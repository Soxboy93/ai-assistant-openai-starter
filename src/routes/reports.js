const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/summary', (req, res) => {
  const { from, to } = req.query;
  const uid = req.user.id;

  let dateFilter = '';
  const params = [uid];
  if (from) { dateFilter += ' AND date >= ?'; params.push(from); }
  if (to)   { dateFilter += ' AND date <= ?'; params.push(to); }

  const totals = db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expenses,
       COUNT(*) AS transaction_count
     FROM transactions WHERE user_id = ? ${dateFilter}`
  ).get(...params);

  const netSavings = totals.total_income - totals.total_expenses;
  const savingsRate = totals.total_income > 0
    ? ((netSavings / totals.total_income) * 100).toFixed(1)
    : '0.0';

  const accounts = db.prepare(
    'SELECT * FROM accounts WHERE user_id = ?'
  ).all(uid);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  res.json({
    total_income: totals.total_income,
    total_expenses: totals.total_expenses,
    net_savings: netSavings,
    savings_rate: parseFloat(savingsRate),
    transaction_count: totals.transaction_count,
    total_balance: totalBalance,
  });
});

// GET /api/reports/by-category?from=&to=&type=expense|income
router.get('/by-category', (req, res) => {
  const { from, to, type = 'expense' } = req.query;
  const uid = req.user.id;

  const params = [uid, type];
  let dateFilter = '';
  if (from) { dateFilter += ' AND t.date >= ?'; params.push(from); }
  if (to)   { dateFilter += ' AND t.date <= ?'; params.push(to); }

  const rows = db.prepare(
    `SELECT
       c.id AS category_id, c.name, c.icon, c.color,
       COALESCE(SUM(t.amount), 0) AS total,
       COUNT(t.id) AS count
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id
       AND t.user_id = ? AND t.type = ? ${dateFilter}
     WHERE c.user_id IS NULL OR c.user_id = ?
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC`
  ).all(...params, uid);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const result = rows.map(r => ({
    ...r,
    percentage: grandTotal > 0 ? parseFloat(((r.total / grandTotal) * 100).toFixed(1)) : 0,
  }));

  res.json(result);
});

// GET /api/reports/monthly?year=YYYY
router.get('/monthly', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const uid = req.user.id;

  const rows = db.prepare(
    `SELECT
       strftime('%m', date) AS month,
       COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
     FROM transactions
     WHERE user_id = ? AND strftime('%Y', date) = ?
     GROUP BY month
     ORDER BY month`
  ).all(uid, String(year));

  // Fill in missing months with zeros
  const byMonth = Object.fromEntries(rows.map(r => [r.month, r]));
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const r = byMonth[m] || { month: m, income: 0, expenses: 0 };
    return { month: m, income: r.income, expenses: r.expenses, net: r.income - r.expenses };
  });

  res.json(months);
});

// GET /api/reports/trends?months=6
router.get('/trends', (req, res) => {
  const { months = 6 } = req.query;
  const uid = req.user.id;

  const rows = db.prepare(
    `SELECT
       strftime('%Y-%m', date) AS period,
       COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
     FROM transactions
     WHERE user_id = ?
       AND date >= date('now', ? || ' months')
     GROUP BY period
     ORDER BY period`
  ).all(uid, `-${months}`);

  res.json(rows.map(r => ({ ...r, net: r.income - r.expenses })));
});

// GET /api/reports/budgets
router.get('/budgets', (req, res) => {
  const uid = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const budgets = db.prepare(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
       COALESCE((
         SELECT SUM(t.amount) FROM transactions t
         WHERE t.category_id = b.category_id
           AND t.user_id = b.user_id
           AND t.type = 'expense'
           AND t.date >= ?
       ), 0) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ?`
  ).all(monthStart, uid);

  res.json(budgets.map(b => ({
    ...b,
    remaining: b.amount - b.spent,
    percentage: parseFloat(((b.spent / b.amount) * 100).toFixed(1)),
  })));
});

module.exports = router;
