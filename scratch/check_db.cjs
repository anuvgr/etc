const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../server/database.sqlite'));

try {
  const sr = db.prepare('SELECT id, return_number FROM sales_returns').all();
  console.log('Sales Returns:', JSON.stringify(sr, null, 2));

  const pr = db.prepare('SELECT id, return_number FROM purchase_returns').all();
  console.log('Purchase Returns:', JSON.stringify(pr, null, 2));

} catch (err) {
  console.error('Check failed:', err.message);
} finally {
  db.close();
}
