const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../server/database.sqlite'));

try {
  const pr = db.prepare('SELECT id, typeof(id) as id_type FROM purchase_returns WHERE id = 1').get();
  console.log('Purchase Return ID 1:', JSON.stringify(pr, null, 2));

  const prAll = db.prepare('SELECT id, typeof(id) as id_type FROM purchase_returns').all();
  console.log('All Purchase Returns:', JSON.stringify(prAll, null, 2));

} catch (err) {
  console.error('Check failed:', err.message);
} finally {
  db.close();
}
