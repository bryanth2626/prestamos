'use strict';

const DashboardModule = {

  async init() {
    await this._cargarStats();
    await this._cargarRecientes();
  },

  async _cargarStats() {
    try {
      const [{ data: herramientas }, { data: clientes }, { data: prestamos }, { data: devoluciones }] = await Promise.all([
        http('/api/herramientas'),
        http('/api/clientes'),
        http('/api/prestamos'),
        http('/api/devoluciones'),
      ]);

      const disponibles = herramientas.filter(h => h.estado === 'disponible').length;
      const prestadas   = herramientas.filter(h => h.estado === 'prestada').length;
      const activos     = prestamos.filter(p => p.estado === 'activo').length;
      const vencidos    = prestamos.filter(p => p.estado === 'vencido').length;

      setText('stat-herramientas',  herramientas.length);
      setText('stat-disponibles',   disponibles);
      setText('stat-prestadas',     prestadas);
      setText('stat-clientes',      clientes.length);
      setText('stat-prestamos-activos', activos);
      setText('stat-vencidos',      vencidos);
      setText('stat-devoluciones',  devoluciones.length);

      // Valor inventario
      const valorTotal = herramientas.reduce((sum, h) => sum + parseFloat(h.precio_compra||0), 0);
      setText('stat-valor-inventario', 'S/ ' + formatPrecio(valorTotal));

      this._renderChartEstados(herramientas);
      this._renderPrestamosRecientes(prestamos.slice(0, 6));

    } catch (e) {
      console.error('Error cargando dashboard:', e);
    }
  },

  _renderChartEstados(herramientas) {
    const container = document.getElementById('chart-estados');
    if (!container) return;

    const grupos = { disponible: 0, prestada: 0, mantenimiento: 0, baja: 0 };
    herramientas.forEach(h => { if (grupos[h.estado] !== undefined) grupos[h.estado]++; });
    const total = herramientas.length || 1;

    const colores = {
      disponible:    'var(--success)',
      prestada:      'var(--primary)',
      mantenimiento: 'var(--warning)',
      baja:          'var(--danger)',
    };
    const labels = {
      disponible: 'Disponibles', prestada: 'Prestadas',
      mantenimiento: 'Mantenimiento', baja: 'Baja',
    };

    container.innerHTML = Object.entries(grupos).map(([key, val]) => `
      <div class="chart-bar-item">
        <div class="chart-bar-label">
          <span>${labels[key]}</span>
          <span style="color:${colores[key]};font-weight:700">${val}</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${(val/total*100).toFixed(1)}%;background:${colores[key]}"></div>
        </div>
      </div>`).join('');
  },

  _renderPrestamosRecientes(prestamos) {
    const container = document.getElementById('tabla-recientes-dashboard');
    if (!container) return;
    if (!prestamos.length) { container.innerHTML = `<div class="empty-state py-4"><i class="bi bi-inbox"></i><p>Sin préstamos recientes</p></div>`; return; }

    const estadoColor = { activo:'var(--primary)', devuelto:'var(--success)', vencido:'var(--danger)' };
    container.innerHTML = `
      <table class="recent-table">
        <thead><tr style="background:var(--surface-2)">
          <th style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted)">Cliente</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted)">Fecha</th>
          <th style="padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted)">Estado</th>
        </tr></thead>
        <tbody>
          ${prestamos.map(p => `
            <tr>
              <td>${escapeHtml(p.nombre_cliente)}</td>
              <td style="color:var(--text-muted)">${formatFecha(p.fecha_prestamo)}</td>
              <td><span style="color:${estadoColor[p.estado]||'var(--text)'};font-weight:600;font-size:12px;text-transform:capitalize">${p.estado}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  },

  async _cargarRecientes() {
    // Ya se carga dentro de _cargarStats
  }
};