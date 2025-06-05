import cv2
import numpy as np
import logging
from PIL import Image, ImageEnhance
import os
import psutil
from wrapt_timeout_decorator import timeout

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

@timeout(10)  # 10 second timeout
def detect_and_transform(image_path):
    """
    Detect document edges in an image and apply perspective transformation
    to get a top-down view of the document.
    """
    if psutil.virtual_memory().percent > 90:
        raise MemoryError("System memory too low for processing")

    try:
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Could not read image at {image_path}")
            return Image.open(image_path)

        original = image.copy()
        height, width = image.shape[:2]

        max_dimension = 1500
        if max(height, width) > max_dimension:
            scale_factor = max_dimension / max(height, width)
            image = cv2.resize(image, None, fx=scale_factor, fy=scale_factor)
            height, width = image.shape[:2]

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(blurred)

        edges = cv2.Canny(enhanced, 50, 150)
        kernel = np.ones((3, 3), np.uint8)
        dilated_edges = cv2.dilate(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            methods = [
                lambda: cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                              cv2.THRESH_BINARY_INV, 11, 2),
                lambda: cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1],
                lambda: cv2.Canny(enhanced, 30, 100)
            ]
            for method in methods:
                thresh = method()
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    break

        if not contours:
            logger.warning("No contours found in the image. Using original image.")
            result_image = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
            return Image.fromarray(result_image)

        largest_contour = max(contours, key=cv2.contourArea)
        peri = cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, 0.02 * peri, True)

        if len(approx) != 4:
            if len(approx) < 4:
                logger.warning(f"Only {len(approx)} points found, using convex hull")
                approx = cv2.convexHull(approx)

            approx = cv2.boxPoints(cv2.minAreaRect(approx))
            approx = np.array(approx, dtype=np.float32)

        if len(approx) == 4:
            try:
                s = approx.sum(axis=1)
                rect = np.zeros((4, 2), dtype=np.float32)
                rect[0] = approx[np.argmin(s)]
                rect[2] = approx[np.argmax(s)]

                diff = np.diff(approx, axis=1)
                rect[1] = approx[np.argmin(diff)]
                rect[3] = approx[np.argmax(diff)]
                approx = rect
            except IndexError as e:
                logger.error(f"Index error during corner ordering: {e}")

        width_top = np.sqrt(((approx[1][0] - approx[0][0]) ** 2) + ((approx[1][1] - approx[0][1]) ** 2))
        width_bottom = np.sqrt(((approx[2][0] - approx[3][0]) ** 2) + ((approx[2][1] - approx[3][1]) ** 2))
        height_left = np.sqrt(((approx[3][0] - approx[0][0]) ** 2) + ((approx[3][1] - approx[0][1]) ** 2))
        height_right = np.sqrt(((approx[2][0] - approx[1][0]) ** 2) + ((approx[2][1] - approx[1][1]) ** 2))

        width = max(int(width_top), int(width_bottom))
        height = max(int(height_left), int(height_right))

        if width == 0 or height == 0:
            raise ValueError("Invalid document dimensions detected")

        width = max(width, 500)
        height = max(height, 700)

        dst_points = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1]
        ], dtype="float32")

        M = cv2.getPerspectiveTransform(approx, dst_points)
        warped = cv2.warpPerspective(original, M, (width, height))
        result_image = cv2.cvtColor(warped, cv2.COLOR_BGR2RGB)
        return Image.fromarray(result_image)

    except Exception as e:
        logger.error(f"Error in document detection: {e}")
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
    """
    try:
        if image.mode != 'L':
            image = image.convert('L')

        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)

        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(1.3)

        img_array = np.array(image)
        bilateral = cv2.bilateralFilter(img_array, 9, 75, 75)

        thresh = cv2.adaptiveThreshold(
            bilateral, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        return Image.fromarray(thresh)

    except Exception as e:
        logger.error(f"Error in image enhancement: {e}")
        return image
