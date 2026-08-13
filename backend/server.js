require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();

app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  credentials: true 
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/api', require('./routes/index'));

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.path} not found` })
);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏥  HMS API →  http://localhost:${PORT}`);
  console.log(`📋  Env     →  ${process.env.NODE_ENV || 'development'}\n`);
});
