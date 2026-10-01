/**
 * Standalone Supabase Keep-Alive Ping Script
 * Can be executed via: npm run keep-alive
 * Or triggered via cron, scheduled tasks, or CI/CD pipelines.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pingDatabase } = require('../src/lib/keepAlive');
const { pool } = require('../src/lib/supabase');

async function run() {
  console.log('🚀 Running manual Supabase Keep-Alive heartbeat...');
  const result = await pingDatabase();
  console.log('Heartbeat result:', result);
  await pool.end();
  process.exit(result.success ? 0 : 1);
}

run();
