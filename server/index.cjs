// Ephphatha Billing System - Server v1.0.5
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./db.cjs');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'ephphatha_secret_key_2024';

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

// --- Logging Helper ---
const logAction = (username, action, req) => {
  let ip = req.headers['x-client-ip'] || req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
  if (ip === '::1') ip = '127.0.0.1';
  if (ip && ip.startsWith('::ffff:')) ip = ip.substring(7);
  const location = 'Ernakulam, Kerala'; // Placeholder for geolocation
  db.prepare('INSERT INTO logs (username, action, ip_address, location) VALUES (?, ?, ?, ?)').run(username, action, ip, location);
};

// --- FY Helper ---
const getActiveFYRange = () => {
  const activeFY = db.prepare('SELECT start_date, end_date FROM financial_years WHERE is_active = 1').get();
  return activeFY || { start_date: '1970-01-01', end_date: '2099-12-31' };
};

// --- Sequential Number Generator ---
const generateNumber = (prefix, table, column) => {
  let fy;
  try {
    const activeFY = db.prepare('SELECT label FROM financial_years WHERE is_active = 1').get();
    if (activeFY) {
      fy = activeFY.label;
    }
  } catch (err) {}
  
  if (!fy) {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    let startYear, endYear;
    if (month >= 3) { // April or later
      startYear = year;
      endYear = year + 1;
    } else {
      startYear = year - 1;
      endYear = year;
    }
    fy = `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
  }
  const fullPrefix = `${prefix}/${fy}/`;
  
  const lastRecord = db.prepare(`SELECT ${column} FROM ${table} WHERE ${column} LIKE '${fullPrefix}%' ORDER BY id DESC LIMIT 1`).get();
  
  if (!lastRecord) return `${fullPrefix}1`;
  
  const lastValue = lastRecord[column];
  const parts = lastValue.split('/');
  const lastNumeric = parseInt(parts[parts.length - 1]);
  
  const nextNumeric = isNaN(lastNumeric) ? 1 : lastNumeric + 1;
  return `${fullPrefix}${nextNumeric}`;
};

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    token = req.query.token;
  }

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
    logAction(user.username, 'Login', req);
    res.json({ token, user: { username: user.username, role: user.role } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// --- System Logs ---
app.get('/api/logs', authenticateToken, (req, res) => {
  const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json(logs);
});

// --- Financial Years Routes ---
app.get('/api/financial-years', authenticateToken, (req, res) => {
  let fyears = db.prepare('SELECT * FROM financial_years ORDER BY id DESC').all();
  if (req.user.role !== 'admin') {
    fyears = fyears.filter(fy => fy.label !== 'All Time');
  }
  res.json(fyears);
});

app.post('/api/financial-years', authenticateToken, (req, res) => {
  const { label, start_date, end_date } = req.body;
  try {
    const info = db.prepare('INSERT INTO financial_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, 0)').run(label, start_date, end_date);
    logAction(req.user.username, `Added Financial Year: ${label}`, req);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/financial-years/:id/activate', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can switch financial years' });
  }
  const id = req.params.id;
  try {
    db.transaction(() => {
      db.prepare('UPDATE financial_years SET is_active = 0').run();
      db.prepare('UPDATE financial_years SET is_active = 1 WHERE id = ?').run(id);
    })();
    const fy = db.prepare('SELECT label FROM financial_years WHERE id = ?').get(id);
    logAction(req.user.username, `Activated Financial Year: ${fy.label}`, req);
    res.json({ message: 'Financial year activated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Customers Routes ---
app.get('/api/customers', authenticateToken, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers').all();
  res.json(customers);
});

app.post('/api/customers', authenticateToken, (req, res) => {
  console.log('Customer Add Request Body:', JSON.stringify(req.body, null, 2));
  const { name, company_name, email, phone, address, gstin } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO customers (name, company_name, email, phone, address, gstin)
      VALUES (@name, @company_name, @email, @phone, @address, @gstin)
    `);
    
    const info = stmt.run({
      name: name || '',
      company_name: company_name || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      gstin: gstin || null
    });

    logAction(req.user.username, `Added Customer: ${name}`, req);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error('Customer save error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/customers/bulk', authenticateToken, (req, res) => {
  const customers = req.body;
  const upsert = db.transaction((custs) => {
    const stmt = db.prepare(`
      INSERT INTO customers (name, company_name, phone, email, address, gstin)
      VALUES (@name, @company_name, @phone, @email, @address, @gstin)
      ON CONFLICT(gstin) DO UPDATE SET
        name = excluded.name,
        company_name = excluded.company_name,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address
    `);
    for (const c of custs) {
      if (c.gstin) stmt.run(c);
    }
  });

  try {
    upsert(customers);
    res.json({ message: 'Customers updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/customers/:id/ledger', authenticateToken, (req, res) => {
  const customerId = req.params.id;
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let activeFY;
    try {
      activeFY = db.prepare('SELECT * FROM financial_years WHERE is_active = 1').get();
    } catch(err) {}

    let openingBalance = 0;
    if (activeFY) {
       const prevTransactions = db.prepare(`
         SELECT SUM(debit) as totalDebit, SUM(credit) as totalCredit FROM (
           SELECT total as debit, 0 as credit FROM invoices WHERE customer_id = ? AND date < ?
           UNION ALL
           SELECT 0 as debit, amount as credit FROM payments WHERE customer_id = ? AND date < ?
           UNION ALL
           SELECT 0 as debit, amount as credit FROM bank_receipts WHERE customer_id = ? AND date < ?
         )
       `).get(customerId, activeFY.start_date, customerId, activeFY.start_date, customerId, activeFY.start_date);
       openingBalance = (prevTransactions.totalDebit || 0) - (prevTransactions.totalCredit || 0);
     }

     let queryArgs = [customerId, customerId, customerId];
     let dateFilter = '';
     if (activeFY) {
        dateFilter = ' AND date >= ? AND date <= ? ';
        queryArgs = [
          customerId, activeFY.start_date, activeFY.end_date, 
          customerId, activeFY.start_date, activeFY.end_date,
          customerId, activeFY.start_date, activeFY.end_date
        ];
     }

     const transactions = db.prepare(`
       SELECT date, 'Invoice' as type, invoice_number as ref, total as debit, 0 as credit
       FROM invoices WHERE customer_id = ? ${dateFilter}
       UNION ALL
       SELECT date, 'Payment' as type, IFNULL(reference_no, 'PAYMENT') as ref, 0 as debit, amount as credit
       FROM payments WHERE customer_id = ? ${dateFilter}
       UNION ALL
       SELECT date, 'Bank Receipt' as type, receipt_number as ref, 0 as debit, amount as credit
       FROM bank_receipts WHERE customer_id = ? ${dateFilter}
       ORDER BY date ASC, type ASC
     `).all(...queryArgs);

    let balance = openingBalance;
    const ledger = transactions.map(t => {
      balance += (t.debit - t.credit);
      return { ...t, balance };
    });

    if (activeFY) {
       ledger.unshift({
          date: activeFY.start_date,
          type: 'Opening Balance',
          ref: '-',
          debit: openingBalance > 0 ? openingBalance : 0,
          credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
          balance: openingBalance
       });
    }

    res.json({ customer, ledger, closingBalance: balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', authenticateToken, (req, res) => {
  const { name, company_name, phone, email, address, gstin } = req.body;
  try {
    db.prepare(`
      UPDATE customers 
      SET name = ?, company_name = ?, phone = ?, email = ?, address = ?, gstin = ? 
      WHERE id = ?
    `).run(name, company_name, phone, email, address, gstin, req.params.id);
    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Products Routes ---
app.get('/api/products', authenticateToken, (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

app.post('/api/products', authenticateToken, (req, res) => {
  const { name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock, category } = req.body;
  try {
    const info = db.prepare('INSERT INTO products (name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock, category || 'Part');
    logAction(req.user.username, `Added Product: ${name}`, req);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/products/bulk', authenticateToken, (req, res) => {
  const products = req.body;
  const upsert = db.transaction((prods) => {
    const stmt = db.prepare(`
      INSERT INTO products (name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock, category)
      VALUES (@name, @part_number, @hsn_code, @unit, @purchase_price, @sales_price, @tax_rate, @stock, @category)
      ON CONFLICT(part_number) DO UPDATE SET
        name = excluded.name,
        purchase_price = excluded.purchase_price,
        sales_price = excluded.sales_price,
        tax_rate = excluded.tax_rate,
        stock = excluded.stock,
        category = excluded.category
    `);
    for (const p of prods) {
      stmt.run({
        ...p,
        category: p.category || 'Part'
      });
    }
  });

  try {
    upsert(products);
    res.json({ message: 'Inventory updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Billing Routes ---
app.get('/api/invoices', authenticateToken, (req, res) => {
  const { from, to, all, status } = req.query;
  const fy = getActiveFYRange();
  let sql = `
    SELECT invoices.*, customers.name as customer_name, customers.phone as customer_phone, customers.gstin as customer_gstin,
    (SELECT GROUP_CONCAT(products.name, ', ') FROM invoice_items JOIN products ON invoice_items.product_id = products.id WHERE invoice_id = invoices.id) as product_names
    FROM invoices 
    LEFT JOIN customers ON invoices.customer_id = customers.id
    WHERE 1=1
  `;
  const params = [];
  if (all !== 'true') {
    sql += ` AND date BETWEEN ? AND ?`;
    params.push(from || fy.start_date, to || fy.end_date);
  }
  if (status && status !== 'All') {
    sql += ` AND invoices.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY invoices.date ASC, invoices.id ASC`;
  const invoices = db.prepare(sql).all(...params);
  res.json(invoices);
});

app.post('/api/invoices', authenticateToken, (req, res) => {
  const { customer_id, date, subtotal, cgst, sgst, igst, total, items, status, delivery_address, discount } = req.body;
  const invoice_number = generateNumber('INV', 'invoices', 'invoice_number');
  
  const insertInvoice = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, quotation_id, date, subtotal, cgst, sgst, igst, total, status, delivery_address, discount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoice_number, customer_id, req.body.quotation_id || null, date, subtotal, cgst, sgst, igst, total, status || 'Pending', delivery_address, discount || 0);
    
    if (req.body.quotation_id) {
      db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run('Accepted', req.body.quotation_id);
    }
    
    const invoiceId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      insertItem.run(invoiceId, item.product_id, item.quantity, item.rate, item.amount);
      // Update stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    return invoiceId;
  });

    try {
      const id = insertInvoice();
      logAction(req.user.username, `Created Invoice: ${invoice_number} | Delivery: ${delivery_address || 'Same as Billing'}`, req);
      res.status(201).json({ id, invoice_number });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Quotations Routes ---
app.get('/api/quotations', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = `
    SELECT quotations.*, customers.name as customer_name, customers.phone as customer_phone
    FROM quotations 
    LEFT JOIN customers ON quotations.customer_id = customers.id
    WHERE date BETWEEN ? AND ?
  `;
  const params = [from || fy.start_date, to || fy.end_date];
  sql += ` ORDER BY date DESC`;
  const quotes = db.prepare(sql).all(...params);
  res.json(quotes);
});

app.post('/api/quotations', authenticateToken, (req, res) => {
  const { customer_id, date, subtotal, cgst, sgst, igst, total, items, status, delivery_address, discount } = req.body;
  const quote_number = generateNumber('ETC', 'quotations', 'quote_number');
  
  const insertQuote = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO quotations (quote_number, customer_id, date, subtotal, cgst, sgst, igst, total, status, delivery_address, discount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(quote_number, customer_id, date, subtotal, cgst, sgst, igst, total, status || 'Open', delivery_address, discount || 0);
    
    const quoteId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO quotation_items (quotation_id, product_id, quantity, rate, amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      insertItem.run(quoteId, item.product_id, item.quantity, item.rate, item.amount);
    }
    return quoteId;
  });

    try {
      const id = insertQuote();
      logAction(req.user.username, `Created Quotation: ${quote_number} | Delivery: ${delivery_address || 'Same as Billing'}`, req);
      res.status(201).json({ id, quote_number });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/quotations/:id/convert', authenticateToken, (req, res) => {
  const quoteId = req.params.id;
  
  const convertTransaction = db.transaction(() => {
    const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(quoteId);
    if (!quote) throw new Error('Quotation not found');
    
    const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quoteId);
    
    const invoice_number = generateNumber('INV', 'invoices', 'invoice_number');
    const info = db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, date, subtotal, cgst, sgst, igst, total, status, delivery_address, discount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoice_number, quote.customer_id, new Date().toISOString().split('T')[0], quote.subtotal, quote.cgst, quote.sgst, quote.igst, quote.total, 'Pending', quote.delivery_address, quote.discount || 0);
    
    const invoiceId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      insertItem.run(invoiceId, item.product_id, item.quantity, item.rate, item.amount);
      // Update stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    
    db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run('Accepted', quoteId);
    
    return { invoiceId, invoice_number };
  });

  try {
    const result = convertTransaction();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Purchases Routes ---
app.get('/api/purchases', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = `
    SELECT purchases.*, suppliers.name as supplier_name, suppliers.company_name as supplier_company, suppliers.phone as supplier_phone, suppliers.gstin as supplier_gstin,
    (SELECT GROUP_CONCAT(products.name, ', ') FROM purchase_items JOIN products ON purchase_items.product_id = products.id WHERE purchase_id = purchases.id) as product_names
    FROM purchases 
    LEFT JOIN suppliers ON purchases.supplier_id = suppliers.id
    WHERE date BETWEEN ? AND ?
  `;
  const params = [from || fy.start_date, to || fy.end_date];
  sql += ` ORDER BY date DESC`;
  const purchases = db.prepare(sql).all(...params);
  res.json(purchases);
});

app.post('/api/purchases', authenticateToken, (req, res) => {
  const { supplier_id, date, subtotal, cgst, sgst, igst, total, items, status, purchase_number: custom_number } = req.body;
  const purchase_number = custom_number || generateNumber('ETC', 'purchases', 'purchase_number');
  
  const insertPurchase = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO purchases (purchase_number, supplier_id, date, subtotal, cgst, sgst, igst, total, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(purchase_number, supplier_id, date, subtotal, cgst, sgst, igst, total, status || 'Received');
    
    const purchaseId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO purchase_items (purchase_id, product_id, quantity, rate, amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      insertItem.run(purchaseId, item.product_id, item.quantity, item.rate, item.amount);
      // Update stock: Increase for purchase
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    return purchaseId;
  });

  try {
    const id = insertPurchase();
    logAction(req.user.username, `Recorded Purchase: ${purchase_number}`, req);
    res.status(201).json({ id, purchase_number });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/purchases/:id', authenticateToken, (req, res) => {
  const purchase = db.prepare(`
    SELECT purchases.*, suppliers.name as supplier_name, suppliers.company_name, suppliers.address, suppliers.gstin, suppliers.phone
    FROM purchases 
    LEFT JOIN suppliers ON purchases.supplier_id = suppliers.id
    WHERE purchases.id = ?
  `).get(req.params.id);
  
  if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
  
  const items = db.prepare(`
    SELECT purchase_items.*, products.name, products.part_number, products.hsn_code, products.unit
    FROM purchase_items
    JOIN products ON purchase_items.product_id = products.id
    WHERE purchase_id = ?
  `).all(req.params.id);
  
  res.json({ ...purchase, items });
});

// --- Sales Returns Routes ---
app.get('/api/sales-returns', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT sales_returns.*, 
           COALESCE(customers.name, inv_cust.name) as customer_name, 
           COALESCE(customers.gstin, inv_cust.gstin) as customer_gstin,
           invoices.invoice_number as original_invoice
    FROM sales_returns 
    LEFT JOIN customers ON sales_returns.customer_id = customers.id
    LEFT JOIN invoices ON sales_returns.invoice_id = invoices.id
    LEFT JOIN customers inv_cust ON invoices.customer_id = inv_cust.id
  `;
  const params = [];
  if (from && to) {
    sql += ` WHERE sales_returns.date BETWEEN ? AND ?`;
    params.push(from, to);
  }
  sql += ` ORDER BY date DESC`;
  const returns = db.prepare(sql).all(...params);
  res.json(returns);
});

app.post('/api/sales-returns', authenticateToken, (req, res) => {
  const { invoice_id, customer_id, date, subtotal, cgst, sgst, igst, total, items, reason } = req.body;
  const return_number = generateNumber('ETC-SR', 'sales_returns', 'return_number');
  
  const insertReturn = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO sales_returns (return_number, invoice_id, customer_id, date, subtotal, cgst, sgst, igst, total, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(return_number, invoice_id, customer_id, date, subtotal, cgst, sgst, igst, total, reason);
    
    const returnId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO sales_return_items (sales_return_id, product_id, quantity, rate, amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      const itemAmount = item.quantity * item.unit_price;
      insertItem.run(returnId, item.product_id, item.quantity, item.unit_price, itemAmount);
      // Increase stock on sales return
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    return returnId;
  });

  try {
    const id = insertReturn();
    logAction(req.user.username, `Recorded Sales Return: ${return_number}`, req);
    res.status(201).json({ id, return_number });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales-returns/:id', authenticateToken, (req, res) => {
  const ret = db.prepare(`
    SELECT sales_returns.*, 
           COALESCE(customers.name, inv_cust.name) as customer_name, 
           COALESCE(customers.company_name, inv_cust.company_name) as company_name, 
           COALESCE(customers.address, inv_cust.address) as address, 
           COALESCE(customers.gstin, inv_cust.gstin) as gstin, 
           COALESCE(customers.phone, inv_cust.phone) as phone,
           invoices.invoice_number as original_invoice
    FROM sales_returns 
    LEFT JOIN customers ON sales_returns.customer_id = customers.id
    LEFT JOIN invoices ON sales_returns.invoice_id = invoices.id
    LEFT JOIN customers inv_cust ON invoices.customer_id = inv_cust.id
    WHERE sales_returns.id = ?
  `).get(parseInt(req.params.id));
  
  if (!ret) return res.status(404).json({ error: 'Sales return not found' });
  
  const items = db.prepare(`
    SELECT sales_return_items.*, products.name, products.part_number, products.hsn_code, products.unit
    FROM sales_return_items
    JOIN products ON sales_return_items.product_id = products.id
    WHERE sales_return_id = ?
  `).all(parseInt(req.params.id));
  
  res.json({ ...ret, items });
});

// --- Purchase Returns Routes ---
app.get('/api/purchase-returns', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT purchase_returns.*, 
           COALESCE(suppliers.name, pur_sup.name) as supplier_name, 
           COALESCE(suppliers.gstin, pur_sup.gstin) as supplier_gstin,
           purchases.purchase_number as original_bill
    FROM purchase_returns 
    LEFT JOIN suppliers ON purchase_returns.supplier_id = suppliers.id
    LEFT JOIN purchases ON purchase_returns.purchase_id = purchases.id
    LEFT JOIN suppliers pur_sup ON purchases.supplier_id = pur_sup.id
  `;
  const params = [];
  if (from && to) {
    sql += ` WHERE purchase_returns.date BETWEEN ? AND ?`;
    params.push(from, to);
  }
  sql += ` ORDER BY date DESC`;
  const returns = db.prepare(sql).all(...params);
  res.json(returns);
});

app.post('/api/purchase-returns', authenticateToken, (req, res) => {
  const { purchase_id, supplier_id, date, subtotal, cgst, sgst, igst, total, items, reason } = req.body;
  const return_number = generateNumber('ETC-PR', 'purchase_returns', 'return_number');
  
  const insertReturn = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO purchase_returns (return_number, purchase_id, supplier_id, date, subtotal, cgst, sgst, igst, total, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(return_number, purchase_id, supplier_id, date, subtotal, cgst, sgst, igst, total, reason);
    
    const returnId = info.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO purchase_return_items (purchase_return_id, product_id, quantity, rate, amount) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      const itemAmount = item.quantity * item.unit_price;
      insertItem.run(returnId, item.product_id, item.quantity, item.unit_price, itemAmount);
      // Decrease stock on purchase return
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    return returnId;
  });

  try {
    const id = insertReturn();
    logAction(req.user.username, `Recorded Purchase Return: ${return_number}`, req);
    res.status(201).json({ id, return_number });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/purchase-returns/:id', authenticateToken, (req, res) => {
  const ret = db.prepare(`
    SELECT purchase_returns.*, 
           COALESCE(suppliers.name, pur_sup.name) as supplier_name, 
           suppliers.company_name, suppliers.address, suppliers.gstin, suppliers.phone,
           purchases.purchase_number as original_bill
    FROM purchase_returns 
    LEFT JOIN suppliers ON purchase_returns.supplier_id = suppliers.id
    LEFT JOIN purchases ON purchase_returns.purchase_id = purchases.id
    LEFT JOIN suppliers pur_sup ON purchases.supplier_id = pur_sup.id
    WHERE purchase_returns.id = ?
  `).get(parseInt(req.params.id));
  
  if (!ret) return res.status(404).json({ error: 'Purchase return not found' });
  
  const items = db.prepare(`
    SELECT purchase_return_items.*, products.name, products.part_number, products.hsn_code, products.unit
    FROM purchase_return_items
    JOIN products ON purchase_return_items.product_id = products.id
    WHERE purchase_return_id = ?
  `).all(parseInt(req.params.id));
  
  res.json({ ...ret, items });
});


// --- Reports Routes ---
app.get('/api/reports/products', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = `
    SELECT products.name, products.part_number, SUM(invoice_items.quantity) as total_qty, SUM(invoice_items.amount) as total_amount
    FROM invoice_items
    JOIN products ON invoice_items.product_id = products.id
    JOIN invoices ON invoice_items.invoice_id = invoices.id
    WHERE invoices.date BETWEEN ? AND ?
  `;
  const params = [from || fy.start_date, to || fy.end_date];
  sql += ` GROUP BY products.id ORDER BY total_amount DESC`;
  const data = db.prepare(sql).all(...params);
  res.json(data);
});

app.get('/api/reports/customers', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = `
    SELECT customers.name, customers.company_name, COUNT(invoices.id) as invoice_count, SUM(invoices.total) as total_spent
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.date BETWEEN ? AND ?
  `;
  const params = [from || fy.start_date, to || fy.end_date];
  sql += ` GROUP BY customers.id ORDER BY total_spent DESC`;
  const data = db.prepare(sql).all(...params);
  res.json(data);
});

app.get('/api/reports/quotations', authenticateToken, (req, res) => {
  const stats = db.prepare(`
    SELECT status, COUNT(*) as count, SUM(total) as total_value
    FROM quotations
    GROUP BY status
  `).all();
  
  const list = db.prepare(`
    SELECT quotations.*, customers.name as customer_name
    FROM quotations
    JOIN customers ON quotations.customer_id = customers.id
    ORDER BY date DESC
  `).all();
  
  res.json({ stats, list });
});

app.get('/api/reports/profit-loss', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let dateClause = '';
  if (from && to) {
    dateClause = ' WHERE date BETWEEN ? AND ?';
    params.push(from, to);
  }

  try {
    // Total Revenue (Excluding Tax)
    const revenue = db.prepare(`SELECT SUM(subtotal) as total FROM invoices${dateClause}`).get(...params);
    
    // Total COGS (Purchase Price * Quantity of items sold)
    let cogsSql = `
      SELECT SUM(invoice_items.quantity * products.purchase_price) as total 
      FROM invoice_items 
      JOIN products ON invoice_items.product_id = products.id
      JOIN invoices ON invoice_items.invoice_id = invoices.id
    `;
    if (from && to) cogsSql += ` WHERE invoices.date BETWEEN ? AND ?`;
    const cogs = db.prepare(cogsSql).get(...params);

    // Total Expenses
    const expenses = db.prepare(`SELECT SUM(amount) as total FROM expenses${dateClause}`).get(...params);

    // Sales Returns (to be deducted from revenue)
    const returns = db.prepare(`SELECT SUM(subtotal) as total FROM sales_returns${dateClause}`).get(...params);

    const totalRevenue = (revenue.total || 0) - (returns.total || 0);
    const totalCogs = cogs.total || 0;
    const grossProfit = totalRevenue - totalCogs;
    const totalExpenses = expenses.total || 0;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/purchases', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  const start = from || (fy ? fy.start_date : null);
  const end = to || (fy ? fy.end_date : null);

  let sql = `
    SELECT products.name, products.part_number, SUM(purchase_items.quantity) as total_qty, SUM(purchase_items.amount) as total_amount
    FROM purchase_items
    JOIN products ON purchase_items.product_id = products.id
    JOIN purchases ON purchase_items.purchase_id = purchases.id
  `;
  const params = [];
  if (start && end) {
    sql += ` WHERE purchases.date BETWEEN ? AND ?`;
    params.push(start, end);
  }
  sql += ` GROUP BY products.id ORDER BY total_amount DESC`;
  try {
    const data = db.prepare(sql).all(...params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/purchase-price-comparison', authenticateToken, (req, res) => {
  try {
    const sql = `
      WITH RankedPurchases AS (
        SELECT 
          pi.product_id,
          p.name as product_name,
          p.part_number,
          pi.rate,
          pur.date,
          ROW_NUMBER() OVER (PARTITION BY pi.product_id ORDER BY pur.date DESC, pur.id DESC) as rank
        FROM purchase_items pi
        JOIN products p ON pi.product_id = p.id
        JOIN purchases pur ON pi.purchase_id = pur.id
      )
      SELECT 
        product_id,
        product_name,
        part_number,
        MAX(CASE WHEN rank = 1 THEN rate END) as latest_price,
        MAX(CASE WHEN rank = 1 THEN date END) as latest_date,
        MAX(CASE WHEN rank = 2 THEN rate END) as previous_price,
        MAX(CASE WHEN rank = 2 THEN date END) as previous_date
      FROM RankedPurchases
      WHERE rank <= 2
      GROUP BY product_id, product_name, part_number
      HAVING latest_price IS NOT NULL
      ORDER BY product_name ASC
    `;
    const data = db.prepare(sql).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Suppliers Routes ---
app.get('/api/suppliers', authenticateToken, (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers').all();
  res.json(suppliers);
});

app.post('/api/suppliers', authenticateToken, (req, res) => {
  const { name, company_name, phone, email, address, gstin } = req.body;
  const info = db.prepare('INSERT INTO suppliers (name, company_name, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?)').run(name, company_name, phone, email, address, gstin);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/suppliers/:id', authenticateToken, (req, res) => {
  const { name, company_name, phone, email, address, gstin } = req.body;
  try {
    db.prepare(`
      UPDATE suppliers 
      SET name = ?, company_name = ?, phone = ?, email = ?, address = ?, gstin = ? 
      WHERE id = ?
    `).run(name, company_name, phone, email, address, gstin, req.params.id);
    res.json({ message: 'Supplier updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Expenses Routes ---
app.post('/api/suppliers/bulk', authenticateToken, (req, res) => {
  const suppliers = req.body;
  const upsert = db.transaction((sups) => {
    const stmt = db.prepare(`
      INSERT INTO suppliers (name, company_name, phone, email, address, gstin)
      VALUES (@name, @company_name, @phone, @email, @address, @gstin)
      ON CONFLICT(gstin) DO UPDATE SET
        name = excluded.name,
        company_name = excluded.company_name,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address
    `);
    for (const s of sups) {
      if (s.gstin) stmt.run(s);
    }
  });

  try {
    upsert(suppliers);
    res.json({ message: 'Suppliers updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/expenses', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = 'SELECT * FROM expenses';
  const params = [from || fy.start_date, to || fy.end_date];
  sql += ' WHERE date BETWEEN ? AND ?';
  sql += ' ORDER BY date DESC';
  const expenses = db.prepare(sql).all(...params);
  res.json(expenses);
});

app.post('/api/expenses', authenticateToken, (req, res) => {
  const { category, amount, date, description, payment_mode } = req.body;
  const info = db.prepare('INSERT INTO expenses (category, amount, date, description, payment_mode) VALUES (?, ?, ?, ?, ?)').run(category, amount, date, description, payment_mode);
  res.status(201).json({ id: info.lastInsertRowid });
});

// --- Users Routes ---
app.get('/api/users', authenticateToken, (req, res) => {
  const users = db.prepare('SELECT id, username, role FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticateToken, (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role || 'staff');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const id = req.params.id;
  
  // Prevent self-deletion
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logAction(req.user.username, `Deleted User: ${user.username}`, req);
  res.json({ message: 'User deleted successfully' });
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, password, role } = req.body;
  const id = req.params.id;

  try {
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?').run(username, hashedPassword, role, id);
    } else {
      db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, id);
    }
    logAction(req.user.username, `Updated User: ${username}`, req);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Update failed: ' + err.message });
  }
});

app.get('/api/backup', authenticateToken, (req, res) => {
  const dbPath = path.join(__dirname, 'database.sqlite');
  logAction(req.user.username, 'System Backup Downloaded', req);
  res.download(dbPath);
});

app.get('/api/backup/fy/:fyId', authenticateToken, (req, res) => {
  const fyId = parseInt(req.params.fyId);
  try {
    const fy = db.prepare('SELECT * FROM financial_years WHERE id = ?').get(fyId);
    if (!fy) return res.status(404).json({ error: 'Financial year not found' });

    const { start_date, end_date, label } = fy;

    const invoices = db.prepare(`
      SELECT invoices.*, customers.name as customer_name, customers.company_name, customers.gstin, customers.phone, customers.address
      FROM invoices LEFT JOIN customers ON invoices.customer_id = customers.id
      WHERE invoices.date BETWEEN ? AND ? ORDER BY invoices.date
    `).all(start_date, end_date);

    const invoiceIds = invoices.map(i => i.id);
    const invoiceItems = invoiceIds.length > 0
      ? db.prepare(`SELECT invoice_items.*, products.name as product_name, products.part_number, products.hsn_code, products.unit FROM invoice_items JOIN products ON invoice_items.product_id = products.id WHERE invoice_id IN (${invoiceIds.map(() => '?').join(',')}) ORDER BY invoice_id`).all(...invoiceIds)
      : [];

    const purchases = db.prepare(`
      SELECT purchases.*, suppliers.name as supplier_name, suppliers.company_name as supplier_company, suppliers.gstin as supplier_gstin
      FROM purchases LEFT JOIN suppliers ON purchases.supplier_id = suppliers.id
      WHERE purchases.date BETWEEN ? AND ? ORDER BY purchases.date
    `).all(start_date, end_date);

    const purchaseIds = purchases.map(p => p.id);
    const purchaseItems = purchaseIds.length > 0
      ? db.prepare(`SELECT purchase_items.*, products.name as product_name, products.part_number, products.hsn_code, products.unit FROM purchase_items JOIN products ON purchase_items.product_id = products.id WHERE purchase_id IN (${purchaseIds.map(() => '?').join(',')}) ORDER BY purchase_id`).all(...purchaseIds)
      : [];

    const payments = db.prepare(`
      SELECT payments.*, customers.name as customer_name, invoices.invoice_number
      FROM payments LEFT JOIN customers ON payments.customer_id = customers.id
      LEFT JOIN invoices ON payments.invoice_id = invoices.id
      WHERE payments.date BETWEEN ? AND ? ORDER BY payments.date
    `).all(start_date, end_date);

    const expenses = db.prepare(`SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date`).all(start_date, end_date);

    const salesReturns = db.prepare(`
      SELECT sales_returns.*, customers.name as customer_name FROM sales_returns
      LEFT JOIN customers ON sales_returns.customer_id = customers.id
      WHERE sales_returns.date BETWEEN ? AND ? ORDER BY sales_returns.date
    `).all(start_date, end_date);

    const purchaseReturns = db.prepare(`
      SELECT purchase_returns.*, suppliers.name as supplier_name FROM purchase_returns
      LEFT JOIN suppliers ON purchase_returns.supplier_id = suppliers.id
      WHERE purchase_returns.date BETWEEN ? AND ? ORDER BY purchase_returns.date
    `).all(start_date, end_date);

    const customers = db.prepare('SELECT * FROM customers').all();
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    const products = db.prepare('SELECT * FROM products').all();

    const backupData = {
      meta: {
        exported_at: new Date().toISOString(),
        financial_year: label,
        start_date,
        end_date,
        company: 'Ephphatha Construction Trading Company'
      },
      summary: {
        invoices: invoices.length,
        purchases: purchases.length,
        payments: payments.length,
        expenses: expenses.length,
        sales_returns: salesReturns.length,
        purchase_returns: purchaseReturns.length,
        total_sales: invoices.reduce((s, i) => s + (i.total || 0), 0),
        total_purchases: purchases.reduce((s, p) => s + (p.total || 0), 0),
        total_expenses: expenses.reduce((s, e) => s + (e.amount || 0), 0),
      },
      financial_year: fy,
      customers,
      suppliers,
      products,
      invoices,
      invoice_items: invoiceItems,
      purchases,
      purchase_items: purchaseItems,
      payments,
      expenses,
      sales_returns: salesReturns,
      purchase_returns: purchaseReturns,
    };

    logAction(req.user.username, `FY Backup Downloaded: ${label}`, req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ETC_FY_${label}_Backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(backupData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restore', authenticateToken, upload.single('database'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const tempPath = req.file.path;
  const dbPath = path.join(__dirname, 'database.sqlite');

  try {
    // For simplicity, we'll just copy the file over. 
    // Note: This might cause issues if there are active transactions.
    await fs.copy(tempPath, dbPath, { overwrite: true });
    await fs.remove(tempPath);
    logAction(req.user.username, 'System Restored from Backup', req);
    res.json({ message: 'Database restored successfully. Please restart the application for changes to take full effect.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

app.post('/api/system/reset', authenticateToken, (req, res) => {
  if (req.user.role.toLowerCase() !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { type } = req.body;

  try {
    const tablesMap = {
      'logs': ['logs'],
      'customers': ['payments', 'sales_return_items', 'sales_returns', 'invoice_items', 'invoices', 'quotation_items', 'quotations', 'customers'],
      'products': ['invoice_items', 'quotation_items', 'purchase_items', 'sales_return_items', 'purchase_return_items', 'products'],
      'invoices': ['sales_return_items', 'sales_returns', 'payments', 'invoice_items', 'invoices'],
      'quotations': ['sales_return_items', 'sales_returns', 'payments', 'invoice_items', 'invoices', 'quotation_items', 'quotations'],
      'payments': ['payments'],
      'purchases': ['purchase_return_items', 'purchase_returns', 'purchase_items', 'purchases'],
      'suppliers': ['purchase_return_items', 'purchase_returns', 'purchase_items', 'purchases', 'suppliers'],
      'expenses': ['expenses'],
      'all': [
        'logs', 'invoice_items', 'quotation_items', 'purchase_items', 
        'sales_return_items', 'purchase_return_items', 'payments', 
        'sales_returns', 'purchase_returns', 'invoices', 'quotations', 
        'purchases', 'expenses', 'customers', 'products', 'suppliers'
      ]
    };

    const tables = tablesMap[type];
    if (!tables) return res.status(400).json({ error: 'Invalid reset type' });

    db.transaction(() => {
      for (const table of tables) {
        db.prepare(`DELETE FROM ${table}`).run();
        // Reset autoincrement
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
      }
    })();

    logAction(req.user.username, `System Reset: ${type}`, req);
    res.json({ message: `Reset successful for ${type}` });
  } catch (err) {
    console.error('Reset error:', err.message);
    res.status(500).json({ error: err.message });
  }
});



app.get('/api/invoices/:id', authenticateToken, (req, res) => {
  const invoice = db.prepare(`
    SELECT invoices.*, customers.name as customer_name, customers.company_name, customers.address, customers.gstin, customers.phone
    FROM invoices 
    LEFT JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.id = ?
  `).get(req.params.id);
  
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  
  const items = db.prepare(`
    SELECT invoice_items.*, products.name, products.part_number, products.hsn_code, products.unit
    FROM invoice_items
    JOIN products ON invoice_items.product_id = products.id
    WHERE invoice_id = ?
  `).all(req.params.id);
  
  res.json({ ...invoice, items });
});

app.get('/api/invoices/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare(`
    SELECT invoice_items.*, 
           invoice_items.rate as unit_price,
           products.name as product_name, 
           products.part_number, 
           products.hsn_code, 
           products.unit,
           products.tax_rate as gst_rate
    FROM invoice_items
    JOIN products ON invoice_items.product_id = products.id
    WHERE invoice_id = ?
  `).all(req.params.id);
  res.json(items);
});

app.get('/api/purchases/:id/items', authenticateToken, (req, res) => {
  const items = db.prepare(`
    SELECT purchase_items.*, 
           purchase_items.rate as unit_price,
           products.name as product_name, 
           products.part_number, 
           products.hsn_code, 
           products.unit,
           products.tax_rate as gst_rate
    FROM purchase_items
    JOIN products ON purchase_items.product_id = products.id
    WHERE purchase_id = ?
  `).all(req.params.id);
  res.json(items);
});

app.get('/api/quotations/:id', authenticateToken, (req, res) => {
  const quote = db.prepare(`
    SELECT quotations.*, customers.name as customer_name, customers.company_name, customers.address, customers.gstin, customers.phone
    FROM quotations 
    LEFT JOIN customers ON quotations.customer_id = customers.id
    WHERE quotations.id = ?
  `).get(req.params.id);
  
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });
  
  const items = db.prepare(`
    SELECT quotation_items.*, products.name, products.part_number, products.hsn_code, products.unit
    FROM quotation_items
    JOIN products ON quotation_items.product_id = products.id
    WHERE quotation_id = ?
  `).all(req.params.id);
  
  res.json({ ...quote, items });
});

// --- Payments Routes ---
app.get('/api/payments', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = `
    SELECT payments.*, customers.name as customer_name, invoices.invoice_number
    FROM payments
    LEFT JOIN customers ON payments.customer_id = customers.id
    LEFT JOIN invoices ON payments.invoice_id = invoices.id
    WHERE payments.date BETWEEN ? AND ?
  `;
  const params = [from || fy.start_date, to || fy.end_date];
  sql += ' ORDER BY date DESC';
  const payments = db.prepare(sql).all(...params);
  res.json(payments);
});

app.post('/api/payments', authenticateToken, (req, res) => {
  const { customer_id, invoice_id, date, amount, payment_mode, reference_no, notes } = req.body;
  const custId = customer_id || null;
  const invId = invoice_id || null;
  
  try {
    const info = db.prepare(`
      INSERT INTO payments (customer_id, invoice_id, date, amount, payment_mode, reference_no, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(custId, invId, date, parseFloat(amount) || 0, payment_mode, reference_no || null, notes || null);
    
    // Auto-update invoice status if linked
    if (invId) {
      const invoice = db.prepare('SELECT total FROM invoices WHERE id = ?').get(invId);
      const totalPaid = db.prepare('SELECT SUM(amount) as paid FROM payments WHERE invoice_id = ?').get(invId).paid || 0;
      
      let newStatus = 'Pending';
      if (totalPaid >= invoice.total) {
        newStatus = 'Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Partial';
      }
      
      db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(newStatus, invId);
    }

    logAction(req.user.username, `Recorded Payment: ₹${amount} from customer_id=${custId}`, req);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error('Payment save error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/payments/:id', authenticateToken, (req, res) => {
  const payment = db.prepare(`
    SELECT payments.*, customers.name as customer_name, customers.company_name, invoices.invoice_number
    FROM payments
    LEFT JOIN customers ON payments.customer_id = customers.id
    LEFT JOIN invoices ON payments.invoice_id = invoices.id
    WHERE payments.id = ?
  `).get(parseInt(req.params.id));
  res.json(payment);
});

// --- Bank Receipts Routes ---
app.get('/api/bank-receipts', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const fy = getActiveFYRange();
  let sql = `SELECT * FROM bank_receipts WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC`;
  const params = [from || fy.start_date, to || fy.end_date];
  try {
    const receipts = db.prepare(sql).all(...params);
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bank-receipts', authenticateToken, (req, res) => {
  const { date, party_name, party_type, amount, payment_mode, bank_name, cheque_number, reference_no, narration, status, customer_id, supplier_id } = req.body;
  const receipt_number = generateNumber('BR', 'bank_receipts', 'receipt_number');
  try {
    const info = db.prepare(`
      INSERT INTO bank_receipts (receipt_number, date, party_name, party_type, amount, payment_mode, bank_name, cheque_number, reference_no, narration, status, customer_id, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receipt_number, date, party_name, party_type || 'Customer',
      parseFloat(amount) || 0, payment_mode || 'Cheque',
      bank_name || null, cheque_number || null,
      reference_no || null, narration || null,
      status || 'Cleared', customer_id || null, supplier_id || null
    );
    logAction(req.user.username, `Added Bank Receipt: ${receipt_number} | ₹${amount} from ${party_name}`, req);
    res.status(201).json({ id: info.lastInsertRowid, receipt_number });
  } catch (err) {
    console.error('Bank receipt save error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/bank-receipts/:id', authenticateToken, (req, res) => {
  const { date, party_name, party_type, amount, payment_mode, bank_name, cheque_number, reference_no, narration, status } = req.body;
  try {
    db.prepare(`
      UPDATE bank_receipts SET date=?, party_name=?, party_type=?, amount=?, payment_mode=?, bank_name=?, cheque_number=?, reference_no=?, narration=?, status=?
      WHERE id=?
    `).run(date, party_name, party_type, amount, payment_mode, bank_name, cheque_number, reference_no, narration, status, req.params.id);
    logAction(req.user.username, `Updated Bank Receipt #${req.params.id}`, req);
    res.json({ message: 'Bank receipt updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bank-receipts/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM bank_receipts WHERE id = ?').run(req.params.id);
    logAction(req.user.username, `Deleted Bank Receipt #${req.params.id}`, req);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Dashboard Stats ---
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const fy = getActiveFYRange();
  const sales = db.prepare('SELECT SUM(total) as total_sales FROM invoices WHERE date BETWEEN ? AND ?').get(fy.start_date, fy.end_date);
  const purchases = db.prepare('SELECT SUM(total) as total_purchases FROM purchases WHERE date BETWEEN ? AND ?').get(fy.start_date, fy.end_date);
  const quotes = db.prepare('SELECT COUNT(*) as total_quotes FROM quotations WHERE date BETWEEN ? AND ?').get(fy.start_date, fy.end_date);
  const products = db.prepare('SELECT COUNT(*) as total_products FROM products').get();
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 10').get();
  
  res.json({
    totalSales: sales.total_sales || 0,
    totalPurchases: purchases.total_purchases || 0,
    totalQuotes: quotes.total_quotes || 0,
    totalProducts: products.total_products || 0,
    lowStock: lowStock.count || 0
  });
});

// --- Server Start ---

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
