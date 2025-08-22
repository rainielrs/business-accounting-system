const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get data counts for all tables
router.get('/counts', async (req, res) => {
    try {
        const queries = [
            'SELECT COUNT(*) as count FROM suppliers',
            'SELECT COUNT(*) as count FROM supplier_products', 
            'SELECT COUNT(*) as count FROM inventory',
            'SELECT COUNT(*) as count FROM customers',
            'SELECT COUNT(*) as count FROM customer_products',
            'SELECT COUNT(*) as count FROM cash_transactions',
            'SELECT COUNT(*) as count FROM returns',
            'SELECT COUNT(*) as count FROM return_items'
        ];

        const results = await Promise.all(
            queries.map(query => pool.query(query))
        );

        const counts = {
            suppliers: parseInt(results[0].rows[0].count),
            supplier_products: parseInt(results[1].rows[0].count),
            inventory: parseInt(results[2].rows[0].count),
            customers: parseInt(results[3].rows[0].count),
            customer_products: parseInt(results[4].rows[0].count),
            cash_transactions: parseInt(results[5].rows[0].count),
            returns: parseInt(results[6].rows[0].count),
            return_items: parseInt(results[7].rows[0].count)
        };

        // Calculate total
        counts.total = counts.suppliers + counts.supplier_products + counts.inventory + 
              counts.customers + counts.customer_products + 
              counts.returns;

        res.json(counts);
    } catch (error) {
        console.error('Error getting data counts:', error);
        res.status(500).json({ error: 'Failed to get data counts' });
    }
});

// Reset all data
router.delete('/reset', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Delete all data from tables (order matters due to foreign keys)
        await client.query('DELETE FROM return_items');
        await client.query('DELETE FROM returns');
        await client.query('DELETE FROM customer_products');
        await client.query('DELETE FROM customers');
        await client.query('DELETE FROM supplier_products');
        await client.query('DELETE FROM suppliers');
        await client.query('DELETE FROM inventory');
        await client.query('DELETE FROM cash_transactions');                

        // Reset sequences to start from 1
        await client.query('ALTER SEQUENCE suppliers_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE supplier_products_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE inventory_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE customers_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE customer_products_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE cash_transactions_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE returns_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE return_items_id_seq RESTART WITH 1');

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            message: 'All data has been successfully reset' 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting data:', error);
        res.status(500).json({ error: 'Failed to reset data' });
    } finally {
        client.release();
    }
});

module.exports = router;