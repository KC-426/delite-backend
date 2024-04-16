const jwt = require('jsonwebtoken');

const userAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, 'kuldeep_secret_key', (err, decodedToken) => {
      if (err) {
        console.log(err);
        return res.status(401).json({ error: 'Unauthorized' });
      } else {
        req.userId = decodedToken.userId;
        next();
      }
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = userAuth;