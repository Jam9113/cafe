const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
const db = new sqlite3.Database('./dear_cafe.db', err => {
  if (err) return console.error('DB connection error:', err.message);
  console.log('Connected to SQLite DB');
});

// Create orders table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    items TEXT,
    total INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Root test route
app.get('/', (req, res) => {
  res.send('Dear Café CDO API is running!');
});

// Save order
app.post('/order', (req, res) => {
  const { customerName, items, total } = req.body;

  if (!customerName || !items || !total) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const stmt = db.prepare('INSERT INTO orders (customer_name, items, total) VALUES (?, ?, ?)');
  stmt.run(customerName, JSON.stringify(items), total, function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Order saved', orderId: this.lastID });
  });
});

// Get all orders
app.get('/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
