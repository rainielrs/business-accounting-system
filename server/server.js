const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { pool } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS] 
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Serve static files
app.use(express.static(path.join(__dirname, '..'))); 

// Add this route BEFORE your existing routes
app.get('/setup-database', async (req, res) => {
  try {
    console.log('Setting up database using schema.sql...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('Database setup completed successfully!');
    res.json({ 
      success: true, 
      message: 'Database tables created successfully using schema.sql!',
      tables: ['suppliers', 'supplier_products', 'inventory', 'customers', 'customer_products', 'cash_transactions', 'returns', 'return_items']
    });

  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to setup database: ' + error.message 
    });
  }
});

// API Routes
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/cash', require('./routes/cash'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/settings', require('./routes/settings'));

// Add this simple test route after your existing routes
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true, 
      message: 'Database connection working!',
      time: result.rows[0].now 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://192.168.254.144:${PORT}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
