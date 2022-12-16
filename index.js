const express = require('express');
const dots365 = require('./lib/365dots')
const dailySaying = require('./lib/daily-saying')

const app = express();
app.get('/365dots', dots365);
app.get('/daily-saying', dailySaying);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));

