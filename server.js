require('dotenv').config();
const express = require('express');

//Es un mecanismo de seguridad que permite a un servidor backend (Node.js) especificar qué 
//orígenes (dominios, puertos o protocolos) tienen permiso para acceder a sus recursos,
const cors = require('cors'); //Interccambio de recursos entre dominios

//Permite trabajar con rutas de archivos y directorios de manera más sencilla y segura,
//independiente del sistema operativo (Windows, Linux, macOS).
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 1. Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json()); // Para parsear JSON en el cuerpo de las solicitudes
app.use(express.urlencoded({ extended: true })); // Para parsear datos de formularios (x-www-form-urlencoded)

// Servir archivos estáticos (frontend SPA)
app.use(express.static(path.join(__dirname, 'public')));

// ── Rutas API ────────────────────────────────────────────────
app.use('/api/clientes', require('./routes/clientes.js'));
app.use('/api/herramientas', require('./routes/herramientas'));
app.use('/api/prestamos', require('./routes/prestamos'));
app.use('/api/devoluciones', require('./routes/devoluciones'));


app.use('/api/proveedores', require('./routes/proveedores')); 

// ── 3. SPA: redirigir todo al index.html ────────────────────────
//Cualquier ruta que el usuario escriba en el navegador y que no haya sido definida previamente en mi código
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler global ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// ── Iniciar servidor ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`API Clientes:  http://localhost:${PORT}/api/clientes`);
  console.log(`API Herramientas: http://localhost:${PORT}/api/herramientas`);
  console.log(`API Préstamos: http://localhost:${PORT}/api/prestamos`);
  console.log(`API Devoluciones: http://localhost:${PORT}/api/devoluciones`);

  
  console.log(`API Proveedores: http://localhost:${PORT}/api/proveedores\n`);
});

module.exports = app;