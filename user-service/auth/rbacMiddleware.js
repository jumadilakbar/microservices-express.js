const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
    // console.log(token);
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.roles)) {
        return res.sendStatus(403);
      }
      next();
    };
  };

module.exports = { authenticateToken, authorizeRole };
