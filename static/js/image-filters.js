/**
 * Image Filters and Processing for Scanitt
 * Provides additional image manipulation functionality using OpenCV-like algorithms
 */

function initOpenCV() {
    if (typeof cv === 'undefined') {
        console.log('OpenCV.js is undefined, attempting to load script.');
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.8.0/opencv.js'; // Ensure this URL is current
        script.onload = () => {
            console.log('OpenCV.js script has been loaded. Waiting for runtime initialization...');
            // OpenCV.js will call cv.onRuntimeInitialized when it's ready
            cv.onRuntimeInitialized = () => {
                console.log('OpenCV runtime initialized successfully.');
                isOpenCvReady = true;
                // You could dispatch a custom event here if other parts of your app need to know
                // document.dispatchEvent(new CustomEvent('opencvready'));
            };
        };
        script.onerror = () => {
            console.error('Failed to load OpenCV.js script.');
            showAlert('Critical Error: Could not load image processing library. Please refresh.', 'danger');
        };
        document.head.appendChild(script);
    } else if (cv.Mat && !isOpenCvReady) {
        // cv is defined, Mat object exists (good sign), but our flag isn't set.
        // This might happen if script was already on page but onRuntimeInitialized hasn't been set by this script yet.
        console.log('OpenCV.js appears to be loaded, ensuring onRuntimeInitialized is set.');
        cv.onRuntimeInitialized = () => { // Ensure our handler is attached
            console.log('OpenCV runtime initialized (onRuntimeInitialized re-checked).');
            isOpenCvReady = true;
        };
        // If already initialized before this script ran, onRuntimeInitialized might not fire again.
        // Check if it's already usable.
        if(cv.Mat && typeof cv.imread === 'function') { // Check a few core functionalities
             console.log('OpenCV seems to be fully ready already (quick check).');
             isOpenCvReady = true;
        }

    } else if (isOpenCvReady) {
        console.log('OpenCV.js is already loaded and ready.');
    } else {
        console.warn('OpenCV.js `cv` object exists but is not fully ready, or its state is unknown. Waiting for onRuntimeInitialized.');
         cv.onRuntimeInitialized = () => {
            console.log('OpenCV runtime initialized (complex existing cv state).');
            isOpenCvReady = true;
        };
    }
}
initOpenCV();


// Global variables for image manipulation
let originalImage = null;
let currentFilter = 'none';
let cropperInstance = null;
let rotationAngle = 0;
let imageCache = {}; // For storing processed images

let isOpenCvReady = false;
// Global variables for cropping
let currentCropper = null; // Instance of Cropper.js
let detectedDocCorners = null; // Stores corners from auto-detection {x, y}
let isAutoDetecting = false; // Flag for auto-detection mode
let preCropImageSrc = null; // To store image state before enabling crop mode
let cropControlsContainer = null;
let mainImageElement = document.getElementById('document-image');
let currentModalCropper = null;
let cropModalInstance = null; // <<<<------ THIS IS THE IMPORTANT GLOBAL DECLARATION
let preCropImageSrcForModal = null;
let detectedModalCorners = null;

document.addEventListener('DOMContentLoaded', function() {
    mainImageElement = document.getElementById('document-image');
    // Initialize filter buttons
    const filterButton = document.getElementById('filter-button');
    const enhanceButton = document.getElementById('enhance-button');
    const cropButton = document.getElementById('crop-button');
    const detectEdgesButton = document.getElementById('detect-edges-button');
    const autoCropButton = document.getElementById('auto-crop-button');
    
    if (filterButton) {
        filterButton.addEventListener('click', showFilterOptions);
    }
    
    if (enhanceButton) {
        enhanceButton.addEventListener('click', enhanceDocument);
    }
    
    if (cropButton) {
        cropButton.addEventListener('click', enableCropMode);
    }
    
    if (detectEdgesButton) {
        detectEdgesButton.addEventListener('click', detectDocumentEdges);
    }
    
    if (autoCropButton) {
        autoCropButton.addEventListener('click', autoCropDocument);
    }
     // Setup the container for crop action buttons
     setupCropControls();
});

function setupCropControls() {
    if (document.getElementById('crop-controls-container')) return;

    cropControlsContainer = document.createElement('div');
    cropControlsContainer.id = 'crop-controls-container';
    cropControlsContainer.className = 'mt-2 text-center'; // Bootstrap classes for styling
    cropControlsContainer.style.padding = '10px';
    cropControlsContainer.style.backgroundColor = 'rgba(240, 240, 240, 0.95)';
    cropControlsContainer.style.borderRadius = '8px';
    cropControlsContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
    cropControlsContainer.style.position = 'fixed'; // Or 'absolute' relative to a container
    cropControlsContainer.style.bottom = '20px'; // Example positioning
    cropControlsContainer.style.left = '50%';
    cropControlsContainer.style.transform = 'translateX(-50%)';
    cropControlsContainer.style.zIndex = '1050'; // Ensure it's above other elements

    // Attempt to append to a specific toolbar or controls area if available
    const editorControlsArea = document.querySelector('.editor-controls'); // Example selector
    if (editorControlsArea) {
        editorControlsArea.appendChild(cropControlsContainer);
    } else if (mainImageElement && mainImageElement.parentElement) {
        mainImageElement.parentElement.insertAdjacentElement('afterend', cropControlsContainer);
    } else {
        document.body.appendChild(cropControlsContainer); // Fallback
    }
    hideCropControls(); // Initially hidden
}


/**
 * Waits for OpenCV.js to be fully initialized.
 * @param {number} timeoutMs - Maximum time to wait in milliseconds.
 * @returns {Promise<void>} - Resolves when OpenCV is ready, rejects on timeout or error.
 */
async function ensureOpenCVReady(timeoutMs = 7000) { // Increased timeout slightly
    return new Promise((resolve, reject) => {
        if (isOpenCvReady && typeof cv !== 'undefined' && cv.Mat) {
            // console.log("ensureOpenCVReady: OpenCV is already marked as ready.");
            resolve();
            return;
        }

        console.log("ensureOpenCVReady: Waiting for OpenCV to become ready...");
        let attempts = 0;
        const intervalTime = 200; // Check every 200ms
        const maxAttempts = Math.floor(timeoutMs / intervalTime);

        const intervalId = setInterval(() => {
            if (isOpenCvReady && typeof cv !== 'undefined' && cv.Mat && typeof cv.imread === 'function') { // Added cv.imread check
                clearInterval(intervalId);
                console.log("ensureOpenCVReady: OpenCV became ready.");
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                const errorMsg = 'OpenCV.js did not initialize within the timeout period.';
                console.error(`ensureOpenCVReady: ${errorMsg}`);
                reject(errorMsg);
            }
            attempts++;
        }, intervalTime);
    });
}

async function detectDocumentEdges() {
    const mainImage = document.getElementById('document-image');
    if (!mainImage || !mainImage.src) {
        showAlert('No image to process', 'warning');
        return;
    }

    try {
        await ensureOpenCVReady();
        clearCornerMarkers();

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = mainImage.naturalWidth;
        canvas.height = mainImage.naturalHeight;
        ctx.drawImage(mainImage, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = new Uint8Array(imageData.data);
        
        // Create OpenCV Mat manually
        let src = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
        src.data.set(data);
        
        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        let edged = new cv.Mat();
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        let biggestContourApprox = null;

        try {
            // Process image
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
            cv.Canny(blurred, edged, 50, 150);
            cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let maxArea = 0;

            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt);
                
                // Filter small contours
                if (area < (src.rows * src.cols * 0.01)) {
                    cnt.delete();
                    continue;
                }

                let peri = cv.arcLength(cnt, true);
                let approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

                // Check if we have quadrilateral
                if (approx.rows === 4 && area > maxArea) {
                    if (biggestContourApprox) biggestContourApprox.delete();
                    biggestContourApprox = approx;
                    maxArea = area;
                } else {
                    approx.delete();
                }
                cnt.delete();
            }

            if (biggestContourApprox) {
                const corners = [];
                // Safe access to contour points
                for (let i = 0; i < 4; i++) {
                    try {
                        // Try multiple access methods
                        const ptr = biggestContourApprox.data32S || biggestContourApprox.intPtr(i);
                        if (ptr) {
                            corners.push({ 
                                x: ptr[i * 2], 
                                y: ptr[i * 2 + 1] 
                            });
                        }
                    } catch (e) {
                        // Fallback to pointAt method
                        const point = biggestContourApprox.intPtr(i, 0);
                        if (point) {
                            corners.push({ x: point[0], y: point[1] });
                        }
                    }
                }
                
                if (corners.length === 4) {
                    displayCornerMarkers(corners, mainImage);
                    window.detectedCorners = corners;
                    showAlert('Document edges detected!', 'success');
                } else {
                    showAlert('Failed to extract corner points', 'warning');
                }
            } else {
                showAlert('No document edges found', 'warning');
            }
        } finally {
            // Clean up ALL Mats
            [src, gray, blurred, edged, contours, hierarchy, biggestContourApprox].forEach(m => {
                if (m && !m.isDeleted) m.delete();
            });
        }
    } catch (error) {
        console.error('Edge detection error:', error);
        showAlert('Error processing image: ' + error.message, 'danger');
    }
}

function displayCornerMarkers(corners, imageElement) {
    clearCornerMarkers();
    
    // Get the container that holds the image
    const viewer = document.querySelector('.document-viewer') || imageElement.parentElement;
    if (!viewer) return;

    // Get image position relative to viewer
    const viewerRect = viewer.getBoundingClientRect();
    const imgRect = imageElement.getBoundingClientRect();
    
    // Calculate offsets
    const offsetX = imgRect.left - viewerRect.left;
    const offsetY = imgRect.top - viewerRect.top;
    
    // Calculate scaling
    const scaleX = imgRect.width / imageElement.naturalWidth;
    const scaleY = imgRect.height / imageElement.naturalHeight;

    corners.forEach((corner) => {
        const marker = document.createElement('div');
        marker.className = 'corner-marker';
        marker.style.position = 'absolute';
        marker.style.width = '12px';
        marker.style.height = '12px';
        marker.style.borderRadius = '50%';
        marker.style.backgroundColor = 'red';
        marker.style.border = '2px solid white';
        marker.style.transform = 'translate(-50%, -50%)';
        marker.style.zIndex = '1000';
        marker.style.pointerEvents = 'none';
        
        // Calculate position relative to viewer
        const x = offsetX + (corner.x * scaleX);
        const y = offsetY + (corner.y * scaleY);
        
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        
        viewer.appendChild(marker);
    });
}

function clearCornerMarkers() {
    const markers = document.querySelectorAll('.corner-marker');
    markers.forEach(marker => marker.remove());
}

async function autoCropDocument() {
    if (!window.detectedCorners) {
        showAlert('Please detect edges first', 'warning');
        return;
    }

    try {
        await ensureOpenCVReady();
        const mainImage = document.getElementById('document-image');
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            try {
                let src = cv.imread(img);
                let dst = new cv.Mat();

                // Sort corners
                const corners = sortCorners(window.detectedCorners);

                // Calculate output dimensions
                const widthA = Math.sqrt(Math.pow(corners[1].x - corners[0].x, 2) + 
                                       Math.pow(corners[1].y - corners[0].y, 2));
                const widthB = Math.sqrt(Math.pow(corners[2].x - corners[3].x, 2) + 
                                       Math.pow(corners[2].y - corners[3].y, 2));
                const maxWidth = Math.max(widthA, widthB);

                const heightA = Math.sqrt(Math.pow(corners[3].x - corners[0].x, 2) + 
                                        Math.pow(corners[3].y - corners[0].y, 2));
                const heightB = Math.sqrt(Math.pow(corners[2].x - corners[1].x, 2) + 
                                        Math.pow(corners[2].y - corners[1].y, 2));
                const maxHeight = Math.max(heightA, heightB);

                // Create source and destination points
                const srcPoints = corners.flatMap(pt => [pt.x, pt.y]);
                const dstPoints = [
                    0, 0,
                    maxWidth - 1, 0,
                    maxWidth - 1, maxHeight - 1,
                    0, maxHeight - 1
                ];

                // Apply perspective transform
                const srcPointsMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcPoints);
                const dstPointsMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstPoints);
                const perspectiveMatrix = cv.getPerspectiveTransform(srcPointsMat, dstPointsMat);
                cv.warpPerspective(src, dst, perspectiveMatrix, new cv.Size(maxWidth, maxHeight));

                // Convert to image and update
                const canvas = document.createElement('canvas');
                cv.imshow(canvas, dst);
                mainImage.src = canvas.toDataURL();
                clearCornerMarkers();
                window.detectedCorners = null;

                // Cleanup
                src.delete(); dst.delete();
                srcPointsMat.delete(); dstPointsMat.delete();
                perspectiveMatrix.delete();

                showAlert('Document cropped successfully!', 'success');

            } catch (error) {
                console.error('Error cropping image:', error);
                showAlert('Error cropping image', 'danger');
            }
        };
        img.src = mainImage.src;

    } catch (error) {
        showAlert('Error initializing OpenCV', 'danger');
        console.error(error);
    }
}

function sortCorners(corners) {
    // Calculate center point
    const center = {
        x: corners.reduce((sum, pt) => sum + pt.x, 0) / 4,
        y: corners.reduce((sum, pt) => sum + pt.y, 0) / 4
    };

    // Sort corners based on their position relative to center
    return corners.sort((a, b) => {
        const angleA = Math.atan2(a.y - center.y, a.x - center.x);
        const angleB = Math.atan2(b.y - center.y, b.x - center.x);
        return angleA - angleB;
    });
}

function showCropControls(mode = 'manual') {
    if (!cropControlsContainer) setupCropControls();
    cropControlsContainer.innerHTML = ''; // Clear previous buttons

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    if (mode === 'manual' && currentCropper) {
        const applyManualCropButton = document.createElement('button');
        applyManualCropButton.id = 'apply-manual-crop-btn';
        applyManualCropButton.className = 'btn btn-success';
        applyManualCropButton.innerHTML = '<i class="fas fa-check"></i> Apply Crop';
        applyManualCropButton.onclick = applyManualCrop;
        btnGroup.appendChild(applyManualCropButton);
    } else if (mode === 'auto' && detectedDocCorners) {
        const applyAutoCropButton = document.createElement('button');
        applyAutoCropButton.id = 'apply-auto-crop-btn';
        applyAutoCropButton.className = 'btn btn-success';
        applyAutoCropButton.innerHTML = '<i class="fas fa-magic"></i> Apply Auto Crop';
        applyAutoCropButton.onclick = applyAutoDetectedCrop;
        btnGroup.appendChild(applyAutoCropButton);

        const refineCropButton = document.createElement('button');
        refineCropButton.id = 'refine-crop-btn';
        refineCropButton.className = 'btn btn-info ms-2';
        refineCropButton.innerHTML = '<i class="fas fa-edit"></i> Refine Manually';
        refineCropButton.onclick = () => enableManualCropFromAuto(detectedDocCorners);
        btnGroup.appendChild(refineCropButton);
    }

    const cancelCropButton = document.createElement('button');
    cancelCropButton.id = 'cancel-crop-btn';
    cancelCropButton.className = 'btn btn-danger ms-2';
    cancelCropButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
    cancelCropButton.onclick = cancelCropMode;
    btnGroup.appendChild(cancelCropButton);

    cropControlsContainer.appendChild(btnGroup);
    cropControlsContainer.style.display = 'block';
}

function hideCropControls() {
    if (cropControlsContainer) {
        cropControlsContainer.style.display = 'none';
    }
    const overlay = document.getElementById('auto-detect-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Show filter options modal with advanced filtering capabilities
 */
function showFilterOptions() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('filter-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'filter-modal';
        modal.className = 'modal fade';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-labelledby', 'filterModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="filterModalLabel">Advanced Document Filters</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <div class="filter-preview text-center mb-3">
                                <img id="filter-preview-image" src="#" alt="Filter preview" class="img-fluid border rounded shadow-sm">
                            </div>
                            <div class="d-flex justify-content-center">
                                <span class="badge bg-primary px-3 py-2">Preview</span>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="filter-categories">
                                <div class="list-group mb-3">
                                    <button class="list-group-item list-group-item-action active" data-filter-category="presets">
                                        <i class="fas fa-sliders-h me-2"></i> Presets
                                    </button>
                                    <button class="list-group-item list-group-item-action" data-filter-category="document">
                                        <i class="fas fa-file-alt me-2"></i> Document
                                    </button>
                                    <button class="list-group-item list-group-item-action" data-filter-category="advanced">
                                        <i class="fas fa-cogs me-2"></i> Advanced
                                    </button>
                                </div>
                                
                                <!-- Filter selection buttons -->
                                <div id="presets-filters" class="filter-category-content">
                                    <div class="mb-2 small text-muted">Select a preset filter:</div>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-sm btn-outline-primary filter-option active" data-filter="none">
                                            <i class="fas fa-undo me-2"></i> Original
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="grayscale">
                                            <i class="fas fa-adjust me-2"></i> Grayscale
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="bw">
                                            <i class="fas fa-tint me-2"></i> Black & White
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="enhance">
                                            <i class="fas fa-magic me-2"></i> Enhanced
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="sharpen">
                                            <i class="fas fa-expand-alt me-2"></i> Sharpen
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="contrast">
                                            <i class="fas fa-adjust me-2"></i> High Contrast
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="vintage">
                                            <i class="fas fa-history me-2"></i> Vintage
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="cool">
                                            <i class="fas fa-snowflake me-2"></i> Cool Tone
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="warm">
                                            <i class="fas fa-sun me-2"></i> Warm Tone
                                        </button>
                                    </div>
                                </div>
                                
                                <div id="document-filters" class="filter-category-content d-none">
                                    <div class="mb-2 small text-muted">Document optimization:</div>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="scan">
                                            <i class="fas fa-scanner me-2"></i> Scanned Document
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="receipt">
                                            <i class="fas fa-receipt me-2"></i> Receipt
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="text">
                                            <i class="fas fa-font me-2"></i> Text Document
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="photo">
                                            <i class="fas fa-camera me-2"></i> Photo
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary filter-option" data-filter="handwriting">
                                            <i class="fas fa-pen-fancy me-2"></i> Handwriting
                                        </button>
                                    </div>
                                </div>
                                
                                <div id="advanced-filters" class="filter-category-content d-none">
                                    <div class="mb-2 small text-muted">Fine-tune manually:</div>
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Brightness</span>
                                            <span class="filter-value" id="brightness-value">0</span>
                                        </label>
                                        <input type="range" class="form-range filter-slider" id="brightness-slider" 
                                            min="-50" max="50" value="0" data-filter-param="brightness">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Contrast</span>
                                            <span class="filter-value" id="contrast-value">0</span>
                                        </label>
                                        <input type="range" class="form-range filter-slider" id="contrast-slider" 
                                            min="-50" max="50" value="0" data-filter-param="contrast">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Saturation</span>
                                            <span class="filter-value" id="saturation-value">0</span>
                                        </label>
                                        <input type="range" class="form-range filter-slider" id="saturation-slider" 
                                            min="-50" max="50" value="0" data-filter-param="saturation">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Sharpness</span>
                                            <span class="filter-value" id="sharpness-value">0</span>
                                        </label>
                                        <input type="range" class="form-range filter-slider" id="sharpness-slider" 
                                            min="0" max="100" value="0" data-filter-param="sharpness">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Threshold</span>
                                            <span class="filter-value" id="threshold-value">0</span>
                                        </label>
                                        <input type="range" class="form-range filter-slider" id="threshold-slider" 
                                            min="0" max="255" value="128" data-filter-param="threshold">
                                    </div>
                                    <button class="btn btn-sm btn-outline-secondary w-100" id="reset-advanced-filters">
                                        Reset All Adjustments
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="apply-filter-btn">
                        <i class="fas fa-check me-1"></i> Apply Filter
                    </button>
                </div>
            </div>
        </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle filter category tabs
        const filterCategories = modal.querySelectorAll('[data-filter-category]');
        const filterContents = modal.querySelectorAll('.filter-category-content');
        
        filterCategories.forEach(category => {
            category.addEventListener('click', function() {
                // Remove active class from all categories
                filterCategories.forEach(c => c.classList.remove('active'));
                // Add active class to clicked category
                this.classList.add('active');
                
                // Hide all content sections
                filterContents.forEach(content => content.classList.add('d-none'));
                
                // Show selected content section
                const categoryName = this.getAttribute('data-filter-category');
                const contentElement = document.getElementById(`${categoryName}-filters`);
                if (contentElement) {
                    contentElement.classList.remove('d-none');
                }
                
                // Reset preview image to original when switching to advanced tab
                if (categoryName === 'advanced') {
                    const previewImage = document.getElementById('filter-preview-image');
                    if (previewImage) {
                        previewImage.style.filter = 'none';
                        
                        // Reset all sliders to zero
                        resetAdvancedFilters();
                        
                        // Make "none" button in presets active
                        const noneButton = document.querySelector('.filter-option[data-filter="none"]');
                        if (noneButton) {
                            document.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                            noneButton.classList.add('active');
                        }
                        
                        // Reset current filter
                        currentFilter = 'none';
                    }
                }
            });
        });
        
        // Handle filter option clicks
        const filterOptions = modal.querySelectorAll('.filter-option');
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove active class from all options within the same category
                const category = this.closest('.filter-category-content');
                if (category) {
                    category.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                }
                
                // Add active class to clicked option
                this.classList.add('active');
                
                // Apply preview filter
                const filter = this.getAttribute('data-filter');
                previewFilter(filter);
                
                // Reset advanced sliders if selecting a preset
                if (category && category.id !== 'advanced-filters') {
                    resetAdvancedFilters();
                }
            });
        });
        
        // Handle advanced filter sliders
        const filterSliders = modal.querySelectorAll('.filter-slider');
        filterSliders.forEach(slider => {
            slider.addEventListener('input', function() {
                const param = this.getAttribute('data-filter-param');
                const value = this.value;
                const valueElement = document.getElementById(`${param}-value`);
                if (valueElement) {
                    valueElement.textContent = value;
                }
                
                // Apply advanced filter
                applyAdvancedFilter();
            });
        });
        
        // Reset advanced filters button
        const resetAdvancedBtn = document.getElementById('reset-advanced-filters');
        if (resetAdvancedBtn) {
            resetAdvancedBtn.addEventListener('click', resetAdvancedFilters);
        }
        
        function resetAdvancedFilters() {
            const sliders = document.querySelectorAll('.filter-slider');
            sliders.forEach(slider => {
                if (slider.id === 'threshold-slider') {
                    slider.value = 128;
                } else if (slider.id === 'sharpness-slider') {
                    slider.value = 0;
                } else {
                    slider.value = 0;
                }
                
                const param = slider.getAttribute('data-filter-param');
                const valueElement = document.getElementById(`${param}-value`);
                if (valueElement) {
                    valueElement.textContent = slider.value;
                }
            });
            
            // Reset to original if in advanced tab
            if (!document.getElementById('advanced-filters').classList.contains('d-none')) {
                // Reset the preview image to show the original image without filters
                const previewImage = document.getElementById('filter-preview-image');
                if (previewImage) {
                    previewImage.style.filter = 'none';
                }
            }
        }
        
        function applyAdvancedFilter() {
            const brightness = parseInt(document.getElementById('brightness-slider').value);
            const contrast = parseInt(document.getElementById('contrast-slider').value);
            const saturation = parseInt(document.getElementById('saturation-slider').value);
            const sharpness = parseInt(document.getElementById('sharpness-slider').value);
            const threshold = parseInt(document.getElementById('threshold-slider').value);
            
            // Get preview image
            const previewImage = document.getElementById('filter-preview-image');
            if (previewImage) {
                // Convert slider values to CSS filter values
                const brightnessVal = 1 + (brightness / 100);
                const contrastVal = 1 + (contrast / 50);
                const saturationVal = 1 + (saturation / 50);
                
                // Apply CSS filters
                let filterString = `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturationVal})`;
                
                // Add sharpness using a combination of contrast and other filters
                if (sharpness > 0) {
                    // For sharpness we use a combination of contrast and negative sepia
                    // which gives a sharper appearance to text and edges
                    const sharpAmount = sharpness / 100;
                    filterString += ` contrast(${1 + sharpAmount * 0.5})`;
                    
                    if (sharpAmount > 0.3) {
                        // At higher sharpness values, reduce saturation slightly to focus on edges
                        filterString += ` saturate(${1 - sharpAmount * 0.2})`;
                    }
                }
                
                // If threshold is high enough, apply a high contrast black and white effect
                if (threshold > 128) {
                    const thresholdAmount = (threshold - 128) / 127; // 0 to 1
                    filterString += ` grayscale(${thresholdAmount}) contrast(${1 + thresholdAmount * 3})`;
                }
                
                previewImage.style.filter = filterString;
                
                // Make "none" button inactive
                const noneButton = document.querySelector('.filter-option[data-filter="none"]');
                if (noneButton) {
                    noneButton.classList.remove('active');
                }
            }
        }
        
        // Handle apply filter button
        const applyFilterBtn = document.getElementById('apply-filter-btn');
        applyFilterBtn.addEventListener('click', function() {
            // Check which tab is active
            const activeCategory = document.querySelector('.list-group-item.active').getAttribute('data-filter-category');
            
            if (activeCategory === 'advanced') {
                // Apply advanced filter
                applyAdvancedFilterToMain();
            } else {
                // Apply preset filter
                applySelectedFilter();
            }
            
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        });
        
        function applyAdvancedFilterToMain() {
            const brightness = parseInt(document.getElementById('brightness-slider').value);
            const contrast = parseInt(document.getElementById('contrast-slider').value);
            const saturation = parseInt(document.getElementById('saturation-slider').value);
            const sharpness = parseInt(document.getElementById('sharpness-slider').value);
            const threshold = parseInt(document.getElementById('threshold-slider').value);
            
            // Get main document image
            const documentImage = document.getElementById('document-image');
            if (!documentImage) return;
            
            // Convert slider values to CSS filter values
            const brightnessVal = 1 + (brightness / 100);
            const contrastVal = 1 + (contrast / 50);
            const saturationVal = 1 + (saturation / 50);
            
            // Apply CSS filters
            let filterString = `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturationVal})`;
            
            // Add sharpness using a combination of contrast and other filters
                        // Add sharpness using a combination of contrast and other filters
                        if (sharpness > 0) {
                            const sharpAmount = sharpness / 100;
                            filterString += ` contrast(${1 + sharpAmount * 0.5})`;
                            
                            if (sharpAmount > 0.3) {
                                // At higher sharpness values, reduce saturation slightly to focus on edges
                                filterString += ` saturate(${1 - sharpAmount * 0.2})`;
                            }
                        }
                        
                        // If threshold is high enough, apply a high contrast black and white effect
                        if (threshold > 128) {
                            const thresholdAmount = (threshold - 128) / 127; // 0 to 1
                            filterString += ` grayscale(${thresholdAmount}) contrast(${1 + thresholdAmount * 3})`;
                        }
                        
                        documentImage.style.filter = filterString;
                        
                        // Store the current filter
                        currentFilter = 'custom';
                        
                        showAlert('Custom filter applied to document', 'success');
                    }
    }
            
    // Store original image before showing modal
    const documentImage = document.getElementById('document-image');
    if (documentImage) {
        originalImage = documentImage.src;
        
        // Set the preview image source to the original image
        const previewImage = document.getElementById('filter-preview-image');
        if (previewImage) {
            previewImage.src = originalImage;
            previewImage.style.filter = 'none'; // Reset any filters
        }
    }
    
    // Show the modal
    const modalElement = document.getElementById('filter-modal');
    const filterModal = new bootstrap.Modal(modalElement);
    filterModal.show();

}

/**
 * Preview a filter on the preview image
 * Applies different OpenCV-like effects using CSS and canvas operations
 */
function previewFilter(filter) {
    const previewImage = document.getElementById('filter-preview-image');
    if (!previewImage) return;
    
    // Reset filter first
    previewImage.style.filter = 'none';
    
    // Apply selected filter
    currentFilter = filter;
    
    switch (filter) {
        case 'none':
            // No filter
            break;
        case 'grayscale':
            previewImage.style.filter = 'grayscale(100%)';
            break;
        case 'bw':
            previewImage.style.filter = 'grayscale(100%) contrast(1.5) brightness(1.2)';
            break;
        case 'enhance':
            previewImage.style.filter = 'contrast(1.2) brightness(1.1) saturate(1.1)';
            break;
        case 'sharpen':
            // Simulate sharpening by increasing contrast and adjusting brightness
            previewImage.style.filter = 'contrast(1.3) brightness(1.05) saturate(0.9)';
            break;
        case 'contrast':
            previewImage.style.filter = 'contrast(1.8) brightness(0.9)';
            break;
        case 'vintage':
            previewImage.style.filter = 'sepia(60%) contrast(1.1) brightness(0.9) saturate(0.8)';
            break;
        case 'cool':
            previewImage.style.filter = 'saturate(0.8) brightness(1.1) hue-rotate(20deg)';
            break;
        case 'warm':
            previewImage.style.filter = 'saturate(1.2) brightness(1.05) sepia(20%) hue-rotate(-10deg)';
            break;
        case 'scan':
            // Optimize for scanned documents - higher contrast, slightly desaturated
            previewImage.style.filter = 'grayscale(30%) contrast(1.4) brightness(1.1) saturate(0.9)';
            break;
        case 'receipt':
            // High contrast grayscale for receipts
            previewImage.style.filter = 'grayscale(90%) contrast(1.6) brightness(1.15)';
            break;
        case 'text':
            // Optimize for text documents
            previewImage.style.filter = 'contrast(1.4) brightness(1.1) grayscale(40%)';
            break;
        case 'photo':
            // Enhance photo colors and details
            previewImage.style.filter = 'contrast(1.15) brightness(1.05) saturate(1.2)';
            break;
        case 'handwriting':
            // Enhance handwriting visibility
            previewImage.style.filter = 'contrast(1.5) brightness(1.2) grayscale(15%)';
            break;
    }
    
    // Additional canvas-based effects could be applied here for more complex filters
    if (filter === 'sharpen' && previewImage.complete) {
        // For real sharpening, we'd use a canvas with convolution operations
        // This would require creating a temporary canvas
        applyCanvasSharpening(previewImage);
    }
}

/**
 * Apply advanced sharpening effect using canvas convolution
 * This simulates an unsharp mask filter similar to OpenCV's filter2D
 */
function applyCanvasSharpening(image) {
    // For performance reasons, only apply this when actually using the filter
    // The actual implementation would involve creating a temporary canvas,
    // applying a convolution kernel for sharpening, and updating the image
    
    // Note: This is a more advanced feature that requires significant processing
    // For now we use CSS approximation in the main filter application
    console.log('Canvas sharpening would be applied here in a full implementation');
}

/**
 * Apply the selected filter to the main document image
 */
function applySelectedFilter() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage) return;
    
    // Apply the filter to the main image
    switch (currentFilter) {
        case 'none':
            documentImage.style.filter = 'none';
            break;
        case 'grayscale':
            documentImage.style.filter = 'grayscale(100%)';
            break;
        case 'bw':
            documentImage.style.filter = 'grayscale(100%) contrast(1.5) brightness(1.2)';
            break;
        case 'enhance':
            documentImage.style.filter = 'contrast(1.2) brightness(1.1) saturate(1.1)';
            break;
        case 'sharpen':
            documentImage.style.filter = 'contrast(1.3) brightness(1.05) saturate(0.9)';
            break;
        case 'contrast':
            documentImage.style.filter = 'contrast(1.8) brightness(0.9)';
            break;
        case 'vintage':
            documentImage.style.filter = 'sepia(60%) contrast(1.1) brightness(0.9) saturate(0.8)';
            break;
        case 'cool':
            documentImage.style.filter = 'saturate(0.8) brightness(1.1) hue-rotate(20deg)';
            break;
        case 'warm':
            documentImage.style.filter = 'saturate(1.2) brightness(1.05) sepia(20%) hue-rotate(-10deg)';
            break;
        case 'scan':
            documentImage.style.filter = 'grayscale(30%) contrast(1.4) brightness(1.1) saturate(0.9)';
            break;
        case 'receipt':
            documentImage.style.filter = 'grayscale(90%) contrast(1.6) brightness(1.15)';
            break;
        case 'text':
            documentImage.style.filter = 'contrast(1.4) brightness(1.1) grayscale(40%)';
            break;
        case 'photo':
            documentImage.style.filter = 'contrast(1.15) brightness(1.05) saturate(1.2)';
            break;
        case 'handwriting':
            documentImage.style.filter = 'contrast(1.5) brightness(1.2) grayscale(15%)';
            break;
    }
    
    // For sharpen, we would apply canvas-based sharpening
    if (currentFilter === 'sharpen' && documentImage.complete) {
        // In a full implementation, we'd use canvas-based sharpening
        // applyCanvasSharpening(documentImage);
        
        // Store the processed image in cache
        cacheProcessedImage(documentImage.src, currentFilter);
    }
    
    showAlert(`Applied '${getFilterName(currentFilter)}' filter to ${isPhotoDocument() ? 'photo' : 'document'}`, 'success');
}

/**
 * Cache processed images to avoid reprocessing
 */
function cacheProcessedImage(src, filter) {
    if (!imageCache[src]) {
        imageCache[src] = {};
    }
    imageCache[src][filter] = true;
}

// Helper function to determine if current document is a photo (no text)
function isPhotoDocument() {
    const textElement = document.getElementById('document-text');
    return textElement && (textElement.textContent.trim() === 'No text extracted.' || textElement.textContent.trim() === '');
}

/**
 * Get human-readable filter name
 */
function getFilterName(filter) {
    switch (filter) {
        case 'none': return 'Original';
        case 'grayscale': return 'Grayscale';
        case 'bw': return 'Black & White';
        case 'enhance': return 'Enhanced';
        case 'sharpen': return 'Sharpen';
        case 'contrast': return 'High Contrast';
        case 'vintage': return 'Vintage';
        case 'cool': return 'Cool Tone';
        case 'warm': return 'Warm Tone';
        case 'scan': return 'Scanned Document';
        case 'receipt': return 'Receipt';
        case 'text': return 'Text Document';
        case 'photo': return 'Photo';
        case 'handwriting': return 'Handwriting';
        case 'custom': return 'Custom';
        default: return filter.charAt(0).toUpperCase() + filter.slice(1);
    }
}  



function enableCropMode() {
    console.log("enableCropMode called. Current state of cropModalInstance:", cropModalInstance);

    if (typeof bootstrap === 'undefined' || typeof Cropper === 'undefined') {
        showAlert('Essential libraries (Bootstrap or Cropper.js) are missing.', 'danger');
        console.error('Bootstrap or Cropper.js is undefined.');
        return;
    }
    if (!mainImageElement || !mainImageElement.src || mainImageElement.src.endsWith('#')) {
        showAlert('Please upload an image first to crop.', 'warning');
        return;
    }

    preCropImageSrcForModal = mainImageElement.src;

    let cropModalElement = document.getElementById('crop-modal');

    if (!cropModalElement) {
        console.log("Crop modal element #crop-modal not found. Creating it.");
        cropModalElement = document.createElement('div');
        cropModalElement.id = 'crop-modal';
        cropModalElement.className = 'modal fade';
        cropModalElement.tabIndex = '-1';
        cropModalElement.setAttribute('aria-labelledby', 'cropModalLabel');
        cropModalElement.setAttribute('aria-hidden', 'true');

        cropModalElement.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="cropModalLabel">Document Crop Tool</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3 bg-light" style="min-height: 300px; display: flex; align-items: center; justify-content: center;">
                        <img id="modal-crop-image" src="#" alt="Image to crop" style="max-width: 100%; max-height: 70vh; display: block; opacity: 0;">
                    </div>
                    <div class="alert alert-info mt-3 small d-none" id="crop-tool-info">
                        <i class="fas fa-info-circle me-1"></i> Drag to create a new crop box or adjust the existing one. Use scroll wheel to zoom.
                    </div>
                    <div class="crop-controls mt-3 d-flex justify-content-start gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-secondary" id="modal-reset-crop">
                            <i class="fas fa-undo me-1"></i> Reset Crop
                        </button>
                        <div class="btn-group ms-auto">
                             <button class="btn btn-sm btn-outline-secondary" id="modal-rotate-left-crop" title="Rotate Left">
                                 <i class="fas fa-rotate-left"></i>
                             </button>
                             <button class="btn btn-sm btn-outline-secondary" id="modal-rotate-right-crop" title="Rotate Right">
                                 <i class="fas fa-rotate-right"></i>
                             </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="modal-cancel-crop-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="modal-apply-crop-btn">
                        <i class="fas fa-crop-alt me-1"></i> Apply Crop
                    </button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(cropModalElement);

        // Attach event listeners for modal and buttons *once* after creation
        cropModalElement.addEventListener('shown.bs.modal', initializeCropperInModal);
        cropModalElement.addEventListener('hidden.bs.modal', destroyCropperInModal);
        document.getElementById('modal-apply-crop-btn').addEventListener('click', applyCropFromModal);
        document.getElementById('modal-reset-crop').addEventListener('click', () => currentModalCropper?.reset());
        document.getElementById('modal-rotate-left-crop').addEventListener('click', () => currentModalCropper?.rotate(-90));
        document.getElementById('modal-rotate-right-crop').addEventListener('click', () => currentModalCropper?.rotate(90));
        document.getElementById('modal-auto-detect-button').addEventListener('click', runAutoDetectInModal);
        // Note: modal-cancel-crop-btn uses data-bs-dismiss, so no explicit JS needed unless you want to do more on cancel.
    }

    // Ensure the modal instance is (re)initialized if needed
    if (!cropModalInstance || (cropModalInstance && cropModalInstance._element !== cropModalElement)) {
        console.log("Initializing or re-initializing Bootstrap modal instance for #crop-modal.");
        cropModalInstance = new bootstrap.Modal(cropModalElement); // This line assigns to the global cropModalInstance
    }

    // Set the image source for the modal's image tag
    const modalCropImage = document.getElementById('modal-crop-image');
    if (modalCropImage) {
        // Make image visible once src is set and Cropper.js is about to initialize
        modalCropImage.style.opacity = '0'; // Hide while loading src
        modalCropImage.onload = () => {
           modalCropImage.style.opacity = '1'; // Show when loaded
           document.getElementById('crop-tool-info').classList.remove('d-none');
        }
        modalCropImage.onerror = () => {
            showAlert('Failed to load image into crop tool.', 'danger');
            modalCropImage.style.opacity = '1'; // Show even on error to see placeholder
        }
        modalCropImage.src = mainImageElement.src;
    } else {
        console.error("#modal-crop-image element not found within the modal!");
        showAlert("Critical Error: Crop tool's image area is missing.", "danger");
        return;
    }

    // Show the modal
    if (cropModalInstance) {
        console.log("Attempting to show crop modal.");
        cropModalInstance.show(); // This is likely where your line 840 is.
    } else {
        console.error("cropModalInstance is null or invalid. Cannot show modal.");
        showAlert("Error: Could not prepare the crop tool interface.", "danger");
    }
}

function initializeCropperInModal() {
    const modalCropImage = document.getElementById('modal-crop-image');
    if (currentModalCropper) {
        currentModalCropper.destroy();
    }
    currentModalCropper = new Cropper(modalCropImage, {
        viewMode: 1,        // No restriction on crop box
        dragMode: 'crop',   // Create new crop box by dragging
        autoCropArea: 0.8,  // Default crop area size
        responsive: true,
        checkCrossOrigin: false, // Important for data URLs or if image source might be different
        background: true,   // Show checkerboard
        // aspectRatio: 16 / 9, // Optional: enforce aspect ratio
        ready: function () {
            console.log('Cropper in modal is ready.');
            // If auto-detected corners are available from a previous step, you could set data here
            // For example, if `detectedModalCorners` were set by an earlier global auto-detect:
            // if (detectedModalCorners) { setCropperDataFromCorners(detectedModalCorners); }
        }
    });
}

function destroyCropperInModal() {
    if (currentModalCropper) {
        currentModalCropper.destroy();
        currentModalCropper = null;
    }
    detectedModalCorners = null; // Reset detected corners for the modal context
    console.log('Cropper in modal destroyed.');
}

function applyCropFromModal() {
    if (!currentModalCropper) {
        showAlert('Cropper not initialized.', 'warning');
        return;
    }
    try {
        const croppedCanvas = currentModalCropper.getCroppedCanvas({
            // You can specify output options here if needed
            // fillColor: '#fff', // If original image has transparency and you want a bg
            // imageSmoothingEnabled: true,
            // imageSmoothingQuality: 'high',
        });

        if (croppedCanvas) {
            mainImageElement.src = croppedCanvas.toDataURL('image/png');
            // If you have a global 'originalImage' variable that tracks the base for filters:
            if (typeof originalImage !== 'undefined') {
                originalImage = mainImageElement.src;
            }
            showAlert('Crop applied successfully!', 'success');
        } else {
            showAlert('Could not get cropped canvas.', 'danger');
        }
    } catch (error) {
        console.error('Error applying crop from modal:', error);
        showAlert(`Error during crop: ${error.message}`, 'danger');
    } finally {
        if (cropModalInstance) {
            cropModalInstance.hide();
        }
    }
}


/**
 * Sets the Cropper.js crop box based on detected corners (their bounding box).
 */
function setCropperDataFromCorners(corners) {
    if (!currentModalCropper || !corners || corners.length !== 4) return;

    const xs = corners.map(p => p.x);
    const ys = corners.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const cropBoxData = {
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY
    };
    currentModalCropper.setData(cropBoxData);
}

/**
 * Enhance document with advanced processing
 * Improved with multi-stage enhancements using adaptive filters
 */
function enhanceDocument() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage) return;
    
    const documentId = window.location.pathname.split('/').pop();
    
    if (!documentId) {
        showAlert('Document ID not found', 'danger');
        return;
    }
            
    // Create a loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50';
    loadingOverlay.style.zIndex = '9999';
    loadingOverlay.innerHTML = `
                        <div class="card p-4">
                            <div class="d-flex align-items-center">
                                <div class="spinner-border text-primary me-3" role="status">
                                    <span class="visually
                                    <div class="spinner-border text-primary me-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div>
                        <h5 class="mb-1">Enhancing Document</h5>
                        <p class="mb-0 text-muted">Applying advanced image processing...</p>
                        <div class="progress mt-2" style="height: 6px;">
                            <div id="enhance-progress" class="progress-bar progress-bar-striped progress-bar-animated" 
                                    role="progressbar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);

    // Store original image for comparison
    const originalSrc = documentImage.src;

    // Create a canvas for more complex image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function() {
        // Set canvas dimensions to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Update progress
        updateEnhanceProgress(20);
        
        // Step 1: Basic normalization
        ctx.drawImage(img, 0, 0);
        
        // Apply initial contrast and brightness adjustments
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Analyze image to determine optimal enhancement approach
        const imageStats = analyzeImage(data, canvas.width, canvas.height);
        
        // Update progress
        updateEnhanceProgress(40);
        
        // Step 2: Apply adaptive enhancement based on image content
        if (imageStats.isDark) {
            // For dark images, increase brightness more
            documentImage.style.filter = 'contrast(1.3) brightness(1.2) saturate(0.9)';
        } else if (imageStats.isLowContrast) {
            // For low contrast images, boost contrast significantly
            documentImage.style.filter = 'contrast(1.5) brightness(1.05) saturate(0.95)';
        } else if (imageStats.hasText) {
            // For text-heavy documents, optimize for readability
            documentImage.style.filter = 'contrast(1.4) brightness(1.1) saturate(0.85) grayscale(0.2)';
        } else {
            // Default enhancement for general documents
            documentImage.style.filter = 'contrast(1.3) brightness(1.1) saturate(0.9)';
        }
        
        // Update progress
        updateEnhanceProgress(60);
        
        // Step 3: Additional CSS filters for sharpening
        setTimeout(() => {
            // Add sharpening effect (combination of contrast and minimal saturation)
            let currentFilter = documentImage.style.filter;
            documentImage.style.filter = `${currentFilter} saturate(0.95)`;
            
            // Update progress
            updateEnhanceProgress(80);
            
            // Step 4: Final adjustments and completion
            setTimeout(() => {
                // Add final touch with slight sepia for better readability
                currentFilter = documentImage.style.filter;
                documentImage.style.filter = `${currentFilter} sepia(0.1)`;
                
                // Update progress to complete
                updateEnhanceProgress(100);
                
                // Remove loading overlay after a small delay
                setTimeout(() => {
                    document.body.removeChild(loadingOverlay);
                    
                    // Add a processed class to the image
                    documentImage.classList.add('enhanced-document');
                    
                    // Show success message with option to revert
                    showEnhancementCompletedAlert(originalSrc);
                }, 400);
            }, 400);
        }, 400);
    };

    // Load the image
    img.src = documentImage.src;

    // Function to update progress bar
    function updateEnhanceProgress(percentage) {
        const progressBar = document.getElementById('enhance-progress');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    // Function to analyze image and determine optimal enhancement
    function analyzeImage(imageData, width, height) {
        let totalBrightness = 0;
        let pixelCount = 0;
        let histogram = new Array(256).fill(0);
        
        // Sample the image (every 4th pixel to improve performance)
        for (let i = 0; i < imageData.length; i += 16) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            
            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += luminance;
            
            // Update histogram
            histogram[Math.floor(luminance)]++;
            
            pixelCount++;
        }
        
        const avgBrightness = totalBrightness / pixelCount;
        
        // Calculate histogram spread (for contrast measurement)
        let minLum = 255;
        let maxLum = 0;
        for (let i = 0; i < 256; i++) {
            if (histogram[i] > pixelCount * 0.01) { // Ignore extreme outliers
                minLum = Math.min(minLum, i);
                maxLum = Math.max(maxLum, i);
            }
        }
        
        const contrastRange = maxLum - minLum;
        
        // Detect if image is likely text document by checking for bimodal histogram
        // (typically black text on white background creates two distinct peaks)
        const isBimodal = detectBimodalHistogram(histogram, pixelCount);
        
        return {
            isDark: avgBrightness < 100,
            isLowContrast: contrastRange < 100,
            hasText: isBimodal
        };
    } 

    // Helper function to detect bimodal histogram (common in text documents)
    function detectBimodalHistogram(histogram, totalPixels) {
        // Smooth the histogram
        const smoothed = new Array(256);
        for (let i = 2; i < 254; i++) {
            smoothed[i] = (histogram[i-2] + histogram[i-1] + histogram[i] + 
                          histogram[i+1] + histogram[i+2]) / 5;
        }
        
        // Count peaks (local maxima)
        let peakCount = 0;
        for (let i = 10; i < 246; i++) {
            if (smoothed[i] > smoothed[i-1] && 
                smoothed[i] > smoothed[i+1] && 
                smoothed[i] > totalPixels * 0.01) { // Ignore small peaks
                peakCount++;
            }
        }
        
        return peakCount >= 2; // Two or more significant peaks suggest text document
    }
    
    // Function to show completion alert with revert option
    function showEnhancementCompletedAlert(originalSrc) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div>
                    <strong><i class="fas fa-magic me-2"></i>Document enhanced!</strong>
                    <p class="mb-0 small">Applied intelligent image processing to improve document quality.</p>
                </div>
                <button type="button" class="btn btn-sm btn-outline-success ms-auto" id="revert-enhancement">
                    <i class="fas fa-undo me-1"></i> Revert
                </button>
                <button type="button" class="btn-close ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // Insert at top of container
        const container = document.querySelector('.container') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Add revert functionality
        const revertBtn = document.getElementById('revert-enhancement');
        if (revertBtn) {
            revertBtn.addEventListener('click', function() {
                const documentImage = document.getElementById('document-image');
                if (documentImage) {
                    documentImage.src = originalSrc;
                    documentImage.style.filter = 'none';
                    documentImage.classList.remove('enhanced-document');
                    alertDiv.remove();
                    showAlert('Reverted to original image', 'info');
                }
            });
        }
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }
        }, 10000);
    }
}


/**
 * Show loading indicator
 */
// UI Helper Functions
function showLoading(message) {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50';
    overlay.style.zIndex = '9999';
    
    overlay.innerHTML = `
        <div class="card p-4">
            <div class="d-flex align-items-center">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>
                    <h5 class="mb-1">${message || 'Loading...'}</h5>
                    <div class="progress mt-2" style="height: 6px; width: 200px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 100%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}


function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}
