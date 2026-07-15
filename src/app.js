const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const authRoutes    = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const stripeRoutes  = require('./routes/stripeRoutes');
const errorHandler  = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/stripe', stripeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Language Learning Platform API' });
});

app.use(errorHandler);

module.exports = app;
