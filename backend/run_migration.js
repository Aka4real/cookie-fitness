import fs from 'fs';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'girjbskzfdebsoodjeuz';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const SQL_PATH = './supabase_migration.sql';

async function run() {
  try {
    const query = fs.readFileSync(SQL_PATH, 'utf-8');
    
    console.log('Sending SQL to Supabase Management API...');
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    const text = await res.text();
    if (!res.ok) {
      console.error('Migration failed:', text);
      process.exit(1);
    }
    
    console.log('Migration successful:', text);
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

run();
