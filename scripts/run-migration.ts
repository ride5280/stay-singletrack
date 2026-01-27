import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Running migration...');
  console.log('Supabase URL:', supabaseUrl);

  // Split SQL into individual statements (roughly)
  // Note: This is a simple split and may not handle all edge cases
  const statements = sql
    .split(/;\s*$/m)
    .filter(s => s.trim())
    .map(s => s.trim() + ';');

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    if (statement.trim() === ';' || statement.startsWith('--')) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try running directly if exec_sql doesn't exist
        const { error: directError } = await supabase.from('_migrations').select().limit(0);
        if (directError?.code === '42P01') {
          // Table doesn't exist, which is fine
        }
        console.error('Statement error:', error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error('Exception running statement:', err);
      errorCount++;
    }
  }

  console.log(`\nMigration complete: ${successCount} successful, ${errorCount} errors`);
}

// Alternative: Use REST API directly
async function runMigrationViaRest() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Running migration via REST API...');
  console.log('Supabase URL:', supabaseUrl);

  // Use the Supabase REST API to execute SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey!,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    console.log('exec_sql RPC not available, migration must be run manually');
    console.log('\n========================================');
    console.log('Please run the migration SQL manually:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Open your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy/paste the SQL from:');
    console.log('   supabase/migrations/001_initial_schema.sql');
    console.log('5. Click "Run"');
    console.log('========================================\n');
  } else {
    console.log('Migration completed successfully!');
  }
}

runMigrationViaRest().catch(console.error);
