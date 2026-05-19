const db = require('../server/db.cjs');
try {
  const suppliers = db.prepare('SELECT * FROM suppliers').all();
  console.log('Suppliers:', suppliers.length);
  if (suppliers.length > 0) {
    console.log('Supplier[0]:', suppliers[0]);
  }
  
  const purchases = db.prepare('SELECT * FROM purchases').all();
  console.log('Purchases:', purchases.length);
  if (purchases.length > 0) {
    console.log('Purchase[0]:', purchases[0]);
  }
  
  const activeFY = db.prepare('SELECT * FROM financial_years WHERE is_active = 1').get();
  console.log('Active FY:', activeFY);

  if (suppliers.length > 0) {
    const supplierId = suppliers[0].id;
    console.log(`Running ledger query for supplier ID ${supplierId}:`);
    
    let queryArgs = [supplierId, supplierId, supplierId];
    let dateFilter = '';
    if (activeFY) {
      dateFilter = ' AND date >= ? AND date <= ? ';
      queryArgs = [
        supplierId, activeFY.start_date, activeFY.end_date, 
        supplierId, activeFY.start_date, activeFY.end_date,
        supplierId, activeFY.start_date, activeFY.end_date
      ];
    }
    
    const transactions = db.prepare(`
      SELECT date, 'Purchase' as type, purchase_number as ref, 0 as debit, total as credit
      FROM purchases WHERE supplier_id = ? ${dateFilter}
      UNION ALL
      SELECT date, 'Payment' as type, IFNULL(receipt_number, 'PAYMENT') as ref, amount as debit, 0 as credit
      FROM bank_receipts WHERE supplier_id = ? ${dateFilter}
      UNION ALL
      SELECT date, 'Purchase Return' as type, return_number as ref, total as debit, 0 as credit
      FROM purchase_returns WHERE supplier_id = ? ${dateFilter}
      ORDER BY date ASC, type ASC
    `).all(...queryArgs);
    
    console.log('Ledger Transactions:', transactions);
  }
} catch (e) {
  console.error('Error:', e.message);
}
