import pytesseract
import logging
from PIL import Image
import os

logger = logging.getLogger(__name__)

def extract_text(image_path):
    """
    Extract text from an image using OCR.
    
    Args:
        image_path: Path to the image
        
    Returns:
        Extracted text as string
    """
    try:
        # Open the image
        image = Image.open(image_path)
        
        # Extract text using pytesseract
        # Using a higher OEM mode (1) for neural net LSTM recognition and PSM 3 for automatic page segmentation
        text = pytesseract.image_to_string(image, config='--oem 1 --psm 3')
        
        # Clean up the text
        if text:
            # Replace multiple newlines with a single one
            text = '\n'.join([line.strip() for line in text.split('\n') if line.strip()])
            logger.info(f"Extracted {len(text)} characters of text")
        else:
            logger.warning("No text extracted from the image")
            text = ""
            
        return text
        
    except Exception as e:
        logger.error(f"Error in OCR text extraction: {e}")
        return "Error extracting text from image."