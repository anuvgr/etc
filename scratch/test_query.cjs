const db = require('../server/db.cjs');
try {
  const sql = `
    SELECT invoices.*, customers.name as customer_name, customers.phone as customer_phone, customers.gstin as customer_gstin,
    (SELECT GROUP_CONCAT(products.name, ', ') FROM invoice_items JOIN products ON invoice_items.product_id = products.id WHERE invoice_id = invoices.id) as product_names
    FROM invoices 
    LEFT JOIN customers ON invoices.customer_id = customers.id
  `;
  const results = db.prepare(sql).all();
  console.log('Results Count:', results.length);
  if (results.length > 0) {
    console.log('First Result:', JSON.stringify(results[0], null, 2));
  }
} catch (e) {
  console.error('SQL Error:', e.message);
}
