const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ── Helper: reintento por deadlock ─────────────────────────────
async function conReintento(fn, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 'ER_LOCK_DEADLOCK' && i < intentos - 1) {
        await new Promise(r => setTimeout(r, 150 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

// ── GET / ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.idcliente,
        c.nombre AS nombre_cliente, c.dni AS dni_cliente,
        DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%d')            AS fecha_prestamo,
        DATE_FORMAT(p.fecha_devolucion_esperada, '%Y-%m-%d') AS fecha_devolucion_esperada,
        DATE_FORMAT(p.fecha_cierre, '%Y-%m-%d')              AS fecha_cierre,
        p.estado, p.observaciones, p.created_at
      FROM prestamos p
      INNER JOIN clientes c ON p.idcliente = c.id
      ORDER BY p.id DESC
    `);
    for (const prestamo of rows) {
      const [detalle] = await db.query(`
        SELECT dp.id, dp.idherramienta, dp.cantidad,
               dp.estado_entrega, dp.observaciones_entrega,
               h.nombre AS nombre_herramienta, h.codigo AS codigo_herramienta, h.marca, h.modelo
        FROM detalle_prestamo dp
        INNER JOIN herramientas h ON dp.idherramienta = h.id
        WHERE dp.idprestamo = ?
      `, [prestamo.id]);
      prestamo.detalle = detalle;
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener préstamos', error: err.message });
  }
});

// ── GET /:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.idcliente,
        c.nombre AS nombre_cliente, c.dni AS dni_cliente,
        DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%d')            AS fecha_prestamo,
        DATE_FORMAT(p.fecha_devolucion_esperada, '%Y-%m-%d') AS fecha_devolucion_esperada,
        DATE_FORMAT(p.fecha_cierre, '%Y-%m-%d')              AS fecha_cierre,
        p.estado, p.observaciones
      FROM prestamos p
      INNER JOIN clientes c ON p.idcliente = c.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Préstamo no encontrado' });

    const [detalle] = await db.query(`
      SELECT dp.id, dp.idherramienta, dp.cantidad,
             dp.estado_entrega, dp.observaciones_entrega,
             h.nombre AS nombre_herramienta, h.codigo AS codigo_herramienta, h.marca, h.modelo
      FROM detalle_prestamo dp
      INNER JOIN herramientas h ON dp.idherramienta = h.id
      WHERE dp.idprestamo = ?
    `, [req.params.id]);

    rows[0].detalle = detalle;
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al buscar préstamo', error: err.message });
  }
});

// ── POST / ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { idcliente, fecha_prestamo, fecha_devolucion_esperada, observaciones, herramientas } = req.body;
  if (!idcliente)                 return res.status(400).json({ success: false, message: 'El cliente es requerido' });
  if (!fecha_prestamo)            return res.status(400).json({ success: false, message: 'La fecha de préstamo es requerida' });
  if (!fecha_devolucion_esperada) return res.status(400).json({ success: false, message: 'La fecha de devolución esperada es requerida' });
  if (!herramientas?.length)      return res.status(400).json({ success: false, message: 'Debe incluir al menos una herramienta' });

  try {
    const id = await conReintento(async () => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        // Bloquear herramientas en orden para evitar deadlock
        const idsOrdenados = [...herramientas].sort((a, b) => a.idherramienta - b.idherramienta);
        for (const item of idsOrdenados) {
          const [hers] = await conn.query(
            'SELECT estado FROM herramientas WHERE id = ? FOR UPDATE',
            [item.idherramienta]
          );
          if (!hers.length) throw new Error(`Herramienta ID ${item.idherramienta} no encontrada`);
          if (hers[0].estado !== 'disponible')
            throw new Error(`Herramienta ID ${item.idherramienta} no está disponible (estado: ${hers[0].estado})`);
        }

        const [result] = await conn.query(
          `INSERT INTO prestamos (idcliente, fecha_prestamo, fecha_devolucion_esperada, estado, observaciones)
           VALUES (?, ?, ?, 'activo', ?)`,
          [idcliente, fecha_prestamo, fecha_devolucion_esperada, observaciones || null]
        );
        const idprestamo = result.insertId;

        for (const item of idsOrdenados) {
          await conn.query(
            `INSERT INTO detalle_prestamo (idprestamo, idherramienta, cantidad, estado_entrega, observaciones_entrega)
             VALUES (?, ?, ?, ?, ?)`,
            [idprestamo, item.idherramienta, item.cantidad || 1,
             item.estado_entrega || 'bueno', item.observaciones_entrega || null]
          );
          await conn.query('UPDATE herramientas SET estado = "prestada" WHERE id = ?', [item.idherramienta]);
        }

        await conn.commit();
        conn.release();
        return idprestamo;
      } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
      }
    });

    res.status(201).json({ success: true, message: 'Préstamo creado exitosamente', id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, error: err.message });
  }
});

// ── PUT /:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const {
    estado, observaciones, fecha_cierre,
    idcliente, fecha_prestamo, fecha_devolucion_esperada,
    herramientas
  } = req.body;

  try {
    await conReintento(async () => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const [pres] = await conn.query('SELECT * FROM prestamos WHERE id = ?', [req.params.id]);
        if (!pres.length) {
          await conn.rollback();
          conn.release();
          throw Object.assign(new Error('Préstamo no encontrado'), { status: 404 });
        }

        const estadoAnterior = pres[0].estado;
        const nuevoEstado    = estado || pres[0].estado;

        await conn.query(
          `UPDATE prestamos
           SET estado = ?, observaciones = ?, fecha_cierre = ?,
               idcliente = ?, fecha_prestamo = ?, fecha_devolucion_esperada = ?
           WHERE id = ?`,
          [
            nuevoEstado,
            observaciones           ?? pres[0].observaciones,
            fecha_cierre            || pres[0].fecha_cierre,
            idcliente               || pres[0].idcliente,
            fecha_prestamo          || pres[0].fecha_prestamo,
            fecha_devolucion_esperada || pres[0].fecha_devolucion_esperada,
            req.params.id
          ]
        );

        // Si se marca como devuelto → liberar herramientas
        if (estadoAnterior !== 'devuelto' && nuevoEstado === 'devuelto') {
          const [detalle] = await conn.query(
            'SELECT idherramienta FROM detalle_prestamo WHERE idprestamo = ?', [req.params.id]
          );
          for (const item of detalle) {
            await conn.query('UPDATE herramientas SET estado = "disponible" WHERE id = ?', [item.idherramienta]);
          }
        }

        // Si se envían nuevas herramientas → reemplazar detalle
        if (herramientas && herramientas.length) {
          const [detalleActual] = await conn.query(
            'SELECT idherramienta FROM detalle_prestamo WHERE idprestamo = ?', [req.params.id]
          );
          for (const item of detalleActual) {
            await conn.query('UPDATE herramientas SET estado = "disponible" WHERE id = ?', [item.idherramienta]);
          }
          await conn.query('DELETE FROM detalle_prestamo WHERE idprestamo = ?', [req.params.id]);

          const idsOrdenados = [...herramientas].sort((a, b) => a.idherramienta - b.idherramienta);
          for (const item of idsOrdenados) {
            const [hers] = await conn.query(
              'SELECT estado FROM herramientas WHERE id = ? FOR UPDATE', [item.idherramienta]
            );
            if (!hers.length) throw new Error(`Herramienta ID ${item.idherramienta} no encontrada`);
            if (hers[0].estado !== 'disponible')
              throw new Error(`Herramienta ID ${item.idherramienta} no está disponible`);

            await conn.query(
              `INSERT INTO detalle_prestamo (idprestamo, idherramienta, cantidad, estado_entrega, observaciones_entrega)
               VALUES (?, ?, ?, ?, ?)`,
              [req.params.id, item.idherramienta, item.cantidad || 1,
               item.estado_entrega || 'bueno', item.observaciones_entrega || null]
            );
            await conn.query('UPDATE herramientas SET estado = "prestada" WHERE id = ?', [item.idherramienta]);
          }
        }

        await conn.commit();
        conn.release();
      } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
      }
    });

    res.json({ success: true, message: 'Préstamo actualizado correctamente' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message, error: err.message });
  }
});

// ── DELETE /:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await conReintento(async () => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [pres] = await conn.query('SELECT * FROM prestamos WHERE id = ?', [req.params.id]);
        if (!pres.length) {
          await conn.rollback();
          conn.release();
          throw Object.assign(new Error('Préstamo no encontrado'), { status: 404 });
        }

        if (pres[0].estado !== 'devuelto') {
          const [detalle] = await conn.query(
            'SELECT idherramienta FROM detalle_prestamo WHERE idprestamo = ?', [req.params.id]
          );
          for (const item of detalle) {
            await conn.query('UPDATE herramientas SET estado = "disponible" WHERE id = ?', [item.idherramienta]);
          }
        }

        await conn.query('DELETE FROM prestamos WHERE id = ?', [req.params.id]);
        await conn.commit();
        conn.release();
      } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
      }
    });

    res.json({ success: true, message: 'Préstamo eliminado correctamente' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message, error: err.message });
  }
});

module.exports = router;