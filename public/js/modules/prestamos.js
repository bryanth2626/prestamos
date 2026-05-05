'use strict';

const PrestamosModule = {
  prestamos: [],
  editandoId: null,
  herramientasDisponibles: [],
  itemsSeleccionados: [], // [{idherramienta, nombre, cantidad, estado_entrega}]

  async init() {
    this._bindEvents();
    await this.load();
  },

  async load() {
    const tbody = document.getElementById('bodyPrestamos');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-custom mx-auto"></div></td></tr>`;
    try {
      const { data } = await http('/api/prestamos');
      this.prestamos = data;
      this._render(data);
      setText('totalPrestamosLabel', `${data.length} préstamo(s)`);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar préstamos</td></tr>`;
      showToast('Error al cargar préstamos', 'error');
    }
  },

  _estadoBadge(estado) {
    const map = {
      activo:   { cls:'badge-estado-disp', icon:'bi-clock-fill',     label:'Activo'   },
      devuelto: { cls:'badge-estado-dev',  icon:'bi-check-circle-fill',label:'Devuelto'},
      vencido:  { cls:'badge-estado-baja', icon:'bi-exclamation-triangle-fill', label:'Vencido'},
    };
    const e = map[estado] || map.activo;
    return `<span class="badge-estado ${e.cls}"><i class="bi ${e.icon} me-1"></i>${e.label}</span>`;
  },

  _render(lista) {
    const tbody = document.getElementById('bodyPrestamos');
    if (!lista.length) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <i class="bi bi-box-arrow-right"></i>
            <p>No hay préstamos registrados</p>
          </div>
        </td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="cell-producto-name">${escapeHtml(p.nombre_cliente)}</div>
          <div class="cell-producto-desc">DNI: ${escapeHtml(p.dni_cliente || '—')}</div>
        </td>
        <td>${formatFecha(p.fecha_prestamo)}</td>
        <td>${formatFecha(p.fecha_devolucion_esperada)}</td>
        <td>${this._estadoBadge(p.estado)}</td>
        <td>
          <button class="btn-action btn-action-view"   onclick="PrestamosModule.verDetalle(${p.id})" title="Ver detalle"><i class="bi bi-eye-fill"></i></button>
          <button class="btn-action btn-action-edit"   onclick="PrestamosModule.abrirEditar(${p.id})" title="Editar estado"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn-action btn-action-delete" onclick="PrestamosModule.eliminar(${p.id})" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
          <button class="btn-action btn-action-chart"  onclick="GraficosModule._verGraficoRapido('prestamos', ${p.id})" title="Ver gráfico"><i class="bi bi-bar-chart-fill"></i></button>
        </td>
      </tr>`).join('');
  },

  _filter() {
    const txt = document.getElementById('searchPrestamo').value.toLowerCase();
    const est = document.getElementById('filterEstadoPrestamo')?.value || '';
    let f = this.prestamos.filter(p =>
      p.nombre_cliente.toLowerCase().includes(txt) ||
      (p.dni_cliente || '').includes(txt)
    );
    if (est) f = f.filter(p => p.estado === est);
    this._render(f);
  },

  verDetalle(id) {
    const p = this.prestamos.find(x => x.id === id);
    if (!p) return;
    const items = (p.detalle || []).map(d =>
      `<li class="mb-1"><strong>${escapeHtml(d.nombre_herramienta)}</strong> (${escapeHtml(d.codigo_herramienta||'')}) — Cant: ${d.cantidad} — Entregado: ${d.estado_entrega}</li>`
    ).join('');
    document.getElementById('detallePrestamoBody').innerHTML = `
      <p><strong>Cliente:</strong> ${escapeHtml(p.nombre_cliente)} — DNI: ${escapeHtml(p.dni_cliente||'—')}</p>
      <p><strong>Préstamo:</strong> ${formatFecha(p.fecha_prestamo)} → <strong>Devolución esperada:</strong> ${formatFecha(p.fecha_devolucion_esperada)}</p>
      <p><strong>Estado:</strong> ${p.estado} ${p.fecha_cierre ? '| Cerrado: '+formatFecha(p.fecha_cierre) : ''}</p>
      ${p.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHtml(p.observaciones)}</p>` : ''}
      <hr/>
      <p><strong>Herramientas prestadas:</strong></p>
      <ul>${items || '<li>Sin detalle</li>'}</ul>`;
    openOverlay('modalDetallePrestamo');
  },

  async _cargarDatos() {
    try {
      const [{ data: clientes }, { data: herramientas }] = await Promise.all([
        http('/api/clientes'),
        http('/api/herramientas')
      ]);
      const selCli = document.getElementById('presCliente');
      selCli.innerHTML = '<option value="">Seleccionar cliente…</option>';
      clientes.forEach(c => selCli.insertAdjacentHTML('beforeend',
        `<option value="${c.id}">${escapeHtml(c.nombre)} — DNI: ${c.dni||'—'}</option>`));

      this.herramientasDisponibles = herramientas.filter(h => h.estado === 'disponible');
      const selHerr = document.getElementById('presHerramientaSelect');
      selHerr.innerHTML = '<option value="">Seleccionar herramienta…</option>';
      this.herramientasDisponibles.forEach(h => selHerr.insertAdjacentHTML('beforeend',
        `<option value="${h.id}">${escapeHtml(h.nombre)} [${h.codigo||''}] — ${escapeHtml(h.marca||'')}</option>`));
    } catch(e) { showToast('Error cargando datos', 'error'); }
  },

  _agregarItem() {
    const selHerr  = document.getElementById('presHerramientaSelect');
    const idherr   = parseInt(selHerr.value);
    const cantidad = parseInt(document.getElementById('presCantidad').value) || 1;
    const estado   = document.getElementById('presEstadoEntrega').value;
    const obs      = document.getElementById('presObsEntrega').value.trim();

    if (!idherr) { showToast('Selecciona una herramienta', 'error'); return; }
    if (this.itemsSeleccionados.find(x => x.idherramienta === idherr)) {
      showToast('Herramienta ya agregada', 'error'); return;
    }
    const herr = this.herramientasDisponibles.find(h => h.id === idherr);
    this.itemsSeleccionados.push({ idherramienta: idherr, nombre: herr.nombre, cantidad, estado_entrega: estado, observaciones_entrega: obs });
    this._renderItemsPrestamo();
    selHerr.value = '';
    document.getElementById('presCantidad').value = 1;
    document.getElementById('presObsEntrega').value = '';
  },

  _quitarItem(idherramienta) {
    this.itemsSeleccionados = this.itemsSeleccionados.filter(x => x.idherramienta !== idherramienta);
    this._renderItemsPrestamo();
  },

  _renderItemsPrestamo() {
    const contenedor = document.getElementById('listaHerramientasPrestamo');
    if (!this.itemsSeleccionados.length) {
      contenedor.innerHTML = `<p class="text-muted text-sm text-center py-2">Sin herramientas agregadas</p>`;
      return;
    }
    contenedor.innerHTML = this.itemsSeleccionados.map(item => `
      <div class="item-prestamo-row">
        <div class="flex-1">
          <strong>${escapeHtml(item.nombre)}</strong>
          <span class="text-muted text-sm ms-2">Cant: ${item.cantidad} · ${item.estado_entrega}</span>
        </div>
        <button class="btn-action btn-action-delete" onclick="PrestamosModule._quitarItem(${item.idherramienta})">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>`).join('');
  },

  

  async abrirNuevo() {
    this.editandoId = null;
    this.itemsSeleccionados = [];
    ['presCliente','presFechaPrestamo','presFechaDevolucion','presObservaciones'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    this._renderItemsPrestamo();
    setText('modalPrestamoTitulo', 'Nuevo Préstamo');
    // Fecha hoy por defecto
    document.getElementById('presFechaPrestamo').value = new Date().toISOString().slice(0,10);
    await this._cargarDatos();
    openOverlay('modalPrestamo');
  },

  abrirEditar(id) {
    const p = this.prestamos.find(x => x.id === id);
    if (!p) return;
    this.editandoId = id;
    document.getElementById('editPresEstado').value         = p.estado         || 'activo';
    document.getElementById('editPresFechaCierre').value    = p.fecha_cierre   || '';
    document.getElementById('editPresObservaciones').value  = p.observaciones  || '';
    openOverlay('modalEditarPrestamo');
  },

  async guardar() {
    const idcliente              = document.getElementById('presCliente').value;
    const fecha_prestamo         = document.getElementById('presFechaPrestamo').value;
    const fecha_devolucion_esperada = document.getElementById('presFechaDevolucion').value;
    const observaciones          = document.getElementById('presObservaciones').value.trim();

    clearErrors(['presCliente','presFechaPrestamo','presHerramientas']);
    let ok = true;
    if (!idcliente)              { setError('presCliente','err-presCliente','El cliente es requerido'); ok = false; }
    if (!fecha_prestamo)         { setError('presFechaPrestamo','err-presFecha','La fecha es requerida'); ok = false; }
    if (!fecha_devolucion_esperada) {
    setError('presFechaDevolucion','err-presFechaDevolucion','La fecha de devolución es requerida');
    ok = false;
    }
    if (!this.itemsSeleccionados.length) { setText('err-presHerramientas','Agrega al menos una herramienta'); ok = false; }
    if (!ok) return;

    setLoading('btnGuardarPrestamo','btnGuardarPrestamoText','btnGuardarPrestamoSpinner', true);
    try {
      const body = {
        idcliente, fecha_prestamo, fecha_devolucion_esperada,
        observaciones: observaciones||null,
        herramientas: this.itemsSeleccionados
      };
      await http('/api/prestamos', 'POST', body);
      showToast('Préstamo creado correctamente', 'success');
      closeOverlay('modalPrestamo');
      await this.load();
    } catch (e) {
      showToast(e.message || 'Error al guardar préstamo', 'error');
    } finally {
      setLoading('btnGuardarPrestamo','btnGuardarPrestamoText','btnGuardarPrestamoSpinner', false);
    }
  },

  async guardarEdicion() {
    if (!this.editandoId) return;
    const estado       = document.getElementById('editPresEstado').value;
    const fecha_cierre = document.getElementById('editPresFechaCierre').value;
    const observaciones= document.getElementById('editPresObservaciones').value.trim();

    setLoading('btnGuardarEditPrestamo','btnGuardarEditPrestamoText','btnGuardarEditPrestamoSpinner', true);
    try {
      await http(`/api/prestamos/${this.editandoId}`, 'PUT', { estado, fecha_cierre: fecha_cierre||null, observaciones: observaciones||null });
      showToast('Préstamo actualizado correctamente', 'success');
      closeOverlay('modalEditarPrestamo');
      await this.load();
    } catch (e) {
      showToast(e.message || 'Error al actualizar', 'error');
    } finally {
      setLoading('btnGuardarEditPrestamo','btnGuardarEditPrestamoText','btnGuardarEditPrestamoSpinner', false);
    }
  },

  eliminar(id) {
    DeleteModal.open('prestamo', id, `préstamo #${id}`, async () => {
      try {
        await http(`/api/prestamos/${id}`, 'DELETE');
        showToast('Préstamo eliminado', 'success');
        await this.load();
      } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
      }
    });
  },

  _bindEvents() {
  document.getElementById('searchPrestamo')?.addEventListener('input', () => this._filter());
  document.getElementById('filterEstadoPrestamo')?.addEventListener('change', () => this._filter());

  document.getElementById('btnNuevoPrestamo')?.addEventListener('click', () => this.abrirNuevo());
  document.getElementById('btnRefreshPrestamos')?.addEventListener('click', () => this.load());

  // NUEVOS
  document.getElementById('btnAgregarHerramienta')?.addEventListener('click', () => this._agregarItem());
  document.getElementById('btnGuardarPrestamo')?.addEventListener('click', () => this.guardar());
  document.getElementById('btnGuardarEditPrestamo')?.addEventListener('click', () => this.guardarEdicion());

  ['modalPrestamo','modalEditarPrestamo','modalDetallePrestamo'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) closeOverlay(id);
    });
  });
}
};