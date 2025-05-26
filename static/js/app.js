// Main application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // File upload handling
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }

    // Document deletion
    const deleteButtons = document.querySelectorAll('.delete-document');
    deleteButtons.forEach(button => {
        button.addEventListener('click', handleDeleteDocument);
    });

    // Document category update
    const categorySelects = document.querySelectorAll('.category-select');
    categorySelects.forEach(select => {
        select.addEventListener('change', handleCategoryChange);
    });

    // Initialize document viewer for enhanced viewing
    initDocumentViewer();
});

/**
 * Handle file upload with progress tracking and error handling
 */
function handleFileUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('document-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Please select a file to upload', 'warning');
        return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showAlert('Please upload a valid image file (JPEG or PNG)', 'warning');
        return;
    }

    // Show upload progress
    const progressBar = document.getElementById('upload-progress');
    const progressContainer = document.getElementById('progress-container');
    const statusText = document.getElementById('upload-status');
    
    progressContainer.classList.remove('d-none');
    statusText.textContent = 'Uploading document...';
    
    const formData = new FormData();
    formData.append('document', file);
    
    // Disable submit button
    const submitButton = document.getElementById('upload-button');
    submitButton.disabled = true;
    
    // Simulate progress for better user experience (actual progress events aren't reliable for small files)
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress >= 90) {
            clearInterval(progressInterval);
        }
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }, 300);
    
    // Send the file
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        
        if (data.success) {
            progressBar.style.width = '100%';
            progressBar.setAttribute('aria-valuenow', 100);
            statusText.textContent = 'Document processed successfully!';
            
            // Show success message
            showAlert('Document processed successfully!', 'success');
            
            // Reset form after successful upload
            uploadForm.reset();
            progressContainer.classList.add('d-none');
            submitButton.disabled = false;
            
            // Redirect to dashboard immediately
            window.location.href = '/dashboard';
        } else {
            showAlert(data.error || 'Error processing document', 'danger');
            progressContainer.classList.add('d-none');
            submitButton.disabled = false;
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        console.error('Upload error:', error);
        showAlert('Error uploading document. Please try again.', 'danger');
        progressContainer.classList.add('d-none');
        submitButton.disabled = false;
    });
}

/**
 * Display a processed document in the results area
 */
function showProcessedDocument(document) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;
    
    resultsContainer.classList.remove('d-none');
    
    const documentImage = document.getElementById('document-image');
    documentImage.src = document.processed_path;
    documentImage.alt = document.original_filename;
    
    const documentTitle = document.getElementById('document-title');
    documentTitle.textContent = document.original_filename;
    
    const documentCategory = document.getElementById('document-category');
    documentCategory.textContent = document.category;
    
    const documentSummary = document.getElementById('document-summary');
    documentSummary.textContent = document.summary;
    
    const documentText = document.getElementById('document-text');
    documentText.textContent = document.text;
    
    // Display tags
    const tagsContainer = document.getElementById('document-tags');
    tagsContainer.innerHTML = '';
    
    document.tags.forEach(tag => {
        const tagBadge = document.createElement('span');
        tagBadge.classList.add('badge', 'bg-secondary', 'me-1');
        tagBadge.textContent = tag;
        tagsContainer.appendChild(tagBadge);
    });
}

/**
 * Handle document deletion
 */
function handleDeleteDocument(event) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }
    
    const documentId = this.getAttribute('data-document-id');
    
    fetch(`/api/delete/${documentId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove the document from the UI
            const documentElement = document.getElementById(`document-${documentId}`);
            if (documentElement) {
                documentElement.remove();
            }
            
            showAlert('Document deleted successfully', 'success');
        } else {
            showAlert(data.error || 'Error deleting document', 'danger');
        }
    })
    .catch(error => {
        console.error('Delete error:', error);
        showAlert('Error deleting document. Please try again.', 'danger');
    });
}

/**
 * Handle category change for a document
 */
function handleCategoryChange(event) {
    const documentId = this.getAttribute('data-document-id');
    const newCategory = this.value;
    
    fetch(`/api/update-category/${documentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category: newCategory })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Category updated successfully', 'success');
        } else {
            showAlert(data.error || 'Error updating category', 'danger');
        }
    })
    .catch(error => {
        console.error('Update error:', error);
        showAlert('Error updating category. Please try again.', 'danger');
    });
}

/**
 * Initialize document viewer functionality
 */
function initDocumentViewer() {
    const viewerContainer = document.getElementById('document-viewer');
    if (!viewerContainer) return;
    
    // Add zoom functionality
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const documentImage = document.getElementById('document-image');
    
    let currentZoom = 1;
    
    if (zoomIn) {
        zoomIn.addEventListener('click', () => {
            currentZoom += 0.1;
            documentImage.style.transform = `scale(${currentZoom})`;
        });
    }
    
    if (zoomOut) {
        zoomOut.addEventListener('click', () => {
            currentZoom = Math.max(0.5, currentZoom - 0.1);
            documentImage.style.transform = `scale(${currentZoom})`;
        });
    }
}

/**
 * Show a Bootstrap alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.role = 'alert';
    
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 150);
    }, 5000);
}

// Create a form dynamically if needed
const uploadForm = document.createElement('form');
uploadForm.id = 'uploadForm';
uploadForm.enctype = 'multipart/form-data';
document.body.appendChild(uploadForm);
