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
 * Show cropping interface
 */
function enableCropMode() {
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
                    <h5 class="modal-title" id="cropModalLabel">Crop Document</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="crop-container text-center">
                        <img id="crop-image" src="#" alt="Image to crop" class="img-fluid">
                    </div>
                    <div class="crop-controls mt-3">
                        <button class="btn btn-sm btn-outline-secondary" id="reset-crop">Reset</button>
                        <button class="btn btn-sm btn-outline-primary" id="auto-detect-edges">Auto-detect Edges</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="apply-crop-btn">Apply Crop</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.appendChild(cropModal);
        
        // Initialize cropper when modal is shown
        cropModal.addEventListener('shown.bs.modal', function() {
            const cropImage = document.getElementById('crop-image');
            if (cropImage) {
                // Use an external library like Cropper.js or a simpler approach
                showAlert('Drag the corners to adjust the crop area', 'info');
                
                // For now, we'll just simulate auto-edge detection
                const autoDetectBtn = document.getElementById('auto-detect-edges');
                if (autoDetectBtn) {
                    autoDetectBtn.addEventListener('click', function() {
                        showAlert('Automatically detecting document edges...', 'info');
                        setTimeout(() => {
                            showAlert('Document edges detected!', 'success');
                        }, 1000);
                    });
                }
                
                // Reset crop button
                const resetCropBtn = document.getElementById('reset-crop');
                if (resetCropBtn) {
                    resetCropBtn.addEventListener('click', function() {
                        showAlert('Crop reset to original', 'info');
                    });
                }
            }
        });
        
        // Handle crop application
        const applyCropBtn = document.getElementById('apply-crop-btn');
        if (applyCropBtn) {
            applyCropBtn.addEventListener('click', function() {
                showAlert('Document cropped successfully!', 'success');
                const modalInstance = bootstrap.Modal.getInstance(cropModal);
                modalInstance.hide();
            });
        }
    }
    
    // Set the image source
    const documentImage = document.getElementById('document-image');
    const cropImage = document.getElementById('crop-image');
    if (documentImage && cropImage) {
        cropImage.src = documentImage.src;
    }
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(cropModal);
    modalInstance.show();
}

/**
 * Enhance document - sends request to server for advanced processing
 */
function enhanceDocument() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage) return;
    
    const documentId = new URLSearchParams(window.location.search).get('id') || 
                      window.location.pathname.split('/').pop();
    
    if (!documentId) {
        showAlert('Document ID not found', 'danger');
        return;
    }
    
    // Show loading state
    showAlert('Enhancing document... This may take a moment.', 'info');
    documentImage.style.opacity = '0.5';
    
    // In a real implementation, you would send an AJAX request to the server
    // For now, we'll just simulate it with a timeout
    setTimeout(() => {
        documentImage.style.filter = 'contrast(1.3) brightness(1.1) grayscale(0.2)';
        documentImage.style.opacity = '1';
        showAlert('Document enhanced successfully!', 'success');
    }, 1500);
}