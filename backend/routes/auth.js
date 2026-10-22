const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// REGISTRAZIONE  ->  POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ message: 'Utente già registrato' });
    }

    const user = await User.create({ email, username, password });

    res.status(201).json({
      id: user._id,
      email: user.email,
      username: user.username,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Utente già registrato' });
    }
    console.error(err);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// LOGIN  ->  POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password sono obbligatorie' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Credenziali non valide' });
    }

    res.json({
      token: signToken(user),
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// PROFILO (rotta protetta)  ->  GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

// LOGOUT (rotta protetta)  ->  POST /api/auth/logout
// Con i JWT il vero logout avviene lato client: si cancella il token.
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout effettuato. Elimina il token dal client.' });
});

module.exports = router;
