const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.idprestamo, d.iddetalle_prestamo,
        DATE_FORMAT(d.fecha_devolucion_real, '%Y-%m-%d') AS fecha_devolucion_real,
        d.estado_retorno, d.penalidad, d.observaciones,
        c.nombre AS nombre_cliente,
        h.nombre AS nombre_herramienta, h.codigo AS codigo_herramienta,
        dp.cantidad, dp.estado_entrega
      FROM devoluciones d
      INNER JOIN prestamos        p  ON d.idprestamo          = p.id
      INNER JOIN clientes         c  ON p.idcliente           = c.id
      INNER JOIN detalle_prestamo dp ON d.iddetalle_prestamo  = dp.id
      INNER JOIN herramientas     h  ON dp.idherramienta      = h.id
      ORDER BY d.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener devoluciones', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.idprestamo, d.iddetalle_prestamo,
        DATE_FORMAT(d.fecha_devolucion_real, '%Y-%m-%d') AS fecha_devolucion_real,
        d.estado_retorno, d.penalidad, d.observaciones,
        c.nombre AS nombre_cliente,
        h.nombre AS nombre_herramienta, h.codigo AS codigo_herramienta,
        dp.cantidad, dp.estado_entrega
      FROM devoluciones d
      INNER JOIN prestamos        p  ON d.idprestamo          = p.id
      INNER JOIN clientes         c  ON p.idcliente           = c.id
      INNER JOIN detalle_prestamo dp ON d.iddetalle_prestamo  = dp.id
      INNER JOIN herramientas     h  ON dp.idherramienta      = h.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al buscar devolución', error: err.message });
  }
});

// Body: { idprestamo, iddetalle_prestamo, fecha_devolucion_real, estado_retorno, penalidad, observaciones }
router.post('/', async (req, res) => {
  const { idprestamo, iddetalle_prestamo, fecha_devolucion_real, estado_retorno, penalidad, observaciones } = req.body;
  if (!idprestamo)           return res.status(400).json({ success: false, message: 'El préstamo es requerido' });
  if (!iddetalle_prestamo)   return res.status(400).json({ success: false, message: 'El detalle del préstamo es requerido' });
  if (!fecha_devolucion_real) return res.status(400).json({ success: false, message: 'La fecha de devolución real es requerida' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [detalles] = await conn.query(
      'SELECT idherramienta FROM detalle_prestamo WHERE id = ? AND idprestamo = ?',
      [iddetalle_prestamo, idprestamo]
    );
    if (!detalles.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Detalle de préstamo no encontrado' });
    }

    const [result] = await conn.query(
      `INSERT INTO devoluciones (idprestamo, iddetalle_prestamo, fecha_devolucion_real, estado_retorno, penalidad, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idprestamo, iddetalle_prestamo, fecha_devolucion_real,
       estado_retorno || 'igual', penalidad || 0, observaciones || null]
    );

    // Liberar la herramienta
    await conn.query('UPDATE herramientas SET estado = "disponible" WHERE id = ?', [detalles[0].idherramienta]);

    // ¿Quedan herramientas pendientes de devolver?
    const [pendientes] = await conn.query(`
      SELECT dp.id FROM detalle_prestamo dp
      LEFT JOIN devoluciones dv ON dp.id = dv.iddetalle_prestamo
      WHERE dp.idprestamo = ? AND dv.id IS NULL
    `, [idprestamo]);

    // Si no quedan pendientes → cerrar el préstamo
    if (pendientes.length === 0) {
      await conn.query(
        `UPDATE prestamos SET estado = 'devuelto', fecha_cierre = ? WHERE id = ?`,
        [fecha_devolucion_real, idprestamo]
      );
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: 'Devolución registrada correctamente',
      id: result.insertId,
      prestamo_cerrado: pendientes.length === 0
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Error al registrar devolución', error: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res) => {
  const { estado_retorno, penalidad, observaciones } = req.body;
  try {
    const [devs] = await db.query('SELECT * FROM devoluciones WHERE id = ?', [req.params.id]);
    if (!devs.length) return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
    await db.query(
      'UPDATE devoluciones SET estado_retorno=?, penalidad=?, observaciones=? WHERE id=?',
      [estado_retorno || devs[0].estado_retorno, penalidad ?? devs[0].penalidad,
       observaciones || devs[0].observaciones, req.params.id]
    );
    res.json({ success: true, message: 'Devolución actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo actualizar la devolución', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [devs] = await conn.query(`
      SELECT d.*, dp.idherramienta FROM devoluciones d
      INNER JOIN detalle_prestamo dp ON d.iddetalle_prestamo = dp.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (!devs.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Devolución no existe' }); }

    await conn.query('DELETE FROM devoluciones WHERE id = ?', [req.params.id]);
    await conn.query('UPDATE herramientas SET estado = "prestada" WHERE id = ?', [devs[0].idherramienta]);
    await conn.query(`UPDATE prestamos SET estado = 'activo', fecha_cierre = NULL WHERE id = ? AND estado = 'devuelto'`, [devs[0].idprestamo]);

    await conn.commit();
    res.json({ success: true, message: 'Devolución eliminada correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'No se pudo eliminar la devolución', error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;