const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Helper: update account balance after a transaction change
function adjustBalance(accountId, delta) {
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(delta, accountId);
}

// GET /api/transactions
// Query params: account_id, category_id, type, from, to, limit, offset, search
router.get('/', (req, res) => {
  const { account_id, category_id, type, from, to, limit = 50, offset = 0, search } = req.query;

  let sql = `
    SELECT t.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
  `;
  const params = [req.user.id];

  if (account_id)  { sql += ' AND t.account_id = ?';   params.push(account_id); }
  if (category_id) { sql += ' AND t.category_id = ?';  params.push(category_id); }
  if (type)        { sql += ' AND t.type = ?';          params.push(type); }
  if (from)        { sql += ' AND t.date >= ?';         params.push(from); }
  if (to)          { sql += ' AND t.date <= ?';         params.push(to); }
  if (search)      { sql += ' AND (t.description LIKE ? OR t.note LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const transactions = db.prepare(sql).all(...params);
  res.json(transactions);
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { account_id, category_id, type, amount, description = '', note = '', date } = req.body;
  if (!account_id || !type || !amount)
    return res.status(400).json({ error: 'account_id, type, and amount are required' });
  if (!['income', 'expense', 'transfer'].includes(type))
    return res.status(400).json({ error: 'type must be income, expense, or transfer' });
  if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

  // Verify account belongs to user
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const txDate = date || new Date().toISOString().split('T')[0];

  const insertAndUpdate = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, note, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, account_id, category_id || null, type, amount, description, note, txDate);

    // Adjust balance: income adds, expense subtracts
    const delta = type === 'income' ? amount : -amount;
    if (type !== 'transfer') adjustBalance(account_id, delta);

    return result.lastInsertRowid;
  });

  const id = insertAndUpdate();
  const tx = db.prepare(
    `SELECT t.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`
  ).get(id);

  res.status(201).json(tx);
});

// GET /api/transactions/:id
router.get('/:id', (req, res) => {
  const tx = db.prepare(
    `SELECT t.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ? AND t.user_id = ?`
  ).get(req.params.id, req.user.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

// PATCH /api/transactions/:id
router.patch('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  const { category_id, description, note, date, amount } = req.body;
  const updates = [];
  const params = [];

  if (category_id !== undefined) { updates.push('category_id = ?');  params.push(category_id); }
  if (description !== undefined) { updates.push('description = ?');   params.push(description); }
  if (note !== undefined)        { updates.push('note = ?');          params.push(note); }
  if (date !== undefined)        { updates.push('date = ?');          params.push(date); }

  const updateTx = db.transaction(() => {
    if (amount !== undefined && amount !== tx.amount) {
      updates.push('amount = ?');
      params.push(amount);
      // Reverse old effect, apply new
      if (tx.type !== 'transfer') {
        const oldDelta = tx.type === 'income' ? -tx.amount : tx.amount;
        const newDelta = tx.type === 'income' ? amount : -amount;
        adjustBalance(tx.account_id, oldDelta + newDelta);
      }
    }
    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
  });

  updateTx();

  const updated = db.prepare(
    `SELECT t.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`
  ).get(req.params.id);

  res.json(updated);
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  db.transaction(() => {
    // Reverse the balance effect
    if (tx.type !== 'transfer') {
      const delta = tx.type === 'income' ? -tx.amount : tx.amount;
      adjustBalance(tx.account_id, delta);
    }
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  })();

  res.json({ message: 'Transaction deleted' });
});

module.exports = router;
