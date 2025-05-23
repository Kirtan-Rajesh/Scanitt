import cv2
import numpy as np
import logging
from PIL import Image, ImageEnhance
import os

logger = logging.getLogger(__name__)

def detect_and_transform(image_path):
    """
    Detect document edges in an image and apply perspective transformation
    to get a top-down view of the document.
    
    Args:
        image_path: Path to the input image
        
    Returns:
        PIL Image with the perspective-corrected document
    """
    try:
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Could not read image at {image_path}")
            return Image.open(image_path)
        
        # Keep a copy of the original image
        original = image.copy()
        
        # Get image dimensions
        height, width = image.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply edge detection
        edges = cv2.Canny(blurred, 75, 200)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # If no contours found, try other methods
        if not contours:
            # Try with adaptive thresholding
            thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                           cv2.THRESH_BINARY_INV, 11, 2)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # If still no contours found, return original image
        if not contours:
            logger.warning("No contours found in the image. Using original image.")
            result_image = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
            return Image.fromarray(result_image)
        
        # Find the largest contour by area
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Approximate the contour to get a polygon
        peri = cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, 0.02 * peri, True)
        
        # If we don't get a quadrilateral, try to find the best 4 points
        if len(approx) != 4:
            # Try with different epsilon values
            for epsilon_factor in [0.01, 0.03, 0.05]:
                approx = cv2.approxPolyDP(largest_contour, epsilon_factor * peri, True)
                if len(approx) == 4:
                    break
            
            # If still not 4 points, use a rectangle
            if len(approx) != 4:
                logger.warning(f"Document corners not clearly detected (found {len(approx)} points). Using bounding rectangle.")
                rect = cv2.minAreaRect(largest_contour)
                approx = cv2.boxPoints(rect)
                approx = np.array(approx, dtype=np.int32)
        
        # Make sure points are in the right order (top-left, top-right, bottom-right, bottom-left)
        approx = np.array(approx, dtype=np.float32)
        if len(approx) == 4:
            # Sum of x+y coordinates - smallest is top-left, largest is bottom-right
            s = approx.sum(axis=1)
            rect = np.zeros((4, 2), dtype=np.float32)
            rect[0] = approx[np.argmin(s)]  # top-left
            rect[2] = approx[np.argmax(s)]  # bottom-right
            
            # Difference of y-x coordinates - smallest is top-right, largest is bottom-left
            diff = np.diff(approx, axis=1)
            rect[1] = approx[np.argmin(diff)]  # top-right
            rect[3] = approx[np.argmax(diff)]  # bottom-left
            approx = rect
        
        # Get width and height of the document
        width_top = np.sqrt(((approx[1][0] - approx[0][0]) ** 2) + ((approx[1][1] - approx[0][1]) ** 2))
        width_bottom = np.sqrt(((approx[2][0] - approx[3][0]) ** 2) + ((approx[2][1] - approx[3][1]) ** 2))
        width = max(int(width_top), int(width_bottom))
        
        height_left = np.sqrt(((approx[3][0] - approx[0][0]) ** 2) + ((approx[3][1] - approx[0][1]) ** 2))
        height_right = np.sqrt(((approx[2][0] - approx[1][0]) ** 2) + ((approx[2][1] - approx[1][1]) ** 2))
        height = max(int(height_left), int(height_right))
        
        # Set a minimum size
        width = max(width, 500)
        height = max(height, 700)
        
        # Define the destination points for the transformation
        dst_points = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1]
        ], dtype="float32")
        
        # Source points are the approx corners
        src_points = approx
        
        # Compute the perspective transform matrix
        M = cv2.getPerspectiveTransform(src_points, dst_points)
        
        # Apply the transformation
        warped = cv2.warpPerspective(original, M, (width, height))
        
        # Convert back to PIL Image
        result_image = cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)
        return Image.fromarray(result_image)
        
    except Exception as e:
        logger.error(f"Error in document detection: {e}")
        # Return the original image if processing fails
        try:
            # original is defined at the start of the try block, so it should be available here
            if 'original' in locals():
                result_image = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
                return Image.fromarray(result_image)
            else:
                return Image.open(image_path)
        except:
            return Image.open(image_path)

def enhance_image(image):
    """
    Enhance the image to make it look more like a scanned document.
    
    Args:
        image: PIL Image to enhance
        
    Returns:
        Enhanced PIL Image
    """
    try:
        # Convert to grayscale if not already
        if image.mode != 'L':
            image = image.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        
        # Increase sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.3)
        
        # Convert to numpy array for OpenCV processing
        img_array = np.array(image)
        
        # Apply bilateral filter to reduce noise while preserving edges
        bilateral = cv2.bilateralFilter(img_array, 9, 75, 75)
        
        # Apply adaptive thresholding for the "scanned" look
        thresh = cv2.adaptiveThreshold(
            bilateral, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Convert back to PIL Image
        return Image.fromarray(thresh)
        
    except Exception as e:
        logger.error(f"Error in image enhancement: {e}")
        # Return the original image if enhancement fails
        return image
