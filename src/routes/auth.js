const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, currency = 'USD' } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, and password are required' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare(
      'INSERT INTO users (name, email, password, currency) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(name, email, hash, currency);
    const userId = result.lastInsertRowid;

    // Create default accounts for the new user
    db.prepare(
      `INSERT INTO accounts (user_id, name, type, balance, color)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userId, 'Cash', 'cash', 0, '#10B981');

    const token = signToken({ id: userId, email });
    const user = db.prepare('SELECT id, name, email, currency, created_at FROM users WHERE id = ?').get(userId);
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ id: user.id, email: user.email });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, currency, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  const { name, currency, password } = req.body;
  const updates = [];
  const params = [];

  if (name)     { updates.push('name = ?');     params.push(name); }
  if (currency) { updates.push('currency = ?'); params.push(currency); }
  if (password) {
    updates.push('password = ?');
    params.push(await bcrypt.hash(password, 10));
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const user = db.prepare('SELECT id, name, email, currency, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
