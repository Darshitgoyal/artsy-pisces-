const { Pool } = require('pg');
require('dotenv').config();

// pg connects directly to Supabase's PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper that mimics the Supabase client API so we don't rewrite all routes
const supabase = {
  from: (table) => ({
    select: (cols = '*') => ({
      eq: (col, val) => ({
        single: async () => {
          const r = await pool.query(`SELECT ${cols} FROM ${table} WHERE ${col} = $1 LIMIT 1`, [val]);
          return { data: r.rows[0] || null, error: null };
        },
        order: (col2, { ascending } = {}) => ({
          async then(resolve) {
            const dir = ascending === false ? 'DESC' : 'ASC';
            const r = await pool.query(`SELECT ${cols} FROM ${table} WHERE ${col} = $1 ORDER BY ${col2} ${dir}`, [val]);
            resolve({ data: r.rows, error: null });
          }
        }),
      }),
      order: (col2, { ascending } = {}) => ({
        async then(resolve) {
          const dir = ascending === false ? 'DESC' : 'ASC';
          const r = await pool.query(`SELECT ${cols} FROM ${table} ORDER BY ${col2} ${dir}`);
          resolve({ data: r.rows, error: null });
        }
      }),
      single: async () => {
        const r = await pool.query(`SELECT ${cols} FROM ${table} LIMIT 1`);
        return { data: r.rows[0] || null, error: null };
      },
    }),
    insert: (obj) => ({
      select: (cols = '*') => ({
        single: async () => {
          const keys = Object.keys(obj);
          const vals = Object.values(obj);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const r = await pool.query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${cols}`,
            vals
          );
          return { data: r.rows[0], error: null };
        },
      }),
    }),
    update: (obj) => ({
      eq: (col, val) => ({
        select: (cols = '*') => ({
          single: async () => {
            const keys = Object.keys(obj);
            const vals = Object.values(obj);
            const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            const r = await pool.query(
              `UPDATE ${table} SET ${sets} WHERE ${col} = $${keys.length + 1} RETURNING ${cols}`,
              [...vals, val]
            );
            return { data: r.rows[0] || null, error: null };
          },
        }),
      }),
    }),
    delete: () => ({
      eq: async (col, val) => {
        await pool.query(`DELETE FROM ${table} WHERE ${col} = $1`, [val]);
        return { error: null };
      },
    }),
  }),
  rpc: async (fn, params) => {
    await pool.query(`SELECT ${fn}($1)`, [params[Object.keys(params)[0]]]);
    return { error: null };
  },
};

module.exports = { supabase, pool };