function showAlert(message, type = 'info') {
    // Create alert container if it doesn't exist
    let alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }

    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    
    // Add icon based on type
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    alertDiv.innerHTML = `
        <span class="alert-icon">${iconMap[type] || iconMap.info}</span>
        <span class="alert-message">${message}</span>
    `;
    
    // Add to container
    alertContainer.appendChild(alertDiv);
    
    // Trigger animation
    setTimeout(() => {
        alertDiv.style.transform = 'translateX(0)';
        alertDiv.style.opacity = '1';
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.transform = 'translateX(100%)';
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 300);
        }
    }, 3000);
}

// Override default alert
window.alert = function(message) {
    showAlert(message, 'info');
};

// Add convenience methods
window.showSuccess = function(message) {
    showAlert(message, 'success');
};

window.showError = function(message) {
    showAlert(message, 'error');
};

window.showWarning = function(message) {
    showAlert(message, 'warning');
};

window.showInfo = function(message) {
    showAlert(message, 'info');
};
