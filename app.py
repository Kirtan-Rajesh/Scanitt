import os
import logging
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import LoginManager, login_user, logout_user, current_user, login_required

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
class Base(DeclarativeBase):
    pass

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "scanitt-dev-secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configuration
UPLOAD_FOLDER = 'static/uploads'
PROCESSED_FOLDER = 'static/processed'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Database configuration
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    db_url = "sqlite:///scanitt.db"  # Fallback to SQLite if no PostgreSQL URL

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    'pool_pre_ping': True,
    "pool_recycle": 300,
}

# Initialize SQLAlchemy with the app
db = SQLAlchemy(app, model_class=Base)

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_message = 'Please log in to access this page.'
# Set login view to redirect unauthorized users
app.config['LOGIN_VIEW'] = 'login'
login_manager.login_view = app.config['LOGIN_VIEW']

# Define models before importing
class User(db.Model):
    """User model for authentication"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship - a user can have many documents
    documents = db.relationship('Document', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Create hashed password."""
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password is correct."""
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    # These methods are required by Flask-Login
    def is_authenticated(self):
        return True
        
    def is_active(self):
        return True
        
    def is_anonymous(self):
        return False
        
    def get_id(self):
        return str(self.id)


class Document(db.Model):
    """Document model representing a scanned document."""
    id = db.Column(db.String(36), primary_key=True)
    original_filename = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    processed_filename = db.Column(db.String(255), nullable=False)
    original_path = db.Column(db.String(255), nullable=False)
    processed_path = db.Column(db.String(255), nullable=False)
    text = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=True)
    tags = db.Column(db.JSON, default=list)
    summary = db.Column(db.Text, nullable=True)
    date_uploaded = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign key - document belongs to a user
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        """Convert object to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'original_filename': self.original_filename,
            'filename': self.filename,
            'processed_filename': self.processed_filename,
            'original_path': self.original_path,
            'processed_path': self.processed_path,
            'text': self.text,
            'category': self.category,
            'tags': self.tags,
            'summary': self.summary,
            'date_uploaded': self.date_uploaded.isoformat() if self.date_uploaded else None,
            'user_id': self.user_id
        }
        
    def __repr__(self):
        return f'<Document {self.original_filename}>'

# Import utils
from utils.document_processor import detect_and_transform, enhance_image
from utils.ocr import extract_text
from utils.ai_categorizer import categorize_document

# Create database tables
with app.app_context():
    db.create_all()
    logger.info("Database tables created")

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def allowed_file(filename):
    """Check if the file extension is allowed"""
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Routes
@app.route('/')
def index():
    """Home page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    """User dashboard with document list"""
    # Get all documents for the current user
    documents = Document.query.filter_by(user_id=current_user.id).order_by(Document.date_uploaded.desc()).all()
    return render_template('dashboard.html', documents=documents)

@app.route('/upload', methods=['GET', 'POST'])
@login_required
def upload_file():
    """Handle file upload and processing"""
    if request.method == 'POST':
        # Check if post request has the file part
        if 'file' not in request.files:
            flash('No file part', 'danger')
            return redirect(request.url)
            
        file = request.files['file']
        
        # If user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            flash('No selected file', 'danger')
            return redirect(request.url)
            
        if file and allowed_file(file.filename):
            # Generate a unique ID and secure filename
            unique_id = str(uuid.uuid4())
            filename = secure_filename(file.filename or "unnamed_file.jpg")
            
            # Save the original file
            original_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(original_path)
            
            try:
                logger.debug(f"Processing document: {filename}")
                transformed_image = detect_and_transform(original_path)
                enhanced_image = enhance_image(transformed_image)
                
                # Save processed image
                processed_filename = f"processed_{filename}"
                processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
                enhanced_image.save(processed_path)
                
                # Extract text using OCR
                text = extract_text(processed_path)
                
                # Categorize document using AI
                category, tags, summary = categorize_document(text)
                
                # Create new document
                document = Document()
                document.id = unique_id
                document.original_filename = file.filename
                document.filename = filename
                document.processed_filename = processed_filename
                document.original_path = original_path
                document.processed_path = processed_path
                document.text = text
                document.category = category
                document.tags = tags
                document.summary = summary
                document.user_id = current_user.id
                
                # Save to database
                db.session.add(document)
                db.session.commit()
                
                flash('Document uploaded and processed successfully!', 'success')
                return redirect(url_for('dashboard'))
                
            except Exception as e:
                logger.error(f"Error processing document: {str(e)}")
                flash(f'Error processing document: {str(e)}', 'danger')
                return redirect(request.url)
                
    return render_template('upload.html')

@app.route('/document/<document_id>')
@login_required
def view_document(document_id):
    """View a single document with its details"""
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    return render_template('document.html', document=document)

@app.route('/api/documents')
@login_required
def api_documents():
    """API endpoint to get all documents for the current user"""
    documents = Document.query.filter_by(user_id=current_user.id).all()
    return jsonify([doc.to_dict() for doc in documents])

@app.route('/delete/<document_id>', methods=['GET', 'POST'])
@login_required
def delete_document(document_id):
    """Delete a document"""
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    
    # Remove files
    try:
        original_path = document.original_path
        processed_path = document.processed_path
        
        if os.path.exists(original_path):
            os.remove(original_path)
        if os.path.exists(processed_path):
            os.remove(processed_path)
    except Exception as e:
        logger.error(f"Error removing files: {str(e)}")
    
    # Remove from database
    db.session.delete(document)
    db.session.commit()
    
    flash('Document deleted successfully', 'success')
    return redirect(url_for('dashboard'))

@app.route('/update_category/<document_id>', methods=['POST'])
@login_required
def update_category(document_id):
    """Update document category"""
    document = Document.query.filter_by(id=document_id, user_id=current_user.id).first_or_404()
    
    if request.method == 'POST':
        category = request.form.get('category')
        if category:
            document.category = category
            db.session.commit()
            flash('Category updated successfully', 'success')
    
    return redirect(url_for('view_document', document_id=document_id))

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = 'remember' in request.form
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            flash('Login successful!', 'success')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
            
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    """User registration"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return redirect(url_for('signup'))
            
        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            flash('Username already taken', 'danger')
            return redirect(url_for('signup'))
            
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'danger')
            return redirect(url_for('signup'))
            
        # Create new user
        user = User()
        user.username = username
        user.email = email
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
        
    return render_template('signup.html')

@app.route('/logout')
@login_required
def logout():
    """User logout"""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

@app.route('/profile')
@login_required
def profile():
    """User profile page"""
    documents_count = Document.query.filter_by(user_id=current_user.id).count()
    categories = db.session.query(Document.category).filter_by(user_id=current_user.id).distinct().count()
    return render_template('profile.html', documents_count=documents_count, categories=categories)

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500