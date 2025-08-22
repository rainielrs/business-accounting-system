document.addEventListener('DOMContentLoaded', function() {
    console.log('Settings page loaded, updating counts...');
    // Load counts immediately when page loads
    updateDataCounts();
    
    // Also refresh when page becomes visible (when user navigates to settings)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('Page became visible, updating counts...');
            updateDataCounts();
        }
    });
    
    // Listen for focus events to refresh when user returns to the page
    window.addEventListener('focus', function() {
        console.log('Page focused, updating counts...');
        updateDataCounts();
    });

    // Listen for custom event when navigating to settings
    window.addEventListener('settingsPageLoaded', function() {
        console.log('Settings page navigation detected, updating counts...');
        updateDataCounts();
    });

    // Listen for hash change events (if you're using hash-based routing)
    window.addEventListener('hashchange', function() {
        if (window.location.hash === '#settings' || window.location.pathname.includes('settings')) {
            console.log('Hash change to settings detected, updating counts...');
            updateDataCounts();
        }
    });
});

// Global function that can be called from anywhere in your app
window.refreshSettingsCounts = function() {
    console.log('Manual refresh of settings counts triggered...');
    updateDataCounts();
};

// Also run when the script loads (in case DOMContentLoaded already fired)
if (document.readyState === 'loading') {
    // Document is still loading
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(updateDataCounts, 100);
    });
} else {
    // Document has already loaded
    setTimeout(updateDataCounts, 100);
}

// Update all data counts on page load
async function updateDataCounts() {
    try {
        console.log('Starting updateDataCounts...');
        
        // Check if window.api is available
        if (!window.api) {
            console.log('API not available yet, retrying in 1 second...');
            setTimeout(updateDataCounts, 1000);
            return;
        }

        // Show loading state - check if elements exist first
        ['suppliers-count', 'customers-count', 'products-count', 'purchases-count', 'sales-count', 'returns-count', 'total-count'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '...';
                console.log(`Set ${id} to loading state`);
            } else {
                console.log(`Element ${id} not found`);
            }
        });

        // Check if getDataCounts method exists
        if (!window.api.getDataCounts) {
            console.log('getDataCounts method not found in API, using alternative method');
            // Try alternative approach - get individual counts
            await updateDataCountsAlternative();
            return;
        }

        // Get counts from the database via API
        console.log('Calling getDataCounts...');
        const counts = await window.api.getDataCounts();
        console.log('Received counts:', counts);

        // Update count displays - check if elements exist first
        const suppliersElement = document.getElementById('suppliers-count');
        const customersElement = document.getElementById('customers-count');
        const productsElement = document.getElementById('products-count');
        const purchasesElement = document.getElementById('purchases-count');
        const salesElement = document.getElementById('sales-count');
        const returnsElement = document.getElementById('returns-count');
        const totalElement = document.getElementById('total-count');

        if (suppliersElement) {
            suppliersElement.textContent = counts.suppliers || 0;
            console.log('Updated suppliers count to:', counts.suppliers || 0);
        }
        if (customersElement) {
            customersElement.textContent = counts.customers || 0;
            console.log('Updated customers count to:', counts.customers || 0);
        }
        if (productsElement) {
            productsElement.textContent = counts.supplier_products || 0;
            console.log('Updated products count to:', counts.supplier_products || 0);
        }
        if (purchasesElement) {
            purchasesElement.textContent = counts.inventory || 0;
            console.log('Updated purchases count to:', counts.inventory || 0);
        }
        if (salesElement) {
            salesElement.textContent = counts.customer_products || 0;
            console.log('Updated sales count to:', counts.customer_products || 0);
        }
        if (returnsElement) {
            returnsElement.textContent = counts.returns || 0;
            console.log('Updated returns count to:', counts.returns || 0);
        }
        if (totalElement) {
            totalElement.textContent = counts.total || 0;
            console.log('Updated total count to:', counts.total || 0);
        }

    } catch (error) {
        console.error('Error updating data counts:', error);
        // Try alternative approach
        await updateDataCountsAlternative();
    }
}

// Alternative method to get counts if getDataCounts doesn't exist
async function updateDataCountsAlternative() {
    try {
        console.log('Using alternative method to get counts...');
        
        // Get individual counts using existing API methods
        const promises = [];
        
        if (window.api.getSuppliers) {
            promises.push(window.api.getSuppliers());
        } else {
            promises.push(Promise.resolve([]));
        }
        
        if (window.api.getCustomers) {
            promises.push(window.api.getCustomers());
        } else {
            promises.push(Promise.resolve([]));
        }

        const [suppliers, customers] = await Promise.all(promises);

        const supplierCount = suppliers.length || 0;
        const customerCount = customers.length || 0;
        
        // Count unique products from suppliers
        const uniqueSupplierProducts = suppliers.reduce((acc, supplier) => {
            if (supplier.product_name && !acc.includes(supplier.product_name)) {
                acc.push(supplier.product_name);
            }
            return acc;
        }, []).length;

        // Count unique products from customers  
        const uniqueCustomerProducts = customers.reduce((acc, customer) => {
            if (customer.product_name && !acc.includes(customer.product_name)) {
                acc.push(customer.product_name);
            }
            return acc;
        }, []).length;

        const total = supplierCount + customerCount + uniqueSupplierProducts + uniqueCustomerProducts;

        // Update displays using the correct element IDs from your HTML
        const suppliersElement = document.getElementById('suppliers-count');
        const customersElement = document.getElementById('customers-count');
        const productsElement = document.getElementById('products-count');
        const purchasesElement = document.getElementById('purchases-count');
        const salesElement = document.getElementById('sales-count');
        const returnsElement = document.getElementById('returns-count');
        const totalElement = document.getElementById('total-count');

        if (suppliersElement) {
            suppliersElement.textContent = supplierCount;
            console.log('Alternative: Updated suppliers count to:', supplierCount);
        }
        if (customersElement) {
            customersElement.textContent = customerCount;
            console.log('Alternative: Updated customers count to:', customerCount);
        }
        if (productsElement) {
            productsElement.textContent = uniqueSupplierProducts;
            console.log('Alternative: Updated products count to:', uniqueSupplierProducts);
        }
        if (purchasesElement) {
            purchasesElement.textContent = 0;
            console.log('Alternative: Updated purchases count to: 0');
        }
        if (salesElement) {
            salesElement.textContent = uniqueCustomerProducts;
            console.log('Alternative: Updated sales count to:', uniqueCustomerProducts);
        }
        if (returnsElement) {
            returnsElement.textContent = 0;
            console.log('Alternative: Updated returns count to: 0');
        }
        if (totalElement) {
            totalElement.textContent = total;
            console.log('Alternative: Updated total count to:', total);
        }

        console.log('Alternative counts updated successfully:', {
            suppliers: supplierCount,
            customers: customerCount,
            products: uniqueSupplierProducts,
            sales: uniqueCustomerProducts,
            total
        });

    } catch (error) {
        console.error('Error in alternative count method:', error);
        // Fallback to showing 0s - check if elements exist first
        ['suppliers-count', 'customers-count', 'products-count', 'purchases-count', 'sales-count', 'returns-count', 'total-count'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '0';
                console.log(`Fallback: Set ${id} to 0`);
            }
        });
    }
}

// Add this function to handle reset confirmation
function showResetConfirmation() {
    const resetButton = document.querySelector('button[onclick="showResetConfirmation()"]');
    const confirmationDiv = document.getElementById('resetConfirmation');
    const confirmButton = confirmationDiv.querySelector('.btn-confirm');
    
    if (!resetButton || !confirmationDiv) return;

    // Hide the reset button and show confirmation buttons
    resetButton.style.display = 'none';
    confirmationDiv.style.display = 'flex';

    // Set up the confirm button with countdown
    confirmButton.disabled = true;
    confirmButton.style.opacity = '0.6';
    confirmButton.style.cursor = 'not-allowed';
    
    let countdown = 10;
    confirmButton.innerHTML = `<i class="fas fa-trash"></i> Confirm Reset (${countdown})`;

    // Update countdown every second
    const countdownTimer = setInterval(() => {
        countdown--;
        confirmButton.innerHTML = `<i class="fas fa-trash"></i> Confirm Reset (${countdown})`;
        
        if (countdown <= 0) {
            // Enable the button when countdown reaches 0
            confirmButton.disabled = false;
            confirmButton.style.opacity = '1';
            confirmButton.style.cursor = 'pointer';
            confirmButton.innerHTML = '<i class="fas fa-trash"></i> Confirm Reset';
            clearInterval(countdownTimer);
        }
    }, 1000);

    // Store the timer so it can be cleared if cancelled
    window.resetCountdownTimer = countdownTimer;
}

// Add this function to handle hiding the confirmation
function hideResetConfirmation() {
    const resetButton = document.querySelector('button[onclick="showResetConfirmation()"]');
    const confirmationDiv = document.getElementById('resetConfirmation');
    const confirmButton = confirmationDiv.querySelector('.btn-confirm');
    
    // Clear the countdown timer
    if (window.resetCountdownTimer) {
        clearInterval(window.resetCountdownTimer);
        window.resetCountdownTimer = null;
    }

    // Hide confirmation buttons and show reset button
    confirmationDiv.style.display = 'none';
    resetButton.style.display = 'inline-flex';

    // Reset the confirm button to its original state
    confirmButton.disabled = false;
    confirmButton.style.opacity = '1';
    confirmButton.style.cursor = 'pointer';
    confirmButton.innerHTML = '<i class="fas fa-trash"></i> Confirm Reset';
}

// Add this function to handle the actual reset
async function resetAllData() {
    const confirmButton = document.querySelector('.btn-confirm');
    
    // Don't proceed if button is disabled
    if (confirmButton.disabled) return;

    try {
        console.log('Starting data reset...');
        
        // Check if API is available
        if (!window.api) {
            console.error('API not available');
            showError('Error: API not available');
            return;
        }

        // Clear the countdown timer
        if (window.resetCountdownTimer) {
            clearInterval(window.resetCountdownTimer);
            window.resetCountdownTimer = null;
        }

        // Show loading state
        const confirmationDiv = document.getElementById('resetConfirmation');
        if (confirmationDiv) {
            confirmationDiv.innerHTML = '<span>Resetting...</span>';
        }

        // Call reset API methods if they exist
        if (window.api.resetAllData) {
            await window.api.resetAllData();
        } else {
            // If no single reset method, try individual resets
            const resetPromises = [];
            if (window.api.clearSuppliers) resetPromises.push(window.api.clearSuppliers());
            if (window.api.clearCustomers) resetPromises.push(window.api.clearCustomers());
            if (window.api.clearProducts) resetPromises.push(window.api.clearProducts());
            
            await Promise.all(resetPromises);
        }

        console.log('Data reset completed');
        showSuccess('All data has been reset successfully');
        
        // Refresh the counts
        updateDataCounts();

        // Restore original state after a delay
        setTimeout(() => {
            hideResetConfirmation();
        }, 2000);

    } catch (error) {
        console.error('Error resetting data:', error);
        showError('Error occurred while resetting data: ' + error.message);
        
        // Restore original state on error
        hideResetConfirmation();
    }
}

// Example usage in your settings:
function saveSettings() {
    try {
        // Your save logic here
        showSuccess('Settings saved successfully!');
    } catch (error) {
        showError('Failed to save settings: ' + error.message);
    }
}

function validateInput() {
    if (!isValid) {
        showWarning('Please check your input values');
        return false;
    }
    return true;
}