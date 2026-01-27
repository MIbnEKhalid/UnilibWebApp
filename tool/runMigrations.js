import fs from 'fs';
import path from 'path';
import { pool } from '../routes/pool.js';

async function run() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const full = path.join(migrationsDir, file);
    console.log('Applying migration:', file);
    const sql = fs.readFileSync(full, 'utf8');
    try {
      await pool.query(sql);
      console.log('Migration applied:', file);
    } catch (err) {
      console.error('Migration failed:', file, err.message);
      process.exit(1);
    }
  }

  console.log('All migrations applied successfully.');
  process.exit(0);
}

if (require.main === module) {
  run().catch(err => {
    console.error('Migration runner error:', err);
    process.exit(1);
  });
}

export default run;