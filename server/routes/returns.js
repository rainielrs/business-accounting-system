
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all returns
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.return_id,
        r.return_type,
        r.original_order_id,
        r.customer_supplier_name,
        r.return_date,
        r.total_amount,
        r.status,
        r.reason,
        r.notes,
        r.created_at,
        ri.product_name
      FROM returns r
      LEFT JOIN return_items ri ON r.return_id = ri.return_id
      ORDER BY r.return_date DESC, r.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get returns error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get return by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        r.*,
        ri.product_name,
        ri.product_id,
        ri.quantity,
        ri.unit_price,
        ri.total_price
      FROM returns r
      LEFT JOIN return_items ri ON r.return_id = ri.return_id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Return not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get return by ID error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update return
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      customer_supplier_name,
      total_amount,
      status,
      reason,
      notes
    } = req.body;

    const result = await client.query(`
      UPDATE returns 
      SET 
        customer_supplier_name = $1,
        total_amount = $2,
        status = $3,
        reason = $4,
        notes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 
      RETURNING *
    `, [customer_supplier_name, total_amount, status, reason, notes, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Return not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update return error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete return
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // First delete return items
    await client.query('DELETE FROM return_items WHERE return_id = (SELECT return_id FROM returns WHERE id = $1)', [id]);
    
    // Then delete the return
    const result = await client.query('DELETE FROM returns WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Return not found' });
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Return deleted successfully' });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete return error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
