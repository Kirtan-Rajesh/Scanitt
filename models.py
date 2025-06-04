from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid
from flask_login import UserMixin  # Add this import

db = SQLAlchemy()

class User(db.Model, UserMixin):  # Add UserMixin here
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    documents = db.relationship('Document', backref='owner', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Document(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = db.Column(db.String(255), nullable=False)
    original_path = db.Column(db.String(255), nullable=False)
    processed_path = db.Column(db.String(255), nullable=True)
    text_content = db.Column(db.Text, nullable=True)
    summary = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default='Uncategorized')
    tags = db.Column(db.String(255), nullable=True)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
