'use strict';

const ProveedoresModule = {
  proveedores: [],
  editandoId: null,

  async init() {
    this._bindEvents();
    await this.load();
  },

  async load() {
    const tbody = document.getElementById('bodyProveedores');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-custom mx-auto"></div></td></tr>`;
    try {
      const { data } = await http('/api/proveedores');
      this.proveedores = data;
      AppState.proveedores = data;
      this._render(data);
      setText('totalProveedoresLabel', `${data.length} proveedor(es)`);
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar proveedores</td></tr>`;
      showToast('Error al cargar proveedores', 'error');
    }
  },

  _render(lista) {
    const tbody = document.getElementById('bodyProveedores');
    if (!lista.length) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <i class="bi bi-truck"></i>
            <p>No hay proveedores registrados</p>
          </div>
        </td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="cell-producto-name">${escapeHtml(p.nombre_comercial)}</div></td>
        <td>${escapeHtml(p.contacto || '—')}</td>
        <td>${escapeHtml(p.telefono || '—')}</td>
        <td>${escapeHtml(p.email || '—')}</td>
        <td>
          <button class="btn-action btn-action-edit"   onclick="ProveedoresModule.abrirEditar(${p.id})" title="Editar"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn-action btn-action-delete" onclick="ProveedoresModule.eliminar(${p.id}, '${escapeHtml(p.nombre_comercial)}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
          <button class="btn-action btn-action-chart"  onclick="GraficosModule._verGraficoRapido('proveedores', ${p.id})" title="Ver gráfico"><i class="bi bi-bar-chart-fill"></i></button>

        </td>
      </tr>`).join('');
  },

  _filter() {
    const txt = document.getElementById('searchProveedor').value.toLowerCase();
    const filtrados = this.proveedores.filter(p =>
      p.nombre_comercial.toLowerCase().includes(txt) ||
      (p.contacto || '').toLowerCase().includes(txt) ||
      (p.telefono || '').includes(txt)
    );
    this._render(filtrados);
  },

  

  


  _limpiarModal() {
    ['provNombre','provContacto','provTelefono','provEmail','provDireccion'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('is-invalid'); }
    });
    setText('err-provNombre', '');
    this.editandoId = null;
  },

  abrirNuevo() {
    this._limpiarModal();
    setText('modalProveedorTitulo', 'Nuevo Proveedor');
    openOverlay('modalProveedor');
    document.getElementById('provNombre')?.focus();
  },

  abrirEditar(id) {
    const p = this.proveedores.find(x => x.id === id);
    if (!p) return;
    this._limpiarModal();
    this.editandoId = id;
    setText('modalProveedorTitulo', 'Editar Proveedor');
    document.getElementById('provNombre').value    = p.nombre_comercial || '';
    document.getElementById('provContacto').value  = p.contacto         || '';
    document.getElementById('provTelefono').value  = p.telefono         || '';
    document.getElementById('provEmail').value     = p.email            || '';
    document.getElementById('provDireccion').value = p.direccion        || '';
    openOverlay('modalProveedor');
  },

  async guardar() {
    const nombre_comercial = document.getElementById('provNombre').value.trim();
    const contacto   = document.getElementById('provContacto').value.trim();
    const telefono   = document.getElementById('provTelefono').value.trim();
    const email      = document.getElementById('provEmail').value.trim();
    const direccion  = document.getElementById('provDireccion').value.trim();

    clearErrors(['provNombre']);
    if (!nombre_comercial) { setError('provNombre','err-provNombre','El nombre comercial es requerido'); return; }

    setLoading('btnGuardarProveedor','btnGuardarProveedorText','btnGuardarProveedorSpinner', true);
    try {
      const body = { nombre_comercial, contacto: contacto||null, telefono: telefono||null, email: email||null, direccion: direccion||null };
      if (this.editandoId) {
        await http(`/api/proveedores/${this.editandoId}`, 'PUT', body);
        showToast('Proveedor actualizado correctamente', 'success');
      } else {
        await http('/api/proveedores', 'POST', body);
        showToast('Proveedor creado correctamente', 'success');
      }
      closeOverlay('modalProveedor');
      await this.load();
    } catch (e) {
      showToast(e.message || 'Error al guardar', 'error');
    } finally {
      setLoading('btnGuardarProveedor','btnGuardarProveedorText','btnGuardarProveedorSpinner', false);
    }
  },

  eliminar(id, nombre) {
    DeleteModal.open('proveedor', id, nombre, async () => {
      try {
        await http(`/api/proveedores/${id}`, 'DELETE');
        showToast('Proveedor eliminado', 'success');
        await this.load();
      } catch (e) {
        showToast(e.message || 'No se puede eliminar (tiene herramientas asociadas)', 'error');
      }
    });
  },

  _bindEvents() {
    document.getElementById('searchProveedor')?.addEventListener('input', () => this._filter());
    document.getElementById('btnNuevoProveedor')?.addEventListener('click', () => this.abrirNuevo());
    document.getElementById('btnRefreshProveedores')?.addEventListener('click', () => this.load());
    document.getElementById('modalProveedor')?.addEventListener('click', e => {
    if (e.target.id === 'modalProveedor') closeOverlay('modalProveedor');
    });
    document.getElementById('btnExportarPdfProveedores')?.addEventListener('click', () => this.abrirModalPdf());
    document.getElementById('modalPdfProveedor')?.addEventListener('click', e => {
      if (e.target.id === 'modalPdfProveedor') closeOverlay('modalPdfProveedor');
    });
  },
 
  _COLUMNAS_PDF: [
    { key: 'nombre_comercial', label: 'Nombre'    },
    { key: 'contacto',         label: 'Contacto'  },
    { key: 'telefono',         label: 'Teléfono'  },
    { key: 'email',            label: 'Email'     },
    { key: 'direccion',        label: 'Dirección' },
  ],

  abrirModalPdf() {
    document.getElementById('pdfTituloProvs').value = 'Reporte de Proveedores';
    this._actualizarKpisPdf(this.proveedores);
    document.querySelectorAll('#pdfColumnasProvs input[type=checkbox]')
      .forEach(cb => { cb.onchange = () => this._actualizarPreviewPdf(); });
    this._actualizarPreviewPdf();
    openOverlay('modalPdfProveedor');
  },

  _getDatosFiltradosPdf() {
    return [...this.proveedores];
  },

  _getColumnasMarcadas() {
    const checked = [];
    document.querySelectorAll('#pdfColumnasProvs input[type=checkbox]')
      .forEach(cb => { if (cb.checked) checked.push(cb.value); });
    return this._COLUMNAS_PDF.filter(c => checked.includes(c.key));
  },

  _actualizarPreviewPdf() {
    const datos = this._getDatosFiltradosPdf().slice(0, 5);
    const cols  = this._getColumnasMarcadas();
    document.getElementById('pdfPreviewHeadProvs').innerHTML =
      `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
    document.getElementById('pdfPreviewBodyProvs').innerHTML = datos.length
      ? datos.map(d => `<tr>${cols.map(c => `<td>${this._formatCeldaPdf(d, c.key)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="text-center py-3 text-muted">Sin datos para mostrar</td></tr>`;
  },

  _actualizarKpisPdf(datos) {
    const total      = datos.length;
    const conEmail   = datos.filter(p => p.email).length;
    const conTel     = datos.filter(p => p.telefono).length;
    document.getElementById('pdfKpisProvs').innerHTML = `
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${total}</div>
        <div style="font-size:12px;color:var(--text-muted)">Proveedores</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#10b981">${conEmail}</div>
        <div style="font-size:12px;color:var(--text-muted)">Con Email</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#6366f1">${conTel}</div>
        <div style="font-size:12px;color:var(--text-muted)">Con Teléfono</div>
      </div>`;
  },

  _formatCeldaPdf(d, key) {
    const val = d[key];
    return val != null && val !== '' ? String(val) : '—';
  },

  async generarPdf() {
    setLoading('btnGenerarPdfProvs', 'btnGenerarPdfProvsText', 'btnGenerarPdfProvsSpinner', true);
    try {
      await this._loadPdfLibs();
      const { jsPDF } = window.jspdf;
      const titulo = document.getElementById('pdfTituloProvs').value || 'Reporte de Proveedores';
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

      const conEmail = datos.filter(p => p.email).length;
      const conTel   = datos.filter(p => p.telefono).length;
      const kpiY = 30;
      const kpis = [
        { l: 'Total proveedores', v: String(datos.length) },
        { l: 'Con Email',         v: String(conEmail)     },
        { l: 'Con Teléfono',      v: String(conTel)       },
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

      doc.save(`proveedores_${now.toISOString().slice(0,10)}.pdf`);
      closeOverlay('modalPdfProveedor');
      showToast('PDF generado correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar el PDF', 'error');
    } finally {
      setLoading('btnGenerarPdfProvs', 'btnGenerarPdfProvsText', 'btnGenerarPdfProvsSpinner', false);
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