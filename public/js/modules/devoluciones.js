'use strict';

const DevolucionesModule = {
  devoluciones: [],
  editandoId: null,
  _viendoId: null,

  async init() {
    this._bindEvents();
    await this.load();
  },

  async load() {
    const tbody = document.getElementById('bodyDevoluciones');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-custom mx-auto"></div></td></tr>`;
    try {
      const { data } = await http('/api/devoluciones');
      this.devoluciones = data;
      this._render(data);
      setText('totalDevolucionesLabel', `${data.length} devolución(es)`);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar devoluciones</td></tr>`;
      showToast('Error al cargar devoluciones', 'error');
    }
  },

  _retornoBadge(estado) {
    const map = {
      igual:   { cls:'badge-estado-disp', icon:'bi-check-circle-fill',          label:'Igual'   },
      bueno:   { cls:'badge-estado-disp', icon:'bi-check-circle',               label:'Bueno'   },
      regular: { cls:'badge-estado-mant', icon:'bi-dash-circle-fill',           label:'Regular' },
      dañado:  { cls:'badge-estado-baja', icon:'bi-exclamation-triangle-fill',  label:'Dañado'  },
      perdido: { cls:'badge-estado-baja', icon:'bi-x-circle-fill',              label:'Perdido' },
    };
    const e = map[estado] || map.igual;
    return `<span class="badge-estado ${e.cls}"><i class="bi ${e.icon} me-1"></i>${e.label}</span>`;
  },

  _render(lista) {
    const tbody = document.getElementById('bodyDevoluciones');
    if (!lista.length) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <i class="bi bi-box-arrow-in-left"></i>
            <p>No hay devoluciones registradas</p>
          </div>
        </td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="cell-producto-name">${escapeHtml(d.nombre_cliente)}</div></td>
        <td>${escapeHtml(d.nombre_herramienta)}<br><span class="cell-producto-desc">${escapeHtml(d.codigo_herramienta||'')}</span></td>
        <td>${formatFecha(d.fecha_devolucion_real)}</td>
        <td>${this._retornoBadge(d.estado_retorno)}</td>
        <td class="cell-precio">${d.penalidad > 0 ? 'S/ '+formatPrecio(d.penalidad) : '—'}</td>
        <td>
          <button class="btn-action btn-action-view"   onclick="DevolucionesModule.verDetalle(${d.id})" title="Ver detalle"><i class="bi bi-eye-fill"></i></button>
          <button class="btn-action btn-action-edit"   onclick="DevolucionesModule.abrirNuevo(${d.id})" title="Editar"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn-action btn-action-delete" onclick="DevolucionesModule.eliminar(${d.id})" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
          <button class="btn-action btn-action-chart"  onclick="GraficosModule._verGraficoRapido('devoluciones')" title="Ver gráfico"><i class="bi bi-bar-chart-fill"></i></button>
        </td>
      </tr>`).join('');
  },

  _filter() {
    const txt = document.getElementById('searchDevolucion').value.toLowerCase();
    const est = document.getElementById('filterEstadoDevolucion')?.value || '';
    let f = this.devoluciones.filter(d =>
      d.nombre_cliente.toLowerCase().includes(txt) ||
      d.nombre_herramienta.toLowerCase().includes(txt)
    );
    if (est) f = f.filter(d => d.estado_retorno === est);
    this._render(f);
  },

  async _cargarPrestamosActivos() {
    const selPres = document.getElementById('devPrestamo');
    selPres.innerHTML = '<option value="">Cargando…</option>';
    try {
      const { data } = await http('/api/prestamos');
      const activos = data.filter(p => p.estado === 'activo');
      selPres.innerHTML = '<option value="">Seleccionar préstamo…</option>';
      activos.forEach(p => selPres.insertAdjacentHTML('beforeend',
        `<option value="${p.id}">#${p.id} — ${escapeHtml(p.nombre_cliente)} (${formatFecha(p.fecha_prestamo)})</option>`));
      this._prestamosData = data;
    } catch { selPres.innerHTML = '<option value="">Error cargando préstamos</option>'; }
  },

  _onSeleccionarPrestamo() {
    const idprestamo = parseInt(document.getElementById('devPrestamo').value);
    const selDetalle = document.getElementById('devDetallePrestamo');
    selDetalle.innerHTML = '<option value="">Seleccionar herramienta…</option>';
    if (!idprestamo || !this._prestamosData) return;
    const prestamo = this._prestamosData.find(p => p.id === idprestamo);
    if (!prestamo?.detalle) return;
    prestamo.detalle.forEach(d => selDetalle.insertAdjacentHTML('beforeend',
      `<option value="${d.id}">${escapeHtml(d.nombre_herramienta)} [${d.codigo_herramienta||''}] — Entregado: ${d.estado_entrega}</option>`));
  },

  verDetalle(id) {
    const d = this.devoluciones.find(x => x.id === id);
    if (!d) return;
    this._viendoId = id;

    document.getElementById('detalleDevolucionBody').innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label-custom">Cliente</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(d.nombre_cliente || '—')}</div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Herramienta</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(d.nombre_herramienta || '—')} ${d.codigo_herramienta ? '['+escapeHtml(d.codigo_herramienta)+']' : ''}</div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Fecha devolución real</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${formatFecha(d.fecha_devolucion_real)}</div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Estado de retorno</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(d.estado_retorno || '—')}</div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Penalidad</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${d.penalidad > 0 ? 'S/ '+formatPrecio(d.penalidad) : '—'}</div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Observaciones</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default;min-height:60px">${escapeHtml(d.observaciones || '—')}</div>
        </div>
      </div>`;

    openOverlay('modalDetalleDevolucion');
  },

  async abrirNuevo(id = null) {
    this.editandoId = id;

    ['devPrestamo','devDetallePrestamo','devObservaciones'].forEach(elId => {
      const el = document.getElementById(elId);
      if (el) el.value = '';
    });
    document.getElementById('devDetallePrestamo').innerHTML = '<option value="">Seleccionar herramienta…</option>';

    document.getElementById('devFecha').value = new Date().toISOString().slice(0,10);
    document.getElementById('devEstadoRetorno').value = 'igual';
    document.getElementById('devPenalidad').value = 0;

    document.getElementById('devPrestamo').disabled = false;
    document.getElementById('devDetallePrestamo').disabled = false;

    await this._cargarPrestamosActivos();

    if (id) {
      const d = this.devoluciones.find(x => x.id === id);
      if (!d) { showToast('Devolución no encontrada', 'error'); return; }

      document.getElementById('modalDevolucionTitulo').innerText = 'Editar Devolución';
      document.getElementById('btnGuardarDevolucionText').innerHTML = '<i class="bi bi-floppy-fill me-1"></i> Guardar Cambios';

      document.getElementById('devFecha').value          = d.fecha_devolucion_real?.split('T')[0] || '';
      document.getElementById('devEstadoRetorno').value  = d.estado_retorno || 'igual';
      document.getElementById('devPenalidad').value      = d.penalidad || 0;
      document.getElementById('devObservaciones').value  = d.observaciones || '';

      document.getElementById('devPrestamo').value = d.idprestamo;
      this._onSeleccionarPrestamo();
      document.getElementById('devDetallePrestamo').value = d.iddetalle_prestamo;

      document.getElementById('devPrestamo').disabled = true;
      document.getElementById('devDetallePrestamo').disabled = true;
    } else {
      this.editandoId = null;
      document.getElementById('modalDevolucionTitulo').innerText = 'Registrar Devolución';
      document.getElementById('btnGuardarDevolucionText').innerHTML = '<i class="bi bi-floppy-fill me-1"></i> Registrar';
      document.getElementById('devPrestamo').disabled = false;
      document.getElementById('devDetallePrestamo').disabled = false;
    }

    openOverlay('modalDevolucion');
  },

  async guardar() {
    const idprestamo            = document.getElementById('devPrestamo').value;
    const iddetalle_prestamo    = document.getElementById('devDetallePrestamo').value;
    const fecha_devolucion_real = document.getElementById('devFecha').value;
    const estado_retorno        = document.getElementById('devEstadoRetorno').value;
    const penalidad             = document.getElementById('devPenalidad').value;
    const observaciones         = document.getElementById('devObservaciones').value.trim();

    clearErrors(['devPrestamo','devDetallePrestamo','devFecha']);
    let ok = true;
    if (!idprestamo)            { setError('devPrestamo','err-devPrestamo','El préstamo es requerido'); ok = false; }
    if (!iddetalle_prestamo)    { setError('devDetallePrestamo','err-devDetalle','Selecciona la herramienta'); ok = false; }
    if (!fecha_devolucion_real) { setError('devFecha','err-devFecha','La fecha es requerida'); ok = false; }
    if (!ok) return;

    setLoading('btnGuardarDevolucion','btnGuardarDevolucionText','btnGuardarDevolucionSpinner', true);
    try {
      const body = {
        idprestamo,
        iddetalle_prestamo,
        fecha_devolucion_real,
        estado_retorno,
        penalidad: penalidad || 0,
        observaciones: observaciones || null
      };

      if (this.editandoId) {
        await http(`/api/devoluciones/${this.editandoId}`, 'PUT', body);
        showToast('Devolución actualizada correctamente', 'success');
      } else {
        await http('/api/devoluciones', 'POST', body);
        showToast('Devolución registrada correctamente', 'success');
      }
      closeOverlay('modalDevolucion');
      await this.load();
    } catch (e) {
      showToast(e.message || 'Error al guardar devolución', 'error');
    } finally {
      setLoading('btnGuardarDevolucion','btnGuardarDevolucionText','btnGuardarDevolucionSpinner', false);
    }
  },

  eliminar(id) {
    DeleteModal.open('devolucion', id, `devolución #${id}`, async () => {
      try {
        await http(`/api/devoluciones/${id}`, 'DELETE');
        showToast('Devolución eliminada', 'success');
        await this.load();
      } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
      }
    });
  },

  _bindEvents() {
    document.getElementById('searchDevolucion')?.addEventListener('input', () => this._filter());
    document.getElementById('filterEstadoDevolucion')?.addEventListener('change', () => this._filter());
    document.getElementById('btnNuevaDevolucion')?.addEventListener('click', () => this.abrirNuevo());
    document.getElementById('btnRefreshDevoluciones')?.addEventListener('click', () => this.load());
    ['modalDevolucion', 'modalDetalleDevolucion'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target.id === id) closeOverlay(id);
      });
    });
  }
};