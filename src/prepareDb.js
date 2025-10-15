import fs from 'fs';
import path from 'path';
import url from 'url';
import { initPostgres } from './db.js';


const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const provider = process.env.DB_PROVIDER || 'postgres';


if (provider === 'postgres') {
    const sqlPath = path.join(__dirname, 'sql', 'postgres.schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const { pool } = await initPostgres();
    await pool.query(sql);
    await pool.end();
    console.log('Postgres schema ensured.');
} else {
    console.log('For Supabase, run the SQL in src/sql/supabase.schema.sql inside your Supabase project.');
}