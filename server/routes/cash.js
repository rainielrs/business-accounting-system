const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all cash transactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        transaction_type,
        amount,
        description,
        created_at
      FROM cash_transactions
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get cash transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add or remove cash
router.post('/update', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { action, amount, description = '' } = req.body;
    
    if (!action || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid action or amount' });
    }
    
    if (action !== 'add' && action !== 'remove') {
      return res.status(400).json({ error: 'Action must be either "add" or "remove"' });
    }
    
    // For remove action, check if there's enough cash
    if (action === 'remove') {
      const currentCashResult = await client.query(`
        SELECT COALESCE(SUM(amount), 0) as total_cash
        FROM cash_transactions
      `);
      
      const currentCash = parseFloat(currentCashResult.rows[0].total_cash) || 0;
      
      if (currentCash < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient cash. Current balance: ${currentCash.toFixed(2)}` 
        });
      }
    }
    
    // Insert transaction (positive for add, negative for remove)
    const transactionAmount = action === 'add' ? amount : -amount;
    const transactionType = action === 'add' ? 'cash_in' : 'cash_out';
    
    const result = await client.query(`
      INSERT INTO cash_transactions (transaction_type, amount, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [transactionType, transactionAmount, description]);
    
    await client.query('COMMIT');
    
    // Get updated cash balance
    const balanceResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as total_cash
      FROM cash_transactions
    `);
    
    res.json({
      transaction: result.rows[0],
      newBalance: parseFloat(balanceResult.rows[0].total_cash) || 0
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update cash error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get current cash balance
router.get('/balance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_cash
      FROM cash_transactions
    `);
    
    res.json({ balance: parseFloat(result.rows[0].total_cash) || 0 });
  } catch (err) {
    console.error('Get cash balance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent transactions
router.get('/recent', async (req, res) => {
  try {
    const limit = req.query.limit || 10; // Default to 10 recent transactions
    
    const result = await pool.query(`
      SELECT 
        id,
        transaction_type,
        amount,
        description,
        created_at
      FROM cash_transactions
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    
    const transactions = result.rows.map(transaction => ({
      id: transaction.id,
      type: transaction.transaction_type,
      amount: parseFloat(transaction.amount),
      description: transaction.description || 'No description',
      date: transaction.created_at,
      formattedDate: new Date(transaction.created_at).toLocaleDateString(),
      formattedTime: new Date(transaction.created_at).toLocaleTimeString()
    }));
    
    res.json({ transactions });
    
  } catch (err) {
    console.error('Get recent transactions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;