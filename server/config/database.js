const { Pool } = require('pg');
require('dotenv').config();

// Railway provides DATABASE_URL, so we need to handle both scenarios
const getDatabaseConfig = () => {
  // If DATABASE_URL is provided (Railway/Production), use it
  if (process.env.DATABASE_URL) {
    console.log('🚀 Using DATABASE_URL for connection (Railway/Production)');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
  
  // Otherwise, use individual environment variables (Local development)
  console.log('🏠 Using individual DB variables for connection (Local development)');
  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'business_accounting',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
};

const pool = new Pool({
  ...getDatabaseConfig(),
  // Connection pool settings for production
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased for Railway
  // Add retry logic for Railway
  retryDelayMs: 1000,
});

// Enhanced connection testing with retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Database connection successful');
      
      // Test a simple query
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database query test successful:', result.rows[0].now);
      
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, err.message);
      
      if (i === retries - 1) {
        console.error('💥 All database connection attempts failed');
        if (process.env.NODE_ENV === 'production') {
          // In production, we might want to exit if DB is not available
          console.error('🚨 Exiting due to database connection failure in production');
          process.exit(1);
        }
      } else {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
};

// Test connection on startup
testConnection();

// Handle connection errors
pool.on('error', (err) => {
  console.error('💥 Unexpected database error:', err);
});

pool.on('connect', () => {
  console.log('🔗 New database connection established');
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🔄 Shutting down database connections...');
  pool.end(() => {
    console.log('✅ Database pool has ended');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { pool, testConnection };