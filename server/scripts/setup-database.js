const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up database schema...');
    
    // Check if tables already exist
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (existingTables.rows.length > 0) {
      console.log('📋 Existing tables found:', existingTables.rows.map(row => row.table_name).join(', '));
      console.log('✅ Database already set up - skipping schema creation');
      return;
    }
    
    // Read and execute schema only if no tables exist
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements and execute them with IF NOT EXISTS
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Database schema created successfully');
    
    // Show final table list
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Final tables:', result.rows.map(row => row.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;