const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Stats routes should come BEFORE parameterized routes like /:id
// Get customer statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as customer_count,
        COALESCE(SUM(cp.balance), 0) as total_receivables,
        COUNT(cp.id) as total_products
      FROM customers c
      LEFT JOIN customer_products cp ON c.id = cp.customer_id
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Stats endpoint error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get total receivables (alternative stats endpoint)
router.get('/stats/receivables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as customer_count,
        COALESCE(SUM(cp.balance), 0) as total_receivables,
        COALESCE(SUM(cp.quantity * cp.price), 0) as total_amount,
        COALESCE(SUM(cp.amount_paid), 0) as total_paid
      FROM customers c
      LEFT JOIN customer_products cp ON c.id = cp.customer_id
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Receivables stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all customers with their products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        cp.id as product_id,
        cp.product_name,
        cp.product_id as product_code,
        cp.quantity,
        cp.price,
        cp.payment_status,
        cp.amount_paid,
        cp.balance,
        cp.created_at
      FROM customers c
      LEFT JOIN customer_products cp ON c.id = cp.customer_id
      ORDER BY c.name, cp.product_name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer by ID (this should come after stats routes)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        c.*,
        cp.id as product_id,
        cp.product_name,
        cp.product_id as product_code,
        cp.quantity,
        cp.price,
        cp.payment_status,
        cp.amount_paid,
        cp.balance
      FROM customers c
      LEFT JOIN customer_products cp ON c.id = cp.customer_id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get customer by ID error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new customer with product
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      customerName, 
      productName = 'General Purchase',
      productId = `CUST-${Date.now()}`,
      quantity = 1, 
      price = 0, 
      paymentStatus = 'unpaid', 
      amountPaid = 0
    } = req.body;

    // Calculate balance
    const totalAmount = quantity * price;
    const balance = totalAmount - amountPaid;

    // Check if customer already exists
    let customerResult = await client.query(
      'SELECT id FROM customers WHERE name = $1',
      [customerName]
    );

    let customerId;
    
    if (customerResult.rows.length > 0) {
      // Customer exists, use existing ID
      customerId = customerResult.rows[0].id;
    } else {
      // Create new customer
      const newCustomerResult = await client.query(
        'INSERT INTO customers (name) VALUES ($1) RETURNING id',
        [customerName]
      );
      customerId = newCustomerResult.rows[0].id;
    }

    // Add product to customer
    const productResult = await client.query(
      'INSERT INTO customer_products (customer_id, product_name, product_id, quantity, price, payment_status, amount_paid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [customerId, productName, productId, quantity, price, paymentStatus, amountPaid]
    );

    await client.query('COMMIT');
    
    // Get the complete record with customer info
    const completeResult = await client.query(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        cp.id as product_id,
        cp.product_name,
        cp.product_id as product_code,
        cp.quantity,
        cp.price,
        cp.payment_status,
        cp.amount_paid,
        cp.balance,
        cp.created_at
      FROM customers c
      JOIN customer_products cp ON c.id = cp.customer_id
      WHERE cp.id = $1
    `, [productResult.rows[0].id]);

    res.status(201).json(completeResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Update customer product
router.put('/:productId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { productId } = req.params;
    const { 
      customerName, 
      productName, 
      productId: newProductId, 
      quantity, 
      price, 
      paymentStatus, 
      amountPaid = 0 
    } = req.body;

    // Ensure proper number parsing
    const parsedQuantity = parseFloat(quantity) || 0;
    const parsedPrice = parseFloat(price) || 0;
    let parsedAmountPaid = parseFloat(amountPaid) || 0;

    // Calculate total amount
    const totalAmount = parsedQuantity * parsedPrice;

    // Handle payment status logic
    if (paymentStatus === 'unpaid') {
      // For unpaid status, amount paid should be 0
      parsedAmountPaid = 0;
    } else if (paymentStatus === 'fully_paid') {
      // For fully paid status, amount paid should equal total amount
      parsedAmountPaid = totalAmount;
    } else if (paymentStatus === 'partially_paid') {
      // Validation for partial payments
      if (parsedAmountPaid >= totalAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `For partial payment, amount paid (${parsedAmountPaid}) must be less than total amount (${totalAmount})` 
        });
      }
      if (parsedAmountPaid <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `For partial payment, amount paid must be greater than 0` 
        });
      }
    }

    // Get current customer product
    const currentProduct = await client.query(
      'SELECT customer_id FROM customer_products WHERE id = $1',
      [productId]
    );

    if (currentProduct.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer product not found' });
    }

    const customerId = currentProduct.rows[0].customer_id;

    // Update customer info
    await client.query(
      'UPDATE customers SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [customerName, customerId]
    );

    // Update product info (balance is automatically calculated by the database)
    await client.query(
      'UPDATE customer_products SET product_name = $1, product_id = $2, quantity = $3, price = $4, payment_status = $5, amount_paid = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
      [productName, newProductId, parsedQuantity, parsedPrice, paymentStatus, parsedAmountPaid, productId]
    );

    await client.query('COMMIT');

    // Get updated record
    const result = await client.query(`
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        cp.id as product_id,
        cp.product_name,
        cp.product_id as product_code,
        cp.quantity,
        cp.price,
        cp.payment_status,
        cp.amount_paid,
        cp.balance,
        cp.created_at
      FROM customers c
      JOIN customer_products cp ON c.id = cp.customer_id
      WHERE cp.id = $1
    `, [productId]);

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete customer product
router.delete('/:productId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { productId } = req.params;

    // Get customer ID before deleting
    const productResult = await client.query(
      'SELECT customer_id FROM customer_products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer product not found' });
    }

    const customerId = productResult.rows[0].customer_id;

    // Delete the product
    await client.query('DELETE FROM customer_products WHERE id = $1', [productId]);

    // Check if customer has any other products
    const remainingProducts = await client.query(
      'SELECT COUNT(*) as count FROM customer_products WHERE customer_id = $1',
      [customerId]
    );

    // If no products left, delete the customer
    if (parseInt(remainingProducts.rows[0].count) === 0) {
      await client.query('DELETE FROM customers WHERE id = $1', [customerId]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Customer product deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Add product to customer
router.post('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, product_id, quantity, price, payment_status, amount_paid } = req.body;
    
    const result = await pool.query(
      'INSERT INTO customer_products (customer_id, product_name, product_id, quantity, price, payment_status, amount_paid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, product_name, product_id, quantity, price, payment_status || 'unpaid', amount_paid || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add product to customer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create return for customer product
router.post('/:productId/return', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { productId } = req.params;
    const { 
      returnQuantity, 
      refundAmount, // New field for custom refund amount
      reason = 'Customer return', 
      notes = ''
    } = req.body;

    // Validate return quantity
    if (!returnQuantity || returnQuantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Return quantity must be greater than 0' });
    }

    // Get customer product details
    const productResult = await client.query(`
      SELECT 
        cp.*,
        c.name as customer_name
      FROM customer_products cp
      JOIN customers c ON cp.customer_id = c.id
      WHERE cp.id = $1
    `, [productId]);

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer product not found' });
    }

    const product = productResult.rows[0];

    // Validate return quantity doesn't exceed purchased quantity
    if (returnQuantity > product.quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Return quantity (${returnQuantity}) cannot exceed purchased quantity (${product.quantity})` 
      });
    }

    // Calculate refund amount - use custom amount if provided, otherwise calculate based on unit price
    const calculatedRefundAmount = returnQuantity * product.price;
    const actualRefundAmount = refundAmount !== undefined ? parseFloat(refundAmount) : calculatedRefundAmount;

    // Validate refund amount
    if (actualRefundAmount < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Refund amount cannot be negative' });
    }

    // Generate unique return ID
    const returnId = `RET${Date.now()}`;
    const returnDate = new Date().toISOString().split('T')[0];

    // Create return record with actual refund amount
    await client.query(`
      INSERT INTO returns (
        return_id, 
        return_type, 
        original_order_id, 
        customer_supplier_name, 
        return_date, 
        total_amount, 
        status, 
        reason, 
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      returnId,
      'customer',
      product.product_id,
      product.customer_name,
      returnDate,
      actualRefundAmount, // Use actual refund amount instead of calculated
      'completed',
      reason,
      notes
    ]);

    // Create return item record
    await client.query(`
      INSERT INTO return_items (
        return_id,
        product_name,
        product_id,
        quantity,
        unit_price,
        total_price
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      returnId,
      product.product_name,
      product.product_id,
      returnQuantity,
      product.price,
      actualRefundAmount // Use actual refund amount
    ]);

    // Update customer product quantity and recalculate amounts
    const newQuantity = product.quantity - returnQuantity;
    const newTotalAmount = newQuantity * product.price;
    
    // Adjust amount paid - subtract the actual refund amount from current amount paid
    const newAmountPaid = Math.max(0, product.amount_paid - actualRefundAmount);
    
    // Determine new payment status
    let newPaymentStatus;
    if (newAmountPaid <= 0 || newTotalAmount <= 0) {
      newPaymentStatus = 'unpaid';
    } else if (Math.abs(newAmountPaid - newTotalAmount) < 0.01) {
      newPaymentStatus = 'fully_paid';
    } else {
      newPaymentStatus = 'partially_paid';
    }

    if (newQuantity === 0) {
      // If all items returned, delete the customer product
      await client.query('DELETE FROM customer_products WHERE id = $1', [productId]);
      
      // Check if customer has any other products
      const remainingProducts = await client.query(
        'SELECT COUNT(*) as count FROM customer_products WHERE customer_id = $1',
        [product.customer_id]
      );

      // If no products left, delete the customer
      if (parseInt(remainingProducts.rows[0].count) === 0) {
        await client.query('DELETE FROM customers WHERE id = $1', [product.customer_id]);
      }
    } else {
      // Update customer product with new quantities
      await client.query(`
        UPDATE customer_products 
        SET 
          quantity = $1,
          amount_paid = $2,
          payment_status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [newQuantity, newAmountPaid, newPaymentStatus, productId]);
    }

    // Add returned items back to original supplier's inventory
    // Find the existing inventory entry for this product (excluding any "Returned Items" entries)
    const inventoryCheck = await client.query(
      'SELECT id, quantity, supplier_name FROM inventory WHERE product_id = $1 ORDER BY created_at ASC LIMIT 1',
      [product.product_id]
    );

    if (inventoryCheck.rows.length > 0) {
      // Update the existing inventory entry - add returned quantity
      const existingInventory = inventoryCheck.rows[0];
      await client.query(
        'UPDATE inventory SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [returnQuantity, existingInventory.id]
      );
      } else {
      console.warn(`No inventory found for product ${product.product_id}. Return processed but inventory not updated.`);
    }

    // Make sure no duplicate "Returned Items" entries are created
    // Delete any "Returned Items" entries that might have been created
    await client.query(
      'DELETE FROM inventory WHERE supplier_name = $1 AND product_id = $2',
      ['Returned Items', product.product_id]
    );

    await client.query('COMMIT');


  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Process return error:', err);
    res.status(500).json({ error: 'Server error processing return: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;