const { pool } = require('./supabase');

/**
 * Executes a heartbeat query directly on Supabase PostgreSQL.
 * Performing a query resets Supabase's 7-day inactivity pause counter.
 */
async function pingDatabase() {
  const startTime = Date.now();
  try {
    // We execute a genuine query across both system clock and user/artwork tables
    const res = await pool.query(`
      SELECT 
        NOW() AS db_time,
        (SELECT count(*) FROM artworks) AS total_artworks,
        (SELECT count(*) FROM users) AS total_users
    `);
    const duration = Date.now() - startTime;
    const row = res.rows[0];

    const result = {
      success: true,
      timestamp: row.db_time,
      durationMs: duration,
      stats: {
        totalArtworks: Number(row.total_artworks || 0),
        totalUsers: Number(row.total_users || 0),
      },
      message: 'Supabase keep-alive heartbeat completed successfully. 7-day auto-pause counter reset.',
    };

    console.log(
      `🕒 [SUPABASE KEEP-ALIVE] Ping OK (${duration}ms) | DB Time: ${new Date(row.db_time).toISOString()} | Artworks: ${row.total_artworks}`
    );
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `⚠️ [SUPABASE KEEP-ALIVE ERROR] Failed to ping database (${duration}ms):`,
      error.message
    );
    return {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      error: error.message,
    };
  }
}

/**
 * Starts the automatic recurring keep-alive scheduler.
 * Runs an immediate ping upon start, followed by recurring pings.
 * 
 * @param {number} intervalHours - Frequency in hours (default: 12 hours)
 */
function startKeepAlive(intervalHours) {
  const hours = Number(intervalHours || process.env.SUPABASE_PING_INTERVAL_HOURS || 12);
  const intervalMs = Math.max(hours, 1) * 60 * 60 * 1000; // minimum 1 hour

  console.log(`🛡️ [SUPABASE KEEP-ALIVE] Initialized. Heartbeat scheduled every ${hours} hour(s) to prevent project pausing.`);

  // Perform initial ping shortly after server starts up (give DB connection 2 seconds to initialize)
  setTimeout(() => {
    pingDatabase();
  }, 2000);

  // Set recurring interval
  const timer = setInterval(() => {
    pingDatabase();
  }, intervalMs);

  // Allow Node process to exit gracefully if needed
  if (timer.unref) {
    timer.unref();
  }

  return timer;
}

module.exports = {
  pingDatabase,
  startKeepAlive,
};
