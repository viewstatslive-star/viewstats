const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const youtubeRoutes = require('./routes/youtube');
const noaRoutes = require('./routes/noa');

app.use('/api/youtube', youtubeRoutes);
app.use('/api/noa', noaRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'ViewStats API is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});