'use strict';

const ClientesModule = {
  clientes: [],
  editandoId: null,
  _viendoId: null,

  async init() {
    this._renderModal();
    this._bindEvents();
    await this.load();
  },

  async load() {
    const tbody = document.getElementById('bodyClientes');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-custom mx-auto"></div></td></tr>`;
    try {
      const { data } = await http('/api/clientes');
      this.clientes = data;
      this._render(data);
      setText('totalClientesLabel', `${data.length} cliente(s)`);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar clientes</td></tr>`;
      showToast('Error al cargar clientes', 'error');
    }
  },

  _render(lista) {
    const tbody = document.getElementById('bodyClientes');
    if (!lista.length) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <i class="bi bi-people"></i>
            <p>No hay clientes registrados</p>
          </div>
        </td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="cell-producto-name">${escapeHtml(c.nombre)}</div></td>
        <td>${escapeHtml(c.dni || '—')}</td>
        <td>${escapeHtml(c.telefono || '—')}</td>
        <td>${escapeHtml(c.email || '—')}</td>
        <td>
          <span class="badge-estado ${c.estado === 'activo' ? 'badge-estado-disp' : 'badge-estado-baja'}">
            <i class="bi ${c.estado === 'activo' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1"></i>
            ${c.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button class="btn-action btn-action-view"   onclick="ClientesModule.verDetalle(${c.id})" title="Ver detalle"><i class="bi bi-eye-fill"></i></button>
          <button class="btn-action btn-action-edit"   onclick="ClientesModule.abrirEditar(${c.id})" title="Editar"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn-action btn-action-delete" onclick="ClientesModule.eliminar(${c.id}, '${escapeHtml(c.nombre)}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
          <button class="btn-action btn-action-chart" onclick="GraficosModule._verGraficoRapido('clientes')" title="Ver gráfico"><i class="bi bi-bar-chart-fill"></i></button>
        </td>
      </tr>`).join('');
  },

  _filter() {
    const txt = document.getElementById('searchCliente').value.toLowerCase();
    const filtrados = this.clientes.filter(c =>
      c.nombre.toLowerCase().includes(txt) ||
      (c.dni || '').includes(txt) ||
      (c.telefono || '').includes(txt)
    );
    this._render(filtrados);
  },

  /* ── MODALS ── */
  _renderModal() {
    // Modal Nuevo / Editar
    document.getElementById('modalsContainer').insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="modalCliente">
        <div class="modal-panel">
          <div class="modal-header-custom">
            <div>
              <div class="modal-title-custom" id="modalClienteTitulo">Nuevo Cliente</div>
              <div class="modal-subtitle">Completa los campos del formulario</div>
            </div>
            <button class="btn-modal-close" onclick="closeOverlay('modalCliente')"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body-custom">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label-custom">Nombre completo <span class="required">*</span></label>
                <input type="text" id="cliNombre" class="input-custom" placeholder="Ej: Roberto Silva Mendoza" maxlength="150"/>
                <div class="field-error" id="err-cliNombre"></div>
              </div>
              <div class="col-md-6">
                <label class="form-label-custom">DNI</label>
                <input type="text" id="cliDni" class="input-custom" placeholder="Ej: 45678901" maxlength="20"/>
                <div class="field-error" id="err-cliDni"></div>
              </div>
              <div class="col-md-6">
                <label class="form-label-custom">Teléfono</label>
                <input type="text" id="cliTelefono" class="input-custom" placeholder="Ej: 987123456" maxlength="20"/>
              </div>
              <div class="col-12">
                <label class="form-label-custom">Email</label>
                <input type="email" id="cliEmail" class="input-custom" placeholder="correo@ejemplo.com" maxlength="100"/>
              </div>
              <div class="col-12">
                <label class="form-label-custom">Dirección</label>
                <textarea id="cliDireccion" class="input-custom" rows="2" placeholder="Av. Los Pinos 234..."></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label-custom">Estado</label>
                <select id="cliEstado" class="input-custom">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer-custom">
            <button class="btn-cancel" onclick="closeOverlay('modalCliente')">Cancelar</button>
            <button class="btn-save" id="btnGuardarCliente" onclick="ClientesModule.guardar()">
              <span id="btnGuardarClienteText"><i class="bi bi-floppy-fill me-1"></i> Guardar</span>
              <span id="btnGuardarClienteSpinner" class="d-none"><span class="spinner-sm"></span></span>
            </button>
          </div>
        </div>
      </div>`);

    document.getElementById('modalCliente').addEventListener('click', e => {
      if (e.target.id === 'modalCliente') closeOverlay('modalCliente');
    });

    // Modal Ver Detalle
    document.getElementById('modalsContainer').insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="modalDetalleCliente">
        <div class="modal-panel" style="max-width:480px">
          <div class="modal-header-custom">
            <div>
              <div class="modal-title-custom">Detalle del Cliente</div>
              <div class="modal-subtitle">Información completa del registro</div>
            </div>
            <button class="btn-modal-close" onclick="closeOverlay('modalDetalleCliente')"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body-custom" id="detalleClienteBody"></div>
          <div class="modal-footer-custom">
            <button class="btn-cancel" onclick="closeOverlay('modalDetalleCliente')">Cerrar</button>
            <button class="btn-save" onclick="ClientesModule.abrirEditar(ClientesModule._viendoId); closeOverlay('modalDetalleCliente')">
              <i class="bi bi-pencil-fill me-1"></i> Editar
            </button>
          </div>
        </div>
      </div>`);

    document.getElementById('modalDetalleCliente').addEventListener('click', e => {
      if (e.target.id === 'modalDetalleCliente') closeOverlay('modalDetalleCliente');
    });
  },

  _limpiarModal() {
    ['cliNombre','cliDni','cliTelefono','cliEmail','cliDireccion'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = '';
        el.classList.remove('is-invalid');
      }
    });

    // Estado por defecto
    const estado = document.getElementById('cliEstado');
    if (estado) estado.value = 'activo';

    ['err-cliNombre','err-cliDni'].forEach(id => setText(id, ''));

    this.editandoId = null;
  },

  abrirNuevo() {
    this._limpiarModal();
    setText('modalClienteTitulo', 'Nuevo Cliente');
    openOverlay('modalCliente');
    document.getElementById('cliNombre')?.focus();
  },

  abrirEditar(id) {
    const c = this.clientes.find(x => x.id === id);
    if (!c) return;
    this._limpiarModal();
    this.editandoId = id;
    setText('modalClienteTitulo', 'Editar Cliente');
    document.getElementById('cliNombre').value    = c.nombre    || '';
    document.getElementById('cliDni').value       = c.dni       || '';
    document.getElementById('cliTelefono').value  = c.telefono  || '';
    document.getElementById('cliEmail').value     = c.email     || '';
    document.getElementById('cliDireccion').value = c.direccion || '';
    document.getElementById('cliEstado').value = c.estado || 'activo';
    openOverlay('modalCliente');
  },

  verDetalle(id) {
    const c = this.clientes.find(x => x.id === id);
    if (!c) return;
    this._viendoId = id;

    document.getElementById('detalleClienteBody').innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label-custom">Nombre completo</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(c.nombre || '—')}</div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">DNI</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(c.dni || '—')}</div>
        </div>
        <div class="col-md-6">
          <label class="form-label-custom">Teléfono</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(c.telefono || '—')}</div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Email</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default">${escapeHtml(c.email || '—')}</div>
        </div>
        <div class="col-12">
          <label class="form-label-custom">Dirección</label>
          <div class="input-custom" style="background:var(--bg-secondary);cursor:default;min-height:60px">${escapeHtml(c.direccion || '—')}</div>
        </div>
      </div>`;

    openOverlay('modalDetalleCliente');
  },

  async guardar() {
    const nombre    = document.getElementById('cliNombre').value.trim();
    const dni       = document.getElementById('cliDni').value.trim();
    const telefono  = document.getElementById('cliTelefono').value.trim();
    const email     = document.getElementById('cliEmail').value.trim();
    const direccion = document.getElementById('cliDireccion').value.trim();
    const estado = document.getElementById('cliEstado').value;

    clearErrors(['cliNombre','cliDni']);
    let ok = true;
    if (!nombre) { setError('cliNombre','err-cliNombre','El nombre es requerido'); ok = false; }
    if (!ok) return;

    setLoading('btnGuardarCliente','btnGuardarClienteText','btnGuardarClienteSpinner', true);
    try {
      const body = {
        nombre,
        dni: dni || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        estado
      };
      if (this.editandoId) {
        await http(`/api/clientes/${this.editandoId}`, 'PUT', body);
        showToast('Cliente actualizado correctamente', 'success');
      } else {
        await http('/api/clientes', 'POST', body);
        showToast('Cliente creado correctamente', 'success');
      }
      closeOverlay('modalCliente');
      await this.load();
    } catch (e) {
      showToast(e.message || 'Error al guardar', 'error');
    } finally {
      setLoading('btnGuardarCliente','btnGuardarClienteText','btnGuardarClienteSpinner', false);
    }
  },

  eliminar(id, nombre) {
    DeleteModal.open('cliente', id, nombre, async () => {
      try {
        await http(`/api/clientes/${id}`, 'DELETE');
        showToast('Cliente eliminado', 'success');
        await this.load();
      } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
      }
    });
  },

  _bindEvents() {
    document.getElementById('searchCliente')?.addEventListener('input', () => this._filter());
    document.getElementById('btnNuevoCliente')?.addEventListener('click', () => this.abrirNuevo());
    document.getElementById('btnRefreshClientes')?.addEventListener('click', () => this.load());
    document.getElementById('btnExportarPdfClientes')?.addEventListener('click', () => this.abrirModalPdf());
    document.getElementById('modalPdfCliente')?.addEventListener('click', e => {
      if (e.target.id === 'modalPdfCliente') closeOverlay('modalPdfCliente');
    });
  },
// ══════════════════════════════════════════
  //  PDF
  // ══════════════════════════════════════════

  _COLUMNAS_PDF: [
    { key: 'nombre',    label: 'Nombre'    },
    { key: 'dni',       label: 'DNI'       },
    { key: 'telefono',  label: 'Teléfono'  },
    { key: 'email',     label: 'Email'     },
    { key: 'direccion', label: 'Dirección' },
    { key: 'estado',    label: 'Estado'    },
  ],

  abrirModalPdf() {
    document.getElementById('pdfFiltroEstadoCli').value = '';
    document.getElementById('pdfTituloCli').value = 'Reporte de Clientes';
    this._actualizarKpisPdf(this.clientes);
    document.querySelectorAll('#pdfColumnasCli input[type=checkbox]')
      .forEach(cb => { cb.onchange = () => this._actualizarPreviewPdf(); });
    document.getElementById('pdfFiltroEstadoCli').onchange = () => {
      this._actualizarKpisPdf(this._getDatosFiltradosPdf());
      this._actualizarPreviewPdf();
    };
    this._actualizarPreviewPdf();
    openOverlay('modalPdfCliente');
  },

  _getDatosFiltradosPdf() {
    const est = document.getElementById('pdfFiltroEstadoCli').value;
    return est ? this.clientes.filter(c => c.estado === est) : [...this.clientes];
  },

  _getColumnasMarcadas() {
    const checked = [];
    document.querySelectorAll('#pdfColumnasCli input[type=checkbox]')
      .forEach(cb => { if (cb.checked) checked.push(cb.value); });
    return this._COLUMNAS_PDF.filter(c => checked.includes(c.key));
  },

  _actualizarPreviewPdf() {
    const datos = this._getDatosFiltradosPdf().slice(0, 5);
    const cols  = this._getColumnasMarcadas();
    document.getElementById('pdfPreviewHeadCli').innerHTML =
      `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
    document.getElementById('pdfPreviewBodyCli').innerHTML = datos.length
      ? datos.map(d => `<tr>${cols.map(c => `<td>${this._formatCeldaPdf(d, c.key)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="text-center py-3 text-muted">Sin datos para mostrar</td></tr>`;
  },

  _actualizarKpisPdf(datos) {
    const total    = datos.length;
    const activos  = datos.filter(c => c.estado === 'activo').length;
    const inactivos= datos.filter(c => c.estado === 'inactivo').length;
    document.getElementById('pdfKpisCli').innerHTML = `
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${total}</div>
        <div style="font-size:12px;color:var(--text-muted)">Total Clientes</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#10b981">${activos}</div>
        <div style="font-size:12px;color:var(--text-muted)">Activos</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#ef4444">${inactivos}</div>
        <div style="font-size:12px;color:var(--text-muted)">Inactivos</div>
      </div>`;
  },

  _formatCeldaPdf(d, key) {
    const val = d[key];
    return val != null && val !== '' ? String(val) : '—';
  },

  async generarPdf() {
    setLoading('btnGenerarPdfCli', 'btnGenerarPdfCliText', 'btnGenerarPdfCliSpinner', true);
    try {
      await this._loadPdfLibs();
      const { jsPDF } = window.jspdf;
      const titulo = document.getElementById('pdfTituloCli').value || 'Reporte de Clientes';
      const datos  = this._getDatosFiltradosPdf();
      const cols   = this._getColumnasMarcadas();

      if (!cols.length)  { showToast('Selecciona al menos una columna', 'error'); return; }
      if (!datos.length) { showToast('No hay datos para exportar', 'error'); return; }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();
      const hoy  = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;
      const hora = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo, 14, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${hoy} ${hora}`, 297 - 14, 14, { align: 'right' });

      const activos  = datos.filter(c => c.estado === 'activo').length;
      const inactivos= datos.filter(c => c.estado === 'inactivo').length;
      const kpiY = 30;
      const kpis = [
        { l: 'Total clientes', v: String(datos.length) },
        { l: 'Activos',        v: String(activos)      },
        { l: 'Inactivos',      v: String(inactivos)    },
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

      const total_pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total_pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 170);
        doc.text(`Página ${i} de ${total_pages}  —  AppPrestamos`, 297 / 2, 207, { align: 'center' });
      }

      doc.save(`clientes_${now.toISOString().slice(0,10)}.pdf`);
      closeOverlay('modalPdfCliente');
      showToast('PDF generado correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar el PDF', 'error');
    } finally {
      setLoading('btnGenerarPdfCli', 'btnGenerarPdfCliText', 'btnGenerarPdfCliSpinner', false);
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