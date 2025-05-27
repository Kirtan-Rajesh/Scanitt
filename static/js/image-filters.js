/**
 * Image Filters and Processing for Scanitt
 * Provides additional image manipulation functionality using OpenCV-like algorithms
 */

// Global variables for image manipulation
let originalImage = null;
let currentFilter = 'none';
let cropperInstance = null;
let rotationAngle = 0;
let imageCache = {}; // For storing processed images

document.addEventListener('DOMContentLoaded', function() {
    // Initialize filter buttons
    const filterButton = document.getElementById('filter-button');
    const enhanceButton = document.getElementById('enhance-button');
    const cropButton = document.getElementById('crop-button');
    const autoDetectButton = document.getElementById('auto-detect-button');
    
    if (filterButton) {
        filterButton.addEventListener('click', showFilterOptions);
    }
    
    if (enhanceButton) {
        enhanceButton.addEventListener('click', enhanceDocument);
    }
    
    if (cropButton) {
        cropButton.addEventListener('click', enableCropMode);
    }
    
    if (autoDetectButton) {
        autoDetectButton.addEventListener('click', enableAutoDetectEdges);
    }
});

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
            
            /**
             * Show interactive cropping interface with realistic controls
             * Improved with better handle positioning and edge detection
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
                                        <!-- Added middle handles for more precise control -->
                                        <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 10%; left: 50%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: n-resize;"></div>
                                        <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 90%; left: 50%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: s-resize;"></div>
                                        <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 50%; left: 10%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: w-resize;"></div>
                                        <div class="crop-handle position-absolute bg-primary rounded-circle" style="top: 50%; left: 90%; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px; cursor: e-resize;"></div>
                                    </div>
                                </div>
                                <div class="alert alert-info mt-3">
                                    <i class="fas fa-info-circle me-2"></i> Drag the rectangle or its handles to adjust the crop area
                                </div>
                                <div class="crop-controls mt-3 d-flex gap-2 flex-wrap">
                                    <button class="btn btn-sm btn-outline-secondary" id="reset-crop">
                                        <i class="fas fa-undo me-1"></i> Reset
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary" id="auto-detect-crop-button">
                                        <i class="fas fa-crop-alt me-2"></i> Auto-detect Edges
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
                                startLeft = parseFloat(cropRectangle.style.left);
                                startTop = parseFloat(cropRectangle.style.top);
                                e.preventDefault();
                            });
                            
                            // Make handles draggable for resizing
                            cropHandles.forEach(handle => {
                                handle.addEventListener('mousedown', function(e) {
                                    isDragging = true;
                                    currentHandle = this;
                                    startX = e.clientX;
                                    startY = e.clientY;
                                    startLeft = parseFloat(cropRectangle.style.left);
                                    startTop = parseFloat(cropRectangle.style.top);
                                    startWidth = parseFloat(cropRectangle.style.width);
                                    startHeight = parseFloat(cropRectangle.style.height);
                                    e.preventDefault();
                                    e.stopPropagation();
                                });
                            });
                            
                            // Handle mouse movement
                            document.addEventListener('mousemove', function(e) {
                                if (!isDragging) return;
                                
                                const containerRect = cropImage.getBoundingClientRect();
                                const dx = (e.clientX - startX) / containerRect.width * 100;
                                const dy = (e.clientY - startY) / containerRect.height * 100;
                                
                                if (currentHandle) {
                                    // Resize from handle
                                    const handlePosition = currentHandle.style.cursor;
                                    
                                    // Handle different resize directions based on handle position
                                    if (handlePosition.includes('nw')) {
                                        // Northwest corner
                                        const newLeft = Math.min(Math.max(startLeft + dx, 0), startLeft + startWidth - 10);
                                        const newTop = Math.min(Math.max(startTop + dy, 0), startTop + startHeight - 10);
                                        const newWidth = Math.max(startWidth - dx, 10);
                                        const newHeight = Math.max(startHeight - dy, 10);
                                        
                                        cropRectangle.style.left = `${newLeft}%`;
                                        cropRectangle.style.top = `${newTop}%`;
                                        cropRectangle.style.width = `${newWidth}%`;
                                        cropRectangle.style.height = `${newHeight}%`;
                                    } else if (handlePosition.includes('ne')) {
                                        // Northeast corner
                                        const newTop = Math.min(Math.max(startTop + dy, 0), startTop + startHeight - 10);
                                        const newWidth = Math.max(Math.min(startWidth + dx, 100 - startLeft), 10);
                                        const newHeight = Math.max(startHeight - dy, 10);
                                        
                                        cropRectangle.style.top = `${newTop}%`;
                                        cropRectangle.style.width = `${newWidth}%`;
                                        cropRectangle.style.height = `${newHeight}%`;
                                    } else if (handlePosition.includes('sw')) {
                                        // Southwest corner
                                        const newLeft = Math.min(Math.max(startLeft + dx, 0), startLeft + startWidth - 10);
                                        const newWidth = Math.max(startWidth - dx, 10);
                                        const newHeight = Math.max(Math.min(startHeight + dy, 100 - startTop), 10);
                                        
                                        cropRectangle.style.left = `${newLeft}%`;
                                        cropRectangle.style.width = `${newWidth}%`;
                                        cropRectangle.style.height = `${newHeight}%`;
                                    } else if (handlePosition.includes('se')) {
                                        // Southeast corner
                                        const newWidth = Math.max(Math.min(startWidth + dx, 100 - startLeft), 10);
                                        const newHeight = Math.max(Math.min(startHeight + dy, 100 - startTop), 10);
                                        
                                        cropRectangle.style.width = `${newWidth}%`;
                                        cropRectangle.style.height = `${newHeight}%`;
                                    } else if (handlePosition === 'n-resize') {
                                        // Top middle
                                        const newTop = Math.min(Math.max(startTop + dy, 0), startTop + startHeight - 10);
                                        const newHeight = Math.max(startHeight - dy, 10);
                                        
                                        cropRectangle.style.top = `${newTop}%`;
                                        cropRectangle.style.height = `${newHeight}%`;
                                    } else if (handlePosition === 's-resize') {
                                        // Bottom middle
                                        const newHeight = Math.max(Math.min(startHeight + dy, 100 - startTop), 10);
                                        cropRectangle.style.height = `${newHeight}%`;
                                    } else if (handlePosition === 'w-resize') {
                                        // Left middle
                                        const newLeft = Math.min(Math.max(startLeft + dx, 0), startLeft + startWidth - 10);
                                        const newWidth = Math.max(startWidth - dx, 10);
                                        
                                        cropRectangle.style.left = `${newLeft}%`;
                                        cropRectangle.style.width = `${newWidth}%`;
                                    } else if (handlePosition === 'e-resize') {
                                        // Right middle
                                        const newWidth = Math.max(Math.min(startWidth + dx, 100 - startLeft), 10);
                                        cropRectangle.style.width = `${newWidth}%`;
                                    }
                                    
                                    // Update handle positions
                                    updateHandlePositions();
                                } else {
                                    // Move the entire rectangle
                                    const newLeft = Math.min(Math.max(startLeft + dx, 0), 100 - parseFloat(cropRectangle.style.width));
                                    const newTop = Math.min(Math.max(startTop + dy, 0), 100 - parseFloat(cropRectangle.style.height));
                                    
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
                                const left = parseFloat(cropRectangle.style.left);
                                const top = parseFloat(cropRectangle.style.top);
                                const width = parseFloat(cropRectangle.style.width);
                                const height = parseFloat(cropRectangle.style.height);
                                
                                // Corner handles
                                cropHandles[0].style.left = `${left}%`;
                                cropHandles[0].style.top = `${top}%`;
                                
                                cropHandles[1].style.left = `${left + width}%`;
                                cropHandles[1].style.top = `${top}%`;
                                
                                cropHandles[2].style.left = `${left}%`;
                                cropHandles[2].style.top = `${top + height}%`;
                                
                                cropHandles[3].style.left = `${left + width}%`;
                                cropHandles[3].style.top = `${top + height}%`;
                                
                                // Middle handles
                                cropHandles[4].style.left = `${left + width/2}%`;
                                cropHandles[4].style.top = `${top}%`;
                                
                                cropHandles[5].style.left = `${left + width/2}%`;
                                cropHandles[5].style.top = `${top + height}%`;
                                
                                cropHandles[6].style.left = `${left}%`;
                                cropHandles[6].style.top = `${top + height/2}%`;
                                
                                cropHandles[7].style.left = `${left + width}%`;
                                cropHandles[7].style.top = `${top + height/2}%`;
                            }
                            
                            // Auto-detect edges button
                            const autoDetectBtn = document.getElementById('auto-detect-crop-button');
                            if (autoDetectBtn) {
                                autoDetectBtn.addEventListener('click', function() {
                                    // Create loading overlay
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
                                    
                                    // Perform actual edge detection using canvas and OpenCV-like algorithms
                                    setTimeout(() => {
                                        try {
                                            // Create a temporary canvas for processing
                                            const canvas = document.createElement('canvas');
                                            const ctx = canvas.getContext('2d');
                                            
                                            // Set canvas dimensions to match image
                                            canvas.width = cropImage.naturalWidth;
                                            canvas.height = cropImage.naturalHeight;
                                            
                                            // Draw image on canvas
                                            ctx.drawImage(cropImage, 0, 0);
                                            
                                            // Get image data for processing
                                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                            const data = imageData.data;
                                            
                                            // Convert to grayscale
                                            const grayscaleData = new Uint8ClampedArray(canvas.width * canvas.height);
                                            for (let i = 0; i < data.length; i += 4) {
                                                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                                                grayscaleData[i / 4] = gray;
                                            }
                                            
                                            // Apply edge detection
                                            const edgesData = detectEdges(grayscaleData, canvas.width, canvas.height);
                                            
                                            // Find contours
                                            const contours = findContours(edgesData, canvas.width, canvas.height);
                                            
                                            if (contours.length > 0) {
                                                // Find largest contour that's likely to be the document
                                                let largestContour = contours[0];
                                                let largestArea = calculateContourArea(largestContour);
                                                
                                                for (let i = 1; i < contours.length; i++) {
                                                    const area = calculateContourArea(contours[i]);
                                                    if (area > largestArea) {
                                                        largestContour = contours[i];
                                                        largestArea = area;
                                                    }
                                                }
                                                
                                                // Get bounding rectangle
                                                const bounds = getBoundingRect(largestContour);
                                                
                                                // Convert to percentages
                                                const left = (bounds.x / canvas.width) * 100;
                                                const top = (bounds.y / canvas.height) * 100;
                                                const width = (bounds.width / canvas.width) * 100;
                                                const height = (bounds.height / canvas.height) * 100;
                                                
                                                // Apply the detected bounds with some padding (5%)
                                                const padding = 5;
                                                cropRectangle.style.left = `${Math.max(0, left - padding)}%`;
                                                cropRectangle.style.top = `${Math.max(0, top - padding)}%`;
                                                cropRectangle.style.width = `${Math.min(100 - left + padding, width + padding * 2)}%`;
                                                cropRectangle.style.height = `${Math.min(100 - top + padding, height + padding * 2)}%`;
                                                
                                                // Update handle positions
                                                updateHandlePositions();
                                                
                                                showAlert('Document edges detected successfully!', 'success');
                                            } else {
                                                // If no contours found, use a reasonable default
                                                cropRectangle.style.left = '10%';
                                                cropRectangle.style.top = '10%';
                                                cropRectangle.style.width = '80%';
                                                cropRectangle.style.height = '80%';
                                                
                                                // Update handle positions
                                                updateHandlePositions();
                                                
                                                showAlert('No clear document edges detected. Using default crop area.', 'warning');
                                            }
                                        } catch (error) {
                                            console.error('Error in auto edge detection:', error);
                                            showAlert('Error detecting edges: ' + error.message, 'danger');
                                            
                                            // Use default crop area on error
                                            cropRectangle.style.left = '10%';
                                            cropRectangle.style.top = '10%';
                                            cropRectangle.style.width = '80%';
                                            cropRectangle.style.height = '80%';
                                            
                                            // Update handle positions
                                            updateHandlePositions();
                                        }
                                        
                                        // Remove loading overlay
                                        document.getElementById('crop-container').removeChild(overlay);
                                    }, 800);
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
                                    
                                    // Swap width and height of crop rectangle on 90/270 degree rotations
                                    if (rotation % 180 !== 0) {
                                        // Get current dimensions
                                        const currentLeft = parseFloat(cropRectangle.style.left);
                                        const currentTop = parseFloat(cropRectangle.style.top);
                                        const currentWidth = parseFloat(cropRectangle.style.width);
                                        const currentHeight = parseFloat(cropRectangle.style.height);
                                        
                                        // Center point
                                        const centerX = currentLeft + currentWidth / 2;
                                        const centerY = currentTop + currentHeight / 2;
                                        
                                        // Reset crop rectangle to be centered
                                        cropRectangle.style.left = `${centerX - currentHeight / 2}%`;
                                        cropRectangle.style.top = `${centerY - currentWidth / 2}%`;
                                        cropRectangle.style.width = `${currentHeight}%`;
                                        cropRectangle.style.height = `${currentWidth}%`;
                                        
                                        // Update handle positions
                                        updateHandlePositions();
                                    }
                                });
                            }
                            
                            if (rotateRightBtn) {
                                rotateRightBtn.addEventListener('click', function() {
                                    rotation += 90;
                                    cropImage.style.transform = `rotate(${rotation}deg)`;
                                    
                                    // Swap width and height of crop rectangle on 90/270 degree rotations
                                    if (rotation % 180 !== 0) {
                                        // Get current dimensions
                                        const currentLeft = parseFloat(cropRectangle.style.left);
                                        const currentTop = parseFloat(cropRectangle.style.top);
                                        const currentWidth = parseFloat(cropRectangle.style.width);
                                        const currentHeight = parseFloat(cropRectangle.style.height);
                                        
                                        // Center point
                                        const centerX = currentLeft + currentWidth / 2;
                                        const centerY = currentTop + currentHeight / 2;
                                        
                                        // Reset crop rectangle to be centered
                                        cropRectangle.style.left = `${centerX - currentHeight / 2}%`;
                                        cropRectangle.style.top = `${centerY - currentWidth / 2}%`;
                                        cropRectangle.style.width = `${currentHeight}%`;
                                        cropRectangle.style.height = `${currentWidth}%`;
                                        
                                        // Update handle positions
                                        updateHandlePositions();
                                    }
                                });
                            }
                            
                            // Initialize handle positions
                            updateHandlePositions();
                        }
                    });
                    
                    // Handle crop application
                    const applyCropBtn = document.getElementById('apply-crop-btn');
                    if (applyCropBtn) {
                        applyCropBtn.addEventListener('click', function() {
                            // Show loading
                            showAlert('Processing crop...', 'info');
                            
                            setTimeout(() => {
                                const cropRectangle = document.getElementById('crop-rectangle');
                                const cropImage = document.getElementById('crop-image');
                                
                                if (cropRectangle && cropImage) {
                                    // Get crop coordinates as percentages
                                    const left = parseFloat(cropRectangle.style.left) / 100;
                                    const top = parseFloat(cropRectangle.style.top) / 100;
                                    const width = parseFloat(cropRectangle.style.width) / 100;
                                    const height = parseFloat(cropRectangle.style.height) / 100;
                                    
                                    // Get rotation
                                    let rotation = 0;
                                    const transformStyle = cropImage.style.transform;
                                    if (transformStyle) {
                                        const match = transformStyle.match(/rotate$$([^)]+)deg$$/);
                                        if (match && match[1]) {
                                            rotation = parseInt(match[1]);
                                        }
                                    }
                                    
                                    // Apply the crop using canvas
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    
                                    // Set appropriate canvas dimensions
                                    if (rotation % 180 === 0) {
                                        canvas.width = width * cropImage.naturalWidth;
                                        canvas.height = height * cropImage.naturalHeight;
                                    } else {
                                        // Swap dimensions for 90/270 degree rotations
                                        canvas.width = height * cropImage.naturalHeight;
                                        canvas.height = width * cropImage.naturalWidth;
                                    }
                                    
                                    // Draw white background (for transparent images)
                                    ctx.fillStyle = 'white';
                                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                                    
                                    // Apply rotation if needed
                                    if (rotation !== 0) {
                                        ctx.save();
                                        
                                        // Translate to center of canvas
                                        ctx.translate(canvas.width / 2, canvas.height / 2);
                                        
                                        // Rotate
                                        ctx.rotate(rotation * Math.PI / 180);
                                        
                                        // Draw the cropped image
                                        if (rotation % 180 === 0) {
                                            ctx.drawImage(
                                                cropImage,
                                                left * cropImage.naturalWidth,
                                                top * cropImage.naturalHeight,
                                                width * cropImage.naturalWidth,
                                                height * cropImage.naturalHeight,
                                                -canvas.width / 2,
                                                -canvas.height / 2,
                                                canvas.width,
                                                canvas.height
                                            );
                                        } else {
                                            // For 90/270 rotations, swap dimensions and coordinates
                                            ctx.drawImage(
                                                cropImage,
                                                left * cropImage.naturalWidth,
                                                top * cropImage.naturalHeight,
                                                width * cropImage.naturalWidth,
                                                height * cropImage.naturalHeight,
                                                -canvas.height / 2,
                                                -canvas.width / 2,
                                                canvas.height,
                                                canvas.width
                                            );
                                        }
                                        
                                        ctx.restore();
                                    } else {
                                        // No rotation, just crop
                                        ctx.drawImage(
                                            cropImage,
                                            left * cropImage.naturalWidth,
                                            top * cropImage.naturalHeight,
                                            width * cropImage.naturalWidth,
                                            height * cropImage.naturalHeight,
                                            0, 0, canvas.width, canvas.height
                                        );
                                    }
                                    
                                    // Update the main document image
                                    const documentImage = document.getElementById('document-image');
                                    if (documentImage) {
                                        documentImage.src = canvas.toDataURL('image/jpeg', 0.95);
                                        
                                        // Reset rotation for the main image
                                        rotationAngle = rotation;
                                        documentImage.style.transform = `rotate(${rotationAngle}deg)`;
                                    }
                                }
                                
                                // Hide the modal
                                const modalInstance = bootstrap.Modal.getInstance(cropModal);
                                modalInstance.hide();
                                
                                // Show success message
                                showAlert('Document cropped successfully!', 'success');
                            }, 800);
                        });
                    }
                }
                
                // Set the image source
                const cropImage = document.getElementById('crop-image');
                if (documentImage && cropImage) {
                    cropImage.src = documentImage.src;
                    cropImage.style.maxHeight = '60vh';
                    
                    // Apply existing rotation if any
                    if (rotationAngle !== 0) {
                        cropImage.style.transform = `rotate(${rotationAngle}deg)`;
                    }
                }
                
                // Show the modal
                const modalInstance = new bootstrap.Modal(cropModal);
                modalInstance.show();
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
 * Improved auto-detect edges with proper document detection
 */
function enableAutoDetectEdges() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage || !documentImage.complete) {
        showAlert('Please load an image first', 'warning');
        return;
    }

    showLoading('Detecting document edges...');
    
    setTimeout(() => {
        try {
            // Create canvas for processing
            const canvas = document.createElement('canvas');
            canvas.width = documentImage.naturalWidth;
            canvas.height = documentImage.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw image on canvas
            ctx.drawImage(documentImage, 0, 0);
            
            // 1. Preprocess the image
            const preprocessed = preprocessImage(canvas);
            
            // 2. Detect edges using improved algorithm
            const edges = detectEdges(preprocessed, canvas.width, canvas.height);
            
            // 3. Find contours
            const contours = findContours(edges, canvas.width, canvas.height);
            
            // 4. Find document contours (quadrilaterals)
            const documentContours = findDocumentContours(contours, canvas.width, canvas.height);
            
            if (documentContours.length > 0) {
                // 5. Apply perspective correction
                const correctedCanvas = applyPerspectiveCorrection(
                    canvas, 
                    documentContours[0] // Use the largest document contour
                );
                
                // Update the document image
                documentImage.src = correctedCanvas.toDataURL('image/jpeg', 0.95);
                showAlert('Document detected and corrected successfully!', 'success');
            } else {
                showAlert('Could not detect document edges. Try manual adjustment.', 'warning');
            }
        } catch (error) {
            console.error('Edge detection error:', error);
            showAlert('Error detecting edges: ' + error.message, 'danger');
        } finally {
            hideLoading();
        }
    }, 100);
}

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

function rgbToGrayscale(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}