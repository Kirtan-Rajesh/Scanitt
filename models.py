from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
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
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password is correct."""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

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
            'date_uploaded': self.date_uploaded.isoformat(),
            'user_id': self.user_id
        }
        
    def __repr__(self):
        return f'<Document {self.original_filename}>'