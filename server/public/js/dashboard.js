class Dashboard {
    constructor() {
        console.log('Dashboard constructor called');
        this.currentCashAction = null;
        this.init();
    }

    async init() {
        console.log('Dashboard init called');
        this.setupEventListeners();
        await this.loadDashboardStats();
        await this.loadRecentTransactions(); // Add this line
    }

    setupEventListeners() {
        // Cash modal event listeners
        const addCashBtn = document.getElementById('addCashBtn');
        const removeCashBtn = document.getElementById('removeCashBtn');
        const cashForm = document.getElementById('cashForm');
        const cashModal = document.getElementById('cashModal');
        const closeModalBtn = document.querySelector('#cashModal .close');
        const cancelCashBtn = document.getElementById('cancelCashBtn'); // Add this line

        if (addCashBtn) {
            addCashBtn.addEventListener('click', () => this.openCashModal('add'));
        }

        if (removeCashBtn) {
            removeCashBtn.addEventListener('click', () => this.openCashModal('remove'));
        }

        if (cashForm) {
            cashForm.addEventListener('submit', (e) => this.handleCashSubmit(e));
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeCashModal());
        }

        // Add event listener for cancel button
        if (cancelCashBtn) {
            cancelCashBtn.addEventListener('click', () => this.closeCashModal());
        }

        // Close modal when clicking outside
        if (cashModal) {
            cashModal.addEventListener('click', (e) => {
                if (e.target === cashModal) {
                    this.closeCashModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cashModal && cashModal.style.display === 'block') {
                this.closeCashModal();
            }
        });

        // View All Transactions button
        const viewAllBtn = document.getElementById('viewAllTransactionsBtn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                this.openAllTransactionsModal();
            });
        }

        // All transactions modal event listeners
        const viewAllTransactionsBtn = document.getElementById('viewAllTransactionsBtn');
        const allTransactionsModal = document.getElementById('allTransactionsModal');
        const closeAllTransactionsModalBtn = document.querySelector('#allTransactionsModal .close');

        if (viewAllTransactionsBtn) {
            viewAllTransactionsBtn.addEventListener('click', () => this.openAllTransactionsModal());
        }

        if (closeAllTransactionsModalBtn) {
            closeAllTransactionsModalBtn.addEventListener('click', () => this.closeAllTransactionsModal());
        }

        if (allTransactionsModal) {
            allTransactionsModal.addEventListener('click', (e) => {
                if (e.target === allTransactionsModal) {
                    this.closeAllTransactionsModal();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && allTransactionsModal && allTransactionsModal.style.display === 'block') {
                this.closeAllTransactionsModal();
            }
        });
    }

    async loadDashboardStats() {
        try {
            console.log('loadDashboardStats called, window.api exists:', !!window.api);
            const stats = await window.api.getDashboardStats();
            console.log('Dashboard stats received:', stats);
            this.updateDashboardUI(stats);
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Failed to load dashboard statistics');
        }
    }

    updateDashboardUI(stats) {
        console.log('updateDashboardUI called with:', stats);
        
        // Update supplier count
        const supplierElement = document.getElementById('suppliers-count');
        if (supplierElement) {
            supplierElement.textContent = stats.active_suppliers || 0;
        }

        // Update customer count
        const customerElement = document.getElementById('customers-count');
        if (customerElement) {
            customerElement.textContent = stats.active_customers || 0;
        }

        // Update product count
        const productElement = document.getElementById('products-count');
        if (productElement) {
            productElement.textContent = stats.active_products || 0;
        }

        // Update pending orders
        const ordersElement = document.getElementById('purchases-count');
        if (ordersElement) {
            ordersElement.textContent = stats.pending_orders || 0;
        }

        // Update total count
        const totalElement = document.getElementById('total-count');
        if (totalElement) {
            const total = parseInt(stats.active_suppliers || 0) + 
                         parseInt(stats.active_customers || 0) + 
                         parseInt(stats.active_products || 0);
            totalElement.textContent = total;
        }

        // Update cash on hand 
        const cashOnHandElement = document.getElementById('cashOnHandAmount');
        console.log('Cash on hand element found:', !!cashOnHandElement);
        if (cashOnHandElement && stats.cashOnHand !== undefined) {
            const formattedValue = `$${parseFloat(stats.cashOnHand || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.log('Setting cash on hand to:', formattedValue);
            cashOnHandElement.textContent = formattedValue;
        }

        // Update inventory value 
        const inventoryValueElement = document.querySelector('.dashboard-cards .card:nth-child(3) .amount');
        console.log('Inventory element found:', !!inventoryValueElement);
        if (inventoryValueElement && stats.inventoryValue !== undefined) {
            const formattedValue = `$${parseFloat(stats.inventoryValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.log('Setting inventory value to:', formattedValue);
            inventoryValueElement.textContent = formattedValue;
        }
        
        // Update customer owing bills 
        const customerOwingElement = document.querySelector('.dashboard-cards .card:nth-child(4) .amount');
        console.log('Customer owing element found:', !!customerOwingElement);
        if (customerOwingElement && stats.customerOwingBills !== undefined) {
            const formattedValue = `$${parseFloat(stats.customerOwingBills || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.log('Setting customer owing to:', formattedValue);
            customerOwingElement.textContent = formattedValue;
        }
        
        // Update debt to suppliers
        const supplierDebtElement = document.querySelector('.dashboard-cards .card:nth-child(5) .amount');
        console.log('Supplier debt element found:', !!supplierDebtElement);
        if (supplierDebtElement && stats.debtToSuppliers !== undefined) {
            const formattedValue = `$${parseFloat(stats.debtToSuppliers || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.log('Setting supplier debt to:', formattedValue);
            supplierDebtElement.textContent = formattedValue;
        }
        
        // Calculate and update net cashflow (6th card)
        this.updateNetCashflow(stats);
    }

    updateNetCashflow(stats) {
        const netCashflowElement = document.getElementById('netCashflowAmount');
        console.log('Net cashflow element found:', !!netCashflowElement);
        
        if (netCashflowElement) {
            const cashOnHand = parseFloat(stats.cashOnHand || 0);
            const inventoryValue = parseFloat(stats.inventoryValue || 0);
            const customerOwingBills = parseFloat(stats.customerOwingBills || 0);
            const debtToSuppliers = parseFloat(stats.debtToSuppliers || 0);
            
            // Net Cashflow = Cash in hand + Inventory value + Customer owing bills - Debt to supplier
            const netCashflow = cashOnHand + inventoryValue + customerOwingBills - debtToSuppliers;
            
            const formattedValue = `$${netCashflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.log('Setting net cashflow to:', formattedValue);
            netCashflowElement.textContent = formattedValue;
            
            // Optional: Add visual indicator for positive/negative cashflow
            const cardElement = netCashflowElement.closest('.card');
            if (cardElement) {
                cardElement.classList.remove('positive-cashflow', 'negative-cashflow');
                if (netCashflow >= 0) {
                    cardElement.classList.add('positive-cashflow');
                } else {
                    cardElement.classList.add('negative-cashflow');
                }
            }
        }
    }

    openCashModal(action) {
        this.currentCashAction = action;
        const modal = document.getElementById('cashModal');
        const modalHeader = document.getElementById('cashModalHeader');
        const title = document.getElementById('cashModalTitle');
        const submitBtn = document.getElementById('cashSubmitBtn');
        const form = document.getElementById('cashForm');
        
        if (form) form.reset();
        
        // Remove any existing classes
        if (modalHeader) {
            modalHeader.classList.remove('add', 'remove');
        }
        if (submitBtn) {
            submitBtn.classList.remove('btn-add', 'btn-remove');
            // Remove inline styles that override CSS
            submitBtn.style.backgroundColor = '';
        }
        
        if (action === 'add') {
            if (title) title.textContent = 'Add Cash';
            if (modalHeader) modalHeader.classList.add('add');
            if (submitBtn) {
                submitBtn.textContent = 'Add Cash';
                submitBtn.classList.add('btn-add');
            }
        } else {
            if (title) title.textContent = 'Remove Cash';
            if (modalHeader) modalHeader.classList.add('remove');
            if (submitBtn) {
                submitBtn.textContent = 'Remove Cash';
                submitBtn.classList.add('btn-remove');
            }
        }
        
        if (modal) modal.style.display = 'block';
    }

    closeCashModal() {
        const modal = document.getElementById('cashModal');
        if (modal) modal.style.display = 'none';
        this.currentCashAction = null;
    }

    async handleCashSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const amount = parseFloat(formData.get('cashAmount'));
        const description = formData.get('cashDescription') || '';
        
        if (!amount || amount <= 0) {
            this.showError('Please enter a valid amount');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('cashSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
            }
            
            await window.api.updateCashOnHand({
                action: this.currentCashAction,
                amount: amount,
                description: description
            });
            
            this.showSuccess(`Cash ${this.currentCashAction === 'add' ? 'added' : 'removed'} successfully!`);
            this.closeCashModal();
            await this.loadDashboardStats();
            await this.loadRecentTransactions(); // Add this line to refresh transactions
            
        } catch (error) {
            console.error('Error updating cash:', error);
            this.showError('Failed to update cash. Please try again.');
        } finally {
            const submitBtn = document.getElementById('cashSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.currentCashAction === 'add' ? 'Add Cash' : 'Remove Cash';
            }
        }
    }

    showError(message) {
    if (window.showAlert) {
        window.showAlert(message, 'error');
    } else {
        alert(message);
    }
}

    showSuccess(message) {
        if (window.showAlert) {
            window.showAlert(message, 'success');
        } else {
            alert(message);
        }
    }

    async updateCashFromCustomerPayment(paymentAmount, customerName = '') {
        try {
            await window.api.updateCashOnHand({
                action: 'add',
                amount: parseFloat(paymentAmount),
                description: `Customer payment${customerName ? ` from ${customerName}` : ''}`
            });
            
            // Refresh dashboard stats and recent transactions
            await this.loadDashboardStats();
            await this.loadRecentTransactions(); // Add this line
            
        } catch (error) {
            console.error('Error updating cash from customer payment:', error);
            throw error;
        }
    }

    // Method to handle customer payment and update cash on hand
    async processCustomerPayment(customerData) {
        try {
            // First, save the customer (this would be handled by your customer management system)
            // Then update cash on hand if there's a payment amount
            if (customerData.amountPaid && customerData.amountPaid > 0) {
                await this.updateCashFromCustomerPayment(
                    customerData.amountPaid, 
                    customerData.name || customerData.customerName
                );
            }
            
            return true;
        } catch (error) {
            console.error('Error processing customer payment:', error);
            this.showError('Failed to process customer payment');
            return false;
        }
    }

    async updateCashFromCustomerDeletion(customerData) {
        try {
            // Calculate total amount paid by the customer
            let totalPaid = 0;
            
            // If customer has products with payments
            if (customerData.products && Array.isArray(customerData.products)) {
                totalPaid = customerData.products.reduce((sum, product) => {
                    return sum + (parseFloat(product.amount_paid) || 0);
                }, 0);
            } else if (customerData.amount_paid) {
                // If it's a single customer record with amount_paid
                totalPaid = parseFloat(customerData.amount_paid) || 0;
            }
            
            // Only update cash if there was actually money paid
            if (totalPaid > 0) {
                await window.api.updateCashOnHand({
                    action: 'remove',
                    amount: totalPaid,
                    description: `Customer deletion - ${customerData.name || customerData.customer_name || 'Unknown Customer'} (Refund: ${totalPaid.toFixed(2)})`
                });
                
                // Refresh dashboard stats to show updated cash on hand
                await this.loadDashboardStats();
                
                console.log(`Cash reduced by ${totalPaid.toFixed(2)} due to customer deletion`);
            }
            
        } catch (error) {
            console.error('Error updating cash from customer deletion:', error);
            throw error; // Re-throw so calling code can handle it
        }
    }

    // Method to handle customer deletion and update cash on hand
    async processCustomerDeletion(customerData) {
        try {
            // Update cash on hand if customer had made payments
            await this.updateCashFromCustomerDeletion(customerData);
            
            return true;
        } catch (error) {
            console.error('Error processing customer deletion cash update:', error);
            this.showError('Failed to update cash on hand after customer deletion');
            return false;
        }
    }

    async loadRecentTransactions() {
        try {
            const loadingElement = document.getElementById('loadingTransactions');
            const tableBody = document.getElementById('recentTransactionsBody');
            const noTransactionsMessage = document.getElementById('noTransactionsMessage');
            
            if (loadingElement) loadingElement.style.display = 'block';
            if (noTransactionsMessage) noTransactionsMessage.style.display = 'none';
            
            const response = await window.api.getRecentTransactions();
            
            if (loadingElement) loadingElement.style.display = 'none';
            
            if (response && response.transactions && response.transactions.length > 0) {
                this.displayRecentTransactions(response.transactions);
            } else {
                if (tableBody) tableBody.innerHTML = '';
                if (noTransactionsMessage) noTransactionsMessage.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error loading recent transactions:', error);
            const loadingElement = document.getElementById('loadingTransactions');
            const noTransactionsMessage = document.getElementById('noTransactionsMessage');
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (noTransactionsMessage) {
                noTransactionsMessage.style.display = 'block';
                noTransactionsMessage.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading transactions</p>
                    <small>Please try refreshing the page</small>
                `;
            }
        }
    }

    displayRecentTransactions(transactions) {
    const tableBody = document.getElementById('recentTransactionsBody');
    if (!tableBody) return;
 
    const limitedTransactions = transactions.slice(0, 5);
    
    tableBody.innerHTML = limitedTransactions.map(transaction => {
        const isIncome = transaction.type === 'cash_in';
        const amountClass = isIncome ? 'amount-positive' : 'amount-negative';
        const typeIcon = isIncome ? 'fa-arrow-up' : 'fa-arrow-down';
        const typeText = isIncome ? 'Cash In' : 'Cash Out';
        
        return `
            <tr class="transaction-row">
                <td class="transaction-date">
                    <div class="date-info">
                        <span class="date">${transaction.formattedDate}</span>
                        <small class="time">${transaction.formattedTime}</small>
                    </div>
                </td>
                <td class="transaction-type">
                    <span class="type-badge ${isIncome ? 'type-income' : 'type-expense'}">
                        <i class="fas ${typeIcon}"></i>
                        ${typeText}
                    </span>
                </td>
                <td class="transaction-description">
                    ${transaction.description}
                </td>
                <td class="transaction-amount">
                    <span class="amount ${amountClass}">
                        ${isIncome ? '+' : '-'}$${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

    openAllTransactionsModal() {
        const modal = document.getElementById('allTransactionsModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadAllTransactions();
        }
    }

    closeAllTransactionsModal() {
        const modal = document.getElementById('allTransactionsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async loadAllTransactions() {
        try {
            const loadingElement = document.getElementById('loadingAllTransactions');
            const tableBody = document.getElementById('allTransactionsBody');
            const noTransactionsElement = document.getElementById('noAllTransactionsMessage');
            
            if (loadingElement) loadingElement.style.display = 'block';
            if (tableBody) tableBody.innerHTML = '';
            if (noTransactionsElement) noTransactionsElement.style.display = 'none';
            
            const transactions = await window.api.getAllTransactions();
            
            if (loadingElement) loadingElement.style.display = 'none';
            
            if (transactions && transactions.length > 0) {
                this.renderAllTransactions(transactions);
            } else {
                if (noTransactionsElement) noTransactionsElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading all transactions:', error);
            const loadingElement = document.getElementById('loadingAllTransactions');
            if (loadingElement) loadingElement.style.display = 'none';
            this.showError('Failed to load transactions');
        }
    }

    renderAllTransactions(transactions) {
        const tableBody = document.getElementById('allTransactionsBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const dateObj = new Date(transaction.created_at);
            const formattedDate = dateObj.toLocaleDateString();
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const type = transaction.transaction_type === 'cash_in' ? 'Cash In' : 'Cash Out';
            const typeClass = transaction.transaction_type === 'cash_in' ? 'cash-in' : 'cash-out';
            const amount = Math.abs(parseFloat(transaction.amount)).toFixed(2);
            const description = transaction.description || 'No description';
            
            row.innerHTML = `
                <td>
                    <div class="date-info">
                        <span class="date">${formattedDate}</span>
                        <small class="time">${formattedTime}</small>
                    </div>
                </td>
                <td><span class="transaction-type ${typeClass}">${type}</span></td>
                <td>${description}</td>
                <td class="amount ${typeClass}">${transaction.transaction_type === 'cash_in' ? '+' : '-'}$${Math.abs(parseFloat(transaction.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                `;
            
            tableBody.appendChild(row);
        });
    }
}

// Store the class globally
window.Dashboard = Dashboard;

// Remove the automatic initialization - it will be handled by script.js
console.log('Dashboard.js fully loaded');