'use strict';

const Herramientasmodule = {
  herramientas: [],

  async init() {
     this._bindEvents();
    await this.load();
  },

  async load() {
    const tbody = document.getElementById('bodyHerramientas');

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="spinner-custom mx-auto"></div>
        </td>
      </tr>`;

    try {
      const { data } = await http('/api/herramientas');

      this.herramientas = data;
      AppState.herramientas = data;

      this._render(data);

      setText(
        'totalHerramientasLabel',
        `${data.length} herramienta(s)`
      );

    } catch (e) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-danger">
            Error al cargar herramientas
          </td>
        </tr>`;

      showToast('Error al cargar herramientas', 'error');
    }
  },

  _estadoBadge(estado) {
    const map = {
      disponible: {
        cls: 'badge-estado-disp',
        icon: 'bi-check-circle-fill',
        label: 'Disponible'
      },
      prestada: {
        cls: 'badge-estado-pres',
        icon: 'bi-arrow-right-circle',
        label: 'Prestada'
      },
      mantenimiento: {
        cls: 'badge-estado-mant',
        icon: 'bi-tools',
        label: 'Mantenimiento'
      },
      baja: {
        cls: 'badge-estado-baja',
        icon: 'bi-x-circle-fill',
        label: 'Baja'
      }
    };

    const e = map[estado] || map.disponible;

    return `
      <span class="badge-estado ${e.cls}">
        <i class="bi ${e.icon} me-1"></i>${e.label}
      </span>`;
  },

  _render(lista) {
    const tbody = document.getElementById('bodyHerramientas');

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <i class="bi bi-tools"></i>
              <p>No hay herramientas registradas</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = lista.map((h, i) => `
      <tr>
        <td>${i + 1}</td>

        <td>
          <div class="cell-producto-name">
            ${escapeHtml(h.nombre)}
          </div>

          <div class="cell-producto-desc">
            ${escapeHtml(h.codigo || '')}
            ${h.marca ? '· ' + escapeHtml(h.marca) : ''}
          </div>
        </td>

        <td>${escapeHtml(h.nombre_categoria || '—')}</td>
        <td>${escapeHtml(h.nombre_proveedor || '—')}</td>

        <td class="cell-precio">
          S/ ${formatPrecio(h.precio_compra)}
        </td>

        <td>${this._estadoBadge(h.estado)}</td>

        <td>
          <button
            class="btn-action btn-action-edit"
            onclick="Herramientasmodule.openEdit(${h.id})"
            title="Editar">
            <i class="bi bi-pencil-fill"></i>
          </button>

          <button
            class="btn-action btn-action-delete"
            onclick="Herramientasmodule.eliminar(${h.id}, '${escapeHtml(h.nombre)}')"
            title="Eliminar">
            <i class="bi bi-trash3-fill"></i>
          </button>
          <button 
            class="btn-action btn-action-chart"
            onclick="GraficosModule._verGraficoRapido('herramientas')"
            title="Ver gráfico">
            <i class="bi bi-bar-chart-fill"></i>
          </button>

        </td>
      </tr>
    `).join('');
  },

  _filter() {
    const txt = document.getElementById('searchHerramienta')?.value.toLowerCase() || '';
    const est = document.getElementById('filterEstadoHerramienta')?.value || '';

    let filtrados = this.herramientas.filter(h =>
      h.nombre.toLowerCase().includes(txt) ||
      (h.codigo || '').toLowerCase().includes(txt) ||
      (h.marca || '').toLowerCase().includes(txt)
    );

    if (est) {
      filtrados = filtrados.filter(h => h.estado === est);
    }

    this._render(filtrados);
  },

  async _cargarSelects() {
    const selProv = document.getElementById('herrProveedor');

    if (selProv) {
      selProv.innerHTML = '<option value="">Seleccionar proveedor…</option>';

      try {
        const { data } = await http('/api/proveedores');

        data.forEach(p => {
          selProv.insertAdjacentHTML(
            'beforeend',
            `<option value="${p.id}">${escapeHtml(p.nombre_comercial)}</option>`
          );
        });

      } catch {}
    }

    const selCat = document.getElementById('herrCategoria');

    if (selCat) {
      selCat.innerHTML = '<option value="">Seleccionar categoría…</option>';

      try {
        const cats = [
          ...new Map(
            this.herramientas.map(h => [
              h.idcategoria,
              {
                id: h.idcategoria,
                nombre: h.nombre_categoria
              }
            ])
          ).values()
        ];

        cats.forEach(c => {
          if (c.id) {
            selCat.insertAdjacentHTML(
              'beforeend',
              `<option value="${c.id}">${escapeHtml(c.nombre || '')}</option>`
            );
          }
        });

      } catch {}
    }
  },



  async _openModal(mode, herramienta = null) {
  const isEdit = mode === 'edit';

  if (!isEdit) {
    herramienta = {};
  }

    setText(
      'modalHerramientaTitulo',
      isEdit ? 'Editar Herramienta' : 'Nueva Herramienta'
    );

    await this._cargarSelects();

    document.getElementById('herramientaId').value = isEdit ? herramienta.id : '';

    document.getElementById('herrNombre').value = isEdit ? herramienta.nombre || '' : '';
    document.getElementById('herrProveedor').value = isEdit ? herramienta.idproveedor || '' : '';
    document.getElementById('herrCategoria').value = isEdit ? herramienta.idcategoria || '' : '';
    document.getElementById('herrMarca').value = isEdit ? herramienta.marca || '' : '';
    document.getElementById('herrModelo').value = isEdit ? herramienta.modelo || '' : '';
    document.getElementById('herrCodigo').value = isEdit ? herramienta.codigo || '' : '';
    document.getElementById('herrSerie').value = isEdit ? herramienta.numero_serie || '' : '';
    document.getElementById('herrPrecio').value = isEdit ? herramienta.precio_compra || '' : '';
    document.getElementById('herrStock').value = isEdit ? herramienta.stock || 1 : 1;
    document.getElementById('herrEstado').value =isEdit ? herramienta.estado || 'disponible' : 'disponible';

    document.getElementById('herrDescripcion').value = isEdit ? herramienta.descripcion || '' : '';

    clearErrors(['herrNombre', 'herrProveedor', 'herrCategoria']);

    openOverlay('modalHerramienta');
  },

  openEdit(id) {
    const herramienta = this.herramientas.find(h => h.id == id);

    if (!herramienta) {
      return showToast('Herramienta no encontrada', 'error');
    }

    this._openModal('edit', herramienta);
  },

  async _save() {
    const id = document.getElementById('herramientaId').value;

    const nombre = document.getElementById('herrNombre').value.trim();
    const idproveedor = document.getElementById('herrProveedor').value;
    const idcategoria = document.getElementById('herrCategoria').value;
    const marca = document.getElementById('herrMarca').value.trim();
    const modelo = document.getElementById('herrModelo').value.trim();
    const codigo = document.getElementById('herrCodigo').value.trim();
    const numero_serie = document.getElementById('herrSerie').value.trim();
    const precio_compra = document.getElementById('herrPrecio').value;
    const stock = document.getElementById('herrStock').value;
    const estado = document.getElementById('herrEstado').value;
    const descripcion = document.getElementById('herrDescripcion').value.trim();

    clearErrors(['herrNombre', 'herrProveedor', 'herrCategoria']);




    let ok = true;

    if (!nombre) {
      setError('herrNombre', 'err-herrNombre', 'El nombre es requerido');
      ok = false;
    }

    if (!idproveedor) {
      setError('herrProveedor', 'err-herrProveedor', 'El proveedor es requerido');
      ok = false;
    }

    if (!idcategoria) {
      setError('herrCategoria', 'err-herrCategoria', 'La categoría es requerida');
      ok = false;
    }

    if (!ok) return;

    const isEdit = !!id;

    setLoading(
      'btnGuardarHerramienta',
      'btnGuardarHerramientaText',
      'btnGuardarHerramientaSpinner',
      true
    );

    try {
      const body = {
        idproveedor,
        idcategoria,
        nombre,
        marca: marca || null,
        modelo: modelo || null,
        codigo: codigo || null,
        numero_serie: numero_serie || null,
        descripcion: descripcion || null,
        precio_compra: precio_compra || null,
        stock: stock || 1,
        estado
      };

      await http(
        isEdit ? `/api/herramientas/${id}` : '/api/herramientas',
        isEdit ? 'PUT' : 'POST',
        body
      );

      showToast(
        `Herramienta ${isEdit ? 'actualizada' : 'creada'} correctamente`,
        'success'
      );

      closeOverlay('modalHerramienta');

      await this.load();

    } catch (e) {
      showToast(e.message || 'Error al guardar', 'error');

    } finally {
      setLoading(
        'btnGuardarHerramienta',
        'btnGuardarHerramientaText',
        'btnGuardarHerramientaSpinner',
        false
      );
    }
  },

  eliminar(id, nombre) {
    DeleteModal.open('herramienta', id, nombre, async () => {
      try {
        await http(`/api/herramientas/${id}`, 'DELETE');

        showToast('Herramienta eliminada', 'success');

        await this.load();

      } catch (e) {
        showToast(e.message || 'No se puede eliminar', 'error');
      }
    });
  },

  _bindEvents() {
    document.getElementById('searchHerramienta')
      ?.addEventListener('input', () => this._filter());

    document.getElementById('filterEstadoHerramienta')
      ?.addEventListener('change', () => this._filter());

    document.getElementById('btnNuevaHerramienta')
      ?.addEventListener('click', () => this._openModal('new'));

    document.getElementById('btnRefreshHerramientas')
      ?.addEventListener('click', () => this.load());

    document.getElementById('btnGuardarHerramienta')
      ?.addEventListener('click', () => this._save());

    document.getElementById('btnCancelHerramienta')
      ?.addEventListener('click', () => closeOverlay('modalHerramienta'));

    document.getElementById('btnCloseModalHerramienta')
      ?.addEventListener('click', () => closeOverlay('modalHerramienta'));

    document.getElementById('modalHerramienta')
      ?.addEventListener('click', e => {
        if (e.target.id === 'modalHerramienta') {
          closeOverlay('modalHerramienta');
        }
    });
    document.getElementById('btnExportarPdfHerramientas')?.addEventListener('click', () => this.abrirModalPdf());
    document.getElementById('modalPdfHerramienta')?.addEventListener('click', e => {
      if (e.target.id === 'modalPdfHerramienta') closeOverlay('modalPdfHerramienta');
    });

  },
  // ══════════════════════════════════════════
  //  PDF
  // ══════════════════════════════════════════

  _COLUMNAS_PDF: [
    { key: 'nombre',           label: 'Nombre'     },
    { key: 'marca',            label: 'Marca'      },
    { key: 'modelo',           label: 'Modelo'     },
    { key: 'codigo',           label: 'Código'     },
    { key: 'nombre_categoria', label: 'Categoría'  },
    { key: 'nombre_proveedor', label: 'Proveedor'  },
    { key: 'precio_compra',    label: 'Precio'     },
    { key: 'stock',            label: 'Stock'      },
    { key: 'estado',           label: 'Estado'     },
  ],

  abrirModalPdf() {
    document.getElementById('pdfFiltroEstadoHerr').value = '';
    document.getElementById('pdfTituloHerr').value = 'Reporte de Herramientas';
    this._actualizarKpisPdf(this.herramientas);
    document.querySelectorAll('#pdfColumnasHerr input[type=checkbox]')
      .forEach(cb => { cb.onchange = () => this._actualizarPreviewPdf(); });
    document.getElementById('pdfFiltroEstadoHerr').onchange = () => {
      this._actualizarKpisPdf(this._getDatosFiltradosPdf());
      this._actualizarPreviewPdf();
    };
    this._actualizarPreviewPdf();
    openOverlay('modalPdfHerramienta');
  },

  _getDatosFiltradosPdf() {
    const est = document.getElementById('pdfFiltroEstadoHerr').value;
    return est ? this.herramientas.filter(h => h.estado === est) : [...this.herramientas];
  },

  _getColumnasMarcadas() {
    const checked = [];
    document.querySelectorAll('#pdfColumnasHerr input[type=checkbox]')
      .forEach(cb => { if (cb.checked) checked.push(cb.value); });
    return this._COLUMNAS_PDF.filter(c => checked.includes(c.key));
  },

  _actualizarPreviewPdf() {
    const datos = this._getDatosFiltradosPdf().slice(0, 5);
    const cols  = this._getColumnasMarcadas();
    document.getElementById('pdfPreviewHeadHerr').innerHTML =
      `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
    document.getElementById('pdfPreviewBodyHerr').innerHTML = datos.length
      ? datos.map(d => `<tr>${cols.map(c => `<td>${this._formatCeldaPdf(d, c.key)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="text-center py-3 text-muted">Sin datos para mostrar</td></tr>`;
  },

  _actualizarKpisPdf(datos) {
    const total       = datos.length;
    const disponibles = datos.filter(h => h.estado === 'disponible').length;
    const prestadas   = datos.filter(h => h.estado === 'prestada').length;
    const bajas       = datos.filter(h => h.estado === 'baja').length;
    document.getElementById('pdfKpisHerr').innerHTML = `
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${total}</div>
        <div style="font-size:12px;color:var(--text-muted)">Total</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#10b981">${disponibles}</div>
        <div style="font-size:12px;color:var(--text-muted)">Disponibles</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#f59e0b">${prestadas}</div>
        <div style="font-size:12px;color:var(--text-muted)">Prestadas</div>
      </div>
      <div style="flex:1;min-width:140px;background:var(--bg-secondary);border-radius:10px;padding:12px 16px;">
        <div style="font-size:22px;font-weight:700;color:#ef4444">${bajas}</div>
        <div style="font-size:12px;color:var(--text-muted)">De Baja</div>
      </div>`;
  },

  _formatCeldaPdf(d, key) {
    if (key === 'precio_compra')
      return d[key] != null ? `S/ ${parseFloat(d[key]).toFixed(2)}` : '—';
    const val = d[key];
    return val != null && val !== '' ? String(val) : '—';
  },

  async generarPdf() {
    setLoading('btnGenerarPdfHerr', 'btnGenerarPdfHerrText', 'btnGenerarPdfHerrSpinner', true);
    try {
      await this._loadPdfLibs();
      const { jsPDF } = window.jspdf;
      const titulo = document.getElementById('pdfTituloHerr').value || 'Reporte de Herramientas';
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

      const disponibles = datos.filter(h => h.estado === 'disponible').length;
      const prestadas   = datos.filter(h => h.estado === 'prestada').length;
      const bajas       = datos.filter(h => h.estado === 'baja').length;
      const kpiY = 30;
      const kpis = [
        { l: 'Total',       v: String(datos.length) },
        { l: 'Disponibles', v: String(disponibles)  },
        { l: 'Prestadas',   v: String(prestadas)    },
        { l: 'De Baja',     v: String(bajas)        },
      ];
      kpis.forEach((k, i) => {
        const x = 14 + i * 68;
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(x, kpiY - 5, 62, 14, 2, 2, 'F');
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

      doc.save(`herramientas_${now.toISOString().slice(0,10)}.pdf`);
      closeOverlay('modalPdfHerramienta');
      showToast('PDF generado correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al generar el PDF', 'error');
    } finally {
      setLoading('btnGenerarPdfHerr', 'btnGenerarPdfHerrText', 'btnGenerarPdfHerrSpinner', false);
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