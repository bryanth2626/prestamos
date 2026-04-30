const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM proveedores ORDER BY nombre_comercial ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener proveedores', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM proveedores WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al buscar proveedor', error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre_comercial, contacto, telefono, email, direccion } = req.body;
  if (!nombre_comercial?.trim())
    return res.status(400).json({ success: false, message: 'El nombre comercial es requerido' });
  try {
    const [result] = await db.query(
      'INSERT INTO proveedores (nombre_comercial, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
      [nombre_comercial.trim(), contacto || null, telefono || null, email || null, direccion || null]
    );
    res.status(201).json({ success: true, message: 'Proveedor creado correctamente', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo crear el proveedor', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre_comercial, contacto, telefono, email, direccion } = req.body;
  if (!nombre_comercial?.trim())
    return res.status(400).json({ success: false, message: 'El nombre comercial es requerido' });
  try {
    const [result] = await db.query(
      'UPDATE proveedores SET nombre_comercial=?, contacto=?, telefono=?, email=?, direccion=? WHERE id=?',
      [nombre_comercial.trim(), contacto || null, telefono || null, email || null, direccion || null, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    res.json({ success: true, message: 'Proveedor actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo actualizar el proveedor', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM proveedores WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Proveedor no existe' });
    res.json({ success: true, message: 'Proveedor eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo eliminar el proveedor', error: err.message });
  }
});

module.exports = router;