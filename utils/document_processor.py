import cv2
import numpy as np
import logging
from PIL import Image, ImageEnhance
import os

logger = logging.getLogger(__name__)

def order_points(pts):
    """
    Order points in clockwise order starting from top-left
    """
    # Initialize ordered points array
    rect = np.zeros((4, 2), dtype="float32")
    
    # Top-left will have the smallest sum
    # Bottom-right will have the largest sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    # Compute the difference between the points
    # Top-right will have the smallest difference
    # Bottom-left will have the largest difference
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

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
        
        # Resize large images for faster processing while maintaining aspect ratio
        max_dimension = 1500
        height, width = image.shape[:2]
        if max(height, width) > max_dimension:
            scale_factor = max_dimension / max(height, width)
            image = cv2.resize(image, None, fx=scale_factor, fy=scale_factor)
            # Update dimensions
            height, width = image.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(blurred)
        
        # Apply edge detection with improved parameters
        edges = cv2.Canny(enhanced, 50, 150)
        
        # Dilate edges to connect broken lines
        kernel = np.ones((3, 3), np.uint8)
        dilated_edges = cv2.dilate(edges, kernel, iterations=1)
        
        # Find contours on dilated edges
        contours, _ = cv2.findContours(dilated_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # If no contours found, try multiple methods
        if not contours:
            methods = [
                # Adaptive thresholding
                lambda: cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                             cv2.THRESH_BINARY_INV, 11, 2),
                # Otsu's thresholding
                lambda: cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1],
                # More aggressive Canny
                lambda: cv2.Canny(enhanced, 30, 100)
            ]
            
            for method in methods:
                thresh = method()
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    break
        
        # If still no contours found, return original image
        if not contours:
            logger.warning("No contours found in the image. Using original image.")
            result_image = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
            return Image.fromarray(result_image)
            
        # Find the largest contour by area
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Approximate the contour to a polygon
        epsilon = 0.02 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        # If the polygon has 4 points, we've likely found our document
        # If not, we'll use the bounding rectangle
        if len(approx) != 4:
            logger.info("Contour doesn't have 4 points, using minimum area rectangle")
            rect = cv2.minAreaRect(largest_contour)
            approx = np.float32(cv2.boxPoints(rect))
            
        # If the image was resized, scale the points back to original size
        if max(height, width) > max_dimension:
            approx = approx / scale_factor
            
        # Order the points in correct sequence (top-left, top-right, bottom-right, bottom-left)
        approx = order_points(approx.reshape(4, 2))
        
        # Calculate the width and height of the new image
        width_top = np.sqrt(((approx[1][0] - approx[0][0]) ** 2) + ((approx[1][1] - approx[0][1]) ** 2))
        width_bottom = np.sqrt(((approx[2][0] - approx[3][0]) ** 2) + ((approx[2][1] - approx[3][1]) ** 2))
        width = max(int(width_top), int(width_bottom))
        
        height_left = np.sqrt(((approx[3][0] - approx[0][0]) ** 2) + ((approx[3][1] - approx[0][1]) ** 2))
        height_right = np.sqrt(((approx[2][0] - approx[1][0]) ** 2) + ((approx[2][1] - approx[1][1]) ** 2))
        height = max(int(height_left), int(height_right))
        
        # Set a minimum size
        width = max(width, 800)
        height = max(height, 1100)
        
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
        # Apply a series of image enhancements
        
        # 1. Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.3)
        
        # 2. Increase sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.5)
        
        # 3. Adjust brightness
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.1)
        
        return image
    except Exception as e:
        logger.error(f"Error enhancing image: {e}")
        return image