# This file would contain database models if using SQLAlchemy
# Since we're using a JSON file for simplicity, this is a placeholder

class Document:
    """
    Document model representing a scanned document.
    This is a placeholder for a database model if we migrated to SQLAlchemy.
    """
    def __init__(self, id, original_filename, filename, processed_filename, 
                 original_path, processed_path, text, category, tags, summary,
                 date_uploaded):
        self.id = id
        self.original_filename = original_filename
        self.filename = filename
        self.processed_filename = processed_filename
        self.original_path = original_path
        self.processed_path = processed_path
        self.text = text
        self.category = category
        self.tags = tags
        self.summary = summary
        self.date_uploaded = date_uploaded

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
            'date_uploaded': self.date_uploaded
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create object from dictionary"""
        return cls(
            id=data.get('id'),
            original_filename=data.get('original_filename'),
            filename=data.get('filename'),
            processed_filename=data.get('processed_filename'),
            original_path=data.get('original_path'),
            processed_path=data.get('processed_path'),
            text=data.get('text'),
            category=data.get('category'),
            tags=data.get('tags'),
            summary=data.get('summary'),
            date_uploaded=data.get('date_uploaded')
        )
