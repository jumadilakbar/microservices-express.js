const express = require('express');
const sequelize = require('./db');
const packageRoutes = require('./routes/packageRoutes');
const process = require('process');
const morgan = require('morgan');

const app = express();
const port = 3002;

app.use(express.json());
app.use(morgan('dev'));
app.use('/package', packageRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Sync Database and Start Server
sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`User service running at http://localhost:${port}`);
  });
});

// Auto-reload using Nodemon
if (process.env.NODE_ENV !== 'production') {
  process.once('SIGUSR2', () => {
    process.kill(process.pid, 'SIGUSR2');
  });

  process.on('SIGINT', () => {
    process.exit();
  });
}
