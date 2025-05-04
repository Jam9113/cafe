const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Connect to SQLite DB
const db = new sqlite3.Database('./orders.db', (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to the SQLite database.');
});

// Create tables if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_name TEXT,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);
});

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Order route
app.post('/order', (req, res) => {
  const { customerName, items, total } = req.body;

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order data.' });
  }

  const insertOrder = `INSERT INTO orders (customer_name, total) VALUES (?, ?)`;
  db.run(insertOrder, [customerName, total], function (err) {
    if (err) {
      console.error('Order Insert Error:', err.message);
      return res.status(500).json({ error: 'Failed to place order' });
    }

    const orderId = this.lastID;

    const insertItem = `INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)`;
    const stmt = db.prepare(insertItem);
    items.forEach(item => {
      stmt.run(orderId, item.name, item.quantity, item.price);
    });
    stmt.finalize();

    res.json({ message: 'Order placed successfully!', orderId });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
