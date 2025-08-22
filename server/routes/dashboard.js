const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get inventory value (sum of amount_paid for all inventory items)
    const inventoryResult = await pool.query(`
        SELECT COALESCE(SUM(quantity * price), 0) as total_value
        FROM inventory
      `);
    
    // Get customer receivables (using the same query as customers page)
    const customerReceivablesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(cp.balance), 0) as total_receivables
      FROM customers c
      LEFT JOIN customer_products cp ON c.id = cp.customer_id
    `);
    
    // Get supplier payables (using the same query as suppliers page)
    const supplierPayablesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(sp.balance), 0) as total_payables
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
    `);
    
    // Get cash on hand
    const cashResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_cash
      FROM cash_transactions
    `);
    
    const inventoryValue = parseFloat(inventoryResult.rows[0].total_value) || 0;
    const customerOwing = parseFloat(customerReceivablesResult.rows[0].total_receivables) || 0;
    const supplierDebt = parseFloat(supplierPayablesResult.rows[0].total_payables) || 0;
    const cashOnHand = parseFloat(cashResult.rows[0].total_cash) || 0;
    
    const stats = {
      inventoryValue: inventoryValue,
      customerOwingBills: customerOwing,
      debtToSuppliers: supplierDebt,
      cashOnHand: cashOnHand
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;