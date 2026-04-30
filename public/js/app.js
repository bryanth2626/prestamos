'use strict';

/* ════════════════════════════════════════════
   ESTADO GLOBAL COMPARTIDO
════════════════════════════════════════════ */
const AppState = {
  proveedores: [],
  herramientas: [],
  prestamos: [],
  clientes: [],
  devoluciones: [],
  deleteTarget: { type: null, id: null, name: null, onConfirm: null },
};

/* ════════════════════════════════════════════
   MODAL DE ELIMINACIÓN (compartido)
════════════════════════════════════════════ */
const DeleteModal = {

  render() {
    document.getElementById('modalsContainer').innerHTML = `
      <div class="modal-overlay" id="modalDeleteOverlay">
        <div class="modal-panel modal-sm">
          <div class="modal-header-custom">
            <div class="modal-title-custom text-danger">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>Confirmar Eliminación
            </div>
            <button class="btn-modal-close" id="btnCloseDelete"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body-custom">
            <p class="text-muted mb-0" id="deleteMessage">
              ¿Estás seguro de que deseas eliminar este registro?
            </p>
          </div>
          <div class="modal-footer-custom">
            <button class="btn-cancel"        id="btnCancelDelete">Cancelar</button>
            <button class="btn-danger-action" id="btnConfirmDelete">
              <i class="bi bi-trash3-fill me-1"></i> Eliminar
            </button>
          </div>
        </div>
      </div>`;

    document.getElementById('btnConfirmDelete').addEventListener('click', () => this._execute());
    document.getElementById('btnCancelDelete').addEventListener('click',  () => closeOverlay('modalDeleteOverlay'));
    document.getElementById('btnCloseDelete').addEventListener('click',   () => closeOverlay('modalDeleteOverlay'));
    document.getElementById('modalDeleteOverlay').addEventListener('click', e => {
      if (e.target.id === 'modalDeleteOverlay') closeOverlay('modalDeleteOverlay');
    });
  },

  open(type, id, name, onConfirm) {
    AppState.deleteTarget = { type, id, name, onConfirm };
    const msgs = {
      cliente:     `¿Eliminar al cliente "<strong>${escapeHtml(name)}</strong>"? Esta acción no se puede deshacer.`,
      proveedor:   `¿Eliminar el proveedor "<strong>${escapeHtml(name)}</strong>"? Solo se puede si no tiene herramientas asociadas.`,
      herramienta: `¿Eliminar la herramienta "<strong>${escapeHtml(name)}</strong>"? Esta acción no se puede deshacer.`,
      prestamo:    `¿Eliminar el "<strong>${escapeHtml(name)}</strong>"? Las herramientas asociadas volverán a estar disponibles.`,
      devolucion:  `¿Eliminar la "<strong>${escapeHtml(name)}</strong>"? La herramienta volverá al estado prestado.`,
    };
    document.getElementById('deleteMessage').innerHTML = msgs[type] || '¿Confirmar eliminación?';
    openOverlay('modalDeleteOverlay');
  },

  async _execute() {
    const { onConfirm } = AppState.deleteTarget;
    closeOverlay('modalDeleteOverlay');
    if (typeof onConfirm === 'function') await onConfirm();
  },
};

/* ════════════════════════════════════════════
   ARRANQUE
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  DeleteModal.render();
  Router.init();
  Router.navigateTo('dashboard');
});