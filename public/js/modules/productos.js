/**
 * modules/productos.js
 * Solo conoce el DOM de views/productos.html
 */

'use strict';

const ProductosModule = {

  async init() {
    // Asegurar marcas cargadas (las necesita el select y el filtro)
    if (!AppState.marcas.length) {
      const { data } = await http('/api/proveedores');
      AppState.marcas = data;
      updateBadges();
    }

    this._bindEvents();
    await this.load();
  },

  async load() {
    document.getElementById('bodyProductos').innerHTML =
      `<tr><td colspan="7" class="text-center py-5"><div class="spinner-custom"></div></td></tr>`;

    try {
      const { data } = await http('/api/productos');
      AppState.productos = data;
      this._render(data);
      this._populateFilterMarca();
      updateBadges();
    } catch (e) {
      showToast('Error al cargar productos: ' + e.message, 'error');
    }
  },

  _render(lista) {
    setText('totalProductosLabel', `${lista.length} producto(s) encontrado(s)`);
    const tbody = document.getElementById('bodyProductos');

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <i class="bi bi-box-seam"></i><p>No hay productos que mostrar</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((p, i) => `
      <tr>
        <td><span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${String(i+1).padStart(2,'0')}</span></td>
        <td style="max-width:220px">
          <div class="cell-producto-name">${escapeHtml(p.nombre)}</div>
          <div class="cell-producto-desc">${escapeHtml(p.descripcion || '—')}</div>
        </td>
        <td><span class="badge-marca"><i class="bi bi-bookmark-star-fill"></i>${escapeHtml(p.nombremarca)}</span></td>
        <td><span class="cell-precio">S/. ${formatPrecio(p.precio)}</span></td>
        <td>${p.garantia ? `<span class="badge-garantia">${p.garantia} meses</span>` : '<span class="text-muted">—</span>'}</td>
        <td style="white-space:nowrap;font-size:13px">${formatFecha(p.fechacompra)}</td>
        <td style="white-space:nowrap">
          <button class="btn-action btn-action-edit"   onclick="ProductosModule.openEdit(${p.id})"   title="Editar"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn-action btn-action-delete" onclick="ProductosModule.confirmDel(${p.id},'${escapeHtml(p.nombre)}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
        </td>
      </tr>`).join('');
  },

  /* ── Filtros ─────────────────────────── */
  _populateFilterMarca() {
    const sel = document.getElementById('filterMarca');
    if (!sel) return;
    sel.innerHTML = `<option value="">Todas las marcas</option>` +
      AppState.marcas.map(m => `<option value="${m.id}">${escapeHtml(m.nombremarca)}</option>`).join('');
  },

  _filter() {
    const search = document.getElementById('searchProducto')?.value.toLowerCase() || '';
    const marca  = document.getElementById('filterMarca')?.value || '';
    this._render(AppState.productos.filter(p =>
      (!search || p.nombre.toLowerCase().includes(search) ||
        p.nombremarca.toLowerCase().includes(search) ||
        (p.descripcion||'').toLowerCase().includes(search)) &&
      (!marca || String(p.idmarca) === marca)
    ));
  },

  /* ── Modal ───────────────────────────── */
  _openModal(mode, producto = null) {
    const isEdit = mode === 'edit';
    setText('modalProductoTitle',    isEdit ? 'Editar Producto' : 'Nuevo Producto');
    setText('modalProductoSubtitle', isEdit ? `Editando: ${producto.nombre}` : 'Completa los campos del formulario');

    // Limpiar
    ['productoId','pNombre','pPrecio','pGarantia','pFechaCompra','pDescripcion']
      .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    clearErrors(['pNombre','pMarca','pPrecio']);
    setText('charCount', '0');

    // Poblar select marcas
    const sel = document.getElementById('pMarca');
    sel.innerHTML = `<option value="">— Seleccionar marca —</option>` +
      AppState.marcas.map(m => `<option value="${m.id}" ${isEdit && m.id==producto.idmarca?'selected':''}>${escapeHtml(m.nombremarca)}</option>`).join('');

    if (isEdit) {
      document.getElementById('productoId').value   = producto.id;
      document.getElementById('pNombre').value      = producto.nombre || '';
      document.getElementById('pPrecio').value      = producto.precio || '';
      document.getElementById('pGarantia').value    = producto.garantia || '';
      document.getElementById('pFechaCompra').value = producto.fechacompra || '';
      document.getElementById('pDescripcion').value = producto.descripcion || '';
      setText('charCount', (producto.descripcion||'').length);
    }

    openOverlay('modalProductoOverlay');
  },

  async openEdit(id) {
    try {
      const { data } = await http(`/api/productos/${id}`);
      this._openModal('edit', data);
    } catch (e) {
      showToast('No se pudo cargar el producto: ' + e.message, 'error');
    }
  },

  confirmDel(id, name) {
    DeleteModal.open('producto', id, name, async () => {
      try {
        await http(`/api/productos/${id}`, 'DELETE');
        showToast(`"${name}" eliminado correctamente`, 'success');
        await this.load();
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  },

  async _save() {
    if (!this._validate()) return;

    const id     = document.getElementById('productoId').value;
    const isEdit = !!id;
    const body   = {
      idmarca:     document.getElementById('pMarca').value,
      nombre:      document.getElementById('pNombre').value.trim(),
      precio:      parseFloat(document.getElementById('pPrecio').value),
      garantia:    document.getElementById('pGarantia').value || null,
      descripcion: document.getElementById('pDescripcion').value.trim() || null,
      fechacompra: document.getElementById('pFechaCompra').value || null,
    };

    setLoading('btnSaveProducto','btnSaveText','btnSaveSpinner', true);
    try {
      await http(isEdit ? `/api/productos/${id}` : '/api/productos', isEdit ? 'PUT' : 'POST', body);
      showToast(`Producto ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
      closeOverlay('modalProductoOverlay');
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading('btnSaveProducto','btnSaveText','btnSaveSpinner', false);
    }
  },

  _validate() {
    clearErrors(['pNombre','pMarca','pPrecio']);
    let ok = true;
    if (!document.getElementById('pNombre').value.trim())
      { setError('pNombre','err-pNombre','El nombre es requerido'); ok = false; }
    if (!document.getElementById('pMarca').value)
      { setError('pMarca','err-pMarca','Selecciona una marca'); ok = false; }
    const p = document.getElementById('pPrecio').value;
    if (!p || isNaN(p) || parseFloat(p) <= 0)
      { setError('pPrecio','err-pPrecio','Ingresa un precio válido mayor a 0'); ok = false; }
    return ok;
  },

  /* ── Listeners (se registran solo cuando la vista está en el DOM) ── */
  _bindEvents() {
    document.getElementById('btnNuevoProducto')?.addEventListener('click', () => {
      if (!AppState.marcas.length) {
        showToast('No hay marcas disponibles. Crea una primero.', 'info');
        Router.navigateTo('marcas');
        return;
      }
      this._openModal('new');
    });

    document.getElementById('btnSaveProducto')?.addEventListener('click',  () => this._save());
    document.getElementById('btnCancelProducto')?.addEventListener('click', () => closeOverlay('modalProductoOverlay'));
    document.getElementById('btnCloseModalProducto')?.addEventListener('click', () => closeOverlay('modalProductoOverlay'));
    document.getElementById('btnRefreshProductos')?.addEventListener('click', () => this.load());
    document.getElementById('searchProducto')?.addEventListener('input',  () => this._filter());
    document.getElementById('filterMarca')?.addEventListener('change',    () => this._filter());
    document.getElementById('pDescripcion')?.addEventListener('input', e =>
      setText('charCount', e.target.value.length));
    document.getElementById('modalProductoOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'modalProductoOverlay') closeOverlay('modalProductoOverlay');
    });
  },
};