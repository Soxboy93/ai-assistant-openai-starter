const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/categories  (default + user-defined)
router.get('/', (req, res) => {
  const categories = db.prepare(
    'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY is_default DESC, name'
  ).all(req.user.id);
  res.json(categories);
});

// POST /api/categories
router.post('/', (req, res) => {
  const { name, icon = '📦', color = '#6B7280', type = 'both' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(
    'INSERT INTO categories (user_id, name, icon, color, type) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, name, icon, color, type);

  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/categories/:id
router.patch('/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!cat) return res.status(404).json({ error: 'Category not found or is a default category' });

  const { name, icon, color, type } = req.body;
  const updates = [];
  const params = [];
  if (name)  { updates.push('name = ?');  params.push(name);  }
  if (icon)  { updates.push('icon = ?');  params.push(icon);  }
  if (color) { updates.push('color = ?'); params.push(color); }
  if (type)  { updates.push('type = ?');  params.push(type);  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!cat) return res.status(404).json({ error: 'Category not found or is a default category' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Category deleted' });
});

module.exports = router;
