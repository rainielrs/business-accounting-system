console.log('Inventory.js loaded');

// Guard against multiple declarations
if (typeof window.InventoryManager === 'undefined') {

class InventoryManager {
    constructor() {
        this.inventory = [];
        this.currentEditingId = null;
        this.currentReturnItem = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInventory();
        this.updateStats();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterInventory(e.target.value);
            });
        }

        // Filter functionality
        const filterSelect = document.querySelector('.filter-select');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterByStatus(e.target.value);
            });
        }

        // Add new item button
        const addItemBtn = document.querySelector('.btn-add-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                this.openModal();
            });
        }

        // Modal close functionality
        const modal = document.getElementById('inventoryModal');
        if (modal) {
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'block') {
                    this.closeModal();
                }
            });
        }

        // Form submission
        const form = document.getElementById('inventoryForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Payment status change
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus) {
            paymentStatus.addEventListener('change', () => this.toggleAmountPaidField());
        }

        // Auto-calculate on quantity/price change
        const quantityInput = document.getElementById('quantity');
        const priceInput = document.getElementById('price');
        if (quantityInput && priceInput) {
            quantityInput.addEventListener('input', () => this.calculateFullPayment());
            priceInput.addEventListener('input', () => this.calculateFullPayment());
        }
        
        // Return modal functionality
        const returnModal = document.getElementById('returnModal');
        if (returnModal) {
            // Close on overlay click
            returnModal.addEventListener('click', (e) => {
                if (e.target === returnModal) {
                    this.closeReturnModal();
                }
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && returnModal.style.display === 'block') {
                    this.closeReturnModal();
                }
            });
        }

        // Return form submission
        const returnForm = document.getElementById('inventoryReturnForm');
        if (returnForm) {
            returnForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReturn();
            });
        }
    }

    async loadInventory() {
        try {
            this.showLoading(true);
            // Use the inventory API endpoint instead of suppliers
            this.inventory = await window.api.getInventory();
            this.renderInventory();
            console.log('Inventory loaded:', this.inventory.length);
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showError('Failed to load inventory. Please check your connection and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async updateStats() {
        try {
            const stats = await window.api.getInventoryStats();
            
            const amountElement = document.querySelector('.inventory-card .amount');
            const itemsCountElement = document.querySelector('.inventory-card .items-count');
            
            if (amountElement) {
                // Use the total_value from stats which is sum of amount_paid
                const totalValue = parseFloat(stats.total_value || 0);
                amountElement.textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            
            if (itemsCountElement) {
                itemsCountElement.textContent = `Across ${stats.total_items || 0} items`;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
            // Fallback to manual calculation if API fails - use amount_paid instead of grand total
            const totalValue = this.inventory.reduce((sum, item) => {
                return sum + (item.amount_paid || 0);
            }, 0);
            
            const amountElement = document.querySelector('.inventory-card .amount');
            const itemsCountElement = document.querySelector('.inventory-card .items-count');
            
            if (amountElement) {
                amountElement.textContent = `${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            
            if (itemsCountElement) {
                itemsCountElement.textContent = `Across ${this.inventory.length} items`;
            }
        }
    }

    renderInventory(inventoryToRender = this.inventory) {
        const tbody = document.querySelector('.inventory-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (inventoryToRender.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 20px;">
                        No inventory items found.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort inventory by creation date (newest first)
        const sortedInventory = [...inventoryToRender].sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Descending order (newest first)
        });

        sortedInventory.forEach(item => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(item.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Calculate grand total
            const grandTotal = item.quantity * item.price;
            
            // Calculate outstanding amount - show 0 if negative (overpaid)
            const outstandingAmount = Math.max(0, grandTotal - (item.amount_paid || 0));
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${item.supplier_name || 'N/A'}</td>
                <td>${item.product_name || 'N/A'}</td>
                <td>${item.product_id || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>$${parseFloat(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${parseFloat(item.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn-payment" onclick="inventoryManager.makePayment(${item.id})" ${outstandingAmount <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-credit-card"></i>
                        ${outstandingAmount <= 0 ? 'Paid' : 'Pay'}
                    </button>
                </td>
                <td>
                    <button class="btn-return" onclick="inventoryManager.returnItem(${item.id})">
                        <i class="fas fa-undo"></i>Return
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async makePayment(itemId) {
        this.showInfo('This is the payment function - feature coming soon!');
    }

    async returnItem(itemId) {
        try {
            // Find the item in the inventory
            const item = this.inventory.find(inv => inv.id === itemId);
            if (!item) {
                this.showError('Item not found');
                return;
            }

            // Populate the return modal with item data
            this.populateReturnModal(item);
            
            // Show the return modal
            const modal = document.getElementById('returnModal');
            if (modal) {
                modal.style.display = 'block';
            }
        } catch (error) {
            console.error('Error opening return modal:', error);
            this.showError('Failed to open return modal');
        }
    }


    populateReturnModal(item) {
        // Populate item information
        document.getElementById('returnSupplierName').textContent = item.supplier_name || 'N/A';
        document.getElementById('returnProductName').textContent = item.product_name || 'N/A';
        document.getElementById('returnProductCode').textContent = item.product_id || 'N/A';
        document.getElementById('returnMaxQuantity').textContent = item.quantity || 0;
        document.getElementById('returnUnitPrice').textContent = parseFloat(item.price || 0).toFixed(2);

        // Set up form inputs
        const returnQuantityInput = document.getElementById('returnQuantity');
        const refundAmountInput = document.getElementById('refundAmount');
        
        if (returnQuantityInput) {
            returnQuantityInput.max = item.quantity;
            returnQuantityInput.value = '';
            returnQuantityInput.placeholder = `Max: ${item.quantity}`;
        }

        if (refundAmountInput) {
            refundAmountInput.value = '';
            // Set initial placeholder based on amount paid
            const amountPaid = parseFloat(item.amount_paid || 0);
            refundAmountInput.placeholder = `Max: $${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        // Reset form
        const form = document.getElementById('inventoryReturnForm');
        if (form) {
            form.reset();
        }

        // Store current item for submission
        this.currentReturnItem = item;
        
        // Set up validation event listeners
        this.setupReturnModalEventListeners();
    }

    setupReturnModalEventListeners() {
        const quantityInput = document.getElementById('returnQuantity');
        const refundAmountInput = document.getElementById('refundAmount');
        
        // Remove existing event listeners by cloning elements
        if (quantityInput) {
            const newQuantityInput = quantityInput.cloneNode(true);
            quantityInput.parentNode.replaceChild(newQuantityInput, quantityInput);
            
            newQuantityInput.addEventListener('input', () => {
                this.calculateReturnAmount();
                this.validateReturnQuantity();
                this.validateRefundAmount();
            });
        }
        
        if (refundAmountInput) {
            const newRefundAmountInput = refundAmountInput.cloneNode(true);
            refundAmountInput.parentNode.replaceChild(newRefundAmountInput, refundAmountInput);
            
            newRefundAmountInput.addEventListener('input', () => {
                this.validateRefundAmount();
            });
            
            newRefundAmountInput.addEventListener('blur', () => {
                this.validateRefundAmount();
            });
        }
    }

    calculateReturnAmount() {
        const quantityInput = document.getElementById('returnQuantity');
        const refundAmountInput = document.getElementById('refundAmount');
        
        if (!quantityInput || !refundAmountInput || !this.currentReturnItem) return;
        
        const quantity = parseInt(quantityInput.value) || 0;
        const unitPrice = parseFloat(this.currentReturnItem.price) || 0;
        const maxQuantity = parseInt(this.currentReturnItem.quantity) || 1;
        const amountPaid = parseFloat(this.currentReturnItem.amount_paid) || 0;
        
        // Calculate proportional refund based on what was actually paid
        const totalAmount = (quantity / maxQuantity) * amountPaid;
        
        // Auto-fill the refund amount but allow user to edit it
        refundAmountInput.value = totalAmount.toFixed(2);
    }

    validateRefundAmount() {
        const refundAmountInput = document.getElementById('refundAmount');
        const quantityInput = document.getElementById('returnQuantity');
        
        if (!refundAmountInput || !quantityInput || !this.currentReturnItem) return;
        
        const refundAmount = parseFloat(refundAmountInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 0;
        const maxQuantity = parseInt(this.currentReturnItem.quantity) || 1;
        const amountPaid = parseFloat(this.currentReturnItem.amount_paid) || 0;
        const maxRefund = (quantity / maxQuantity) * amountPaid;
        
        if (refundAmount < 0) {
            refundAmountInput.setCustomValidity('Refund amount cannot be negative');
            refundAmountInput.style.borderColor = '#e74c3c';
            refundAmountInput.style.backgroundColor = '#ffeaea';
        } else if (refundAmount > maxRefund && maxRefund > 0) {
            refundAmountInput.setCustomValidity(`Refund amount cannot exceed ${maxRefund.toFixed(2)} (proportional to amount paid)`);
            refundAmountInput.style.borderColor = '#e74c3c';
            refundAmountInput.style.backgroundColor = '#ffeaea';
        } else {
            refundAmountInput.setCustomValidity('');
            refundAmountInput.style.borderColor = '';
            refundAmountInput.style.backgroundColor = '';
        }
        
        // Update placeholder to show maximum
        if (maxRefund > 0) {
            refundAmountInput.placeholder = `Max: ${maxRefund.toFixed(2)}`;
        }
    }

    validateReturnQuantity() {
        const quantityInput = document.getElementById('returnQuantity');
        
        if (!quantityInput || !this.currentReturnItem) return;
        
        const quantity = parseInt(quantityInput.value) || 0;
        const maxQuantity = parseInt(this.currentReturnItem.quantity) || 0;
        
        if (quantity > maxQuantity) {
            quantityInput.setCustomValidity(`Maximum return quantity is ${maxQuantity}`);
            quantityInput.style.borderColor = '#e74c3c';
            quantityInput.style.backgroundColor = '#ffeaea';
        } else if (quantity <= 0) {
            quantityInput.setCustomValidity('Return quantity must be greater than 0');
            quantityInput.style.borderColor = '#e74c3c';
            quantityInput.style.backgroundColor = '#ffeaea';
        } else {
            quantityInput.setCustomValidity('');
            quantityInput.style.borderColor = '';
            quantityInput.style.backgroundColor = '';
        }
    }

    
closeReturnModal() {
    const modal = document.getElementById('returnModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear current return item
    this.currentReturnItem = null;
    
    // Reset form
    const form = document.getElementById('inventoryReturnForm');
    if (form) {
        form.reset();
    }
    
    // Reset validation styles
    const quantityInput = document.getElementById('returnQuantity');
    const refundAmountInput = document.getElementById('refundAmount');
    
    if (quantityInput) {
        quantityInput.style.borderColor = '';
        quantityInput.style.backgroundColor = '';
        quantityInput.setCustomValidity('');
    }
    
    if (refundAmountInput) {
        refundAmountInput.style.borderColor = '';
        refundAmountInput.style.backgroundColor = '';
        refundAmountInput.setCustomValidity('');
    }
}

    
async submitReturn() {
    try {
        if (!this.currentReturnItem) {
            this.showError('No item selected for return');
            return;
        }

        // Get form data
        const returnQuantity = parseInt(document.getElementById('returnQuantity').value);
        const refundAmount = parseFloat(document.getElementById('refundAmount').value);
        const returnReason = document.getElementById('returnReason').value;
        const returnNotes = document.getElementById('returnNotes').value;

        // Validate return quantity
        if (!returnQuantity || returnQuantity <= 0) {
            this.showError('Please enter a valid return quantity');
            return;
        }

        if (returnQuantity > this.currentReturnItem.quantity) {
            this.showError(`Return quantity cannot exceed available quantity (${this.currentReturnItem.quantity})`);
            return;
        }

        // Validate refund amount
        if (refundAmount < 0) {
            this.showError('Refund amount cannot be negative');
            return;
        }

        // Calculate maximum allowed refund amount based on what was paid
        const amountPaid = parseFloat(this.currentReturnItem.amount_paid || 0);
        const maxQuantity = parseInt(this.currentReturnItem.quantity);
        const maxRefundAmount = (returnQuantity / maxQuantity) * amountPaid;

        // Prevent submission if refund amount exceeds maximum
        if (refundAmount > maxRefundAmount) {
            this.showError(`Refund amount cannot exceed ${maxRefundAmount.toFixed(2)} (proportional to amount paid)`);
            return;
        }

        // Check form validity using HTML5 validation
        const quantityInput = document.getElementById('returnQuantity');
        const refundAmountInput = document.getElementById('refundAmount');
        
        if (!quantityInput.checkValidity()) {
            this.showError(quantityInput.validationMessage);
            return;
        }
        
        if (!refundAmountInput.checkValidity()) {
            this.showError(refundAmountInput.validationMessage);
            return;
        }

        // Prepare return data
        const returnData = {
            return_quantity: returnQuantity,
            refund_amount: refundAmount, // Use the custom refund amount
            return_reason: returnReason,
            return_notes: returnNotes,
            original_quantity: this.currentReturnItem.quantity,
            original_price: this.currentReturnItem.price,
            supplier_name: this.currentReturnItem.supplier_name,
            product_name: this.currentReturnItem.product_name,
            product_code: this.currentReturnItem.product_id
        };

        try {
            // Submit the return
            await window.api.processInventoryReturn(this.currentReturnItem.id, returnData);
            
            this.showSuccess('Return processed successfully!');
            this.closeReturnModal();
            await this.loadInventory();
            await this.updateStats();
            
        } catch (error) {
            console.error('Error processing return:', error);
            this.showError('Failed to process return. Please try again.');
        }

    } catch (error) {
        console.error('Error submitting return:', error);
        this.showError('Failed to submit return. Please try again.');
    }
}

    filterInventory(searchTerm) {
        const filteredInventory = this.inventory.filter(item => {
            const searchString = `${item.supplier_name} ${item.product_name} ${item.product_id}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
        this.renderInventory(filteredInventory);
    }

    filterByStatus(status) {
        if (status === 'all') {
            this.renderInventory();
        } else if (status === 'outstanding') {
            // Show unpaid and partially paid items
            const filteredInventory = this.inventory.filter(item => 
                item.payment_status === 'unpaid' || item.payment_status === 'partially_paid'
            );
            this.renderInventory(filteredInventory);
        } else if (status === 'fully_paid') {
            // Show only fully paid items
            const filteredInventory = this.inventory.filter(item => 
                item.payment_status === 'fully_paid'
            );
            this.renderInventory(filteredInventory);
        } else {
            // Filter by specific status
            const filteredInventory = this.inventory.filter(item => 
                item.payment_status === status
            );
            this.renderInventory(filteredInventory);
        }
    }

    showLoading(show) {
        // You can implement a loading spinner here
        console.log(show ? 'Loading...' : 'Loading complete');
    }

    showSuccess(message) {
        if (window.alertManager) {
            window.alertManager.showAlert(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.alertManager) {
            window.alertManager.showAlert(message, 'error');
        } else {
            alert(message);
        }
    }

    showInfo(message) {
        if (window.alertManager) {
            window.alertManager.showAlert(message, 'info');
        } else {
            alert(message);
        }
    }

    showConfirmModal(title, message, onConfirm, onCancel = null) {
        const modal = document.getElementById('confirmModal');
        const titleElement = document.getElementById('confirmTitle');
        const messageElement = document.getElementById('confirmMessage');
        const cancelBtn = document.getElementById('confirmCancel');
        const confirmBtn = document.getElementById('confirmDelete');

        if (!modal || !titleElement || !messageElement || !cancelBtn || !confirmBtn) {
            // Fallback to browser confirm if modal elements don't exist
            if (confirm(`${title}\n\n${message}`)) {
                onConfirm();
            } else if (onCancel) {
                onCancel();
            }
            return;
        }

        // Set content
        titleElement.textContent = title;
        messageElement.textContent = message;

        // Show modal
        modal.style.display = 'block';

        // Remove existing event listeners to prevent duplicates
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        // Add event listeners
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
                        if (onCancel) onCancel();
        });

        newConfirmBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            onConfirm();
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                if (onCancel) onCancel();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                document.removeEventListener('keydown', handleEscape);
                if (onCancel) onCancel();
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    renderInventoryTable(inventory) {
        const tbody = document.querySelector('.inventory-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        inventory.forEach(item => {
            const row = document.createElement('tr');
            
            // Calculate display balance - show 0 if negative (overpaid)
            const displayBalance = Math.max(0, parseFloat(item.balance) || 0);
            
            row.innerHTML = `
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>${item.supplier_name}</td>
                <td>${item.product_name}</td>
                <td>${item.product_id}</td>
                <td>${item.quantity}</td>
                <td>${parseFloat(item.price).toFixed(2)}</td>
                <td>${(item.quantity * item.price).toFixed(2)}</td>
                <td>${parseFloat(item.amount_paid).toFixed(2)}</td>
                <td>${displayBalance.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${item.payment_status === 'fully_paid' || item.payment_status === 'paid' ? 'paid' : item.payment_status === 'partially_paid' ? 'partial' : 'unpaid'}">
                        ${item.payment_status === 'fully_paid' || item.payment_status === 'paid' ? 'Paid' : item.payment_status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="inventory.editItem(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="inventory.deleteItem(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
}

// Store the class globally to prevent redeclaration
window.InventoryManager = InventoryManager;
}

// Remove the automatic initialization - it will be handled by script.js
console.log('Inventory.js fully loaded');