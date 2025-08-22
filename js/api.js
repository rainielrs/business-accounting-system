class API {
    constructor() {
        this.baseURL = window.location.origin + '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Supplier methods
    async getSuppliers() {
        return this.request('/suppliers');
    }

    async getSupplierStats() {
        return this.request('/suppliers/stats');
    }

    async createSupplier(supplierData) {
        return this.request('/suppliers', {
            method: 'POST',
            body: supplierData,
        });
    }

    async updateSupplier(productId, supplierData) {
        return this.request(`/suppliers/${productId}`, {
            method: 'PUT',
            body: supplierData,
        });
    }

    async deleteSupplier(productId) {
        return this.request(`/suppliers/${productId}`, {
            method: 'DELETE',
        });
    }

    async returnSupplier(productId) {
        return this.request(`/suppliers/${productId}/return`, {
            method: 'POST',
        });
    }

    // Customer API methods
    async getCustomers() {
        return this.request('/customers');
    }

    async getCustomerStats() {
        return this.request('/customers/stats');
    }

    async createCustomer(customerData) {
        return this.request('/customers', {
            method: 'POST',
            body: customerData,
        });
    }

    async updateCustomer(productId, customerData) {
        return this.request(`/customers/${productId}`, {
            method: 'PUT',
            body: customerData,
        });
    }

    async deleteCustomer(productId) {
        return this.request(`/customers/${productId}`, {
            method: 'DELETE',
        });
    }

    // Returns API methods
    async getReturns() {
        return this.request('/returns');
    }

    async getReturn(id) {
        return this.request(`/returns/${id}`);
    }

    async updateReturn(id, returnData) {
        return this.request(`/returns/${id}`, {
            method: 'PUT',
            body: returnData,
        });
    }

    async deleteReturn(id) {
        return this.request(`/returns/${id}`, {
            method: 'DELETE',
        });
    }

    async reverseReturn(id) {
        return this.request(`/returns/${id}/reverse`, {
            method: 'POST',
        });
    }

    // Dashboard API methods
    async getDashboardStats() {
        console.log('Calling dashboard stats API...');
        return this.request('/dashboard/stats');
    }

    // Cash management API methods
    async updateCashOnHand(data) {
        return this.request('/cash/update', {
            method: 'POST',
            body: data,
        });
    }

    async getCashBalance() {
        return this.request('/cash/balance');
    }

    async getCashTransactions() {
        return this.request('/cash');
    }

    async getRecentTransactions(limit = 10) {
        return this.request(`/cash/recent?limit=${limit}`);
    }

    async getAllTransactions() {
        return this.request('/cash/');
    }

    // Inventory API methods
    async getInventory() {
        return this.request('/inventory');
    }

    async getInventoryStats() {
        return this.request('/inventory/stats');
    }

    async getInventoryItem(id) {
        return this.request(`/inventory/${id}`);
    }

    async updateInventoryItem(id, itemData) {
        return this.request(`/inventory/${id}`, {
            method: 'PUT',
            body: itemData,
        });
    }

    async deleteInventoryItem(id) {
        return this.request(`/inventory/${id}`, {
            method: 'DELETE',
        });
    }

    async updateInventoryStock(inventoryId, quantitySold) {
        console.log('API: Reducing stock for inventory ID:', inventoryId, 'Quantity:', quantitySold);
        
        return this.request(`/inventory/${inventoryId}/reduce-stock`, {
            method: 'PUT',
            body: { 
                quantity_sold: quantitySold 
            }
        });
    }

    // Reset/Settings API methods
    async resetAllData() {
        return this.request('/settings/reset', {
            method: 'DELETE',
        });
    }

    async getDataCounts() {
        return this.request('/settings/counts');
    }

    async processCustomerReturn(productId, returnData) {
        return this.request(`/customers/${productId}/return`, {
            method: 'POST',
            body: returnData,
        });
    }

    async processInventoryReturn(inventoryId, returnData) {
        return this.request(`/inventory/${inventoryId}/return`, {
            method: 'POST',
            body: returnData,
        });
    }
}

// Initialize API and make it globally available
window.api = new API();
console.log('API initialized');