import os
import logging
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime

# Import utility modules
from utils.document_processor import detect_and_transform, enhance_image
from utils.ocr import extract_text
from utils.ai_categorizer import categorize_document
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Document
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')  # Use PostgreSQL in production
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['PROCESSED_FOLDER'] = os.path.join('static', 'processed')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'tiff'}

# Add SQLAlchemy engine options for connection pooling
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,  # Number of connections to keep open in the pool
    'max_overflow': 20, # Number of connections that can be created beyond pool_size
    'pool_timeout': 30 # Seconds to wait for a connection to become available
}

# Initialize database
db.init_app(app)

# Create tables within app context
with app.app_context():
    db.create_all()

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))



# Routes for authentication
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check if user exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))
            
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    # Get documents for the current user only
    documents = Document.query.filter_by(user_id=current_user.id).all()
    
    # Organize documents by category
    categories = {}
    for doc in documents:
        category = doc.category or "Uncategorized"
        if category not in categories:
            categories[category] = []
        categories[category].append(doc)
    
    return render_template('dashboard.html', documents=documents, categories=categories)

@app.route('/upload', methods=['POST'])
@login_required
def upload_document():
    if 'document' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
        
    file = request.files['document']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        try:
            # Generate unique filename
            filename = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            
            # Create user-specific upload directory if it doesn't exist
            user_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], str(current_user.id))
            user_processed_dir = os.path.join(app.config['PROCESSED_FOLDER'], str(current_user.id))
            
            os.makedirs(user_upload_dir, exist_ok=True)
            os.makedirs(user_processed_dir, exist_ok=True)
            
            # Save original file
            original_path = os.path.join(user_upload_dir, filename).replace('\\', '/')
            file.save(original_path)
            
            # Process document
            processed_path = os.path.join(user_processed_dir, 'processed_' + filename).replace('\\', '/')
            processed_image = detect_and_transform(original_path)
            processed_image.save(processed_path)
            
            # Extract text with OCR
            text_content = extract_text(processed_path)
            
            # Categorize document - this returns a tuple (category, tags, summary)
            category_info = categorize_document(text_content)
            
            # Unpack the tuple
            category_name, tags_list, summary = category_info
            
            # Convert tags list to string for storage
            tags_string = ",".join(tags_list) if tags_list else None
            
            # Save document in database
            document = Document(
                filename=filename,
                original_path=original_path,
                processed_path=processed_path,
                text_content=text_content,
                category=category_name,  # Use just the category name
                tags=tags_string,        # Store tags as a comma-separated string
                summary=summary,  # Add this line
                user_id=current_user.id
            )
            
            db.session.add(document)
            db.session.commit()
            
            return jsonify({'success': True, 'document_id': document.id})
        except Exception as e:
            # Log the exception for server-side debugging
            app.logger.error(f"Error during document upload: {e}")
            db.session.rollback() # Rollback any pending database changes
            return jsonify({'success': False, 'error': f'Server error during processing: {str(e)}'}), 500
    else:
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400

@app.route('/document/<document_id>')
@login_required
def view_document(document_id):
    # Ensure the document belongs to the current user
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    return render_template('document.html', document=document)
    

@app.route('/api/documents')
@login_required
def api_documents():
    documents = Document.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': doc.id,
        'filename': doc.filename,
        'category': doc.category,
        'text_content': doc.text_content,
        'upload_date': doc.upload_date.isoformat(),
        'tags': doc.tags
    } for doc in documents])

@app.route('/api/delete/<document_id>', methods=['DELETE'])
@login_required
def delete_document(document_id):
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    
    try:
        # Remove files
        if os.path.exists(document.original_path):
            os.remove(document.original_path)
        if os.path.exists(document.processed_path):
            os.remove(document.processed_path)
            
        # Remove from database
        db.session.delete(document)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update-category/<document_id>', methods=['POST'])
@login_required
def update_category(document_id):
    data = request.json
    new_category = data.get('category')
    
    if not new_category:
        return jsonify({'success': False, 'error': 'No category provided'}), 400
    
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    document.category = new_category
    db.session.commit()
    
    return jsonify({'success': True})

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

# Add this function to create user directories
def ensure_user_directories(user_id):
    user_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], str(user_id))
    user_processed_dir = os.path.join(app.config['PROCESSED_FOLDER'], str(user_id))
    
    os.makedirs(user_upload_dir, exist_ok=True)
    os.makedirs(user_processed_dir, exist_ok=True)
    
    return user_upload_dir, user_processed_dir

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

# Add this route to your app.py file

# Add this import at the top with other imports
import time

@app.route('/api/save-document/<document_id>', methods=['POST'])
@login_required
def save_document(document_id):
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'})
    
    image_file = request.files['image']
    if not image_file.filename:
        return jsonify({'success': False, 'error': 'No image file selected'})
    
    # Get document and verify ownership
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    

    processed_dir = os.path.join('static', 'processed', document.id)
    os.makedirs(processed_dir, exist_ok=True)
    
    # Generate a unique filename
    filename = secure_filename(f"processed_{int(time.time())}.png")
    filepath = os.path.join(processed_dir, filename)
    
    try:
        # Save the file
        image_file.save(filepath)
        
        # Update document record with relative path for web access
        document.processed_path = os.path.join('processed', document.id, filename).replace('\\', '/')
        
        # Extract new text content from the processed image
        text_content = extract_text(filepath)
        if text_content:
            document.text_content = text_content
        
        document.last_modified = datetime.now()
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error saving document: {str(e)}")
        return jsonify({'success': False, 'error': 'Error saving document'}), 500

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
