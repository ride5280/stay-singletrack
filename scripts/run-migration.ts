import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  const sql = fs.readFileSync('supabase/migrations/002_trail_predictions.sql', 'utf8');
  
  // Split by semicolons and run each statement
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (!statement.trim()) continue;
    console.log('Running:', statement.slice(0, 60) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    if (error) {
      // Try direct query approach
      const { error: err2 } = await supabase.from('_migrations').select('*').limit(0);
      console.log('Note: RPC not available, run SQL manually in Supabase dashboard');
      console.log('\nSQL to run:\n');
      console.log(sql);
      return;
    }
  }
  console.log('Migration complete!');
}

runMigration();
