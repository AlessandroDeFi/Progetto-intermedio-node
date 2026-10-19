require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const app = express();

// Legge il body JSON delle richieste
app.use(express.json());

// Passport (autenticazione JWT)
app.use(passport.initialize());
require('./config/passport')(passport);

// Rotta di prova
app.get('/', (req, res) => {
  res.send('ShowTracker funziona');
});

// Rotte di autenticazione
app.use('/api/auth', require('./routes/auth'));

// Il server parte solo dopo la connessione al database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connesso');
    app.listen(process.env.PORT || 3000, () => {
      console.log('Server su http://localhost:' + (process.env.PORT || 3000));
    });
  })
  .catch((err) => {
    console.error('Errore di connessione al DB:', err.message);
  });
