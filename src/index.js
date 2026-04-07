require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createAssistantReply } = require('./assistant');
const { requireAuth } = require('./middleware/auth');
const db = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/accounts',     require('./routes/accounts'));
app.use('/api/categories',   require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/budgets',      require('./routes/budgets'));

// ── AI Accounting Assistant ───────────────────────────────────────────────────
app.post('/api/assistant', requireAuth, async (req, res) => {
  try {
    const { messages, assistantConfig } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: "Request must include 'messages' array." });

    // Build financial context from the user's actual data
    const uid = req.user.id;
    const user = db.prepare('SELECT name, currency FROM users WHERE id = ?').get(uid);
    const accounts = db.prepare('SELECT name, type, balance FROM accounts WHERE user_id = ?').all(uid);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const monthlyTotals = db.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expenses
       FROM transactions WHERE user_id = ? AND date >= ?`
    ).get(uid, monthStart);

    const recentTx = db.prepare(
      `SELECT t.type, t.amount, t.description, t.date, c.name AS category
       FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? ORDER BY t.date DESC, t.created_at DESC LIMIT 10`
    ).all(uid);

    const systemContext = `You are a friendly, expert personal finance assistant for ${user.name}.
Here is their current financial snapshot (currency: ${user.currency}):

ACCOUNTS:
${accounts.map(a => `- ${a.name} (${a.type}): ${a.balance.toFixed(2)}`).join('\n')}
Total Balance: ${totalBalance.toFixed(2)} ${user.currency}

THIS MONTH:
- Income: ${monthlyTotals.income.toFixed(2)}
- Expenses: ${monthlyTotals.expenses.toFixed(2)}
- Net: ${(monthlyTotals.income - monthlyTotals.expenses).toFixed(2)}

RECENT TRANSACTIONS:
${recentTx.map(t => `- ${t.date} | ${t.type} | ${t.amount.toFixed(2)} | ${t.description || 'No description'} | ${t.category || 'Uncategorized'}`).join('\n')}

Provide concise, practical financial advice. When asked to categorize expenses, suggest the most appropriate category. Be encouraging and actionable.`;

    const messagesWithContext = [
      { role: 'system', content: systemContext },
      ...messages,
    ];

    const reply = await createAssistantReply(messagesWithContext, assistantConfig || {});
    res.json({ reply });
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Accounting API server running on http://localhost:${PORT}`);
});
