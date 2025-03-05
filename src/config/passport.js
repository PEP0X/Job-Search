import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../model/User.model.js';
import { config } from './env.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.oauth.google.clientId,
      clientSecret: config.oauth.google.clientSecret,
      callbackURL: `${config.apiUrl}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // If user exists but was created with system provider, update provider
          if (user.provider === 'system') {
            user.provider = 'google';
            await user.save();
          }
          return done(null, user);
        }

        // Create new user if doesn't exist
        const newUser = new User({
          firstName: profile.name.givenName || profile.displayName.split(' ')[0],
          lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' '),
          email: profile.emails[0].value,
          password: Math.random().toString(36).slice(-10), // Generate random password
          provider: 'google',
          gender: 'Male', // Default value, can be updated by user later
          DOB: new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000), // Default to 18 years ago
          mobileNumber: '0000000000', // Default value, can be updated by user later
          isConfirmed: true, // Google accounts are pre-verified
        });

        // Save the new user
        await newUser.save();
        
        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

export default passport;