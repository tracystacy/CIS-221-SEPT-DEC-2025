// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = 3000;

// Enable CORS for frontend communication
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    // Create inventory table
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        bought INTEGER NOT NULL,
        sold INTEGER DEFAULT 0,
        stock INTEGER NOT NULL
      )
    `);
    // Create revenue table (to store total revenue)
    db.run(`
      CREATE TABLE IF NOT EXISTS revenue (
        id INTEGER PRIMARY KEY,
        total REAL DEFAULT 0.0
      )
    `);
    // Insert initial revenue if not exists
    db.get('SELECT * FROM revenue WHERE id = 1', (err, row) => {
      if (!row) {
        db.run('INSERT INTO revenue (id, total) VALUES (1, 0.0)');
      }
    });
  }
});

// Insert initial items (only if table is empty)
const initialItems = [
  { id: 1, name: 'Summer Floral Dress', price: 1459.00, bought: 100, sold: 0, stock: 100 },
  { id: 2, name: 'Classic Denim Jacket', price: 1799.99, bought: 100, sold: 0, stock: 100 },
  { id: 3, name: 'Leather Ankle Boots', price: 5699.00, bought: 100, sold: 0, stock: 100 }
];

db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
  if (row.count === 0) {
    const stmt = db.prepare('INSERT INTO inventory (id, name, price, bought, sold, stock) VALUES (?, ?, ?, ?, ?, ?)');
    initialItems.forEach(item => {
      stmt.run(item.id, item.name, item.price, item.bought, item.sold, item.stock);
    });
    stmt.finalize();
  }
});

// API to get inventory and revenue
app.get('/api/inventory', (req, res) => {
  db.all('SELECT * FROM inventory', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get('SELECT total FROM revenue WHERE id = 1', (err, revenue) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ inventory: rows, totalRevenue: revenue.total });
    });
  });
});

// API to handle a sale (add to cart)
app.post('/api/sell/:id', (req, res) => {
  const itemId = req.params.id;
  db.get('SELECT * FROM inventory WHERE id = ?', [itemId], (err, item) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!item || item.stock <= 0) {
      return res.status(400).json({ error: 'Out of stock or item not found' });
    }
    db.run('UPDATE inventory SET sold = sold + 1, stock = stock - 1 WHERE id = ?', [itemId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.run('UPDATE revenue SET total = total + ? WHERE id = 1', [item.price], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Sale recorded', item });
      });
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(Server running at http://localhost:${port});
});