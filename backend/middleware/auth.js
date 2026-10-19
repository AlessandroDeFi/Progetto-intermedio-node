const passport = require('passport');

// Middleware da mettere davanti a ogni rotta che richiede il login.
// Se il token (Authorization: Bearer <token>) e' valido, in "req.user" ci sono
// i dati dell'utente (senza password). Altrimenti risponde 401 da solo.
//
// Uso:
//   const auth = require('../middleware/auth');
//   router.get('/liste', auth, (req, res) => { ... req.user._id ... });
module.exports = passport.authenticate('jwt', { session: false });
