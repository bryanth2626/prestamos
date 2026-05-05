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
}
};