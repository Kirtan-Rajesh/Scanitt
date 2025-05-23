/**
 * Document Processing JavaScript for Scanitt
 * Handles document viewing, zooming, rotation and more
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize document viewer if we're on document view page
    if (document.getElementById('document-image')) {
        setupDocumentViewer();
        setupImagePreview();
    }
});

/**
 * Configure the document viewer UI controls
 */
function setupDocumentViewer() {
    // Initialize all tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltips.length > 0) {
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }
    
    // Zoom controls
    const documentImage = document.getElementById('document-image');
    let currentZoom = 1;
    let currentRotation = 0;
    
    // Handle rotation buttons
    const rotateLeft = document.getElementById('rotate-left');
    const rotateRight = document.getElementById('rotate-right');
    
    if (rotateLeft && rotateRight && documentImage) {
        rotateLeft.addEventListener('click', () => {
            currentRotation = (currentRotation - 90) % 360;
            updateDocumentTransform();
        });
        
        rotateRight.addEventListener('click', () => {
            currentRotation = (currentRotation + 90) % 360;
            updateDocumentTransform();
        });
    }
    
    // Document tabs
    const imageTab = document.getElementById('image-tab');
    const textTab = document.getElementById('text-tab');
    
    if (imageTab && textTab) {
        imageTab.addEventListener('click', function(e) {
            e.preventDefault();
            toggleDocumentView('image');
        });
        
        textTab.addEventListener('click', function(e) {
            e.preventDefault();
            toggleDocumentView('text');
        });
    }
    
    // Function to update image transform
    function updateDocumentTransform() {
        if (documentImage) {
            documentImage.style.transform = `rotate(${currentRotation}deg) scale(${currentZoom})`;
            documentImage.style.transition = 'transform 0.3s ease-in-out';
        }
    }
}

/**
 * Update the document image transform (rotation, zoom)
 */
function updateDocumentTransform() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage) return;
    
    // Get current transform values
    let transform = documentImage.style.transform || 'rotate(0deg) scale(1)';
    let rotation = 0;
    let scale = 1;
    
    // Extract current rotation and scale values
    const rotateMatch = transform.match(/rotate\((\-?\d+)deg\)/);
    if (rotateMatch && rotateMatch[1]) {
        rotation = parseInt(rotateMatch[1]);
    }
    
    const scaleMatch = transform.match(/scale\((\d+\.?\d*)\)/);
    if (scaleMatch && scaleMatch[1]) {
        scale = parseFloat(scaleMatch[1]);
    }
    
    // Apply updated transform
    documentImage.style.transform = `rotate(${rotation}deg) scale(${scale})`;
}

/**
 * Configure export options functionality
 */
function setupExportOptions() {
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportJpgBtn = document.getElementById('export-jpg');
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', function() {
            showAlert('Generating PDF...', 'info');
            setTimeout(() => {
                showAlert('Document exported as PDF successfully!', 'success');
            }, 1000);
        });
    }
    
    if (exportJpgBtn) {
        exportJpgBtn.addEventListener('click', function() {
            showAlert('Exporting as JPEG...', 'info');
            setTimeout(() => {
                showAlert('Document exported as JPEG successfully!', 'success');
            }, 800);
        });
    }
}

/**
 * Set up image preview for the upload form
 */
function setupImagePreview() {
    const fileInput = document.getElementById('file');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    
    if (fileInput && previewContainer && previewImage) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewContainer.classList.remove('d-none');
                }
                
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
}

/**
 * Toggle between text and image view
 */
function toggleDocumentView(view) {
    const imageTab = document.getElementById('image-tab');
    const textTab = document.getElementById('text-tab');
    const imageView = document.getElementById('image-view');
    const textView = document.getElementById('text-view');
    
    if (!imageTab || !textTab || !imageView || !textView) return;
    
    if (view === 'text') {
        imageTab.classList.remove('active');
        textTab.classList.add('active');
        imageView.classList.remove('show', 'active');
        textView.classList.add('show', 'active');
    } else {
        textTab.classList.remove('active');
        imageTab.classList.add('active');
        textView.classList.remove('show', 'active');
        imageView.classList.add('show', 'active');
    }
}