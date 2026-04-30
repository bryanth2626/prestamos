const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener clientes', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al buscar cliente', error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, dni, telefono, email, direccion } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ success: false, message: 'El nombre del cliente es requerido' });
  try {
    const [result] = await db.query(
      'INSERT INTO clientes (nombre, dni, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), dni || null, telefono || null, email || null, direccion || null]
    );
    res.status(201).json({ success: true, message: 'Cliente creado correctamente', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo crear el cliente', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, dni, telefono, email, direccion, estado } = req.body;
  if (!nombre?.trim())
    return res.status(400).json({ success: false, message: 'El nombre del cliente es requerido' });
  try {
    const [result] = await db.query(
      'UPDATE clientes SET nombre=?, dni=?, telefono=?, email=?, direccion=?, estado=? WHERE id=?',
      [nombre.trim(), dni || null, telefono || null, email || null, direccion || null, estado || 'activo', req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, message: 'Cliente actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo actualizar el cliente', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Cliente no existe' });
    res.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo eliminar el cliente', error: err.message });
  }
});

module.exports = router;