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
            raise ValueError(f"Could not read image at {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply edge detection
        edges = cv2.Canny(blurred, 75, 200)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Find the largest contour (assuming it's the document)
        if not contours:
            logger.warning("No contours found in the image. Using original image.")
            return Image.open(image_path)
        
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Approximate the contour to get a polygon
        epsilon = 0.02 * cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, epsilon, True)
        
        # If we don't get a quadrilateral, try to find the best 4 points
        if len(approx) != 4:
            logger.warning(f"Document corners not clearly detected (found {len(approx)} points). Trying to find best 4 corners.")
            # Use a rectangle if approximation didn't work well
            rect = cv2.minAreaRect(largest_contour)
            box = cv2.boxPoints(rect)
            approx = np.int0(box)
        
        # Ensure points are in the correct order (top-left, top-right, bottom-right, bottom-left)
        approx = order_points(approx)
        
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
        
        # Convert the approximated quadrilateral to the right format
        src_points = np.array([
            approx[0].flatten(),
            approx[1].flatten(),
            approx[2].flatten(),
            approx[3].flatten()
        ], dtype="float32")
        
        # Compute the perspective transform matrix
        M = cv2.getPerspectiveTransform(src_points, dst_points)
        
        # Apply the transformation
        warped = cv2.warpPerspective(image, M, (width, height))
        
        # Convert back to PIL Image
        warped_pil = Image.fromarray(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB))
        
        return warped_pil
        
    except Exception as e:
        logger.error(f"Error in document detection: {e}")
        # Return the original image if processing fails
        return Image.open(image_path)

def order_points(pts):
    """
    Order points in: top-left, top-right, bottom-right, bottom-left order
    
    Args:
        pts: The points to be ordered
        
    Returns:
        Ordered points
    """
    # Convert to the right format if needed
    if isinstance(pts, np.ndarray) and pts.shape[1] == 1 and pts.shape[2] == 2:
        pts = pts.reshape(pts.shape[0], 2)
    
    # Initialize result
    rect = np.zeros((4, 2), dtype="float32")
    
    # Sum of (x+y) is smallest at top-left, largest at bottom-right
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    # Difference (y-x) is smallest at top-right, largest at bottom-left
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

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
        
        # Increase brightness slightly
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.1)
        
        # Apply adaptive thresholding using OpenCV
        img_array = np.array(image)
        blurred = cv2.GaussianBlur(img_array, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Convert back to PIL Image
        processed_image = Image.fromarray(thresh)
        
        return processed_image
        
    except Exception as e:
        logger.error(f"Error in image enhancement: {e}")
        # Return the original image if enhancement fails
        return image
