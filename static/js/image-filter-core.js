/**
 * Core Image Processing Functions for Scanitt
 * Contains all the low-level image manipulation algorithms
 */



/**
 * Enhanced Image Preprocessing
 */
function preprocessImage(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 1. Convert to grayscale
    const grayscaleData = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayscaleData[i / 4] = gray;
    }
    
    // 2. Apply adaptive thresholding
    const thresholded = adaptiveThreshold(grayscaleData, canvas.width, canvas.height);
    
    // 3. Apply morphological operations to clean up
    const cleaned = morphologicalClose(thresholded, canvas.width, canvas.height);
    
    return cleaned;
}


/**
 * Professional Edge Detection (Canny-like)
 */
function detectEdges(grayscaleData, width, height) {
    // 1. Apply Gaussian blur
    const blurred = applyGaussianBlur(grayscaleData, width, height);
    
    // 2. Calculate gradients using Sobel operator
    const {magnitude, direction} = calculateGradients(blurred, width, height);
    
    // 3. Non-maximum suppression
    const suppressed = nonMaximumSuppression(magnitude, direction, width, height);
    
    // 4. Double threshold and edge tracking
    const edges = doubleThreshold(suppressed, width, height, 50, 150);
    
    return edges;
}

/**
 * Calculate image gradients using Sobel operator
 */
function calculateGradients(data, width, height) {
    const gx = new Int32Array(width * height);
    const gy = new Int32Array(width * height);
    const magnitude = new Uint8ClampedArray(width * height);
    const direction = new Float32Array(width * height);
    
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumX = 0;
            let sumY = 0;
            
            // Apply Sobel kernels
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    
                    sumX += data[idx] * sobelX[kernelIdx];
                    sumY += data[idx] * sobelY[kernelIdx];
                }
            }
            
            const pos = y * width + x;
            gx[pos] = sumX;
            gy[pos] = sumY;
            magnitude[pos] = Math.min(255, Math.sqrt(sumX * sumX + sumY * sumY));
            direction[pos] = Math.atan2(sumY, sumX);
        }
    }
    
    return {magnitude, direction};
}


/**
 * Non-maximum suppression for edge thinning
 */
function nonMaximumSuppression(magnitude, direction, width, height) {
    const suppressed = new Uint8ClampedArray(width * height);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const pos = y * width + x;
            const angle = direction[pos] * (180 / Math.PI);
            const mag = magnitude[pos];
            
            // Quantize angle to 0, 45, 90, or 135 degrees
            let qAngle = Math.round(angle / 45) * 45;
            qAngle = (qAngle < 0) ? qAngle + 180 : qAngle;
            
            // Positions to compare
            let [x1, y1, x2, y2] = [0, 0, 0, 0];
            
            if ((qAngle >= 0 && qAngle < 22.5) || (qAngle >= 157.5 && qAngle <= 180)) {
                x1 = x + 1; y1 = y;
                x2 = x - 1; y2 = y;
            } else if (qAngle >= 22.5 && qAngle < 67.5) {
                x1 = x + 1; y1 = y - 1;
                x2 = x - 1; y2 = y + 1;
            } else if (qAngle >= 67.5 && qAngle < 112.5) {
                x1 = x; y1 = y - 1;
                x2 = x; y2 = y + 1;
            } else if (qAngle >= 112.5 && qAngle < 157.5) {
                x1 = x - 1; y1 = y - 1;
                x2 = x + 1; y2 = y + 1;
            }
            
            // Check if current pixel is maximum
            const pos1 = y1 * width + x1;
            const pos2 = y2 * width + x2;
            
            if (mag >= magnitude[pos1] && mag >= magnitude[pos2]) {
                suppressed[pos] = mag;
            } else {
                suppressed[pos] = 0;
            }
        }
    }
    
    return suppressed;
}

/**
 * Double threshold and edge tracking
 */
function doubleThreshold(data, width, height, lowThreshold, highThreshold) {
    const result = new Uint8ClampedArray(width * height);
    
    // Strong edges = 255, weak edges = 100, non-edges = 0
    for (let i = 0; i < data.length; i++) {
        if (data[i] >= highThreshold) {
            result[i] = 255;
        } else if (data[i] >= lowThreshold) {
            result[i] = 100;
        } else {
            result[i] = 0;
        }
    }
    
    // Edge tracking by hysteresis
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const pos = y * width + x;
            if (result[pos] === 100) {
                // Check if any of 8 neighbors is a strong edge
                let isStrongNeighbor = false;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        if (ky === 0 && kx === 0) continue;
                        const neighborPos = (y + ky) * width + (x + kx);
                        if (result[neighborPos] === 255) {
                            isStrongNeighbor = true;
                            break;
                        }
                    }
                    if (isStrongNeighbor) break;
                }
                
                result[pos] = isStrongNeighbor ? 255 : 0;
            }
        }
    }
    
    return result;
}

/**
 * Improved document contour detection
 */
function findDocumentContours(edges, width, height) {
    // Find all contours
    const contours = findContours(edges, width, height);
    
    // Filter contours to find document-like quadrilaterals
    const documentContours = [];
    const minArea = width * height * 0.1; // At least 10% of image area
    
    for (const contour of contours) {
        const area = calculateContourArea(contour);
        if (area < minArea) continue;
        
        // Approximate contour with polygon
        const epsilon = 0.02 * calculateContourPerimeter(contour);
        const approx = approxPolyDP(contour, epsilon);
        
        // We're looking for quadrilaterals (4 points)
        if (approx.length === 4) {
            // Check if it's convex
            if (isContourConvex(approx)) {
                // Order points consistently (top-left, top-right, bottom-right, bottom-left)
                const ordered = orderPoints(approx);
                documentContours.push(ordered);
            }
        }
    }
    
    // Sort by area (largest first)
    documentContours.sort((a, b) => {
        return calculateContourArea(b) - calculateContourArea(a);
    });
    
    return documentContours;
}

/**
 * Apply perspective correction to the detected document
 */
function applyPerspectiveCorrection(canvas, corners) {
    // Calculate destination dimensions based on document edges
    const width = Math.max(
        distance(corners[0], corners[1]),
        distance(corners[2], corners[3])
    );
    const height = Math.max(
        distance(corners[0], corners[3]),
        distance(corners[1], corners[2])
    );
    
    // Destination points (in correct order)
    const dst = [
        {x: 0, y: 0},          // top-left
        {x: width-1, y: 0},     // top-right
        {x: width-1, y: height-1}, // bottom-right
        {x: 0, y: height-1}     // bottom-left
    ];
    
    // Calculate perspective transform matrix
    const M = getPerspectiveTransform(corners, dst);
    
    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');
    
    // Get source image data
    const srcData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const dstData = ctx.createImageData(width, height);
    
    // Apply transformation
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Apply inverse transform
            const denominator = M[6]*x + M[7]*y + M[8];
            const srcX = (M[0]*x + M[1]*y + M[2]) / denominator;
            const srcY = (M[3]*x + M[4]*y + M[5]) / denominator;
            
            if (srcX >= 0 && srcX < canvas.width && srcY >= 0 && srcY < canvas.height) {
                // Bilinear interpolation
                const x1 = Math.floor(srcX);
                const y1 = Math.floor(srcY);
                const x2 = Math.min(x1 + 1, canvas.width - 1);
                const y2 = Math.min(y1 + 1, canvas.height - 1);
                
                const dx = srcX - x1;
                const dy = srcY - y1;
                
                const pos1 = (y1 * canvas.width + x1) * 4;
                const pos2 = (y1 * canvas.width + x2) * 4;
                const pos3 = (y2 * canvas.width + x1) * 4;
                const pos4 = (y2 * canvas.width + x2) * 4;
                
                const dstPos = (y * width + x) * 4;
                
                for (let c = 0; c < 4; c++) {
                    const val = 
                        srcData[pos1 + c] * (1 - dx) * (1 - dy) +
                        srcData[pos2 + c] * dx * (1 - dy) +
                        srcData[pos3 + c] * (1 - dx) * dy +
                        srcData[pos4 + c] * dx * dy;
                    
                    dstData.data[dstPos + c] = Math.round(val);
                }
            }
        }
    }
    
    ctx.putImageData(dstData, 0, 0);
    return outputCanvas;
}



/**
 * Apply Gaussian blur to reduce noise
 * Simulates cv2.GaussianBlur
 */
function applyGaussianBlur(grayscaleData, width, height) {
    const result = new Uint8ClampedArray(width * height);
    const kernel = [
        1, 4, 6, 4, 1,
        4, 16, 24, 16, 4,
        6, 24, 36, 24, 6,
        4, 16, 24, 16, 4,
        1, 4, 6, 4, 1
    ];
    const kernelSum = 256;
    const kernelSize = 5;
    const radius = Math.floor(kernelSize / 2);
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            let sum = 0;
            
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const kernelIdx = (ky + radius) * kernelSize + (kx + radius);
                    const imgIdx = (y + ky) * width + (x + kx);
                    sum += grayscaleData[imgIdx] * kernel[kernelIdx];
                }
            }
            
            result[y * width + x] = sum / kernelSum;
        }
    }
    
    // Copy border pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (x < radius || x >= width - radius || y < radius || y >= height - radius) {
                result[y * width + x] = grayscaleData[y * width + x];
            }
        }
    }
    
    return result;
}



/**
 * Helper Functions
 */

function adaptiveThreshold(data, width, height) {
    const blockSize = Math.floor(Math.min(width, height) * 0.1) | 1; // Ensure odd
    const thresholded = new Uint8ClampedArray(width * height);
    const C = 5; // Constant subtracted from mean
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Calculate local mean
            let sum = 0;
            let count = 0;
            
            for (let dy = -blockSize/2; dy <= blockSize/2; dy++) {
                for (let dx = -blockSize/2; dx <= blockSize/2; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        sum += data[ny * width + nx];
                        count++;
                    }
                }
            }
            
            const mean = sum / count;
            thresholded[y * width + x] = data[y * width + x] > (mean - C) ? 255 : 0;
        }
    }
    
    return thresholded;
}


/**
 * Apply morphological closing to connect nearby edges
 * Similar to cv2.morphologyEx with MORPH_CLOSE
 */

function morphologicalClose(edgesData, width, height) {
    // First dilate (expand)
    const dilated = new Uint8ClampedArray(width * height);
    const kernelSize = 3;
    const radius = Math.floor(kernelSize / 2);
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const pos = y * width + x;
            
            // Check if any pixel in the kernel neighborhood is an edge
            let hasEdge = false;
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const neighborPos = (y + ky) * width + (x + kx);
                    if (edgesData[neighborPos] > 0) {
                        hasEdge = true;
                        break;
                    }
                }
                if (hasEdge) break;
            }
            
            dilated[pos] = hasEdge ? 255 : 0;
        }
    }
    
    // Then erode (contract)
    const result = new Uint8ClampedArray(width * height);
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const pos = y * width + x;
            
            // Check if all pixels in the kernel neighborhood are edges
            let allEdges = true;
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const neighborPos = (y + ky) * width + (x + kx);
                    if (dilated[neighborPos] === 0) {
                        allEdges = false;
                        break;
                    }
                }
                if (!allEdges) break;
            }
            
            result[pos] = allEdges ? 255 : 0;
        }
    }
    
    return result;
}


/**
 * Find contours in a binary image
 * Simplified version of cv2.findContours
 */
function findContours(binaryData, width, height) {
    const visited = new Uint8Array(width * height);
    const contours = [];
    
    // Scan the image for edge pixels
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const pos = y * width + x;
            
            // If this is an edge pixel and not visited yet
            if (binaryData[pos] > 0 && !visited[pos]) {
                // Start a new contour
                const contour = [];
                
                // Use a simple 4-connected boundary following algorithm
                let currentX = x;
                let currentY = y;
                let currentPos = pos;
                let dir = 0;
                
                do {
                    // Mark as visited
                    visited[currentPos] = 1;
                    
                    // Add to contour
                    contour.push({ x: currentX, y: currentY });
                    
                    // Try to turn left first (relative to current direction)
                    let found = false;
                    for (let i = 0; i < 4; i++) {
                        const newDir = (dir + 3 + i) % 4; // Try left, then forward, then right, then back
                        
                        let newX = currentX;
                        let newY = currentY;
                        
                        if (newDir === 0) newX++;
                        else if (newDir === 1) newY++;
                        else if (newDir === 2) newX--;
                        else if (newDir === 3) newY--;
                        
                        // Check if in bounds
                        if (newX < 0 || newX >= width || newY < 0 || newY >= height) continue;
                        
                        const newPos = newY * width + newX;
                        
                        // If this is an edge pixel
                        if (binaryData[newPos] > 0) {
                            currentX = newX;
                            currentY = newY;
                            currentPos = newPos;
                            dir = newDir;
                            found = true;
                            break;
                        }
                    }
                    
                    // If no neighbor found, break the loop
                    if (!found) break;
                    
                } while (currentX !== x || currentY !== y);
                
                // Add the contour if it has enough points
                if (contour.length > 10) {
                    contours.push(contour);
                }
            }
        }
    }
    
    return contours;
}


function isContourConvex(contour) {
    if (contour.length < 3) return false;
    
    let sign = 0;
    const n = contour.length;
    
    for (let i = 0; i < n; i++) {
        const p1 = contour[i];
        const p2 = contour[(i+1)%n];
        const p3 = contour[(i+2)%n];
        
        // Calculate cross product
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;
        
        const cross = dx1*dy2 - dy1*dx2;
        
        if (cross !== 0) {
            if (sign === 0) {
                sign = cross > 0 ? 1 : -1;
            } else if (sign * cross < 0) {
                return false;
            }
        }
    }
    
    return true;
}

function orderPoints(points) {
    // Order points: top-left, top-right, bottom-right, bottom-left
    const sorted = [...points].sort((a, b) => a.x - b.x);
    
    const left = sorted.slice(0, 2);
    const right = sorted.slice(2);
    
    left.sort((a, b) => a.y - b.y);
    right.sort((a, b) => a.y - b.y);
    
    return [
        left[0],  // top-left
        right[0], // top-right
        right[1], // bottom-right
        left[1]   // bottom-left
    ];
}

function calculateContourArea(contour) {
    let area = 0;
    const n = contour.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += contour[i].x * contour[j].y;
        area -= contour[j].x * contour[i].y;
    }
    
    return Math.abs(area / 2);
}
/**
 * Calculate the perimeter of a contour
 */
function calculateContourPerimeter(contour) {
    let perimeter = 0;
    const n = contour.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = contour[j].x - contour[i].x;
        const dy = contour[j].y - contour[i].y;
        perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
}

function approxPolyDP(contour, epsilon) {
    if (contour.length <= 2) return contour;
    
    let maxDist = 0;
    let maxIndex = 0;
    
    const start = contour[0];
    const end = contour[contour.length - 1];
    
    for (let i = 1; i < contour.length - 1; i++) {
        const dist = pointToLineDistance(contour[i], start, end);
        if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
        }
    }
    
    if (maxDist > epsilon) {
        const left = approxPolyDP(contour.slice(0, maxIndex + 1), epsilon);
        const right = approxPolyDP(contour.slice(maxIndex), epsilon);
        return left.slice(0, -1).concat(right);
    } else {
        return [start, end];
    }
}


/**
 * Calculate the distance from a point to a line
 */
function pointToLineDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
        const pdx = point.x - lineStart.x;
        const pdy = point.y - lineStart.y;
        return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    
    if (t < 0) {
        const pdx = point.x - lineStart.x;
        const pdy = point.y - lineStart.y;
        return Math.sqrt(pdx * pdx + pdy * pdy);
    } else if (t > 1) {
        const pdx = point.x - lineEnd.x;
        const pdy = point.y - lineEnd.y;
        return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    const pdx = point.x - projX;
    const pdy = point.y - projY;
    
    return Math.sqrt(pdx * pdx + pdy * pdy);
}


/**
 * Get the bounding rectangle of a contour
 */
function getBoundingRect(contour) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const point of contour) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}




function getPerspectiveTransform(src, dst) {
    const A = [];
    
    for (let i = 0; i < 4; i++) {
        const x = src[i].x, y = src[i].y;
        const u = dst[i].x, v = dst[i].y;
        
        A.push([x, y, 1, 0, 0, 0, -u*x, -u*y, -u]);
        A.push([0, 0, 0, x, y, 1, -v*x, -v*y, -v]);
    }
    
    for (let i = 0; i < 8; i++) {
        let maxRow = i;
        for (let j = i+1; j < 8; j++) {
            if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
                maxRow = j;
            }
        }
        
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        
        for (let j = i+1; j < 8; j++) {
            const factor = A[j][i] / A[i][i];
            for (let k = i; k < 9; k++) {
                A[j][k] -= A[i][k] * factor;
            }
        }
    }
    
    const M = new Array(9);
    for (let i = 7; i >= 0; i--) {
        M[i] = A[i][8];
        for (let j = i+1; j < 8; j++) {
            M[i] -= A[i][j] * M[j];
        }
        M[i] /= A[i][i];
    }
    M[8] = 1;
    
    return M;
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}


function rgbToGrayscale(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Export functions that will be used in the UI file
export {
    preprocessImage,
    detectEdges,
    calculateGradients,
    nonMaximumSuppression,
    doubleThreshold,
    findDocumentContours,
    applyPerspectiveCorrection,
    applyGaussianBlur,
    adaptiveThreshold,
    morphologicalClose,
    findContours,
    isContourConvex,
    orderPoints,
    calculateContourArea,
    calculateContourPerimeter,
    approxPolyDP,
    pointToLineDistance,
    getBoundingRect,
    getPerspectiveTransform,
    distance,
    rgbToGrayscale
};