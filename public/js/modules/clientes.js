'use strict';

const ClientesModule = {
  clientes: [],
  editandoId: null,

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
          <button class="btn-action btn-action-edit"   onclick="ClientesModule.abrirEditar(${c.id})" title="Editar"><i class="bi bi-pencil-fill"></i></button>
          <button class="btn-action btn-action-delete" onclick="ClientesModule.eliminar(${c.id}, '${escapeHtml(c.nombre)}')" title="Eliminar"><i class="bi bi-trash3-fill"></i></button>
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

  /* ── MODAL ── */
  _renderModal() {
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
  },

  _limpiarModal() {
    ['cliNombre','cliDni','cliTelefono','cliEmail','cliDireccion'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('is-invalid'); }
    });
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
    openOverlay('modalCliente');
  },

  async guardar() {
    const nombre    = document.getElementById('cliNombre').value.trim();
    const dni       = document.getElementById('cliDni').value.trim();
    const telefono  = document.getElementById('cliTelefono').value.trim();
    const email     = document.getElementById('cliEmail').value.trim();
    const direccion = document.getElementById('cliDireccion').value.trim();

    clearErrors(['cliNombre','cliDni']);
    let ok = true;
    if (!nombre) { setError('cliNombre','err-cliNombre','El nombre es requerido'); ok = false; }

    if (!ok) return;

    setLoading('btnGuardarCliente','btnGuardarClienteText','btnGuardarClienteSpinner', true);
    try {
      const body = { nombre, dni: dni||null, telefono: telefono||null, email: email||null, direccion: direccion||null };
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
  }
};