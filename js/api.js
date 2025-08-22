class API {
    constructor() {
        // More robust base URL detection for different environments
        this.baseURL = this.getBaseURL() + '/api';
        this.timeout = 30000; // 30 second timeout
    }

    getBaseURL() {
        // Handle different deployment scenarios
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return window.location.origin;
        }
        
        // For Railway or other cloud deployments
        return window.location.origin;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            // Add timeout for better UX
            signal: AbortSignal.timeout(this.timeout),
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                // More specific error handling
                const error = new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const data = await response.json();
            console.log(`✅ API Response: ${config.method || 'GET'} ${url}`, data);
            return data;
            
        } catch (error) {
            // Enhanced error logging for debugging
            if (error.name === 'AbortError') {
                console.error('❌ API request timeout:', url);
                throw new Error('Request timeout - please check your connection');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('❌ Network error:', url, error);
                throw new Error('Network error - please check your connection');
            } else {
                console.error('❌ API request failed:', url, error);
                throw error;
            }
        }
    }

    // Add a health check method for deployment verification
    async healthCheck() {
        try {
            const response = await this.request('/test');
            console.log('✅ API Health Check passed:', response);
            return response;
        } catch (error) {
            console.error('❌ API Health Check failed:', error);
            throw error;
        }
    }

    // Add connection test method
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            return response.ok;
        } catch {
            return false;
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

// Test connection on load for debugging
window.api.testConnection().then(connected => {
    if (connected) {
        console.log('✅ API connection test passed');
    } else {
        console.warn('⚠️ API connection test failed');
    }
});

console.log('🚀 API initialized with base URL:', window.api.baseURL);