const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User');

module.exports = (passport) => {
  const options = {
    // Legge il token dall'header "Authorization: Bearer <token>"
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(options, async (payload, done) => {
      try {
        // payload.sub contiene l'id dell'utente (messo in signToken)
        const user = await User.findById(payload.sub).select('-password');
        if (!user) return done(null, false);
        return done(null, user); // diventa req.user
      } catch (err) {
        return done(err, false);
      }
    })
  );
};
