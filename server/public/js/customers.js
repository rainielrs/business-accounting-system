console.log('Customers.js loaded');

// Guard against multiple declarations
if (typeof window.CustomersManager === 'undefined') {
    
    class CustomersManager {
        constructor() {
            this.customers = [];
            this.currentEditingId = null;
            this.currentReturnProduct = null;
            this.init();
        }

        init() {
            this.loadCustomers();
            this.updateStats();
            this.setupEventListeners();
        }

        setupEventListeners() {
            // Search functionality
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterCustomers(e.target.value);
                });
            }

            // Filter functionality
            const filterSelect = document.querySelector('.filter-select');
            if (filterSelect) {
                filterSelect.addEventListener('change', (e) => {
                    this.filterByStatus(e.target.value);
                });
            }

            // Add new customer button
            const addCustomerBtn = document.querySelector('.btn-add-customer');
            if (addCustomerBtn) {
                addCustomerBtn.addEventListener('click', () => {
                    this.openModal();
                });
            }

            // Modal close functionality
            const modal = document.getElementById('customerModal');
            const closeBtn = modal?.querySelector('.close');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal();
                });
            }

            if (modal) {

                // Close on escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && modal.classList.contains('show')) {
                        this.closeModal();
                    }
                });
            }

            // Form submission
            const form = document.getElementById('customerForm');
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

            // NEW: Product selection handler
            this.handleProductSelection();
        }

        toggleAmountPaidField() {
            const paymentStatus = document.getElementById('paymentStatus');
            const amountPaidGroup = document.getElementById('amountPaidGroup');
            const amountPaidInput = document.getElementById('amountPaid');
            
            if (paymentStatus && amountPaidGroup && amountPaidInput) {
                if (paymentStatus.value === 'partially_paid') {
                    // Show amount paid field for partial payments
                    amountPaidGroup.style.display = 'block';
                    amountPaidInput.required = true;
                    // Only clear the value if we're NOT in edit mode
                    if (!this.currentEditingId) {
                        amountPaidInput.value = '';
                    }
                    // Add validation for partial payments
                    this.setupPartialPaymentValidation();
                } else if (paymentStatus.value === 'fully_paid') {
                    // Hide amount paid field and auto-calculate total
                    amountPaidGroup.style.display = 'none';
                    amountPaidInput.required = false;
                    this.calculateFullPayment();
                } else {
                    // Hide amount paid field for unpaid
                    amountPaidGroup.style.display = 'none';
                    amountPaidInput.required = false;
                    amountPaidInput.value = '0';
                }
            }
        }

        setupPartialPaymentValidation() {
            const amountPaidInput = document.getElementById('amountPaid');
            const quantityInput = document.getElementById('quantity');
            const priceInput = document.getElementById('price');
            
            if (!amountPaidInput || !quantityInput || !priceInput) return;
            
            const validatePartialPayment = () => {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const totalAmount = quantity * price;
                const amountPaid = parseFloat(amountPaidInput.value) || 0;
                
                if (totalAmount > 0) {
                    // Set the max attribute for HTML5 validation
                    amountPaidInput.setAttribute('max', (totalAmount - 0.01).toFixed(2));
                    
                    if (amountPaid >= totalAmount) {
                        amountPaidInput.setCustomValidity(`For partial payment, amount must be less than total amount (${totalAmount.toFixed(2)})`);
                        amountPaidInput.style.borderColor = '#e74c3c';
                        amountPaidInput.style.backgroundColor = '#ffeaea';
                    } else if (amountPaid <= 0) {
                        amountPaidInput.setCustomValidity('Amount paid must be greater than 0');
                        amountPaidInput.style.borderColor = '#e74c3c';
                        amountPaidInput.style.backgroundColor = '#ffeaea';
                    } else {
                        amountPaidInput.setCustomValidity('');
                        amountPaidInput.style.borderColor = '';
                        amountPaidInput.style.backgroundColor = '';
                    }
                    
                    // Update placeholder to show maximum
                    amountPaidInput.placeholder = `Max: ${(totalAmount - 0.01).toFixed(2)}`;
                }
            };
            
            // Clear existing event listeners by cloning the elements
            const newAmountPaidInput = amountPaidInput.cloneNode(true);
            const newQuantityInput = quantityInput.cloneNode(true);
            const newPriceInput = priceInput.cloneNode(true);
            
            amountPaidInput.parentNode.replaceChild(newAmountPaidInput, amountPaidInput);
            quantityInput.parentNode.replaceChild(newQuantityInput, quantityInput);
            priceInput.parentNode.replaceChild(newPriceInput, priceInput);
            
            // Add validation on input events
            newAmountPaidInput.addEventListener('input', validatePartialPayment);
            newAmountPaidInput.addEventListener('blur', validatePartialPayment);
            newQuantityInput.addEventListener('input', validatePartialPayment);
            newPriceInput.addEventListener('input', validatePartialPayment);
            
            // Initial validation
            setTimeout(validatePartialPayment, 100);
        }

        calculateFullPayment() {
            const quantityInput = document.getElementById('quantity');
            const priceInput = document.getElementById('price');
            const amountPaidInput = document.getElementById('amountPaid');
            const paymentStatus = document.getElementById('paymentStatus');
            
            if (quantityInput && priceInput && amountPaidInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const totalAmount = quantity * price;
                
                // Only auto-fill for fully paid status
                if (paymentStatus && paymentStatus.value === 'fully_paid') {
                    amountPaidInput.value = totalAmount.toFixed(2);
                }
                
                // If partial payment is selected, update validation
                if (paymentStatus && paymentStatus.value === 'partially_paid') {
                    this.setupPartialPaymentValidation();
                }
            }
        }

        handlePaymentStatusChange(status) {
            const amountPaidGroup = document.getElementById('amountPaidGroup');
            if (amountPaidGroup) {
                if (status === 'partially_paid' || status === 'fully_paid') {
                    amountPaidGroup.style.display = 'block';
                    document.getElementById('amountPaid').required = true;
                } else {
                    amountPaidGroup.style.display = 'none';
                    document.getElementById('amountPaid').required = false;
                    document.getElementById('amountPaid').value = '';
                }
            }
        }

        async loadCustomers() {
            try {
                this.showLoading(true);
                this.customers = await window.api.getCustomers();
                this.renderCustomers();
                console.log('Customers loaded:', this.customers.length);
            } catch (error) {
                console.error('Error loading customers:', error);
                this.showError('Failed to load customers. Please check your connection and try again.');
            } finally {
                this.showLoading(false);
            }
        }

        async updateStats() {
            try {
                const stats = await window.api.getCustomerStats();
                
                const totalReceivablesElement = document.getElementById('totalReceivablesAmount');
                const customersCountElement = document.getElementById('customersCount');
                
                if (totalReceivablesElement) {
                    totalReceivablesElement.textContent = `$${parseFloat(stats.total_receivables || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                
                if (customersCountElement) {
                    customersCountElement.textContent = `Across ${stats.customer_count || 0} customers`;
                }
            } catch (error) {
                console.error('Error updating stats:', error);
            }
        }

        renderCustomers(customersToRender = this.customers) {
            const tbody = document.querySelector('.customer-table tbody');
            if (!tbody) return;

            tbody.innerHTML = '';

            if (customersToRender.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 20px;">
                            No customers found. Click "Add Customer" to get started.
                        </td>
                    </tr>
                `;
                return;
            }

            // Sort customers by creation date (newest first)
            const sortedCustomers = [...customersToRender].sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });

            sortedCustomers.forEach(customer => {
                const row = document.createElement('tr');
                
                // Get payment status class
                const getStatusClass = (status) => {
                    switch(status) {
                        case 'fully_paid': return 'fully-paid';
                        case 'partially_paid': return 'partially-paid';
                        case 'unpaid': return 'unpaid';
                        default: return 'unpaid';
                    }
                };

                // Get payment status text
                const getStatusText = (status) => {
                    switch(status) {
                        case 'fully_paid': return 'Paid';
                        case 'partially_paid': return 'Partial';
                        case 'unpaid': return 'Unpaid';
                        default: return 'Unpaid';
                    }
                };
                
                row.innerHTML = `
                    <td>${customer.customer_name || 'N/A'}</td>
                    <td>${customer.product_name || 'N/A'}</td>
                    <td>${customer.product_code || 'N/A'}</td>
                    <td>${customer.quantity || 0}</td>
                    <td>$${parseFloat(customer.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span class="status ${getStatusClass(customer.payment_status)}">${getStatusText(customer.payment_status)}</span></td>
                    <td>$${parseFloat(customer.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>$${parseFloat(customer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-edit" title="Edit" onclick="customersManager.editCustomer(${customer.product_id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" title="Delete" onclick="customersManager.deleteCustomer(${customer.product_id})">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn-customer-return" title="Return" onclick="customersManager.processReturn(${customer.product_id})">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        async openModal(customer = null) {
            const modal = document.getElementById('customerModal');
            const form = document.getElementById('customerForm');
            const submitBtn = document.getElementById('addCustomer');
            const modalTitle = document.querySelector('#customerModal h2');
            const productSelect = document.getElementById('productSelect');
            
            // Ensure modal is visible
            modal.style.display = 'block';
            
            // Load products first
            await this.populateProductSelect();
            
            if (customer) {
                // Edit mode
                modalTitle.textContent = 'Edit Customer';
                this.currentEditingId = customer.product_id;
                document.getElementById('customerName').value = customer.customer_name || '';
                document.getElementById('productName').value = customer.product_name || '';
                document.getElementById('productId').value = customer.product_code || '';
                document.getElementById('quantity').value = customer.quantity || '';
                document.getElementById('price').value = customer.price || '';
                document.getElementById('paymentStatus').value = customer.payment_status || 'unpaid';
                
                // Disable product selection in edit mode to prevent inventory confusion
                productSelect.disabled = true;
                productSelect.style.opacity = '0.6';
                
                // Add a note about product selection being disabled
                const existingNote = document.getElementById('editModeNote');
                if (!existingNote) {
                    const note = document.createElement('small');
                    note.id = 'editModeNote';
                    note.style.color = '#666';
                    note.style.fontStyle = 'italic';
                    note.textContent = 'Product selection is disabled in edit mode';
                    productSelect.parentNode.appendChild(note);
                }
                
                // Call toggleAmountPaidField first to show/hide the field
                this.toggleAmountPaidField();
                
                // Then set the amount paid value after the field visibility is determined
                document.getElementById('amountPaid').value = customer.amount_paid || '';
                
                submitBtn.textContent = 'Update Customer';
            } else {
                // Add mode
                modalTitle.textContent = 'Add Customer';
                this.currentEditingId = null;
                form.reset();
                
                // Enable product selection in add mode
                productSelect.disabled = false;
                productSelect.style.opacity = '1';
                
                // Remove edit mode note if it exists
                const existingNote = document.getElementById('editModeNote');
                if (existingNote) {
                    existingNote.remove();
                }
                
                // Repopulate products for new customer
                await this.populateProductSelect();
                
                submitBtn.textContent = 'Add Customer';
                this.toggleAmountPaidField();
            }
            
            modal.classList.add('show');
        }

        closeModal() {
            const modal = document.getElementById('customerModal');
            modal.classList.remove('show');
            modal.style.display = 'none'; // Add this back to properly close the modal
            this.currentEditingId = null;
            
            // Remove edit mode note if it exists
            const existingNote = document.getElementById('editModeNote');
            if (existingNote) {
                existingNote.remove();
            }
            
            // Re-enable product selection
            const productSelect = document.getElementById('productSelect');
            if (productSelect) {
                productSelect.disabled = false;
                productSelect.style.opacity = '1';
            }
        }

        async handleFormSubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const customerData = {
                customerName: formData.get('customerName'),
                productName: formData.get('productName'),
                productId: formData.get('productId'),
                quantity: parseInt(formData.get('quantity')),
                price: parseFloat(formData.get('price')),
                paymentStatus: formData.get('paymentStatus'),
                amountPaid: formData.get('amountPaid') ? parseFloat(formData.get('amountPaid')) : 0
            };

            // Additional validation for partial payments
            if (customerData.paymentStatus === 'partially_paid') {
                const totalAmount = customerData.quantity * customerData.price;
                if (customerData.amountPaid >= totalAmount) {
                    this.showError(`For partial payment, amount paid (${customerData.amountPaid.toFixed(2)}) must be less than total amount (${totalAmount.toFixed(2)})`);
                    return;
                }
                if (customerData.amountPaid <= 0) {
                    this.showError('For partial payment, amount paid must be greater than 0');
                    return;
                }
            }

            // Get the selected inventory product ID for stock reduction
            const productSelect = document.getElementById('productSelect');
            const selectedInventoryId = productSelect.value;

            try {
                this.showLoading(true);
                
                if (this.currentEditingId) {
                    // Update existing customer
                    const existingCustomer = this.customers.find(c => c.product_id === this.currentEditingId);
                    const oldAmountPaid = existingCustomer ? parseFloat(existingCustomer.amount_paid || 0) : 0;
                    const newAmountPaid = customerData.amountPaid;
                    const paymentDifference = newAmountPaid - oldAmountPaid;

                    await window.api.updateCustomer(this.currentEditingId, customerData);
                    
                    // Update cash on hand based on payment difference
                    if (paymentDifference !== 0) {
                        await this.updateCashOnHandForUpdate(paymentDifference, customerData.customerName);
                    }
                    
                    this.showSuccess('Customer updated successfully!');
                } else {
                    // Create new customer
                    await window.api.createCustomer(customerData);
                    
                    // Reduce inventory stock for the selected product
                    if (selectedInventoryId && customerData.quantity > 0) {
                        try {
                            await window.api.updateInventoryStock(selectedInventoryId, customerData.quantity);
                        } catch (inventoryError) {
                            // Show specific error message
                            if (inventoryError.message.includes('Insufficient stock')) {
                                this.showError(`Error: ${inventoryError.message}`);
                            } else if (inventoryError.message.includes('not found')) {
                                this.showError('Selected product not found in inventory.');
                            } else {
                                this.showError('Failed to update inventory. Please check stock manually.');
                            }
                            
                            this.showLoading(false);
                            return;
                        }
                    }
                    
                    // Update cash on hand if payment was made
                    if (customerData.amountPaid > 0) {
                        await this.updateCashOnHand(customerData.amountPaid, customerData.customerName);
                    }
                    
                    this.showSuccess('Customer added successfully!');
                }
                
                this.closeModal();
                await this.loadCustomers();
                await this.updateStats();
                
                // Refresh inventory if the inventory manager exists
                if (window.inventoryManager) {
                    await window.inventoryManager.loadInventory();
                    await window.inventoryManager.updateStats();
                }
                
            } catch (error) {
                console.error('Error saving customer:', error);
                this.showError('Failed to save customer. Please try again.');
            } finally {
                this.showLoading(false);
            }
        }

        async editCustomer(productId) {
            const customer = this.customers.find(c => c.product_id === productId);
            if (customer) {
                this.openModal(customer);
            }
        }

        async deleteCustomer(productId) {
            this.showConfirmModal(
                'Confirm Deletion',
                'Are you sure you want to delete this customer record?',
                async () => {
                    try {
                        this.showLoading(true);
                        
                        // Get the customer data before deletion to check for payments
                        const customer = this.customers.find(c => c.product_id === productId);
                        const amountPaid = parseFloat(customer?.amount_paid || 0);
                        
                        // Delete the customer
                        await window.api.deleteCustomer(productId);
                        
                        // Update cash on hand if customer had made payments
                        if (amountPaid > 0) {
                            await this.updateCashOnHandForDeletion(amountPaid, customer?.customer_name);
                        }
                        
                        this.showSuccess('Customer deleted successfully!');
                        await this.loadCustomers();
                        await this.updateStats();
                    } catch (error) {
                        console.error('Error deleting customer:', error);
                        this.showError('Failed to delete customer. Please try again.');
                    } finally {
                        this.showLoading(false);
                    }
                }
            );
        }

        
// Add this method to the CustomersManager class, after the deleteCustomer method:

async processReturn(productId) {
    const customer = this.customers.find(c => c.product_id === productId);
    if (!customer) {
        this.showError('Customer not found');
        return;
    }
    
    this.openReturnModal(customer);
}

openReturnModal(customer) {
    // Get the existing return modal from HTML
    const returnModal = document.getElementById('returnModal');
    if (!returnModal) {
        this.showError('Return modal not found');
        return;
    }
    
    // Populate modal with customer data
    document.getElementById('returnCustomerName').textContent = customer.customer_name;
    document.getElementById('returnProductName').textContent = customer.product_name;
    document.getElementById('returnProductId').textContent = customer.product_code;
    document.getElementById('returnMaxQuantity').textContent = customer.quantity;
    document.getElementById('returnUnitPrice').textContent = `${parseFloat(customer.price).toFixed(2)}`;
    
    // Set up quantity input validation
    const quantityInput = document.getElementById('returnQuantity');
    quantityInput.max = customer.quantity;
    quantityInput.value = '';
    quantityInput.placeholder = `Max: ${customer.quantity}`;
    
    // Store customer data for form submission
    returnModal.dataset.customerId = customer.product_id;
    returnModal.dataset.maxQuantity = customer.quantity;
    returnModal.dataset.unitPrice = customer.price;
    returnModal.dataset.amountPaid = customer.amount_paid;
    
    // Set up event listeners for this modal instance
    this.setupReturnModalEventListeners();
    
    // Show modal
    returnModal.style.display = 'block';
    returnModal.classList.add('show');
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
    const modal = document.getElementById('returnModal');
    
    if (!quantityInput || !refundAmountInput || !modal) return;
    
    const quantity = parseInt(quantityInput.value) || 0;
    const unitPrice = parseFloat(modal.dataset.unitPrice) || 0;
    const maxQuantity = parseInt(modal.dataset.maxQuantity) || 1;
    const amountPaid = parseFloat(modal.dataset.amountPaid) || 0;
    const totalAmount = (quantity / maxQuantity) * amountPaid;
    
    // Auto-fill the refund amount but allow user to edit it
    refundAmountInput.value = totalAmount.toFixed(2);
}

validateRefundAmount() {
    const refundAmountInput = document.getElementById('refundAmount');
    const quantityInput = document.getElementById('returnQuantity');
    const modal = document.getElementById('returnModal');
    
    if (!refundAmountInput || !quantityInput || !modal) return;
    
    const refundAmount = parseFloat(refundAmountInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    const unitPrice = parseFloat(modal.dataset.unitPrice) || 0;
    const maxRefund = (quantity / parseInt(modal.dataset.maxQuantity)) * parseFloat(modal.dataset.amountPaid);
    
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
    
    // Update the submit button state
    this.updateSubmitButtonState();
}

validateReturnQuantity() {
    const quantityInput = document.getElementById('returnQuantity');
    const modal = document.getElementById('returnModal');
    
    if (!quantityInput || !modal) return;
    
    const quantity = parseInt(quantityInput.value) || 0;
    const maxQuantity = parseInt(modal.dataset.maxQuantity) || 0;
    
    if (quantity > maxQuantity) {
        quantityInput.setCustomValidity(`Maximum return quantity is ${maxQuantity}`);
        quantityInput.style.borderColor = '#e74c3c';
    } else if (quantity <= 0) {
        quantityInput.setCustomValidity('Return quantity must be greater than 0');
        quantityInput.style.borderColor = '#e74c3c';
    } else {
        quantityInput.setCustomValidity('');
        quantityInput.style.borderColor = '';
    }
}

closeReturnModal() {
    const modal = document.getElementById('returnModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        
        // Reset form
        const form = document.getElementById('returnForm');
        if (form) {
            form.reset();
        }
        
        // Reset refund amount
        const refundAmountInput = document.getElementById('refundAmount');
        if (refundAmountInput) {
            refundAmountInput.value = '';
            refundAmountInput.style.borderColor = '';
            refundAmountInput.setCustomValidity('');
        }
    }
}

async submitReturn() {
    try {
        const modal = document.getElementById('returnModal');
        const returnQuantity = parseInt(document.getElementById('returnQuantity').value);
        const refundAmount = parseFloat(document.getElementById('refundAmount').value);
        const reason = document.getElementById('returnReason').value;
        const notes = document.getElementById('returnNotes').value;
        const productId = modal.dataset.customerId;
        const maxQuantity = parseInt(modal.dataset.maxQuantity);
        const unitPrice = parseFloat(modal.dataset.unitPrice);

        // Validate return quantity
        if (!returnQuantity || returnQuantity <= 0) {
            showAlert('Please enter a valid return quantity', 'error');
            return;
        }

        if (returnQuantity > maxQuantity) {
            showAlert(`Return quantity cannot exceed available quantity (${maxQuantity})`, 'error');
            return;
        }

        // Validate refund amount
        if (refundAmount < 0) {
            showAlert('Refund amount cannot be negative', 'error');
            return;
        }

        // Calculate maximum allowed refund amount based on what customer paid
        const amountPaid = parseFloat(modal.dataset.amountPaid) || 0;
        const maxRefundAmount = (returnQuantity / maxQuantity) * amountPaid;

        // Prevent submission if refund amount exceeds maximum
        if (refundAmount > maxRefundAmount) {
            showAlert(`Refund amount cannot exceed ${maxRefundAmount.toFixed(2)} (proportional to amount paid)`, 'error');
            return;
        }

        // Check form validity using HTML5 validation
        const quantityInput = document.getElementById('returnQuantity');
        const refundAmountInput = document.getElementById('refundAmount');
        
        if (!quantityInput.checkValidity()) {
            showAlert(quantityInput.validationMessage, 'error');
            return;
        }
        
        if (!refundAmountInput.checkValidity()) {
            showAlert(refundAmountInput.validationMessage, 'error');
            return;
        }

        const returnData = {
            returnQuantity,
            refundAmount, // Include the custom refund amount
            reason,
            notes
        };

        const result = await window.api.processCustomerReturn(productId, returnData);
        
        // Use the actual refund amount for cash update (not calculated amount)
        await this.updateCashOnHandForReturn(refundAmount, result.returnId || '');
        
        showAlert('Return processed successfully!', 'success');
        this.closeReturnModal();
        await this.loadCustomers();
        await this.updateStats();
        
        // Refresh dashboard if it exists
        if (window.dashboardInstance) {
            await window.dashboardInstance.loadDashboardStats();
        }
        
    } catch (error) {
        console.error('Error processing return:', error);
        showAlert('Error processing return: ' + error.message, 'error');
    }
}

    async updateCashOnHandForReturn(returnAmount, returnId = '') {
    try {
        // Get customer name from the current return modal
        const customerName = document.getElementById('returnCustomerName')?.textContent || 'Unknown Customer';
        
        await window.api.updateCashOnHand({
            action: 'remove',
            amount: returnAmount,
            description: `Customer Return - Refund to ${customerName}`
        });
        
        // Refresh dashboard
        if (window.dashboardInstance) {
            await window.dashboardInstance.loadDashboardStats();
        }
        
        } catch (error) {
            console.error('Error updating cash from return:', error);
            console.warn('Return was processed but cash on hand update failed');
        }
    }

        filterCustomers(searchTerm) {
            const filteredCustomers = this.customers.filter(customer => {
                const searchString = `${customer.customer_name || ''} ${customer.email || ''} ${customer.phone || ''} ${customer.product_name || ''} ${customer.product_code || ''}`.toLowerCase();
                return searchString.includes(searchTerm.toLowerCase());
            });
            this.renderCustomers(filteredCustomers);
        }

        filterByStatus(status) {
            if (status === 'all') {
                this.renderCustomers();
            } else if (status === 'paid') {
                // Show both partially and fully paid
                const filteredCustomers = this.customers.filter(customer => 
                    customer.payment_status === 'partially_paid' || customer.payment_status === 'fully_paid'
                );
                this.renderCustomers(filteredCustomers);
            } else {
                // Filter by specific status
                const filteredCustomers = this.customers.filter(customer => 
                    customer.payment_status === status
                );
                this.renderCustomers(filteredCustomers);
            }
        }

        showLoading(show) {
            const submitBtn = document.getElementById('addCustomer');
            if (submitBtn) {
                submitBtn.disabled = show;
                submitBtn.textContent = show ? 'Processing...' : (this.currentEditingId ? 'Update Customer' : 'Add Customer');
            }
        }

        showSuccess(message) {
            showAlert(message, 'success');
        }

        showError(message) {
            showAlert(message, 'error');
        }

        showConfirmModal(title, message, onConfirm, onCancel = null) {
            const modal = document.getElementById('confirmModal');
            const titleElement = document.getElementById('confirmTitle');
            const messageElement = document.getElementById('confirmMessage');
            const cancelBtn = document.getElementById('confirmCancel');
            const confirmBtn = document.getElementById('confirmDelete');

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

        async updateCashOnHandForUpdate(paymentDifference, customerName = '') {
            try {
                if (paymentDifference > 0) {
                    // Payment increased - add to cash
                    await window.api.updateCashOnHand({
                        action: 'add',
                        amount: Math.abs(paymentDifference),
                        description: `Customer payment increase${customerName ? ` from ${customerName}` : ''}`
                    });
                } else if (paymentDifference < 0) {
                    // Payment decreased - remove from cash
                    await window.api.updateCashOnHand({
                        action: 'remove',
                        amount: Math.abs(paymentDifference),
                        description: `Customer payment decrease${customerName ? ` from ${customerName}` : ''}`
                    });
                }
                
                // Refresh dashboard if it exists
                if (window.dashboardInstance) {
                    await window.dashboardInstance.loadDashboardStats();
                }
                
            } catch (error) {
                console.error('Error updating cash from customer payment change:', error);
                console.warn('Customer was updated but cash on hand update failed');
            }
        }

        async updateCashOnHand(paymentAmount, customerName = '') {
            try {
                await window.api.updateCashOnHand({
                    action: 'add',
                    amount: parseFloat(paymentAmount),
                    description: `Customer payment${customerName ? ` from ${customerName}` : ''}`
                });
                
                // Refresh dashboard if it exists
                if (window.dashboardInstance) {
                    await window.dashboardInstance.loadDashboardStats();
                }
                
            } catch (error) {
                console.error('Error updating cash from customer payment:', error);
                console.warn('Customer was saved but cash on hand update failed');
            }
        }

        async updateCashOnHandForDeletion(amountPaid, customerName = '') {
            try {
                await window.api.updateCashOnHand({
                    action: 'remove',
                    amount: amountPaid,
                    description: `Customer deletion - ${customerName || 'Unknown Customer'} (Refund: ${amountPaid.toFixed(2)})`
                });
                
                // Refresh dashboard
                if (window.dashboardInstance) {
                    await window.dashboardInstance.loadDashboardStats();
                }
                
            } catch (error) {
                console.error('Error updating cash from customer deletion:', error);
                console.warn('Customer was deleted but cash on hand update failed');
            }
        }

        async loadInventoryProducts() {
            try {
                const inventory = await window.api.getInventory();
                return inventory.filter(item => item.quantity > 0); // Only show items with stock
            } catch (error) {
                console.error('Error loading inventory products:', error);
                return [];
            }
        }

        async populateProductSelect() {
            const productSelect = document.getElementById('productSelect');
            if (!productSelect) return;

            try {
                const products = await this.loadInventoryProducts();
                
                // Clear existing options except the first one
                productSelect.innerHTML = '<option value="">-- Select a Product --</option>';
                
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.product_name} (${product.product_id}) - Stock: ${product.quantity}`;
                    option.dataset.productName = product.product_name;
                    option.dataset.productId = product.product_id;
                    option.dataset.price = product.price;
                    option.dataset.availableQuantity = product.quantity;
                    productSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error populating product select:', error);
                this.showError('Failed to load products. Please try again.');
            }
        }

        handleProductSelection() {
            const productSelect = document.getElementById('productSelect');
            const productNameInput = document.getElementById('productName');
            const productIdInput = document.getElementById('productId');
            const priceInput = document.getElementById('price');
            const quantityInput = document.getElementById('quantity');

            if (!productSelect) return;

            productSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.selectedOptions[0];
                
                if (selectedOption.value === '') {
                    // Clear fields if no product selected
                    productNameInput.value = '';
                    productIdInput.value = '';
                    priceInput.value = '';
                    quantityInput.max = '';
                    quantityInput.value = '';
                    quantityInput.placeholder = 'Enter quantity';
                } else {
                    // Populate fields with selected product data
                    const availableQuantity = parseInt(selectedOption.dataset.availableQuantity) || 0;
                    
                    productNameInput.value = selectedOption.dataset.productName || '';
                    productIdInput.value = selectedOption.dataset.productId || '';
                    priceInput.value = selectedOption.dataset.price || '';
                    quantityInput.max = availableQuantity;
                    quantityInput.value = '1'; // Default to 1
                    
                    // Update quantity input placeholder and validation
                    quantityInput.placeholder = `Max available: ${availableQuantity}`;
                    
                    // Add real-time validation for quantity
                    quantityInput.addEventListener('input', function() {
                        const enteredQuantity = parseInt(this.value) || 0;
                        if (enteredQuantity > availableQuantity) {
                            this.setCustomValidity(`Maximum available quantity is ${availableQuantity}`);
                            this.style.borderColor = '#e74c3c';
                        } else if (enteredQuantity <= 0) {
                            this.setCustomValidity('Quantity must be greater than 0');
                            this.style.borderColor = '#e74c3c';
                        } else {
                            this.setCustomValidity('');
                            this.style.borderColor = '';
                        }
                    });
                }
                
                // Recalculate total if payment status is fully paid
                this.calculateFullPayment();
            });
        }
        
        updateSubmitButtonState() {
            const submitButton = document.querySelector('#returnModal .btn-submit');
            const quantityInput = document.getElementById('returnQuantity');
            const refundAmountInput = document.getElementById('refundAmount');
            
            if (!submitButton || !quantityInput || !refundAmountInput) return;
            
            const isQuantityValid = quantityInput.checkValidity() && quantityInput.value > 0;
            const isRefundValid = refundAmountInput.checkValidity() && refundAmountInput.value >= 0;
            
            if (isQuantityValid && isRefundValid) {
                submitButton.disabled = false;
                submitButton.style.opacity = '1';
                submitButton.style.cursor = 'pointer';
            } else {
                submitButton.disabled = true;
                submitButton.style.opacity = '0.6';
                submitButton.style.cursor = 'not-allowed';
            }
        }
    }

    // Store the class globally to prevent redeclaration
    window.CustomersManager = CustomersManager;
}

// Remove the automatic initialization - it will be handled by script.js
console.log('Customers.js fully loaded');