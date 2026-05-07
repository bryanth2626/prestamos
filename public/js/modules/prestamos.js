'use strict';

const PrestamosModule = {
  prestamos: [],
  editandoId: null,
  _viendoId: null, 
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

  // ✅ pon esto
  verDetalle(id) {
    const p = this.prestamos.find(x => x.id === id);
    if (!p) return;
    this._viendoId = id;

    const items = (p.detalle || []).map(d => `
      <div class="input-custom mb-2" style="background:var(--bg-secondary);cursor:default">
        <strong>${escapeHtml(d.nombre_herramienta)}</strong>
        <span class="text-muted text-sm ms-2">
          [${escapeHtml(d.codigo_herramienta || '')}] — Cant: ${d.cantidad} — Entregado: ${d.estado_entrega}
        </span>
      </div>`).join('');

    document.getElementById('detallePrestamoBody').innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label-custom">Cliente</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">
            ${escapeHtml(p.nombre_cliente)} — DNI: ${escapeHtml(p.dni_cliente || '—')}
          </div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Fecha préstamo</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">
            ${formatFecha(p.fecha_prestamo)}
          </div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Devolución esperada</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">
            ${formatFecha(p.fecha_devolucion_esperada)}
          </div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Estado</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">
            ${this._estadoBadge(p.estado)}
          </div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Fecha cierre</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">
            ${p.fecha_cierre ? formatFecha(p.fecha_cierre) : '—'}
          </div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Observaciones</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default;min-height:60px">
            ${escapeHtml(p.observaciones || '—')}
          </div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Herramientas prestadas</label>
          ${items || '<div class="input-custom" style="background:var(--bg-secondary);cursor:default">Sin herramientas registradas</div>'}
        </div>
      </div>`;

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
    document.getElementById('btnExportarPdfPrestamos')?.addEventListener('click', () => this.abrirModalPdf());
    ['modalPdfPrestamo'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target.id === id) closeOverlay(id);
      });
    }); 
  
  },
// ══════════════════════════════════════════
  //  PDF
  // ══════════════════════════════════════════

  _COLUMNAS_PDF: [
    { key: 'nombre_cliente',            label: 'Cliente'                  },
    { key: 'fecha_prestamo',            label: 'Fecha Préstamo'           },
    { key: 'fecha_devolucion_esperada', label: 'Fecha Devolución Esp.'    },
    { key: 'fecha_cierre',              label: 'Fecha Cierre'             },
    { key: 'estado',                    label: 'Estado'                   },
    { key: 'observaciones',             label: 'Observaciones'            },
  ],

  abrirModalPdf() {
    document.getElementById('pdfFiltroEstadoPres').value = '';
    document.getElementById('pdfTituloPres').value = 'Reporte de Préstamos';
    this._actualizarKpisPdf(this.prestamos);
    document.querySelectorAll('#pdfColumnasPres input[type=checkbox]')
      .forEach(cb => { cb.onchange = () => this._actualizarPreviewPdf(); });
    document.getElementById('pdfFiltroEstadoPres').onchange = () => {
      this._actualizarKpisPdf(this._getDatosFiltradosPdf());
      this._actualizarPreviewPdf();
    };
    this._actualizarPreviewPdf();
    openOverlay('modalPdfPrestamo');
  },

  _getDatosFiltradosPdf() {
    const est = document.getElementById('pdfFiltroEstadoPres').value;
    return est ? this.prestamos.filter(p => p.estado === est) : [...this.prestamos];
  },

  _getColumnasMarcadas() {
    const checked = [];
    document.querySelectorAll('#pdfColumnasPres input[type=checkbox]')
      .forEach(cb => { if (cb.checked) checked.push(cb.value); });
    return this._COLUMNAS_PDF.filter(c => checked.includes(c.key));
  },

  _actualizarPreviewPdf() {
    const datos = this._getDatosFiltradosPdf().slice(0, 5);
    const cols  = this._getColumnasMarcadas();
    document.getElementById('pdfPreviewHeadPres').innerHTML =
      `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
    document.getElementById('pdfPreviewBodyPres').innerHTML = datos.length
      ? datos.map(d => `<tr>${cols.map(c => `<td>${this._formatCeldaPdf(d, c.key)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="text-center py-3 text-muted">Sin datos para mostrar</td></tr>`;
  },

  _actualizarKpisPdf(datos) {
    const total    = datos.length;
    const activos  = datos.filter(p => p.estado === 'activo').length;
    const vencidos = datos.filter(p => p.estado === 'vencido').length;
    document.getElementById('pdfKpisPres').innerHTML = `
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${total}</div>
        <div style="font-size:12px;color:var(--text-muted)">Préstamos</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#f59e0b">${activos}</div>
        <div style="font-size:12px;color:var(--text-muted)">Activos</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#ef4444">${vencidos}</div>
        <div style="font-size:12px;color:var(--text-muted)">Vencidos</div>
      </div>`;
  },

  _formatCeldaPdf(d, key) {
    if (['fecha_prestamo','fecha_devolucion_esperada','fecha_cierre'].includes(key))
      return d[key] ? formatFecha(d[key]) : '—';
    const val = d[key];
    return val != null && val !== '' ? String(val) : '—';
  },

  async generarPdf() {
    setLoading('btnGenerarPdfPres', 'btnGenerarPdfPresText', 'btnGenerarPdfPresSpinner', true);
    try {
      await this._loadPdfLibs();
      const { jsPDF } = window.jspdf;
      const titulo = document.getElementById('pdfTituloPres').value || 'Reporte de Préstamos';
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
      const activos  = datos.filter(p => p.estado === 'activo').length;
      const vencidos = datos.filter(p => p.estado === 'vencido').length;
      const kpiY = 30;
      const kpis = [
        { l: 'Total préstamos', v: String(datos.length) },
        { l: 'Activos',         v: String(activos)      },
        { l: 'Vencidos',        v: String(vencidos)     },
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

      doc.save(`prestamos_${now.toISOString().slice(0,10)}.pdf`);
      closeOverlay('modalPdfPrestamo');
      showToast('PDF generado correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar el PDF', 'error');
    } finally {
      setLoading('btnGenerarPdfPres', 'btnGenerarPdfPresText', 'btnGenerarPdfPresSpinner', false);
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