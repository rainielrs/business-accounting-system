-- Suppliers table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Products table 
CREATE TABLE supplier_products (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')),
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS ((quantity * price) - amount_paid) STORED,
    supplier_name VARCHAR(255), -- Add this to preserve supplier name even after deletion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table 
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')),
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS ((quantity * price) - amount_paid) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table 
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    total_purchases DECIMAL(10, 2) DEFAULT 0,
    outstanding_balance DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Products table
CREATE TABLE customer_products (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')),
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS ((quantity * price) - amount_paid) STORED,
    customer_name VARCHAR(255), -- Add this to preserve customer name even after deletion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Transactions table
CREATE TABLE cash_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('cash_in', 'cash_out')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Returns table
CREATE TABLE returns (
    id SERIAL PRIMARY KEY,
    return_id VARCHAR(20) UNIQUE NOT NULL,
    return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('customer', 'supplier')),
    original_order_id VARCHAR(20) NOT NULL,
    customer_supplier_name VARCHAR(255) NOT NULL,
    return_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return items table 
CREATE TABLE return_items (
    id SERIAL PRIMARY KEY,
    return_id VARCHAR(20) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES returns(return_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product_id ON supplier_products(product_id);
CREATE INDEX idx_inventory_supplier_name ON inventory(supplier_name);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_created_at ON inventory(created_at);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customer_products_customer_id ON customer_products(customer_id);
CREATE INDEX idx_customer_products_product_id ON customer_products(product_id);
CREATE INDEX idx_cash_transactions_created_at ON cash_transactions(created_at);
CREATE INDEX idx_cash_transactions_type ON cash_transactions(transaction_type);
CREATE INDEX idx_returns_return_id ON returns(return_id);
CREATE INDEX idx_returns_type ON returns(return_type);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_date ON returns(return_date);
CREATE INDEX idx_returns_customer_supplier ON returns(customer_supplier_name);
CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_product_id ON return_items(product_id);