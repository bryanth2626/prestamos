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
    document.getElementById('btnExportarPdfDevoluciones')?.addEventListener('click', () => this.abrirModalPdf());
    ['modalDevolucion', 'modalDetalleDevolucion', 'modalPdfDevolucion'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target.id === id) closeOverlay(id);
      });
    });
  },

  // ══════════════════════════════════════════
  //  PDF
  // ══════════════════════════════════════════

  _COLUMNAS_PDF: [
    { key: 'nombre_cliente',        label: 'Cliente'          },
    { key: 'nombre_herramienta',    label: 'Herramienta'      },
    { key: 'codigo_herramienta',    label: 'Código'           },
    { key: 'fecha_devolucion_real', label: 'Fecha Devolución' },
    { key: 'estado_retorno',        label: 'Estado'           },
    { key: 'penalidad',             label: 'Penalidad (S/)'   },
    { key: 'observaciones',         label: 'Observaciones'    },
  ],

  abrirModalPdf() {
    document.getElementById('pdfFiltroEstadoDev').value = '';
    document.getElementById('pdfTituloDev').value = 'Reporte de Devoluciones';
    this._actualizarKpisPdf(this.devoluciones);

    document.querySelectorAll('#pdfColumnasDev input[type=checkbox]')
      .forEach(cb => { cb.onchange = () => this._actualizarPreviewPdf(); });
    document.getElementById('pdfFiltroEstadoDev').onchange = () => {
      this._actualizarKpisPdf(this._getDatosFiltradosPdf());
      this._actualizarPreviewPdf();
    };

    this._actualizarPreviewPdf();
    openOverlay('modalPdfDevolucion');
  },

  _getDatosFiltradosPdf() {
    const est = document.getElementById('pdfFiltroEstadoDev').value;
    return est ? this.devoluciones.filter(d => d.estado_retorno === est) : [...this.devoluciones];
  },

  _getColumnasMarcadas() {
    const checked = [];
    document.querySelectorAll('#pdfColumnasDev input[type=checkbox]').forEach(cb => {
      if (cb.checked) checked.push(cb.value);
    });
    return this._COLUMNAS_PDF.filter(c => checked.includes(c.key));
  },

  _actualizarPreviewPdf() {
    const datos = this._getDatosFiltradosPdf().slice(0, 5);
    const cols  = this._getColumnasMarcadas();
    const thead = document.getElementById('pdfPreviewHeadDev');
    const tbody = document.getElementById('pdfPreviewBodyDev');
    thead.innerHTML = `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
    tbody.innerHTML = datos.length
      ? datos.map(d => `<tr>${cols.map(c => `<td>${this._formatCeldaPdf(d, c.key)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="text-center py-3 text-muted">Sin datos para mostrar</td></tr>`;
  },

  _actualizarKpisPdf(datos) {
    const total    = datos.length;
    const penTotal = datos.reduce((s, d) => s + parseFloat(d.penalidad || 0), 0);
    const danados  = datos.filter(d => d.estado_retorno === 'dañado' || d.estado_retorno === 'perdido').length;
    document.getElementById('pdfKpisDev').innerHTML = `
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${total}</div>
        <div style="font-size:12px;color:var(--text-muted)">Devoluciones</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#ef4444">S/ ${penTotal.toFixed(2)}</div>
        <div style="font-size:12px;color:var(--text-muted)">Total penalidades</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#f59e0b">${danados}</div>
        <div style="font-size:12px;color:var(--text-muted)">Dañados / Perdidos</div>
      </div>`;
  },

  _formatCeldaPdf(d, key) {
    if (key === 'penalidad')
      return d.penalidad > 0 ? `S/ ${parseFloat(d.penalidad).toFixed(2)}` : '—';
    if (key === 'fecha_devolucion_real')
      return d.fecha_devolucion_real ? formatFecha(d.fecha_devolucion_real) : '—';
    const val = d[key];
    return val != null && val !== '' ? String(val) : '—';
  },

  async generarPdf() {
    setLoading('btnGenerarPdfDev', 'btnGenerarPdfDevText', 'btnGenerarPdfDevSpinner', true);
    try {
      await this._loadPdfLibs();

      const { jsPDF } = window.jspdf;
      const titulo = document.getElementById('pdfTituloDev').value || 'Reporte de Devoluciones';
      const datos  = this._getDatosFiltradosPdf();
      const cols   = this._getColumnasMarcadas();

      if (!cols.length)  { showToast('Selecciona al menos una columna', 'error'); return; }
      if (!datos.length) { showToast('No hay datos para exportar', 'error'); return; }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();
      const hoy  = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;
      const hora = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

      // Encabezado
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo, 14, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${hoy} ${hora}`, 297 - 14, 14, { align: 'right' });

      // KPIs
      const penTotal = datos.reduce((s, d) => s + parseFloat(d.penalidad || 0), 0);
      const danados  = datos.filter(d => d.estado_retorno === 'dañado' || d.estado_retorno === 'perdido').length;
      const kpiY = 30;
      const kpis = [
        { l: 'Total registros',    v: String(datos.length) },
        { l: 'Total penalidades',  v: `S/ ${penTotal.toFixed(2)}` },
        { l: 'Dañados / Perdidos', v: String(danados) },
      ];
      kpis.forEach((k, i) => {
        const x = 14 + i * 90;
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(x, kpiY - 5, 84, 14, 2, 2, 'F');
        doc.setTextColor(99, 102, 241);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(k.v, x + 6, kpiY + 2);
        doc.setTextColor(120, 120, 130);
        doc.setFont('helvetica', 'normal');
        doc.text(k.l, x + 6, kpiY + 7);
      });

      // Tabla
      doc.autoTable({
        head: [cols.map(c => c.label)],
        body: datos.map(d => cols.map(c => this._formatCeldaPdf(d, c.key))),
        startY: kpiY + 14,
        styles: { fontSize: 9, cellPadding: 3, textColor: [40,40,40], lineColor: [220,220,230], lineWidth: 0.2 },
        headStyles: { fillColor: [99,102,241], textColor: [255,255,255], fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [248,248,255] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 14, right: 14 },
      });

      // Pie de página
      const total_pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total_pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 170);
        doc.text(`Página ${i} de ${total_pages}  —  AppPrestamos`, 297 / 2, 207, { align: 'center' });
      }

      doc.save(`devoluciones_${now.toISOString().slice(0,10)}.pdf`);
      closeOverlay('modalPdfDevolucion');
      showToast('PDF generado correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar el PDF', 'error');
    } finally {
      setLoading('btnGenerarPdfDev', 'btnGenerarPdfDevText', 'btnGenerarPdfDevSpinner', false);
    }
  },

  async _loadPdfLibs() {
    if (window.jspdf) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

};