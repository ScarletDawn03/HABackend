const express = require('express');
const cors = require('cors');
const testRoutes = require('./routes/test.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Mount your test route
app.use('/api/test', testRoutes);

module.exports = app;
