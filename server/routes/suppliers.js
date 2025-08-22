const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Stats routes should come BEFORE parameterized routes like /:id
// Get supplier statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as supplier_count,
        COALESCE(SUM(sp.balance), 0) as total_payables,
        COUNT(sp.id) as total_products
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Stats endpoint error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get total payables (alternative stats endpoint)
router.get('/stats/payables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as supplier_count,
        COALESCE(SUM(sp.balance), 0) as total_payables,
        COALESCE(SUM(sp.quantity * sp.price), 0) as total_amount,
        COALESCE(SUM(sp.amount_paid), 0) as total_paid
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Payables stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all suppliers with their products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.email,
        s.phone,
        s.address,
        s.contact_person,
        sp.id as product_id,
        sp.product_name,
        sp.product_id as product_code,
        sp.quantity,
        sp.price,
        sp.payment_status,
        sp.amount_paid,
        sp.balance,
        sp.created_at
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
      ORDER BY s.name, sp.product_name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get supplier by ID (this should come after stats routes)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        s.*,
        sp.id as product_id,
        sp.product_name,
        sp.product_id as product_code,
        sp.quantity,
        sp.price,
        sp.payment_status,
        sp.amount_paid,
        sp.balance
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get supplier by ID error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new supplier with product
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      supplierName, 
      productName, 
      productId, 
      quantity = 0, 
      price = 0, 
      paymentStatus = 'unpaid', 
      amountPaid = 0,
      email = '',
      phone = '',
      address = '',
      contactPerson = ''
    } = req.body;

    // Calculate the correct amount_paid based on payment status
    const totalAmount = quantity * price;
    let finalAmountPaid = amountPaid;
    
    
    // If payment status is "paid" or "fully paid", set amount_paid to total amount
    if (paymentStatus === 'paid' || paymentStatus === 'fully_paid') {
      finalAmountPaid = totalAmount;
    } else if (paymentStatus === 'unpaid') {
      finalAmountPaid = 0;
    } else {
    }

    // Check if supplier already exists
    let supplierResult = await client.query(
      'SELECT id FROM suppliers WHERE name = $1',
      [supplierName]
    );

    let supplierId;
    
    if (supplierResult.rows.length > 0) {
      // Supplier exists, use existing ID
      supplierId = supplierResult.rows[0].id;
      console.log('Using existing supplier ID:', supplierId);
    } else {
      // Create new supplier
      const newSupplierResult = await client.query(
        'INSERT INTO suppliers (name, email, phone, address, contact_person) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [supplierName, email, phone, address, contactPerson]
      );
      supplierId = newSupplierResult.rows[0].id;
    }

    // Add product to supplier with calculated amount_paid
    const productResult = await client.query(
      'INSERT INTO supplier_products (supplier_id, product_name, product_id, quantity, price, payment_status, amount_paid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [supplierId, productName, productId, quantity, price, paymentStatus, finalAmountPaid]
    );

    // Also add to inventory table with calculated amount_paid
   await client.query(
      'INSERT INTO inventory (supplier_name, product_name, product_id, quantity, price, payment_status, amount_paid) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [supplierName, productName, productId, quantity, price, paymentStatus, finalAmountPaid]
    );

    await client.query('COMMIT');
    
    // Get the complete record with supplier info
    const completeResult = await client.query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.email,
        s.phone,
        s.address,
        s.contact_person,
        sp.id as product_id,
        sp.product_name,
        sp.product_id as product_code,
        sp.quantity,
        sp.price,
        sp.payment_status,
        sp.amount_paid,
        sp.balance,
        sp.created_at
      FROM suppliers s
      JOIN supplier_products sp ON s.id = sp.supplier_id
      WHERE sp.id = $1
    `, [productResult.rows[0].id]);

    res.status(201).json(completeResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Update supplier product
router.put('/:productId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { productId } = req.params;
    const { 
      supplierName, 
      productName, 
      productId: newProductId, 
      quantity, 
      price, 
      paymentStatus, 
      amountPaid = 0 
    } = req.body;

    // Calculate the correct amount_paid based on payment status
    const totalAmount = quantity * price;
    let finalAmountPaid = amountPaid;
    
    console.log('Calculated total amount:', totalAmount);
    console.log('Initial finalAmountPaid:', finalAmountPaid);
    
    // If payment status is "paid" or "fully paid", set amount_paid to total amount
    if (paymentStatus === 'paid' || paymentStatus === 'fully_paid') {
      finalAmountPaid = totalAmount;
      console.log('Payment status is paid/fully_paid, setting finalAmountPaid to:', finalAmountPaid);
    } else if (paymentStatus === 'unpaid') {
      finalAmountPaid = 0;
      console.log('Payment status is unpaid, setting finalAmountPaid to:', finalAmountPaid);
    } else {
      console.log('Payment status is partial, keeping finalAmountPaid as:', finalAmountPaid);
    }
    
    console.log('Final amount paid to be saved:', finalAmountPaid);

    // Get current supplier product with original product_id
    const currentProduct = await client.query(
      'SELECT sp.supplier_id, sp.product_id as original_product_id, sp.quantity as original_quantity, s.name as original_supplier_name FROM supplier_products sp JOIN suppliers s ON sp.supplier_id = s.id WHERE sp.id = $1',
      [productId]
    );

    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier product not found' });
    }

    const supplierId = currentProduct.rows[0].supplier_id;
    const originalProductId = currentProduct.rows[0].original_product_id;
    const originalSupplierName = currentProduct.rows[0].original_supplier_name;
    const originalQuantity = parseInt(currentProduct.rows[0].original_quantity);

    console.log('Original product info:', {
      supplierId,
      originalProductId,
      originalSupplierName,
      originalQuantity
    });

    // Get current inventory quantity to calculate how much was sold
    const inventoryResult = await client.query(
      'SELECT quantity FROM inventory WHERE product_id = $1 AND supplier_name = $2',
      [originalProductId, originalSupplierName]
    );

    let currentInventoryQuantity = 0;
    let quantitySold = 0;
    
    if (inventoryResult.rows.length > 0) {
      currentInventoryQuantity = parseInt(inventoryResult.rows[0].quantity);
      quantitySold = originalQuantity - currentInventoryQuantity;
      console.log('Current inventory quantity:', currentInventoryQuantity);
      console.log('Quantity sold (original - current inventory):', quantitySold);
    }

    // Calculate new inventory quantity: new supplier quantity minus what was already sold
    const newInventoryQuantity = Math.max(0, quantity - quantitySold);
    console.log('New inventory quantity will be:', newInventoryQuantity);

    // Update supplier info
    await client.query(
      'UPDATE suppliers SET name = $1 WHERE id = $2',
      [supplierName, supplierId]
    );

    // Update product info in supplier_products with calculated amount_paid
    console.log('Updating supplier_products with values:', [productName, newProductId, quantity, price, paymentStatus, finalAmountPaid, productId]);
    await client.query(
      'UPDATE supplier_products SET product_name = $1, product_id = $2, quantity = $3, price = $4, payment_status = $5, amount_paid = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
      [productName, newProductId, quantity, price, paymentStatus, finalAmountPaid, productId]
    );

    // Update inventory table with calculated inventory quantity (preserving sales)
    console.log('Updating inventory with values:', [supplierName, productName, newProductId, newInventoryQuantity, price, paymentStatus, finalAmountPaid, originalProductId, originalSupplierName]);
    await client.query(
      'UPDATE inventory SET supplier_name = $1, product_name = $2, product_id = $3, quantity = $4, price = $5, payment_status = $6, amount_paid = $7, updated_at = CURRENT_TIMESTAMP WHERE product_id = $8 AND supplier_name = $9',
      [supplierName, productName, newProductId, newInventoryQuantity, price, paymentStatus, finalAmountPaid, originalProductId, originalSupplierName]
    );

    await client.query('COMMIT');

    // Get updated record
    const result = await client.query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.email,
        s.phone,
        s.address,
        s.contact_person,
        sp.id as product_id,
        sp.product_name,
        sp.product_id as product_code,
        sp.quantity,
        sp.price,
        sp.payment_status,
        sp.amount_paid,
        sp.balance,
        sp.created_at
      FROM suppliers s
      JOIN supplier_products sp ON s.id = sp.supplier_id
      WHERE sp.id = $1
    `, [productId]);

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update supplier error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete supplier product (DO NOT delete from inventory)
router.delete('/:productId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { productId } = req.params;

    // Get supplier ID before deleting
    const productResult = await client.query(
      'SELECT supplier_id FROM supplier_products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier product not found' });
    }

    const supplierId = productResult.rows[0].supplier_id;

    // Delete the product from supplier_products ONLY (keep inventory record)
    await client.query('DELETE FROM supplier_products WHERE id = $1', [productId]);

    // Check if supplier has any other products
    const remainingProducts = await client.query(
      'SELECT COUNT(*) as count FROM supplier_products WHERE supplier_id = $1',
      [supplierId]
    );

    // If no products left, delete the supplier (but keep inventory records)
    if (parseInt(remainingProducts.rows[0].count) === 0) {
      await client.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Supplier product deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete supplier error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;