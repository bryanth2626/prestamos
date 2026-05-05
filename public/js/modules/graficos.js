'use strict';

/* ═══════════════════════════════════════════════
   GraficosModule — Chart.js dinámico por módulo
═══════════════════════════════════════════════ */
const GraficosModule = {
  _charts: [],          // instancias activas de Chart.js para destruirlas al cambiar
  _moduloActual: null,

  async init() {
    // Cargar Chart.js si no está disponible
    await this._loadChartJs();
    this._bindEvents();
    // Resetear vista
    this._mostrarEstado('empty');
  },

  // ── Cargar Chart.js dinámicamente ──────────────────────────
  _loadChartJs() {
    return new Promise((resolve) => {
      if (window.Chart) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });
  },

  // ── Bind eventos ───────────────────────────────────────────
  _bindEvents() {
    document.getElementById('selectorModuloGrafico')
      ?.addEventListener('change', async (e) => {
        const modulo = e.target.value;
        if (!modulo) { this._mostrarEstado('empty'); return; }
        await this.cargarModulo(modulo);
      });

    document.getElementById('btnRefreshGraficos')
      ?.addEventListener('click', async () => {
        if (this._moduloActual) await this.cargarModulo(this._moduloActual);
      });
  },

  // ── Lógica principal ───────────────────────────────────────
  async cargarModulo(modulo) {
    this._moduloActual = modulo;
    this._mostrarEstado('loading');
    this._destruirCharts();

    try {
      switch (modulo) {
        case 'prestamos':    await this._renderPrestamos();    break;
        case 'clientes':     await this._renderClientes();     break;
        case 'devoluciones': await this._renderDevoluciones(); break;
        case 'herramientas': await this._renderHerramientas(); break;
        case 'proveedores':  await this._renderProveedores();  break;
      }
      this._mostrarEstado('charts');
      document.getElementById('btnRefreshGraficos').style.display = '';
    } catch (err) {
      console.error('GraficosModule error:', err);
      showToast('Error al cargar datos del módulo', 'error');
      this._mostrarEstado('empty');
    }
  },

  // ── MÓDULO: PRÉSTAMOS ──────────────────────────────────────
  async _renderPrestamos() {
    const { data } = await http('/api/prestamos');

    // KPIs
    const total    = data.length;
    const activos  = data.filter(p => p.estado === 'activo').length;
    const devueltos= data.filter(p => p.estado === 'devuelto').length;
    const vencidos = data.filter(p => p.estado === 'vencido').length;

    this._renderKpis([
      { label: 'Total Préstamos', value: total,     icon: 'bi-box-arrow-right', color: 'var(--primary)' },
      { label: 'Activos',         value: activos,   icon: 'bi-clock-fill',       color: '#f59e0b' },
      { label: 'Devueltos',       value: devueltos, icon: 'bi-check-circle-fill',color: '#10b981' },
      { label: 'Vencidos',        value: vencidos,  icon: 'bi-exclamation-triangle-fill', color: '#ef4444' },
    ]);

    // Grid de gráficos
    document.getElementById('graficosGrid').innerHTML = `
      <div class="grafico-card">
        <div class="grafico-card-title"><i class="bi bi-pie-chart-fill me-2"></i>Estado de Préstamos</div>
        <div class="grafico-canvas-wrap"><canvas id="chartPresEstado"></canvas></div>
      </div>
      <div class="grafico-card">
        <div class="grafico-card-title"><i class="bi bi-bar-chart-fill me-2"></i>Préstamos por Mes</div>
        <div class="grafico-canvas-wrap"><canvas id="chartPresMes"></canvas></div>
      </div>
      <div class="grafico-card grafico-card-wide">
        <div class="grafico-card-title"><i class="bi bi-tools me-2"></i>Herramientas Más Prestadas</div>
        <div class="grafico-canvas-wrap"><canvas id="chartPresHerramientas"></canvas></div>
      </div>
    `;

    // Gráfico 1: Dona — estados
    this._crearChart('chartPresEstado', 'doughnut', {
      labels: ['Activo', 'Devuelto', 'Vencido'],
      datasets: [{
        data: [activos, devueltos, vencidos],
        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    }, { plugins: { legend: { position: 'bottom' } } });

    // Gráfico 2: Barras — préstamos por mes
    const porMes = this._agruparPorMes(data, 'fecha_prestamo');
    this._crearChart('chartPresMes', 'bar', {
      labels: porMes.labels,
      datasets: [{
        label: 'Préstamos',
        data: porMes.counts,
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 6,
        borderSkipped: false,
      }]
    });

    // Gráfico 3: Horizontal — herramientas más prestadas
    const herrConteo = {};
    data.forEach(p => {
      (p.detalle || []).forEach(d => {
        const nombre = d.nombre_herramienta || `Herramienta ${d.idherramienta}`;
        herrConteo[nombre] = (herrConteo[nombre] || 0) + 1;
      });
    });
    const topHerr = Object.entries(herrConteo)
      .sort((a,b) => b[1]-a[1]).slice(0,8);

    this._crearChart('chartPresHerramientas', 'bar', {
      labels: topHerr.map(h => h[0]),
      datasets: [{
        label: 'Veces prestada',
        data: topHerr.map(h => h[1]),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderRadius: 6,
      }]
    }, { indexAxis: 'y', plugins: { legend: { display: false } } });
  },

  // ── MÓDULO: CLIENTES ───────────────────────────────────────
  async _renderClientes() {
    const { data } = await http('/api/clientes');

    this._renderKpis([
      { label: 'Total Clientes', value: data.length, icon: 'bi-people-fill', color: 'var(--primary)' },
      { label: 'Con DNI',  value: data.filter(c => c.dni).length,   icon: 'bi-card-text',   color: '#6366f1' },
      { label: 'Sin DNI',  value: data.filter(c => !c.dni).length,  icon: 'bi-person-dash', color: '#f59e0b' },
    ]);

    document.getElementById('graficosGrid').innerHTML = `
      <div class="grafico-card">
        <div class="grafico-card-title"><i class="bi bi-pie-chart-fill me-2"></i>Clientes con / sin DNI</div>
        <div class="grafico-canvas-wrap"><canvas id="chartCliDni"></canvas></div>
      </div>
      <div class="grafico-card grafico-card-wide">
        <div class="grafico-card-title"><i class="bi bi-bar-chart-fill me-2"></i>Clientes Registrados por Mes</div>
        <div class="grafico-canvas-wrap"><canvas id="chartCliMes"></canvas></div>
      </div>
    `;

    this._crearChart('chartCliDni', 'doughnut', {
      labels: ['Con DNI', 'Sin DNI'],
      datasets: [{
        data: [data.filter(c=>c.dni).length, data.filter(c=>!c.dni).length],
        backgroundColor: ['#6366f1','#f59e0b'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    }, { plugins: { legend: { position: 'bottom' } } });

    const porMes = this._agruparPorMes(data, 'created_at');
    this._crearChart('chartCliMes', 'line', {
      labels: porMes.labels,
      datasets: [{
        label: 'Clientes nuevos',
        data: porMes.counts,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#6366f1',
      }]
    });
  },

  // ── MÓDULO: DEVOLUCIONES ───────────────────────────────────
  async _renderDevoluciones() {
    const { data } = await http('/api/devoluciones');

    const bueno   = data.filter(d => d.estado_devolucion === 'bueno').length;
    const regular = data.filter(d => d.estado_devolucion === 'regular').length;
    const danado  = data.filter(d => d.estado_devolucion === 'dañado' || d.estado_devolucion === 'danado').length;

    this._renderKpis([
      { label: 'Total Devoluciones', value: data.length, icon: 'bi-arrow-return-left', color: 'var(--primary)' },
      { label: 'Buen estado',  value: bueno,   icon: 'bi-check-circle-fill',         color: '#10b981' },
      { label: 'Regular',      value: regular, icon: 'bi-dash-circle-fill',           color: '#f59e0b' },
      { label: 'Dañado',       value: danado,  icon: 'bi-exclamation-triangle-fill',  color: '#ef4444' },
    ]);

    document.getElementById('graficosGrid').innerHTML = `
      <div class="grafico-card">
        <div class="grafico-card-title"><i class="bi bi-pie-chart-fill me-2"></i>Estado de Devoluciones</div>
        <div class="grafico-canvas-wrap"><canvas id="chartDevEstado"></canvas></div>
      </div>
      <div class="grafico-card grafico-card-wide">
        <div class="grafico-card-title"><i class="bi bi-bar-chart-fill me-2"></i>Devoluciones por Mes</div>
        <div class="grafico-canvas-wrap"><canvas id="chartDevMes"></canvas></div>
      </div>
    `;

    this._crearChart('chartDevEstado', 'pie', {
      labels: ['Bueno', 'Regular', 'Dañado'],
      datasets: [{
        data: [bueno, regular, danado],
        backgroundColor: ['#10b981','#f59e0b','#ef4444'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    }, { plugins: { legend: { position: 'bottom' } } });

    const porMes = this._agruparPorMes(data, 'fecha_devolucion');
    this._crearChart('chartDevMes', 'bar', {
      labels: porMes.labels,
      datasets: [{
        label: 'Devoluciones',
        data: porMes.counts,
        backgroundColor: 'rgba(239,68,68,0.65)',
        borderRadius: 6,
      }]
    });
  },

  // ── MÓDULO: HERRAMIENTAS ───────────────────────────────────
  async _renderHerramientas() {
    const { data } = await http('/api/herramientas');

    const disponibles = data.filter(h => h.estado === 'disponible').length;
    const prestadas   = data.filter(h => h.estado === 'prestada').length;
    const bajas       = data.filter(h => h.estado === 'baja').length;

    this._renderKpis([
      { label: 'Total Herramientas', value: data.length,    icon: 'bi-tools',            color: 'var(--primary)' },
      { label: 'Disponibles',        value: disponibles,    icon: 'bi-check-circle-fill', color: '#10b981' },
      { label: 'Prestadas',          value: prestadas,      icon: 'bi-box-arrow-right',   color: '#f59e0b' },
      { label: 'De Baja',            value: bajas,          icon: 'bi-x-circle-fill',     color: '#ef4444' },
    ]);

    document.getElementById('graficosGrid').innerHTML = `
      <div class="grafico-card">
        <div class="grafico-card-title"><i class="bi bi-pie-chart-fill me-2"></i>Estado de Herramientas</div>
        <div class="grafico-canvas-wrap"><canvas id="chartHerrEstado"></canvas></div>
      </div>
      <div class="grafico-card grafico-card-wide">
        <div class="grafico-card-title"><i class="bi bi-bar-chart-fill me-2"></i>Herramientas por Marca</div>
        <div class="grafico-canvas-wrap"><canvas id="chartHerrMarca"></canvas></div>
      </div>
    `;

    this._crearChart('chartHerrEstado', 'doughnut', {
      labels: ['Disponible', 'Prestada', 'De Baja'],
      datasets: [{
        data: [disponibles, prestadas, bajas],
        backgroundColor: ['#10b981','#f59e0b','#ef4444'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    }, { plugins: { legend: { position: 'bottom' } } });

    // Agrupar por marca
    const marcas = {};
    data.forEach(h => {
      const m = h.marca || 'Sin marca';
      marcas[m] = (marcas[m] || 0) + 1;
    });
    const topMarcas = Object.entries(marcas).sort((a,b) => b[1]-a[1]).slice(0,8);
    const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

    this._crearChart('chartHerrMarca', 'bar', {
      labels: topMarcas.map(m => m[0]),
      datasets: [{
        label: 'Cantidad',
        data: topMarcas.map(m => m[1]),
        backgroundColor: colors.slice(0, topMarcas.length),
        borderRadius: 6,
      }]
    }, { plugins: { legend: { display: false } } });
  },

  // ── MÓDULO: PROVEEDORES ────────────────────────────────────
  async _renderProveedores() {
    const { data } = await http('/api/proveedores');

    this._renderKpis([
      { label: 'Total Proveedores', value: data.length, icon: 'bi-building', color: 'var(--primary)' },
      { label: 'Con RUC',  value: data.filter(p => p.ruc).length,   icon: 'bi-file-text-fill', color: '#6366f1' },
      { label: 'Con Email',value: data.filter(p => p.email).length,  icon: 'bi-envelope-fill',  color: '#10b981' },
    ]);

    document.getElementById('graficosGrid').innerHTML = `
      <div class="grafico-card grafico-card-wide">
        <div class="grafico-card-title"><i class="bi bi-pie-chart-fill me-2"></i>Datos de contacto completados</div>
        <div class="grafico-canvas-wrap"><canvas id="chartProvContacto"></canvas></div>
      </div>
    `;

    this._crearChart('chartProvContacto', 'bar', {
      labels: ['Con RUC', 'Con Email', 'Con Teléfono'],
      datasets: [{
        label: 'Proveedores',
        data: [
          data.filter(p => p.ruc).length,
          data.filter(p => p.email).length,
          data.filter(p => p.telefono).length,
        ],
        backgroundColor: ['#6366f1','#10b981','#f59e0b'],
        borderRadius: 6,
      }]
    }, { plugins: { legend: { display: false } } });
  },

  // ── HELPERS ────────────────────────────────────────────────

  /** Agrupa registros por mes (campo fecha ISO string) */
  _agruparPorMes(data, campo) {
    const meses = {};
    const nombresM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    data.forEach(item => {
      const val = item[campo];
      if (!val) return;
      const d = new Date(val);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      meses[key] = (meses[key] || 0) + 1;
    });
    const sorted = Object.keys(meses).sort();
    return {
      labels: sorted.map(k => {
        const [y, m] = k.split('-');
        return `${nombresM[parseInt(m)-1]} ${y}`;
      }),
      counts: sorted.map(k => meses[k]),
    };
  },

  /** Crea y registra un Chart.js */
  _crearChart(canvasId, tipo, chartData, extraOpts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const defaultOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#333' } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: tipo === 'doughnut' || tipo === 'pie' ? {} : {
        x: { ticks: { color: '#888' }, grid: { color: 'rgba(0,0,0,0.06)' } },
        y: { ticks: { color: '#888' }, grid: { color: 'rgba(0,0,0,0.06)' }, beginAtZero: true },
      },
    };
    const opts = this._mergeDeep(defaultOpts, extraOpts);
    const chart = new Chart(canvas, { type: tipo, data: chartData, options: opts });
    this._charts.push(chart);
    return chart;
  },

  /** Destruye charts activos para evitar memory leaks */
  _destruirCharts() {
    this._charts.forEach(c => c.destroy());
    this._charts = [];
  },

  /** Merge profundo de opciones */
  _mergeDeep(target, source) {
    const out = Object.assign({}, target);
    Object.keys(source).forEach(k => {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        out[k] = this._mergeDeep(target[k] || {}, source[k]);
      } else {
        out[k] = source[k];
      }
    });
    return out;
  },

  /** Muestra / oculta secciones de la vista */
  _mostrarEstado(estado) {
    document.getElementById('graficosEmptyState').style.display  = estado === 'empty'   ? '' : 'none';
    document.getElementById('graficosLoader').style.display       = estado === 'loading' ? '' : 'none';
    document.getElementById('graficosContainer').style.display    = estado === 'charts'  ? '' : 'none';
    if (estado !== 'charts') {
      document.getElementById('btnRefreshGraficos').style.display = 'none';
    }
  },

  /** Renderiza las tarjetas KPI */
  _renderKpis(kpis) {
    document.getElementById('graficosKpis').innerHTML = kpis.map(k => `
      <div class="grafico-kpi-card">
        <div class="grafico-kpi-icon" style="color:${k.color}">
          <i class="bi ${k.icon}"></i>
        </div>
        <div>
          <div class="grafico-kpi-value">${k.value}</div>
          <div class="grafico-kpi-label">${k.label}</div>
        </div>
      </div>
    `).join('');
  },
  /** Navega a gráficos con el módulo preseleccionado */
  _verGraficoRapido(modulo) {
    Router.navigateTo('graficos');
    setTimeout(() => {
      const sel = document.getElementById('selectorModuloGrafico');
      if (sel) {
        sel.value = modulo;
        sel.dispatchEvent(new Event('change'));
      }
    }, 400);
  },
};