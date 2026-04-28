/**
 * Authentication Routes - Signup, Login, Profile
 * Uses JWT for stateless auth
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'churnguard_secret_key_change_in_prod';
const JWT_EXPIRES = '7d';

// ─── POST /api/auth/signup ─────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Check if user exists (use in-memory if no MongoDB)
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email });
    } catch (e) {
      // MongoDB not available — skip DB check
    }

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user = {
      _id: `user_${Date.now()}`,
      name,
      email,
      company: company || '',
      plan: 'basic',
      createdAt: new Date()
    };

    try {
      const newUser = new User({ name, email, password: hashedPassword, company });
      const saved = await newUser.save();
      user = saved;
    } catch (e) {
      // MongoDB not available — use in-memory user
    }

    const token = jwt.sign({ userId: user._id, email, plan: user.plan }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({
      token,
      user: { id: user._id, name, email, company: user.company, plan: user.plan }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    let user = null;
    try {
      user = await User.findOne({ email });
    } catch (e) {
      // MongoDB not available
    }

    // Demo account always works (for testing without MongoDB)
    if (!user && email === 'demo@churnguard.ai' && password === 'demo1234') {
      const token = jwt.sign(
        { userId: 'demo_user', email, plan: 'premium' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      return res.json({
        token,
        user: { id: 'demo_user', name: 'Demo User', email, company: 'Acme Corp', plan: 'premium' }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email, company: user.company, plan: user.plan }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/profile ─────────────────────────────────────────────────
router.get('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    let user = null;
    try {
      user = await User.findById(req.user.userId).select('-password');
    } catch (e) { /* MongoDB unavailable */ }

    if (!user) {
      return res.json({
        user: {
          id: req.user.userId,
          email: req.user.email,
          plan: req.user.plan,
          name: 'Demo User'
        }
      });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
