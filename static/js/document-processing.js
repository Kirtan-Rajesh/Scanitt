/**
 * Document Processing JavaScript
 * Handles client-side document processing features.
 */

// DOM elements and state variables
let currentDocument = null;
let imageRotation = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Document viewer controls
    setupDocumentViewer();
    
    // Export functionality
    setupExportOptions();
    
    // Image preview for upload
    setupImagePreview();
});

/**
 * Configure the document viewer UI controls
 */
function setupDocumentViewer() {
    const rotateLeftButton = document.getElementById('rotate-left');
    const rotateRightButton = document.getElementById('rotate-right');
    const resetButton = document.getElementById('reset-view');
    const fullscreenButton = document.getElementById('fullscreen');
    const documentImage = document.getElementById('document-image');
    
    if (rotateLeftButton) {
        rotateLeftButton.addEventListener('click', () => {
            imageRotation -= 90;
            if (imageRotation < 0) imageRotation += 360;
            updateDocumentTransform();
        });
    }
    
    if (rotateRightButton) {
        rotateRightButton.addEventListener('click', () => {
            imageRotation = (imageRotation + 90) % 360;
            updateDocumentTransform();
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            imageRotation = 0;
            currentZoom = 1;
            updateDocumentTransform();
        });
    }
    
    if (fullscreenButton && documentImage) {
        fullscreenButton.addEventListener('click', () => {
            if (documentImage.requestFullscreen) {
                documentImage.requestFullscreen();
            } else if (documentImage.webkitRequestFullscreen) {
                documentImage.webkitRequestFullscreen();
            } else if (documentImage.msRequestFullscreen) {
                documentImage.msRequestFullscreen();
            }
        });
    }
}

/**
 * Update the document image transform (rotation, zoom)
 */
function updateDocumentTransform() {
    const documentImage = document.getElementById('document-image');
    if (!documentImage) return;
    
    documentImage.style.transform = `rotate(${imageRotation}deg) scale(${currentZoom})`;
}

/**
 * Configure export options functionality
 */
function setupExportOptions() {
    const exportPdfButton = document.getElementById('export-pdf');
    const exportImageButton = document.getElementById('export-image');
    const exportTextButton = document.getElementById('export-text');
    
    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => {
            if (!currentDocument) {
                showAlert('No document available to export', 'warning');
                return;
            }
            
            // In a production app, this would call a server endpoint to generate a PDF
            // For this prototype, we'll simulate it with a download
            showAlert('PDF export functionality would be implemented here', 'info');
        });
    }
    
    if (exportImageButton) {
        exportImageButton.addEventListener('click', () => {
            const documentImage = document.getElementById('document-image');
            if (!documentImage || !documentImage.src) {
                showAlert('No document image available to export', 'warning');
                return;
            }
            
            // Create a temporary link to download the image
            const link = document.createElement('a');
            link.href = documentImage.src;
            link.download = 'scanned-document.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    
    if (exportTextButton) {
        exportTextButton.addEventListener('click', () => {
            const documentText = document.getElementById('document-text');
            if (!documentText || !documentText.textContent) {
                showAlert('No text available to export', 'warning');
                return;
            }
            
            // Create a blob and download link for the text
            const textBlob = new Blob([documentText.textContent], { type: 'text/plain' });
            const textUrl = URL.createObjectURL(textBlob);
            
            const link = document.createElement('a');
            link.href = textUrl;
            link.download = 'document-text.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(textUrl);
        });
    }
}

/**
 * Set up image preview for the upload form
 */
function setupImagePreview() {
    const fileInput = document.getElementById('document-file');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');
    
    if (fileInput && previewContainer && previewImage) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            
            if (file) {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    previewImage.src = e.target.result;
                    previewContainer.classList.remove('d-none');
                };
                
                reader.readAsDataURL(file);
            } else {
                previewContainer.classList.add('d-none');
            }
        });
    }
}

/**
 * Toggle between text and image view
 */
function toggleDocumentView(view) {
    const imageView = document.getElementById('image-view');
    const textView = document.getElementById('text-view');
    const imageTab = document.getElementById('image-tab');
    const textTab = document.getElementById('text-tab');
    
    if (view === 'text') {
        imageView.classList.add('d-none');
        textView.classList.remove('d-none');
        imageTab.classList.remove('active');
        textTab.classList.add('active');
    } else {
        textView.classList.add('d-none');
        imageView.classList.remove('d-none');
        textTab.classList.remove('active');
        imageTab.classList.add('active');
    }
}
