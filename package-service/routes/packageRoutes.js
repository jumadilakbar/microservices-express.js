
const express = require('express');
const router = express.Router();
const Package = require('../models/packageModel');
const { authenticateToken, authorizeRole } = require('../../user-service/auth/rbacMiddleware');
const redisClient = require('../redis');

router.get('/', authenticateToken, authorizeRole(['admin','user']), async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
  
    const cachedPackages = await redisClient.get(`packages_page_${page}`);
    if (cachedPackages) return res.json(JSON.parse(cachedPackages));
  
    const packages = await Package.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
  
    redisClient.set(`packages_page_${page}`, JSON.stringify(packages));
    res.json(packages);
  });
  
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }
        const pkg = await Package.create({ name, description });
        await redisClient.flushDb(); // Invalidate cache
        res.status(201).json(pkg);
    }
    catch (err) {
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
  });

router.get('/:id', async (req, res) => {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.sendStatus(404);
    res.json(pkg);
  });
  
  // Update Package
router.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const { id } = req.params;
        if (!name || !description) {
          return res.status(400).json({ error: 'Name and description are required' });
        }
        const updatedPackage = await Package.update(
          { name, description },
          { where: { id } }
        );
        if (!updatedPackage[0]) {
          return res.status(404).json({ error: 'Package not found' });
        }
        await redisClient.flushDb(); // Invalidate cache
        res.json({ message: 'Package updated successfully' });
    } 
    catch (err) {
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
    });

// Delete Package
router.delete('/:id', async (req, res) => {
    const deleted = await Package.destroy({ where: { id: req.params.id } });
    if (deleted) res.sendStatus(204);
    else res.sendStatus(404);
  });

module.exports = router;