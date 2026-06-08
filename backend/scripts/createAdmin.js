const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createAdmin() {
  const ADMIN_EMAIL    = 'khushi@artsy-pisces.com';
  const ADMIN_PASSWORD = 'khushi16';
  const ADMIN_NAME     = 'khushii';

  console.log('Creating admin account...');

  // Check if already exists
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [ADMIN_EMAIL]
  );

  if (existing.rows.length > 0) {
    console.log('⚠️  Admin already exists. No changes made.');
    await pool.end();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id, email, name, role`,
    [ADMIN_EMAIL, hashedPassword, ADMIN_NAME]
  );

  console.log('✅ Admin created!');
  console.log('   Email:', result.rows[0].email);
  console.log('   Role:', result.rows[0].role);

  await pool.end();
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});