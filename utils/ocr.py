import pytesseract
import logging
import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Set the path to the Tesseract executable
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# If installed elsewhere, adjust the path accordingly

def extract_text(image_path):
    """
    Extract text from an image using OCR.
    
    Args:
        image_path: Path to the image
        
    Returns:
        Extracted text as string
    """
    try:
        # Read the image
        image = Image.open(image_path)
        
        # Preprocess for better OCR results
        img_array = np.array(image)
        
        # If image is grayscale, convert to RGB for consistency
        if len(img_array.shape) == 2:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        
        # Apply preprocessing techniques
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Apply thresholding to make text more visible
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert back to PIL Image for Tesseract
        pil_img = Image.fromarray(binary)
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(pil_img)
        
        # Log text extraction result length
        logger.debug(f"Extracted {len(text)} characters from {image_path}")
        
        return text.strip()
        
    except Exception as e:
        logger.error(f"Error in OCR text extraction: {e}")
        return "Error extracting text. Please try again with a clearer image."