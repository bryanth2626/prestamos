/**
 * router.js — Router SPA
 *
 * Responsabilidades:
 *  1. Mantener el registro de rutas (página → archivo HTML + módulo JS)
 *  2. Cargar el HTML de cada vista de forma dinámica (fetch de /views/*.html)
 *  3. Inyectarlo en #pageContainer
 *  4. Llamar al init() del módulo correspondiente
 *  5. Gestionar el estado activo del sidebar
 *
 * Para agregar una nueva página basta con:
 *  a) Crear  public/views/nueva-pagina.html
 *  b) Crear  public/js/modules/nueva-pagina.js  con un init()
 *  c) Registrarla aquí en ROUTES
 *  d) Agregar el <a data-page="nueva-pagina"> en el sidebar del index.html
 */

'use strict';

const ROUTES = {
  dashboard: {
    title:  'Dashboard',
    view:   '/views/dashboard.html',
    module: () => DashboardModule,
  },
  proveedores: {
    title:  'Proveedores',
    view:   '/views/proveedores.html',
    module: () => ProveedoresModule,
  },
  herramientas: {
    title:  'Herramientas',
    view:   '/views/herramientas.html',
    module: () => Herramientasmodule,
  },
  prestamo: {
    title:  'Préstamos',
    view:   '/views/prestamo.html',
    module: () => PrestamosModule,
  },
  devoluciones: {
    title:  'Devoluciones',
    view:   '/views/devoluciones.html',
    module: () => DevolucionesModule,
  },
  clientes: {
    title:  'Clientes',
    view:   '/views/clientes.html',
    module: () => ClientesModule,
  },
};

const viewCache = {};

const Router = {
  currentPage: null,

  async navigateTo(page) {
    const route = ROUTES[page];
    if (!route) { console.warn(`Router: ruta "${page}" no registrada.`); return; }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    setText('topbarTitle', route.title);

    const container = document.getElementById('pageContainer');
    container.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="height:60vh">
        <div class="spinner-custom"></div>
      </div>`;

    try {
      if (!viewCache[page]) {
        const res = await fetch(route.view);
        if (!res.ok) throw new Error(`No se pudo cargar la vista: ${route.view}`);
        viewCache[page] = await res.text();
      }
      container.innerHTML = viewCache[page];

      const mod = route.module();
      if (mod && typeof mod.init === 'function') await mod.init();

      this.currentPage = page;
      this._closeSidebarMobile();
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="padding:80px 20px">
          <i class="bi bi-exclamation-triangle" style="font-size:48px;color:var(--danger);opacity:.5"></i>
          <p class="mt-3">Error al cargar la vista <strong>${page}</strong></p>
          <p style="font-size:12px;color:var(--text-muted)">${err.message}</p>
        </div>`;
      console.error('Router error:', err);
    }
  },

  init() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        Router.navigateTo(item.dataset.page);
      });
    });

    document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('open');
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      this._closeSidebarMobile();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      }
    });
  },

  _closeSidebarMobile() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('open');
  },
};