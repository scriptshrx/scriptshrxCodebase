const { Client } = require('pg');
require('dotenv').config();

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check if Role table exists
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    console.log('Tables with "ole" in name:', result.rows);
    
    // Try to query Role table directly
    if (result.rows.length > 0) {
      const roleResult = await client.query('SELECT * FROM "Role";');
      console.log('Roles in database:', roleResult.rows);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
