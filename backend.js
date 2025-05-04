
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('dear_cafe.db');

app.use(cors());
app.use(bodyParser.json());

// Get all products
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get cart items
app.get('/cart', (req, res) => {
    db.all(\`
        SELECT cart.id, products.name, products.price, cart.quantity
        FROM cart
        JOIN products ON cart.product_id = products.id
    \`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add to cart
app.post('/cart', (req, res) => {
    const { product_id, quantity } = req.body;
    db.get('SELECT id, quantity FROM cart WHERE product_id = ?', [product_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            db.run('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [quantity, row.id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'updated' });
            });
        } else {
            db.run('INSERT INTO cart (product_id, quantity) VALUES (?, ?)', [product_id, quantity], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'added' });
            });
        }
    });
});

// Checkout cart
app.post('/checkout', (req, res) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('INSERT INTO orders DEFAULT VALUES', function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            const orderId = this.lastID;
            db.all(\`
                SELECT product_id, quantity,
                (SELECT price FROM products WHERE id = cart.product_id) AS price
                FROM cart
            \`, [], (err, items) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                const stmt = db.prepare(\`
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?)
                \`);
                for (const item of items) {
                    stmt.run(orderId, item.product_id, item.quantity, item.price);
                }
                stmt.finalize();
                db.run('DELETE FROM cart');
                db.run('COMMIT');
                res.json({ status: 'checked out', order_id: orderId });
            });
        });
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
