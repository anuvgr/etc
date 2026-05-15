const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'database.sqlite'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff'
  );

  CREATE TABLE IF NOT EXISTS financial_years (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    part_number TEXT UNIQUE,
    hsn_code TEXT,
    unit TEXT DEFAULT 'PCS',
    purchase_price REAL DEFAULT 0,
    sales_price REAL DEFAULT 0,
    tax_rate REAL DEFAULT 18.0,
    stock INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    quotation_id INTEGER,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    discount REAL DEFAULT 0,
    delivery_address TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(quotation_id) REFERENCES quotations(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Open',
    discount REAL DEFAULT 0,
    delivery_address TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY(quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    invoice_id INTEGER,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_mode TEXT DEFAULT 'Cash',
    reference_no TEXT,
    notes TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(invoice_id) REFERENCES invoices(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    payment_mode TEXT DEFAULT 'Cash'
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    location TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id INTEGER,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Received',
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS sales_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT UNIQUE NOT NULL,
    invoice_id INTEGER,
    customer_id INTEGER,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    total REAL NOT NULL,
    reason TEXT,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id),
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_return_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY(sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_number TEXT UNIQUE NOT NULL,
    purchase_id INTEGER,
    supplier_id INTEGER,
    date TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    total REAL NOT NULL,
    reason TEXT,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_return_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY(purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS bank_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_type TEXT DEFAULT 'Customer',
    amount REAL NOT NULL,
    payment_mode TEXT DEFAULT 'Cheque',
    bank_name TEXT,
    cheque_number TEXT,
    reference_no TEXT,
    narration TEXT,
    status TEXT DEFAULT 'Cleared',
    customer_id INTEGER REFERENCES customers(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: If the table was created with 'price', copy it to 'sales_price' and remove 'price'
try {
  const columns = db.prepare("PRAGMA table_info(products)").all();
  const hasPrice = columns.some(c => c.name === 'price');
  
  if (hasPrice) {
    db.transaction(() => {
      // Create new table without 'price'
      db.prepare(`
        CREATE TABLE IF NOT EXISTS products_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          part_number TEXT UNIQUE,
          hsn_code TEXT,
          unit TEXT DEFAULT 'PCS',
          purchase_price REAL DEFAULT 0,
          sales_price REAL DEFAULT 0,
          tax_rate REAL DEFAULT 18.0,
          stock INTEGER DEFAULT 0
        )
      `).run();

      // Copy data
      const hasOldSalesPrice = columns.some(c => c.name === 'sales_price');
      if (hasOldSalesPrice) {
        db.prepare(`
          INSERT INTO products_new (id, name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock)
          SELECT id, name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock FROM products
        `).run();
      } else {
        db.prepare(`
          INSERT INTO products_new (id, name, part_number, hsn_code, unit, purchase_price, sales_price, tax_rate, stock)
          SELECT id, name, part_number, hsn_code, unit, 0, price, tax_rate, stock FROM products
        `).run();
      }

      db.prepare('DROP TABLE products').run();
      db.prepare('ALTER TABLE products_new RENAME TO products').run();
    })();
  }
} catch (e) {
  console.log('Product migration info:', e.message);
}

// Migration for invoices: add quotation_id if missing
try {
  const columns = db.prepare("PRAGMA table_info(invoices)").all();
  if (!columns.some(c => c.name === 'quotation_id')) {
    db.prepare("ALTER TABLE invoices ADD COLUMN quotation_id INTEGER REFERENCES quotations(id)").run();
  }
} catch (e) {
  console.log('Invoice migration info:', e.message);
}

// Migration: create bank_receipts table if it doesn't exist yet
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bank_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      party_name TEXT NOT NULL,
      party_type TEXT DEFAULT 'Customer',
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cheque',
      bank_name TEXT,
      cheque_number TEXT,
      reference_no TEXT,
      narration TEXT,
      status TEXT DEFAULT 'Cleared',
      customer_id INTEGER REFERENCES customers(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  // Add columns if they don't exist (for existing tables)
  const columns = db.prepare("PRAGMA table_info(bank_receipts)").all();
  if (!columns.some(c => c.name === 'customer_id')) {
    db.prepare("ALTER TABLE bank_receipts ADD COLUMN customer_id INTEGER REFERENCES customers(id)").run();
  }
  if (!columns.some(c => c.name === 'supplier_id')) {
    db.prepare("ALTER TABLE bank_receipts ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)").run();
  }
  
  console.log('bank_receipts table ready.');
} catch (e) {
  console.log('bank_receipts migration info:', e.message);
}

// Seed Admin User
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
  console.log('Default admin user created: admin / admin123');
}

// Seed initial Financial Year if none exists
const fyCount = db.prepare('SELECT COUNT(*) as count FROM financial_years').get();
if (fyCount.count === 0) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  let startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  let endYear = startYear + 1;
  
  const label = `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;

  db.prepare('INSERT INTO financial_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, 1)').run(label, startDate, endDate);
  console.log(`Seeded default Financial Year: ${label} (Active)`);
}

module.exports = db;
