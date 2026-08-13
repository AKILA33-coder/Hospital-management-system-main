const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME || 'hms_db',
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           '+05:30',
});

pool.getConnection()
  .then(c => { console.log('✅ MySQL connected:', process.env.DB_NAME); c.release(); })
  .catch(e => { console.error('❌ MySQL error:', e.message); process.exit(1); });

module.exports = pool;
