console.log('Suppliers.js loaded');

// Guard against multiple declarations
if (typeof window.SuppliersManager === 'undefined') {
    
    class SuppliersManager {
        constructor() {
            this.suppliers = [];
            this.currentEditingId = null;
            this.init();
        }

        async init() {
            // Wait for API to be available
            if (!window.api) {
                console.log('Waiting for API to be available...');
                setTimeout(() => this.init(), 100);
                return;
            }
            
            this.setupEventListeners();
            await this.loadSuppliers();
            await this.updateStats();
        }

        setupEventListeners() {
    // Add supplier button
    const addBtn = document.querySelector('.btn-add-supplier');
    if (addBtn) {
        addBtn.addEventListener('click', () => this.openModal());
    }

    // Modal close - only via X button
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Form submission
    const form = document.getElementById('supplierForm');
    if (form) {
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Payment status change
    const paymentStatus = document.getElementById('paymentStatus');
    if (paymentStatus) {
        paymentStatus.addEventListener('change', () => this.toggleAmountPaidField());
    }

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => this.filterSuppliers(e.target.value));
    }

    // Filter functionality
    const filterSelect = document.querySelector('.filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => this.filterByStatus(e.target.value));
    }

    // NEW: Add Escape key listener to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('supplierModal');
            if (modal && modal.style.display === 'block') {
                this.closeModal();
            }
        }
    });

    // ✅ Proper modal overlay click handling
    const modal = document.getElementById('supplierModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            // Only close if clicking the overlay (not the modal content)
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
}

        async loadSuppliers() {
            try {
                this.showLoading(true);
                this.suppliers = await window.api.getSuppliers();
                this.renderSuppliers();
                console.log('Suppliers loaded:', this.suppliers.length);
            } catch (error) {
                console.error('Error loading suppliers:', error);
                this.showError('Failed to load suppliers. Please check your connection and try again.');
            } finally {
                this.showLoading(false);
            }
        }

        async updateStats() {
            try {
                const stats = await window.api.getSupplierStats();
                
                const totalPayablesElement = document.getElementById('totalPayablesAmount');
                const suppliersCountElement = document.getElementById('suppliersCount');
                
                if (totalPayablesElement) {
                    totalPayablesElement.textContent = `$${parseFloat(stats.total_payables || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                
                if (suppliersCountElement) {
                    suppliersCountElement.textContent = `Across ${stats.supplier_count || 0} suppliers`;
                }
            } catch (error) {
                console.error('Error updating stats:', error);
            }
        }

renderSuppliers(suppliersToRender = this.suppliers) {
    const tbody = document.querySelector('.supplier-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (suppliersToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px;">
                    No suppliers found. Click "Add Supplier" to get started.
                </td>
            </tr>
        `;
        return;
    }

    // Sort suppliers by creation date (newest first)
    const sortedSuppliers = [...suppliersToRender].sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA; // Descending order (newest first)
    });

    sortedSuppliers.forEach(supplier => {
        if (supplier.product_id) { // Only render if there's a product
            const row = document.createElement('tr');
            
            // Determine status display text and class
            let statusText = 'Unpaid';
            let statusClass = 'unpaid';
            
            if (supplier.payment_status === 'partially_paid') {
                statusText = 'Partial';
                statusClass = 'partially-paid';
            } else if (supplier.payment_status === 'fully_paid') {
                statusText = 'Paid';
                statusClass = 'fully-paid';
            }
            
            row.innerHTML = `
                <td>${supplier.supplier_name || 'N/A'}</td>
                <td>${supplier.product_name || 'N/A'}</td>
                <td>${supplier.product_code || 'N/A'}</td>
                <td>${supplier.quantity || 0}</td>
                <td>$${parseFloat(supplier.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>$${parseFloat(supplier.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${parseFloat(supplier.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-edit" onclick="suppliersManager.editSupplier(${supplier.product_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="suppliersManager.deleteSupplier(${supplier.product_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <!--<button class="btn-return-js" onclick="suppliersManager.returnSupplier(${supplier.product_id})">
                        <i class="fas fa-undo"></i>
                    </button>-->
                </div>
                </td>
            `;
            tbody.appendChild(row);
                }
            });
        }

        openModal(supplier = null) {
            const modal = document.getElementById('supplierModal');
            const form = document.getElementById('supplierForm');
            const submitBtn = document.getElementById('addSupplier');
            const modalTitle = document.querySelector('#supplierModal h2');
            
            if (supplier) {
                // Edit mode
                modalTitle.textContent = 'Edit Supplier';
                this.currentEditingId = supplier.product_id;
                document.getElementById('supplierName').value = supplier.supplier_name || '';
                document.getElementById('productName').value = supplier.product_name || '';
                document.getElementById('productId').value = supplier.product_code || '';
                document.getElementById('quantity').value = supplier.quantity || '';
                document.getElementById('price').value = supplier.price || '';
                document.getElementById('paymentStatus').value = supplier.payment_status || 'unpaid';
                
                // Call toggleAmountPaidField first to show/hide the field
                this.toggleAmountPaidField();
                
                // Then set the amount paid value after the field visibility is determined
                document.getElementById('amountPaid').value = supplier.amount_paid || '';
                
                submitBtn.textContent = 'Update Supplier';
            } else {
                // Add mode
                modalTitle.textContent = 'Add Supplier'; 
                this.currentEditingId = null;
                form.reset();
                submitBtn.textContent = 'Add Supplier';
                this.toggleAmountPaidField();
            }
            
            modal.classList.add('show');
        }

        closeModal() {
            const modal = document.getElementById('supplierModal');
            modal.classList.remove('show');
            this.currentEditingId = null;
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

        calculateFullPayment() {
            const quantityInput = document.getElementById('quantity');
            const priceInput = document.getElementById('price');
            const amountPaidInput = document.getElementById('amountPaid');
            
            if (quantityInput && priceInput && amountPaidInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const price = parseFloat(priceInput.value) || 0;
                const totalAmount = quantity * price;
                
                // Set the amount paid to the total calculated amount
                amountPaidInput.value = totalAmount.toFixed(2);
            }
        }

        async handleFormSubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const supplierData = {
                supplierName: formData.get('supplierName'),
                productName: formData.get('productName'),
                productId: formData.get('productId'),
                quantity: parseInt(formData.get('quantity')),
                price: parseFloat(formData.get('price')),
                paymentStatus: formData.get('paymentStatus'),
                amountPaid: formData.get('amountPaid') ? parseFloat(formData.get('amountPaid')) : 0
            };

            try {
                this.showLoading(true);
                
                if (this.currentEditingId) {
                    // Update existing supplier
                    await window.api.updateSupplier(this.currentEditingId, supplierData);
                    this.showSuccess('Supplier updated successfully!');
                } else {
                    // Create new supplier
                    await window.api.createSupplier(supplierData);
                    this.showSuccess('Supplier added successfully!');
                }
                
                this.closeModal();
                await this.loadSuppliers();
                await this.updateStats();
                
            } catch (error) {
                console.error('Error saving supplier:', error);
                this.showError('Failed to save supplier. Please try again.');
            } finally {
                this.showLoading(false);
            }
        }

        async editSupplier(productId) {
            const supplier = this.suppliers.find(s => s.product_id === productId);
            if (supplier) {
                this.openModal(supplier);
            }
        }

        async deleteSupplier(productId) {
            this.showConfirmModal(
                'Confirm Deletion',
                'Are you sure you want to delete this supplier product?',
                async () => {
                    try {
                        this.showLoading(true);
                        await window.api.deleteSupplier(productId);
                        this.showSuccess('Supplier product deleted successfully!');
                        await this.loadSuppliers();
                        await this.updateStats();
                    } catch (error) {
                        console.error('Error deleting supplier:', error);
                        this.showError('Failed to delete supplier. Please try again.');
                    } finally {
                        this.showLoading(false);
                    }
                }
            );
        }

        async returnSupplier(productId) {
            const supplier = this.suppliers.find(s => s.product_id === productId);
            if (supplier) {
                this.showReturnModal(supplier, async () => {
                    try {
                        this.showLoading(true);
                        await window.api.returnSupplier(productId);
                        this.showSuccess('Supplier product returned successfully!');
                        await this.loadSuppliers();
                        await this.updateStats();
                    } catch (error) {
                        console.error('Error returning supplier product:', error);
                        this.showError('Failed to return supplier product. Please try again.');
                    } finally {
                        this.showLoading(false);
                    }
                });
            }
        }

        async showReturnModal(supplier, onConfirm, onCancel = null) {
            const modal = document.getElementById('returnModal');
            const titleElement = document.getElementById('returnTitle');
            const messageElement = document.getElementById('returnMessage');
            const detailsElement = document.getElementById('returnDetails');
            const cancelBtn = document.getElementById('returnCancel');
            const confirmBtn = document.getElementById('returnConfirm');

            // Set content
            titleElement.textContent = 'Confirm Return';
            messageElement.textContent = `Are you sure you want to return this product to ${supplier.supplier_name}?`;
            
            // Show product details
            detailsElement.innerHTML = `
                <p><strong>Product:</strong> ${supplier.product_name}</p>
                <p><strong>Product ID:</strong> ${supplier.product_code}</p>
                <p><strong>Quantity:</strong> ${supplier.quantity}</p>
                <p><strong>Total Value:</strong> ${(supplier.quantity * supplier.price).toFixed(2)}</p>`;

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

        filterSuppliers(searchTerm) {
            const filteredSuppliers = this.suppliers.filter(supplier => {
                const searchString = `${supplier.supplier_name} ${supplier.product_name} ${supplier.product_code}`.toLowerCase();
                return searchString.includes(searchTerm.toLowerCase());
            });
            this.renderSuppliers(filteredSuppliers);
        }

        filterByStatus(status) {
            if (status === 'all') {
                this.renderSuppliers();
            } else if (status === 'paid') {
                // Show both partially paid and fully paid
                const filteredSuppliers = this.suppliers.filter(supplier => 
                    supplier.payment_status === 'partially_paid' || supplier.payment_status === 'fully_paid'
                );
                this.renderSuppliers(filteredSuppliers);
            } else {
                const filteredSuppliers = this.suppliers.filter(supplier => 
                    supplier.payment_status === status
                );
                this.renderSuppliers(filteredSuppliers);
            }
        }

        showLoading(show) {
            const submitBtn = document.getElementById('addSupplier');
            if (submitBtn) {
                submitBtn.disabled = show;
                submitBtn.textContent = show ? 'Processing...' : (this.currentEditingId ? 'Update Supplier' : 'Add Supplier');
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
    }

    // Store the class globally to prevent redeclaration
    window.SuppliersManager = SuppliersManager;
}

// Remove the automatic initialization - it will be handled by script.js
console.log('Suppliers.js fully loaded');