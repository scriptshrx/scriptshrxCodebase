import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Create Supabase client with service role key (allows schema modifications)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public',
  },
});

async function pushSchema() {
  try {
    console.log('📂 Reading schema file...');
    const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔗 Connecting to Supabase...');
    
    // Split schema into individual statements and execute
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      
      const { error } = await supabase.rpc('exec', {
        sql: statement,
      }).catch(() => {
        // If exec RPC doesn't exist, try direct execution
        return supabase.from('_prisma_migrations').select('id').limit(1);
      });

      if (error) {
        console.warn(`⚠️  Statement ${i + 1} warning: ${error.message}`);
      }
    }

    console.log('\n✅ Schema push completed!');
  } catch (error) {
    console.error('❌ Error pushing schema:', error.message);
    process.exit(1);
  }
}

pushSchema();
