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

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// 🚨 CRITICAL: API Routes MUST come BEFORE static files
console.log('Loading API routes...');

// Check if route files exist before requiring them
const routeFiles = ['suppliers', 'customers', 'inventory', 'cash', 'dashboard', 'returns', 'settings'];
routeFiles.forEach(routeFile => {
  const routePath = path.join(__dirname, 'routes', `${routeFile}.js`);
  if (fs.existsSync(routePath)) {
    console.log(`✅ Loading route: /api/${routeFile}`);
    app.use(`/api/${routeFile}`, require(`./routes/${routeFile}`));
  } else {
    console.log(`❌ Route file missing: ${routePath}`);
  }
});

// Database setup route
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

// Test database connection route
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

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date() });
});

// 🚨 CRITICAL: Static files MUST come AFTER API routes
console.log('Setting up static file serving...');
app.use(express.static(path.join(__dirname, '..'))); 

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.originalUrl}`);
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