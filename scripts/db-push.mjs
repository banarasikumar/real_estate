import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_REF = 'bidoztekidogxiljrcmy';

import { execSync } from 'child_process';

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && process.platform === 'win32') {
  try {
    token = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'SUPABASE_ACCESS_TOKEN\', \'User\')"', { encoding: 'utf8' }).trim();
  } catch (e) {}
}

if (!token) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable not found. Please set it with:');
  console.error('[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "<your-token>", "User")');
  process.exit(1);
}

const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

async function execQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Query failed [${res.status}]: ${err}`);
  }
  return res.json().catch(() => null);
}

async function run() {
  console.log(`Checking migrations table on ${PROJECT_REF}...`);
  await execQuery(`
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const appliedRows = await execQuery(`SELECT version FROM public._schema_migrations;`) || [];
  const appliedSet = new Set(appliedRows.map(r => r.version));

  // If table is newly created, backfill historical migrations that are already present
  if (!appliedSet.has('00000000000000_initial_schema.sql')) {
    await execQuery(`INSERT INTO public._schema_migrations (version) VALUES ('00000000000000_initial_schema.sql') ON CONFLICT DO NOTHING;`);
    appliedSet.add('00000000000000_initial_schema.sql');
  }
  if (!appliedSet.has('00000000000001_realtime_chat.sql')) {
    await execQuery(`INSERT INTO public._schema_migrations (version) VALUES ('00000000000001_realtime_chat.sql') ON CONFLICT DO NOTHING;`);
    appliedSet.add('00000000000001_realtime_chat.sql');
  }

  let newCount = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`[Already Applied] ${file}`);
      continue;
    }

    console.log(`[Applying Migration] ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    await execQuery(sql);
    await execQuery(`INSERT INTO public._schema_migrations (version) VALUES ('${file}');`);
    console.log(`[Done] ${file} applied successfully.`);
    newCount++;
  }

  console.log(`\nMigration check complete. ${newCount} new migration(s) applied.`);
}

run().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
