console.log('Returns.js loaded');

// Guard against multiple declarations
if (typeof window.ReturnsManager === 'undefined') {
    class ReturnsManager {
        constructor() {
            this.returns = [];
            this.init();
        }

        init() {
            console.log('Initializing ReturnsManager...');
            // Wait a bit to ensure DOM is ready
            setTimeout(() => {
                this.loadReturns();
                this.setupEventListeners();
            }, 100);
        }

        setupEventListeners() {
            // Search functionality
            const searchInput = document.querySelector('.search-returns');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterReturns(e.target.value);
                });
            }
        }

        async loadReturns() {
            try {
                console.log('Fetching returns data...');
                this.returns = await window.api.getReturns();
                console.log('Returns data:', this.returns);
                this.renderReturns(this.returns);
            } catch (error) {
                console.error('Error loading returns:', error);
                this.showError('Failed to load returns data: ' + error.message);
            }
        }

        renderReturns(returns) {
            const tbody = document.querySelector('.returns-table tbody');
            console.log('Tbody element:', tbody);
            
            if (!tbody) {
                console.error('returns table tbody element not found!');
                return;
            }

            if (returns.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="no-data-cell" style="text-align: center; padding: 20px;">No returns found</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = returns.map(returnItem => `
                <tr data-return-id="${returnItem.id}">
                    <td>${this.formatDate(returnItem.return_date)}</td>
                    <td>${this.capitalizeFirst(returnItem.return_type)}</td>
                    <td>${returnItem.customer_supplier_name}</td>
                    <td>${returnItem.product_name || 'N/A'}</td>
                    <td>$${parseFloat(returnItem.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${returnItem.reason || 'Not specified'}</td>
                    <td>${returnItem.notes || 'No notes'}</td>
                    <!--<td>
                        <span class="status ${returnItem.status}">${this.capitalizeFirst(returnItem.status)}</span>
                    </td>-->
                    <td class="actions">
                        <button class="btn-cancel-return" onclick="returnsManager.cancelReturn(${returnItem.id})" title="Cancel Return">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn-delete" onclick="returnsManager.deleteReturn(${returnItem.id})" title="Delete Return">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        filterReturns(searchTerm) {
            if (!searchTerm.trim()) {
                this.renderReturns(this.returns);
                return;
            }

            const filtered = this.returns.filter(returnItem => 
                returnItem.customer_supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                returnItem.return_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                returnItem.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (returnItem.return_id && returnItem.return_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (returnItem.reason && returnItem.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (returnItem.notes && returnItem.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (returnItem.product_name && returnItem.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            this.renderReturns(filtered);
        }

        async deleteReturn(id) {
            // Show custom confirmation modal
            this.showConfirmModal(
                'Delete Return',
                'Are you sure you want to delete this return? This action cannot be undone.',
                async () => {
                    try {
                        await window.api.deleteReturn(id);
                        
                        // Remove from local array
                        this.returns = this.returns.filter(returnItem => returnItem.id !== id);
                        this.renderReturns(this.returns);
                        
                        this.showSuccess('Return deleted successfully');
                    } catch (error) {
                        console.error('Error deleting return:', error);
                        this.showError('Failed to delete return');
                    }
                }
            );
        }

        showConfirmModal(title, message, onConfirm) {
            const modal = document.getElementById('confirmModal');
            const titleElement = document.getElementById('confirmTitle');
            const messageElement = document.getElementById('confirmMessage');
            const cancelBtn = document.getElementById('confirmCancel');
            const deleteBtn = document.getElementById('confirmDelete');

            if (!modal || !titleElement || !messageElement || !cancelBtn || !deleteBtn) {
                console.error('Confirmation modal elements not found');
                return;
            }

            titleElement.textContent = title;
            messageElement.textContent = message;
            modal.style.display = 'block';

            // Remove any existing event listeners
            const newCancelBtn = cancelBtn.cloneNode(true);
            const newDeleteBtn = deleteBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

            // Add event listeners
            newCancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            newDeleteBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                onConfirm();
            });

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        async updateReturn(id, formData) {
            try {
                const updateData = {
                    total_amount: parseFloat(formData.get('total_amount')),
                    status: formData.get('status'),
                    reason: formData.get('reason'),
                    notes: formData.get('notes')
                };

                await window.api.updateReturn(id, updateData);
                
                // Update local array
                const index = this.returns.findIndex(r => r.id === id);
                if (index !== -1) {
                    this.returns[index] = { ...this.returns[index], ...updateData };
                }
                
                this.renderReturns(this.returns);
                this.showSuccess('Return updated successfully');
            } catch (error) {
                console.error('Error updating return:', error);
                this.showError('Failed to update return');
            }
        }

        async cancelReturn(id) {
            try {
                await window.api.reverseReturn(id);
                
                // Remove the return from local array since it's been reversed
                this.returns = this.returns.filter(returnItem => returnItem.id !== id);
                this.renderReturns(this.returns);
                
                this.showSuccess('Return cancelled successfully - inventory and customer balance restored');
            } catch (error) {
                console.error('Error cancelling return:', error);
                this.showError('Failed to cancel return');
            }
        }

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }

        capitalizeFirst(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        showSuccess(message) {
            if (window.showAlert) {
                window.showAlert(message, 'success');
            } else {
                console.log('Success:', message);
            }
        }

        showError(message) {
            if (window.showAlert) {
                window.showAlert(message, 'error');
            } else {
                console.error('Error:', message);
            }
        }
    }

    // Store the class globally to prevent redeclaration
    window.ReturnsManager = ReturnsManager;
}

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, creating ReturnsManager...');
        if (typeof window.initializeReturns === 'undefined') {
            window.initializeReturns = function() {
                if (!window.returnsManager) {
                    console.log('Initializing ReturnsManager...');
                    window.returnsManager = new ReturnsManager();
                }
            };
        }
        window.initializeReturns();
    });

console.log('Returns.js fully loaded');