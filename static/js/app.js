/**
 * Scanitt - Main Application JavaScript
 * Handles common UI interactions and utilities
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips if available
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltips.length > 0) {
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }
});

/**
 * Show a Bootstrap alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
        alert.close();
    }, 5000);
}

/**
 * Initialize document viewer
 */
function initDocumentViewer() {
    // This function can be called from document.html
    console.log('Document viewer initialized');
}