#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function pushSchema() {
  try {
    console.log('📂 Reading schema file...');
    const schemaPath = path.join(__dirname, 'supabase_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing SQL schema...');
    
    // Try using the SQL endpoint directly via admin API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: schema }),
    });

    if (!response.ok) {
      // RPC might not exist, try alternative approach
      console.log('📝 Using alternative method to push schema...');
      console.log('✅ Please execute the schema manually via Supabase dashboard:');
      console.log('   1. Go to SQL Editor in Supabase dashboard');
      console.log('   2. Create new query');
      console.log('   3. Copy content from supabase_schema.sql');
      console.log('   4. Execute');
      return;
    }

    const result = await response.json();
    console.log('✅ Schema push completed!');
    console.log('📊 Check your Supabase dashboard to verify the tables were created.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Execute the schema manually via Supabase dashboard SQL Editor');
    process.exit(1);
  }
}

pushSchema();
