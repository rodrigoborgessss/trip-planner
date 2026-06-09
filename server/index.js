// Servidor TripPlanner: serve o frontend estático (public/) e a API (/api).
const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();
app.use(express.json());

// API
app.use('/api', require('./routes/search'));
app.use('/api', require('./routes/destinations'));
app.use('/api', require('./routes/browse'));
app.use('/api', require('./routes/photo'));

// frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, () => { 
  console.log(''); 
  console.log(' ╔══════════════════════════════════════════╗'); 
  console.log(' ║     TRIP PLANNER – SERVER A CORRER EM    ║'); 
  console.log(` ║        http://localhost:${config.port}             ║`); // Corrigido para crases
  console.log(' ╠══════════════════════════════════════════╣'); 
  console.log(` ║     Index → http://localhost:${config.port}/       ║`); // Corrigido para crases e config.port
  console.log(' ╚══════════════════════════════════════════╝\n'); 
});
