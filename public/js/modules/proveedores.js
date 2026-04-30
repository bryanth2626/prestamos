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
  }
};