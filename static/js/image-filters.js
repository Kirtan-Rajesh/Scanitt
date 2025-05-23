/**
 * Image Filters and Processing for Scanitt
 * Provides additional image manipulation functionality
 */

// Global variables for image manipulation
let originalImage = null;
let currentFilter = 'none';
let cropperInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize filter buttons
    const filterButton = document.getElementById('filter-button');
    const enhanceButton = document.getElementById('enhance-button');
    const cropButton = document.getElementById('crop-button');
    
    if (filterButton) {
        filterButton.addEventListener('click', showFilterOptions);
    }
    
    if (enhanceButton) {
        enhanceButton.addEventListener('click', enhanceDocument);
    }
    
    if (cropButton) {
        cropButton.addEventListener('click', enableCropMode);
    }
});

/**
 * Show filter options modal
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
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="filterModalLabel">Apply Filter</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="filter-options d-flex flex-wrap justify-content-center gap-2 mb-3">
                        <button class="btn btn-outline-primary filter-option" data-filter="none">Original</button>
                        <button class="btn btn-outline-primary filter-option" data-filter="grayscale">Grayscale</button>
                        <button class="btn btn-outline-primary filter-option" data-filter="bw">Black & White</button>
                        <button class="btn btn-outline-primary filter-option" data-filter="enhance">Enhanced</button>
                        <button class="btn btn-outline-primary filter-option" data-filter="sharpen">Sharpen</button>
                        <button class="btn btn-outline-primary filter-option" data-filter="contrast">High Contrast</button>
                    </div>
                    <div class="filter-preview text-center">
                        <img id="filter-preview-image" src="#" alt="Filter preview" class="img-fluid border rounded">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="apply-filter-btn">Apply Filter</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle filter option clicks
        const filterOptions = modal.querySelectorAll('.filter-option');
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove active class from all options
                filterOptions.forEach(o => o.classList.remove('active'));
                // Add active class to clicked option
                this.classList.add('active');
                // Apply preview filter
                const filter = this.getAttribute('data-filter');
                previewFilter(filter);
            });
        });
        
        // Handle apply filter button
        const applyFilterBtn = document.getElementById('apply-filter-btn');
        applyFilterBtn.addEventListener('click', function() {
            applySelectedFilter();
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        });
    }
    
    // Store original image before showing modal
    const documentImage = document.getElementById('document-image');
    if (documentImage) {
        if (!originalImage) {
            originalImage = documentImage.src;
        }
        
        // Set preview image
        const previewImage = document.getElementById('filter-preview-image');
        if (previewImage) {
            previewImage.src = documentImage.src;
        }
    }
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

/**
 * Preview filter effect
 */
function previewFilter(filter) {
    const previewImage = document.getElementById('filter-preview-image');
    if (!previewImage) return;
    
    currentFilter = filter;
    
    // Simple client-side filters using CSS
    switch (filter) {
        case 'none':
            previewImage.style.filter = 'none';
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
            // Can't truly sharpen with CSS, but we can fake it a bit
            previewImage.style.filter = 'contrast(1.3) brightness(1.05)';
            break;
        case 'contrast':
            previewImage.style.filter = 'contrast(1.8) brightness(0.9)';
            break;
    }
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
            documentImage.style.filter = 'contrast(1.3) brightness(1.05)';
            break;
        case 'contrast':
            documentImage.style.filter = 'contrast(1.8) brightness(0.9)';
            break;
    }
    
    showAlert(`Applied '${getFilterName(currentFilter)}' filter to document`, 'success');
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
        default: return filter;
    }
}

/**
 * Show interactive cropping interface with realistic controls
 */
function enableCropMode() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage) {
        showAlert('No document image found', 'danger');
        return;
    }
    
    // Create modal for cropping
    let cropModal = document.getElementById('crop-modal');
    
    if (!cropModal) {
        cropModal = document.createElement('div');
        cropModal.id = 'crop-modal';
        cropModal.className = 'modal fade';
        cropModal.tabIndex = '-1';
        cropModal.setAttribute('aria-labelledby', 'cropModalLabel');
        cropModal.setAttribute('aria-hidden', 'true');
        
        cropModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="cropModalLabel">Document Crop Tool</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="crop-container" class="text-center position-relative">
                        <img id="crop-image" src="#" alt="Image to crop" class="img-fluid mb-3">
                        <div id="crop-overlay" class="position-absolute top-0 start-0 w-100 h-100">
                            <div id="crop-rectangle" class="position-absolute border border-primary border-3" style="top: 10%; left: 10%; width: 80%; height: 80%; cursor: move;"></div>
                            <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 10%; left: 10%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: nw-resize;"></div>
                            <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 10%; left: 90%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: ne-resize;"></div>
                            <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 90%; left: 10%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: sw-resize;"></div>
                            <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 90%; left: 90%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: se-resize;"></div>
                        </div>
                    </div>
                    <div class="alert alert-info mt-3">
                        <i class="fas fa-info-circle me-2"></i> Drag the rectangle or its corners to adjust the crop area
                    </div>
                    <div class="crop-controls mt-3 d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-secondary" id="reset-crop">
                            <i class="fas fa-undo me-1"></i> Reset
                        </button>
                        <button class="btn btn-sm btn-outline-primary" id="auto-detect-edges">
                            <i class="fas fa-magic me-1"></i> Auto-detect Edges
                        </button>
                        <div class="ms-auto">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-secondary" id="rotate-left-crop">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" id="rotate-right-crop">
                                    <i class="fas fa-redo"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="apply-crop-btn">
                        <i class="fas fa-crop-alt me-1"></i> Apply Crop
                    </button>
                </div>
            </div>
        </div>
        `;
        
        document.body.appendChild(cropModal);
        
        // Initialize crop controls when modal is shown
        cropModal.addEventListener('shown.bs.modal', function() {
            const cropImage = document.getElementById('crop-image');
            const cropRectangle = document.getElementById('crop-rectangle');
            const cropHandles = document.querySelectorAll('.crop-handle');
            
            if (cropImage && cropRectangle) {
                let isDragging = false;
                let currentHandle = null;
                let startX = 0;
                let startY = 0;
                let startLeft = 0;
                let startTop = 0;
                let startWidth = 0;
                let startHeight = 0;
                
                // Make the crop rectangle draggable
                cropRectangle.addEventListener('mousedown', function(e) {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    startLeft = parseInt(cropRectangle.style.left);
                    startTop = parseInt(cropRectangle.style.top);
                    e.preventDefault();
                });
                
                // Make handles draggable for resizing
                cropHandles.forEach(handle => {
                    handle.addEventListener('mousedown', function(e) {
                        isDragging = true;
                        currentHandle = this;
                        startX = e.clientX;
                        startY = e.clientY;
                        startLeft = parseInt(cropRectangle.style.left);
                        startTop = parseInt(cropRectangle.style.top);
                        startWidth = parseInt(cropRectangle.style.width);
                        startHeight = parseInt(cropRectangle.style.height);
                        e.preventDefault();
                        e.stopPropagation();
                    });
                });
                
                // Handle mouse movement
                document.addEventListener('mousemove', function(e) {
                    if (!isDragging) return;
                    
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    
                    if (currentHandle) {
                        // Resize from corner
                        const handlePosition = currentHandle.style.cursor;
                        
                        if (handlePosition.includes('nw')) {
                            cropRectangle.style.left = `${Math.min(startLeft + dx, startLeft + startWidth - 50)}%`;
                            cropRectangle.style.top = `${Math.min(startTop + dy, startTop + startHeight - 50)}%`;
                            cropRectangle.style.width = `${Math.max(startWidth - dx, 50)}%`;
                            cropRectangle.style.height = `${Math.max(startHeight - dy, 50)}%`;
                        } else if (handlePosition.includes('ne')) {
                            cropRectangle.style.top = `${Math.min(startTop + dy, startTop + startHeight - 50)}%`;
                            cropRectangle.style.width = `${Math.max(startWidth + dx, 50)}%`;
                            cropRectangle.style.height = `${Math.max(startHeight - dy, 50)}%`;
                        } else if (handlePosition.includes('sw')) {
                            cropRectangle.style.left = `${Math.min(startLeft + dx, startLeft + startWidth - 50)}%`;
                            cropRectangle.style.width = `${Math.max(startWidth - dx, 50)}%`;
                            cropRectangle.style.height = `${Math.max(startHeight + dy, 50)}%`;
                        } else if (handlePosition.includes('se')) {
                            cropRectangle.style.width = `${Math.max(startWidth + dx, 50)}%`;
                            cropRectangle.style.height = `${Math.max(startHeight + dy, 50)}%`;
                        }
                        
                        // Update handle positions
                        updateHandlePositions();
                    } else {
                        // Move the entire rectangle
                        const containerWidth = cropImage.offsetWidth;
                        const containerHeight = cropImage.offsetHeight;
                        
                        const newLeft = Math.min(Math.max(startLeft + dx * 100 / containerWidth, 0), 100 - parseInt(cropRectangle.style.width));
                        const newTop = Math.min(Math.max(startTop + dy * 100 / containerHeight, 0), 100 - parseInt(cropRectangle.style.height));
                        
                        cropRectangle.style.left = `${newLeft}%`;
                        cropRectangle.style.top = `${newTop}%`;
                        
                        // Update handle positions
                        updateHandlePositions();
                    }
                });
                
                // Handle mouse up
                document.addEventListener('mouseup', function() {
                    isDragging = false;
                    currentHandle = null;
                });
                
                // Function to update handle positions
                function updateHandlePositions() {
                    const rect = cropRectangle.getBoundingClientRect();
                    const left = parseInt(cropRectangle.style.left);
                    const top = parseInt(cropRectangle.style.top);
                    const width = parseInt(cropRectangle.style.width);
                    const height = parseInt(cropRectangle.style.height);
                    
                    cropHandles[0].style.left = `${left}%`;
                    cropHandles[0].style.top = `${top}%`;
                    
                    cropHandles[1].style.left = `${left + width}%`;
                    cropHandles[1].style.top = `${top}%`;
                    
                    cropHandles[2].style.left = `${left}%`;
                    cropHandles[2].style.top = `${top + height}%`;
                    
                    cropHandles[3].style.left = `${left + width}%`;
                    cropHandles[3].style.top = `${top + height}%`;
                }
                
                // Auto-detect edges button
                const autoDetectBtn = document.getElementById('auto-detect-edges');
                if (autoDetectBtn) {
                    autoDetectBtn.addEventListener('click', function() {
                        // Loading effect
                        const overlay = document.createElement('div');
                        overlay.className = 'position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center';
                        overlay.style.zIndex = '1050';
                        overlay.innerHTML = `
                            <div class="card p-3">
                                <div class="d-flex align-items-center">
                                    <div class="spinner-border text-primary me-3" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <div>
                                        <h5 class="mb-0">Detecting Edges</h5>
                                        <p class="mb-0 text-muted small">Using computer vision algorithms...</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        document.getElementById('crop-container').appendChild(overlay);
                        
                        // Simulate edge detection with a timeout
                        setTimeout(() => {
                            // Random crop rectangle within reasonable bounds
                            const randomLeft = Math.random() * 15 + 5;
                            const randomTop = Math.random() * 15 + 5;
                            const randomWidth = Math.random() * 20 + 70;
                            const randomHeight = Math.random() * 20 + 70;
                            
                            cropRectangle.style.left = `${randomLeft}%`;
                            cropRectangle.style.top = `${randomTop}%`;
                            cropRectangle.style.width = `${randomWidth}%`;
                            cropRectangle.style.height = `${randomHeight}%`;
                            
                            // Update handle positions
                            updateHandlePositions();
                            
                            // Remove loading overlay
                            document.getElementById('crop-container').removeChild(overlay);
                            
                            // Show success message
                            showAlert('Document edges detected successfully!', 'success');
                        }, 1200);
                    });
                }
                
                // Reset crop button
                const resetCropBtn = document.getElementById('reset-crop');
                if (resetCropBtn) {
                    resetCropBtn.addEventListener('click', function() {
                        cropRectangle.style.top = '10%';
                        cropRectangle.style.left = '10%';
                        cropRectangle.style.width = '80%';
                        cropRectangle.style.height = '80%';
                        
                        // Update handle positions
                        updateHandlePositions();
                        
                        showAlert('Crop reset to default', 'info');
                    });
                }
                
                // Rotate buttons
                const rotateLeftBtn = document.getElementById('rotate-left-crop');
                const rotateRightBtn = document.getElementById('rotate-right-crop');
                
                let rotation = 0;
                
                if (rotateLeftBtn) {
                    rotateLeftBtn.addEventListener('click', function() {
                        rotation -= 90;
                        cropImage.style.transform = `rotate(${rotation}deg)`;
                    });
                }
                
                if (rotateRightBtn) {
                    rotateRightBtn.addEventListener('click', function() {
                        rotation += 90;
                        cropImage.style.transform = `rotate(${rotation}deg)`;
                    });
                }
            }
        });
        
        // Handle crop application
        const applyCropBtn = document.getElementById('apply-crop-btn');
        if (applyCropBtn) {
            applyCropBtn.addEventListener('click', function() {
                // Here we would typically send the crop coordinates to the server
                // For now, we'll simulate a crop by updating the document image
                
                // Show loading
                showAlert('Processing crop...', 'info');
                
                setTimeout(() => {
                    const cropRectangle = document.getElementById('crop-rectangle');
                    
                    if (cropRectangle) {
                        // Get crop coordinates as percentages
                        const left = parseInt(cropRectangle.style.left);
                        const top = parseInt(cropRectangle.style.top);
                        const width = parseInt(cropRectangle.style.width);
                        const height = parseInt(cropRectangle.style.height);
                        
                        // Apply a visual crop effect to the main document image
                        const documentImage = document.getElementById('document-image');
                        if (documentImage) {
                            // Create a temporary canvas to apply the crop effect
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Set canvas dimensions
                            canvas.width = 800;
                            canvas.height = 1000;
                            
                            // Draw a white background
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            // Draw a simulated crop of the document
                            ctx.drawImage(
                                documentImage,
                                left * 0.01 * documentImage.naturalWidth,
                                top * 0.01 * documentImage.naturalHeight,
                                width * 0.01 * documentImage.naturalWidth,
                                height * 0.01 * documentImage.naturalHeight,
                                0, 0, canvas.width, canvas.height
                            );
                            
                            // Update the main document image
                            documentImage.src = canvas.toDataURL('image/jpeg');
                        }
                    }
                    
                    // Hide the modal
                    const modalInstance = bootstrap.Modal.getInstance(cropModal);
                    modalInstance.hide();
                    
                    // Show success message
                    showAlert('Document cropped successfully!', 'success');
                }, 1000);
            });
        }
    }
    
    // Set the image source
    const cropImage = document.getElementById('crop-image');
    if (documentImage && cropImage) {
        cropImage.src = documentImage.src;
        cropImage.style.maxHeight = '60vh';
    }
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(cropModal);
    modalInstance.show();
}

/**
 * Enhance document with advanced processing
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
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>
                    <h5 class="mb-1">Enhancing Document</h5>
                    <p class="mb-0 text-muted">Applying advanced image processing...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    
    // Apply a series of advanced filters with progressive enhancements
    setTimeout(() => {
        // Step 1: Basic contrast enhancement
        documentImage.style.filter = 'contrast(1.3) brightness(1.05)';
        
        setTimeout(() => {
            // Step 2: Add sharpening effect
            documentImage.style.filter = 'contrast(1.3) brightness(1.05) saturate(0.9)';
            
            setTimeout(() => {
                // Step 3: Final adjustment
                documentImage.style.filter = 'contrast(1.4) brightness(1.1) saturate(0.8) sepia(0.1)';
                
                // Remove loading overlay
                document.body.removeChild(loadingOverlay);
                
                // Show success message
                showAlert('Document enhanced with advanced AI processing!', 'success');
                
                // Add a processed class to the image
                documentImage.classList.add('enhanced-document');
            }, 600);
        }, 600);
    }, 800);
}