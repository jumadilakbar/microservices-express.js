const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const redisClient = require('../redis');

const User = require('../models/userModel');
const { authenticateToken, authorizeRole } = require('../auth/rbacMiddleware');

// Register User
router.post('/register', async (req, res) => {
  const { username, password, roles } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userExists = await User.findOne({ where: { username } });
  if (userExists) {
    return res.status(409).send({'message':'Username already exists'});
  }
  const user = await User.create({ username, password: hashedPassword, roles });
  res.status(201).json(user);
});

// Login User
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Invalid credentials');
  }
  const token = jwt.sign({ id: user.id, roles: user.roles }, process.env.JWT_SECRET);
  await redisClient.set(user.id.toString(), token, { EX: 3600 });
  res.json({ token });
});

// Get All Users
router.get('/', authenticateToken, authorizeRole(['admin','user']), async (req, res) => {
  const users = await User.findAll();
  res.json({ "data" : users, "message": "Get All Data success" });
});

// Get User Me
router.get('/authme', authenticateToken, async (req, res) => {
  try {
    const cachedToken = await redisClient.get(req.user.id.toString());
    if (!cachedToken) return res.status(401).json({ error: 'Session expired' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin', authenticateToken, authorizeRole(['admin']), (req, res) => {
    res.json({ message: 'Welcome Admin!' });
  });
  

module.exports = router;
