const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    const msg = 'SUPABASE_URL and SUPABASE_ANON_KEY must be set to use Supabase features.';
    console.error('❗ ' + msg);
    if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
    }
    // In development, export a thin stub that throws on use to fail fast where called
    const supabaseStub = new Proxy({}, {
        get() {
            return () => { throw new Error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'); };
        }
    });
    module.exports = supabaseStub;
} else {
    const supabase = createClient(supabaseUrl, supabaseKey);
    module.exports = supabase;
}
