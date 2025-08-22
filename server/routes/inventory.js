const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get inventory statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(DISTINCT supplier_name) as total_suppliers,
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(quantity * price), 0) as total_value,
        COALESCE(SUM(
          CASE 
            WHEN (quantity * price) - amount_paid < 0 
            THEN 0 
            ELSE (quantity * price) - amount_paid 
          END
        ), 0) as total_outstanding
      FROM inventory
    `);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Inventory stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        supplier_name,
        product_name,
        product_id,
        quantity,
        price,
        payment_status,
        amount_paid,
        balance,
        created_at,
        updated_at
      FROM inventory
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        supplier_name,
        product_name,
        product_id,
        quantity,
        price,
        payment_status,
        amount_paid,
        balance,
        created_at,
        updated_at
      FROM inventory
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get inventory item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search inventory by product name or supplier
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        supplier_name,
        product_name,
        product_id,
        quantity,
        price,
        payment_status,
        amount_paid,
        balance,
        created_at,
        updated_at
      FROM inventory
      WHERE 
        LOWER(product_name) LIKE LOWER($1) OR
        LOWER(supplier_name) LIKE LOWER($1) OR
        LOWER(product_id) LIKE LOWER($1)
      ORDER BY created_at DESC
    `, [`%${term}%`]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Search inventory error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inventory by supplier
router.get('/supplier/:supplierName', async (req, res) => {
  try {
    const { supplierName } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        supplier_name,
        product_name,
        product_id,
        quantity,
        price,
        payment_status,
        amount_paid,
        balance,
        created_at,
        updated_at
      FROM inventory
      WHERE LOWER(supplier_name) = LOWER($1)
      ORDER BY created_at DESC
    `, [supplierName]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get inventory by supplier error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update inventory item (manual adjustment)
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      supplier_name,
      product_name,
      product_id,
      quantity,
      price,
      payment_status,
      amount_paid = 0
    } = req.body;

    // Update inventory item
    const result = await client.query(
      'UPDATE inventory SET supplier_name = $1, product_name = $2, product_id = $3, quantity = $4, price = $5, payment_status = $6, amount_paid = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [supplier_name, product_name, product_id, quantity, price, payment_status, amount_paid, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update inventory error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Reduce inventory stock
router.put('/:id/reduce-stock', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { quantity_sold } = req.body;

    if (!quantity_sold || quantity_sold <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid quantity sold' });
    }

    // Get current inventory item
    const currentResult = await client.query(
      'SELECT * FROM inventory WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const currentItem = currentResult.rows[0];
    const currentQuantity = parseInt(currentItem.quantity) || 0;

    // Check if there's enough stock
    if (currentQuantity < quantity_sold) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Insufficient stock. Available: ${currentQuantity}, Requested: ${quantity_sold}` 
      });
    }

    // Calculate new quantity
    const newQuantity = currentQuantity - quantity_sold;

    // Update inventory quantity
    const result = await client.query(
      'UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newQuantity, id]
    );

    await client.query('COMMIT');
    
    res.json({
      message: 'Inventory stock updated successfully',
      item: result.rows[0],
      quantity_sold: quantity_sold,
      previous_quantity: currentQuantity,
      new_quantity: newQuantity
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reduce inventory stock error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  } finally {
    client.release();
  }
});

// Delete inventory item (manual removal)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if item exists
    const checkResult = await client.query(
      'SELECT id FROM inventory WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Delete the inventory item
    await client.query('DELETE FROM inventory WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete inventory error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Create return for inventory item
router.post('/:id/return', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      return_quantity,
      refund_amount,
      return_reason = 'Inventory return',
      return_notes = ''
    } = req.body;

    // Convert to numbers and validate (same as customers route)
    const returnQty = parseInt(return_quantity);
    const refundAmt = parseFloat(refund_amount);

    // Validate return quantity
    if (!returnQty || isNaN(returnQty) || returnQty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Return quantity must be a valid number greater than 0' });
    }

    // Validate refund amount
    if (isNaN(refundAmt) || refundAmt < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Refund amount must be a valid number and cannot be negative' });
    }

    // Get inventory item details
    const inventoryResult = await client.query(`
      SELECT *
      FROM inventory
      WHERE id = $1
    `, [id]);

    if (inventoryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const inventoryItem = inventoryResult.rows[0];

    // Validate return quantity doesn't exceed current quantity
    if (returnQty > inventoryItem.quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Return quantity (${returnQty}) cannot exceed current quantity (${inventoryItem.quantity})` 
      });
    }

    // Calculate refund amount - use custom amount if provided, otherwise calculate based on unit price
    const calculatedRefundAmount = returnQty * inventoryItem.price;
    const actualRefundAmount = refund_amount !== undefined ? parseFloat(refund_amount) : calculatedRefundAmount;

    // Generate unique return ID (same format as customers)
    const returnId = `RET${Date.now()}`;
    const returnDate = new Date().toISOString().split('T')[0];

    // Create return record (using same field mapping as customers route)
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
      'supplier',
      inventoryItem.product_id,
      inventoryItem.supplier_name,
      returnDate,
      actualRefundAmount,
      'completed',
      return_reason,  // Use the original field name like customers route
      return_notes    // Use the original field name like customers route
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
      inventoryItem.product_name,
      inventoryItem.product_id,
      returnQty,
      inventoryItem.price,
      actualRefundAmount
    ]);

    // Update inventory item quantity and recalculate amounts
    const newQuantity = inventoryItem.quantity - returnQty;
    const newTotalAmount = newQuantity * inventoryItem.price;
    
    // Adjust amount paid - subtract the actual refund amount from current amount paid
    const newAmountPaid = Math.max(0, inventoryItem.amount_paid - actualRefundAmount);
    
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
      // If all items returned, delete the inventory item
      await client.query('DELETE FROM inventory WHERE id = $1', [id]);
    } else {
      // Update inventory item with new quantities
      await client.query(`
        UPDATE inventory 
        SET 
          quantity = $1,
          amount_paid = $2,
          payment_status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [newQuantity, newAmountPaid, newPaymentStatus, id]);
    }

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Process inventory return error:', err);
    res.status(500).json({ error: 'Server error processing return: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;