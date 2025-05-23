import logging
from PIL import Image
import os
import re

logger = logging.getLogger(__name__)

def extract_text(image_path):
    """
    Extract text from an image (simplified fallback version).
    
    Args:
        image_path: Path to the image
        
    Returns:
        Extracted text as string
    """
    try:
        # Since we don't have Tesseract OCR installed, we'll provide a fallback
        # that extracts basic information from the image filename
        filename = os.path.basename(image_path)
        
        # Try to extract a meaningful text from the filename
        # Remove file extension and replace underscores/hyphens with spaces
        base_name = os.path.splitext(filename)[0]
        cleaned_name = re.sub(r'[_-]', ' ', base_name)
        
        # Check if it's a processed image and adjust
        if cleaned_name.startswith('processed '):
            cleaned_name = cleaned_name[10:]
            
        logger.info(f"Using filename as text fallback: {cleaned_name}")
        
        # Return a friendly message about the fallback
        fallback_text = f"This is a document named '{cleaned_name}'\n\n"
        fallback_text += "Note: Full OCR text extraction requires Tesseract OCR installation.\n"
        fallback_text += "The application is currently running in a limited mode without text extraction."
        
        return fallback_text
        
    except Exception as e:
        logger.error(f"Error in fallback text generation: {e}")
        return "This is a document image. Text extraction is limited without Tesseract OCR."