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

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "scanitt-dev-secret")

# Configuration
UPLOAD_FOLDER = 'static/uploads'
PROCESSED_FOLDER = 'static/processed'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
DOCUMENTS_DB = 'data/documents.json'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER

logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_documents():
    try:
        if os.path.exists(DOCUMENTS_DB):
            with open(DOCUMENTS_DB, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading documents: {e}")
        return []

def save_documents(documents):
    try:
        with open(DOCUMENTS_DB, 'w') as f:
            json.dump(documents, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving documents: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    documents = get_documents()
    # Group documents by category
    categories = {}
    for doc in documents:
        cat = doc.get('category', 'Uncategorized')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(doc)
    
    return render_template('dashboard.html', categories=categories, documents=documents)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'document' not in request.files:
        flash('No file part')
        return redirect(request.url)
    
    file = request.files['document']
    
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        filename = unique_id + '_' + secure_filename(file.filename)
        original_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(original_path)
        
        try:
            # Process document image
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
            
            # Save document metadata
            document = {
                'id': unique_id,
                'original_filename': file.filename,
                'filename': filename,
                'processed_filename': processed_filename,
                'original_path': f"/{app.config['UPLOAD_FOLDER']}/{filename}",
                'processed_path': f"/{app.config['PROCESSED_FOLDER']}/{processed_filename}",
                'text': text,
                'category': category,
                'tags': tags,
                'summary': summary,
                'date_uploaded': datetime.now().isoformat()
            }
            
            documents = get_documents()
            documents.append(document)
            save_documents(documents)
            
            return jsonify({
                'success': True,
                'document': document
            })
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    return jsonify({
        'success': False,
        'error': 'Invalid file type. Please upload a PNG or JPEG image.'
    }), 400

@app.route('/document/<document_id>')
def view_document(document_id):
    documents = get_documents()
    document = next((doc for doc in documents if doc['id'] == document_id), None)
    
    if document:
        return render_template('document.html', document=document)
    else:
        flash('Document not found')
        return redirect(url_for('dashboard'))

@app.route('/api/documents')
def api_documents():
    documents = get_documents()
    return jsonify(documents)

@app.route('/api/delete/<document_id>', methods=['DELETE'])
def delete_document(document_id):
    documents = get_documents()
    document = next((doc for doc in documents if doc['id'] == document_id), None)
    
    if document:
        # Remove files
        try:
            original_path = os.path.join(app.config['UPLOAD_FOLDER'], document['filename'])
            processed_path = os.path.join(app.config['PROCESSED_FOLDER'], document['processed_filename'])
            
            if os.path.exists(original_path):
                os.remove(original_path)
            if os.path.exists(processed_path):
                os.remove(processed_path)
        except Exception as e:
            logger.error(f"Error removing files: {e}")
        
        # Remove from database
        documents = [doc for doc in documents if doc['id'] != document_id]
        save_documents(documents)
        
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Document not found'}), 404

@app.route('/api/update-category/<document_id>', methods=['POST'])
def update_category(document_id):
    data = request.json
    new_category = data.get('category')
    
    if not new_category:
        return jsonify({'success': False, 'error': 'No category provided'}), 400
    
    documents = get_documents()
    document = next((doc for doc in documents if doc['id'] == document_id), None)
    
    if document:
        document['category'] = new_category
        save_documents(documents)
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Document not found'}), 404

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
