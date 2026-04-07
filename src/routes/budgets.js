const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/budgets
router.get('/', (req, res) => {
  const budgets = db.prepare(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ? ORDER BY c.name`
  ).all(req.user.id);
  res.json(budgets);
});

// POST /api/budgets
router.post('/', (req, res) => {
  const { category_id, amount, period = 'monthly' } = req.body;
  if (!category_id || !amount) return res.status(400).json({ error: 'category_id and amount are required' });

  try {
    const result = db.prepare(
      'INSERT INTO budgets (user_id, category_id, amount, period) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, category_id, amount, period);
    const budget = db.prepare(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM budgets b JOIN categories c ON c.id = b.category_id WHERE b.id = ?`
    ).get(result.lastInsertRowid);
    res.status(201).json(budget);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Budget for this category and period already exists' });
    throw err;
  }
});

// PATCH /api/budgets/:id
router.patch('/:id', (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found' });

  const { amount, period } = req.body;
  const updates = [];
  const params = [];
  if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
  if (period !== undefined) { updates.push('period = ?'); params.push(period); }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM budgets b JOIN categories c ON c.id = b.category_id WHERE b.id = ?`
  ).get(req.params.id);
  res.json(updated);
});

// DELETE /api/budgets/:id
router.delete('/:id', (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!budget) return res.status(404).json({ error: 'Budget not found' });
  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Budget deleted' });
});

module.exports = router;
