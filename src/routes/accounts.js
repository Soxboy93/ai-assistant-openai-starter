const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/accounts
router.get('/', (req, res) => {
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at').all(req.user.id);
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);
  res.json({ accounts, totalBalance: total });
});

// POST /api/accounts
router.post('/', (req, res) => {
  const { name, type, balance = 0, color = '#4F46E5' } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

  const valid = ['checking', 'savings', 'credit', 'cash', 'investment'];
  if (!valid.includes(type)) return res.status(400).json({ error: `type must be one of: ${valid.join(', ')}` });

  const result = db.prepare(
    'INSERT INTO accounts (user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, name, type, balance, color);

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(account);
});

// GET /api/accounts/:id
router.get('/:id', (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
});

// PATCH /api/accounts/:id
router.patch('/:id', (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const { name, color } = req.body;
  const updates = [];
  const params = [];
  if (name)  { updates.push('name = ?');  params.push(name);  }
  if (color) { updates.push('color = ?'); params.push(color); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id));
});

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Account deleted' });
});

module.exports = router;
