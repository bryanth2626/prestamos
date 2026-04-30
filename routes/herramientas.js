const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT h.*, p.nombre_comercial AS nombre_proveedor,
             c.nombre AS nombre_categoria, c.tipo AS tipo_categoria
      FROM herramientas h
      INNER JOIN proveedores p ON h.idproveedor = p.id
      INNER JOIN categorias  c ON h.idcategoria  = c.id
      ORDER BY h.nombre ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener herramientas', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT h.*, p.nombre_comercial AS nombre_proveedor,
             c.nombre AS nombre_categoria, c.tipo AS tipo_categoria
      FROM herramientas h
      INNER JOIN proveedores p ON h.idproveedor = p.id
      INNER JOIN categorias  c ON h.idcategoria  = c.id
      WHERE h.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Herramienta no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al buscar herramienta', error: err.message });
  }
});

router.post('/', async (req, res) => {
  const {
    idproveedor, idcategoria, nombre, marca, modelo,
    codigo, numero_serie, descripcion,
    precio_compra, stock, estado
  } = req.body;

  if (!idproveedor)
    return res.status(400).json({ success: false, message: 'El proveedor es requerido' });

  if (!idcategoria)
    return res.status(400).json({ success: false, message: 'La categoría es requerida' });

  if (!nombre?.trim())
    return res.status(400).json({ success: false, message: 'El nombre es requerido' });

  try {
    const [result] = await db.query(
      `INSERT INTO herramientas
      (idproveedor, idcategoria, nombre, marca, modelo, codigo, numero_serie, descripcion, precio_compra, stock, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idproveedor,
        idcategoria,
        nombre.trim(),
        marca || null,
        modelo || null,
        codigo || null,
        numero_serie || null,
        descripcion || null,
        precio_compra || null,
        stock || 1,
        estado || 'disponible'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Herramienta creada correctamente',
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'No se pudo crear la herramienta',
      error: err.message
    });
  }
});

router.put('/:id', async (req, res) => {
  const { idproveedor, idcategoria, nombre, marca, modelo, codigo, numero_serie, descripcion, precio_compra, stock, estado } = req.body;
  if (!idproveedor) return res.status(400).json({ success: false, message: 'El proveedor es requerido' });
  if (!idcategoria) return res.status(400).json({ success: false, message: 'La categoría es requerida' });
  if (!nombre?.trim()) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
  try {
    const [result] = await db.query(
      `UPDATE herramientas SET idproveedor=?, idcategoria=?, nombre=?, marca=?, modelo=?, codigo=?,
       numero_serie=?, descripcion=?, precio_compra=?, stock=?, estado=? WHERE id=?`,
      [idproveedor, idcategoria, nombre.trim(), marca || null, modelo || null, codigo || null,
       numero_serie || null, descripcion || null, precio_compra || null, stock || 1,
       estado || 'disponible', req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Herramienta no encontrada' });
    res.json({ success: true, message: 'Herramienta actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo actualizar la herramienta', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM herramientas WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Herramienta no existe' });
    res.json({ success: true, message: 'Herramienta eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo eliminar la herramienta', error: err.message });
  }
});

module.exports = router;