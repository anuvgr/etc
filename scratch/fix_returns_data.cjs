const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../server/database.sqlite'));

try {
  console.log('Fixing Sales Returns data...');
  const srFix = db.prepare(`
    UPDATE sales_returns 
    SET customer_id = (SELECT customer_id FROM invoices WHERE id = sales_returns.invoice_id)
    WHERE customer_id IS NULL AND invoice_id IS NOT NULL
  `).run();
  console.log(`Updated ${srFix.changes} Sales Returns.`);

  console.log('Fixing Purchase Returns data...');
  const prFix = db.prepare(`
    UPDATE purchase_returns 
    SET supplier_id = (SELECT supplier_id FROM purchases WHERE id = purchase_returns.purchase_id)
    WHERE supplier_id IS NULL AND purchase_id IS NOT NULL
  `).run();
  console.log(`Updated ${prFix.changes} Purchase Returns.`);

} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  db.close();
}
