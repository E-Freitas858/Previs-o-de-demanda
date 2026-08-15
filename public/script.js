const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const demandForm = document.getElementById('demandForm');
const demandTableBody = document.getElementById('demandTableBody');
const salesForecastChart = document.getElementById('salesForecastChart');
const tempChart = document.getElementById('tempChart');
const horizonRange = document.getElementById('horizonRange');

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getWeatherAdjustment(date) {
  const weatherMap = {
    0: 1.10,
    1: 0.98,
    2: 0.99,
    3: 1.02,
    4: 1.05,
    5: 1.18,
    6: 1.25,
  };

  return weatherMap[date.getDay()] || 1;
}

function buildProjectedDemandas(daysCount = 7) {
  const today = new Date();
  const historicBase = [1650, 1780, 1860, 1940, 2090, 2280, 2410, 2550, 2680, 2790, 2860, 2950, 3120, 3240];
  const items = [];

  for (let index = 1; index <= daysCount; index += 1) {
    const date = addDays(today, index);
    const weekday = date.getDay();
    const seasonalFactor = weekday === 5 ? 1.22 : weekday === 6 ? 1.28 : weekday === 0 ? 1.12 : 1.0;
    const trendFactor = 1 + index * 0.035;
    const historicalFactor = historicBase[(index - 1) % historicBase.length] / 2200;
    const weatherFactor = getWeatherAdjustment(date);
    const baseRevenue = Math.round((historicBase[(index - 1) % historicBase.length] * trendFactor * seasonalFactor * weatherFactor * 1.18));
    const itens = Math.max(120, Math.round(baseRevenue / 18 + (weekday === 5 ? 26 : weekday === 6 ? 32 : 12)));
    const vendas = Math.max(38, Math.round(itens / 2.5 + (weekday === 5 ? 10 : weekday === 6 ? 12 : 4)));
    const temperatura = 22 + (index % 4) + (weekday === 5 || weekday === 6 ? 5 : 0);

    items.push({
      data: date,
      receita: baseRevenue,
      itens,
      vendas,
      temperatura,
      historicalFactor,
      seasonalFactor,
      weatherFactor,
    });
  }

  return items;
}

function ensureTooltip() {
  let tooltip = document.getElementById('chartTooltip');

  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chartTooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.background = 'rgba(20, 14, 13, 0.94)';
    tooltip.style.color = '#f7efe9';
    tooltip.style.border = '1px solid rgba(240, 180, 93, 0.35)';
    tooltip.style.borderRadius = '10px';
    tooltip.style.padding = '8px 10px';
    tooltip.style.fontSize = '12px';
    tooltip.style.boxShadow = '0 10px 24px rgba(0,0,0,0.2)';
    tooltip.style.zIndex = '9999';
    document.body.appendChild(tooltip);
  }

  return tooltip;
}

function handleChartHover(event, label, value) {
  const tooltip = ensureTooltip();
  tooltip.innerHTML = `${label}<br><strong>${value}</strong>`;
  tooltip.style.display = 'block';
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

function hideTooltip() {
  const tooltip = document.getElementById('chartTooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

function hasDayFilter() {
  const dateInput = document.getElementById('daySearchInput');
  return Boolean(dateInput && dateInput.value);
}

function applyDayFilterMode() {
  const simulator = document.querySelector('.simulator.panel');
  const active = hasDayFilter();

  if (simulator) {
    simulator.classList.toggle('day-filter-active', active);
  }

  document.body.classList.toggle('day-mode', active);
}

function updateForecastSummary() {
  const dateInput = document.getElementById('daySearchInput');
  const selectedDate = dateInput && dateInput.value ? toISODate(new Date(`${dateInput.value}T12:00:00`)) : null;

  const forecastDaysLabel = document.getElementById('forecastDaysLabel');
  const forecastTotalValue = document.getElementById('forecastTotalValue');
  const forecastTrendText = document.getElementById('forecastTrendText');
  const reorderValue = document.getElementById('reorderValue');
  const reorderDelta = document.getElementById('reorderDelta');
  const accuracyValue = document.getElementById('accuracyValue');
  const accuracyDelta = document.getElementById('accuracyDelta');
  const horizonValue = document.getElementById('horizonValue');
  const historicalRevenueValue = document.getElementById('historicalRevenueValue');
  const historicalRevenueMeta = document.getElementById('historicalRevenueMeta');

  if (selectedDate) {
    const item = buildProjectedDemandas(Number(horizonRange?.value || 7)).find((entry) => toISODate(entry.data) === selectedDate) || getVisibleDemandas()[0];

    if (item) {
      if (forecastDaysLabel) {
        forecastDaysLabel.textContent = '1 dia';
      }

      if (forecastTotalValue) {
        forecastTotalValue.textContent = formatCurrency(item.receita);
      }

      if (forecastTrendText) {
        forecastTrendText.textContent = 'visão isolada do dia';
      }

      if (reorderValue) {
        reorderValue.textContent = item.itens.toLocaleString('pt-BR');
      }

      if (reorderDelta) {
        reorderDelta.textContent = 'sem outros dias';
      }

      if (accuracyValue) {
        accuracyValue.textContent = 'R² 0,99';
      }

      if (accuracyDelta) {
        accuracyDelta.textContent = 'foco do dia';
      }

      if (historicalRevenueValue) {
        historicalRevenueValue.textContent = formatCurrency(item.receita);
      }

      if (historicalRevenueMeta) {
        historicalRevenueMeta.textContent = '1 dia selecionado';
      }

      if (horizonValue) {
        horizonValue.textContent = '1 dia';
      }
    }

    if (horizonRange) {
      horizonRange.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.08) 100%)';
    }

    return;
  }

  const horizon = Number(horizonRange?.value || 7);
  const items = buildProjectedDemandas(horizon);
  const totalReceita = items.reduce((sum, item) => sum + item.receita, 0);
  const totalItens = items.reduce((sum, item) => sum + item.itens, 0);
  const mediaReceita = totalReceita / Math.max(items.length, 1);
  const baselineReceita = 4400;
  const deltaPercent = ((mediaReceita - baselineReceita) / baselineReceita) * 100;
  const precision = Math.min(0.99, Math.max(0.85, 0.92 + horizon * 0.004));
  const reorderQtd = Math.round(totalItens * 0.62);

  if (forecastDaysLabel) {
    forecastDaysLabel.textContent = `${horizon} dias`;
  }

  if (forecastTotalValue) {
    forecastTotalValue.textContent = formatCurrency(totalReceita);
  }

  if (forecastTrendText) {
    forecastTrendText.textContent = `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}% vs. média`;
  }

  if (reorderValue) {
    reorderValue.textContent = reorderQtd.toLocaleString('pt-BR');
  }

  if (reorderDelta) {
    reorderDelta.textContent = `${reorderQtd > 0 ? '+' : ''}${Math.round(reorderQtd * 0.14).toLocaleString('pt-BR')} itens`;
  }

  if (accuracyValue) {
    accuracyValue.textContent = `R² ${precision.toFixed(2)}`;
  }

  if (accuracyDelta) {
    accuracyDelta.textContent = `erro médio ${(100 - precision * 100).toFixed(1)}%`;
  }

  if (historicalRevenueValue) {
    historicalRevenueValue.textContent = formatCurrency(totalReceita * 0.8);
  }

  if (historicalRevenueMeta) {
    historicalRevenueMeta.textContent = `${horizon} dias úteis`;
  }

  if (horizonValue) {
    horizonValue.textContent = `${horizon} dias`;
  }

  if (horizonRange) {
    const min = Number(horizonRange.min);
    const max = Number(horizonRange.max);
    const percent = ((horizon - min) / (max - min || 1)) * 100;
    horizonRange.style.background = `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${percent}%, rgba(255,255,255,0.08) ${percent}%, rgba(255,255,255,0.08) 100%)`;
  }
}

function toISODate(date) {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 10);
}

function getVisibleDemandas() {
  const horizon = Number(horizonRange?.value || 7);
  const items = buildProjectedDemandas(horizon);
  const dateInput = document.getElementById('daySearchInput');
  const selectedDate = dateInput && dateInput.value ? toISODate(new Date(`${dateInput.value}T12:00:00`)) : null;

  if (!selectedDate) {
    return items;
  }

  return items.filter((item) => toISODate(item.data) === selectedDate);
}

function updateDaySummary() {
  const dayDetailSummary = document.getElementById('dayDetailSummary');
  const dateInput = document.getElementById('daySearchInput');

  if (!dayDetailSummary) {
    return;
  }

  if (!dateInput || !dateInput.value) {
    dayDetailSummary.textContent = 'Exibindo todos os dias do horizonte.';
    return;
  }

  const selectedDate = new Date(`${dateInput.value}T12:00:00`);
  const label = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' });
  dayDetailSummary.textContent = `Dados filtrados para: ${label}.`;
}

function renderWeekdayBars() {
  const weekdayContainer = document.querySelector('.bars');
  if (!weekdayContainer) {
    return;
  }

  const horizon = Number(horizonRange?.value || 7);
  const dayInput = document.getElementById('daySearchInput');
  const selectedDate = dayInput && dayInput.value ? toISODate(new Date(`${dayInput.value}T12:00:00`)) : null;
  const baseItems = buildProjectedDemandas(horizon);
  const items = selectedDate ? baseItems.filter((item) => toISODate(item.data) === selectedDate) : baseItems;

  if (!items.length) {
    weekdayContainer.innerHTML = '<div class="weekday-empty">Sem dados para esse dia.</div>';
    return;
  }

  const maxRevenue = Math.max(...items.map((item) => item.receita), 1);

  weekdayContainer.innerHTML = items.map((item) => {
    const dateLabel = item.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dayLabel = item.data.toLocaleDateString('pt-BR', { weekday: 'short' });
    const height = Math.max(18, (item.receita / maxRevenue) * 100);

    return `
      <button class="bar-wrap" data-date="${toISODate(item.data)}" type="button" title="${dateLabel} • ${item.receita}">
        <span class="day-label">${dayLabel}</span>
        <div class="bar pink" style="height: ${height}%" data-value="Receita: ${formatCurrency(item.receita)} • ${dateLabel}"></div>
        <span class="bar-value">${formatCurrency(Math.round(item.receita))}</span>
      </button>
    `;
  }).join('');

  weekdayContainer.querySelectorAll('.bar-wrap').forEach((button) => {
    const bar = button.querySelector('.bar');
    if (!bar) {
      return;
    }

    button.addEventListener('mousemove', (event) => {
      handleChartHover(event, `${button.dataset.date}`, `${bar.dataset.value}`);
    });
    button.addEventListener('mouseleave', hideTooltip);
    button.addEventListener('click', () => {
      const dateInput = document.getElementById('daySearchInput');
      if (dateInput) {
        dateInput.value = button.dataset.date;
      }
      renderDashboard();
    });
  });
}

function renderCategoryBreakdown() {
  const categoryList = document.getElementById('categoryList');
  if (!categoryList) {
    return;
  }

  const visibleItems = getVisibleDemandas();
  const selectedItem = visibleItems[0] || buildProjectedDemandas(Number(horizonRange?.value || 7))[0];
  const weekday = selectedItem ? selectedItem.data.toLocaleDateString('pt-BR', { weekday: 'long' }) : 'dia selecionado';
  const totalRevenue = visibleItems.reduce((sum, item) => sum + item.receita, 0) || selectedItem.receita || 1;
  const categoryWeights = {
    Cervejas: 0.44,
    Vinhos: 0.27,
    Destilados: 0.18,
    Petiscos: 0.11,
  };

  const items = Array.from(categoryList.querySelectorAll('.category-item'));

  items.forEach((itemElement) => {
    const category = itemElement.dataset.category;
    const revenue = totalRevenue * (categoryWeights[category] || 0.1);
    const percent = Math.max(8, Math.min(100, ((categoryWeights[category] || 0.1) * 100)));
    const bar = itemElement.querySelector('.cat-bar i');
    const valueLabel = itemElement.querySelector('strong');

    if (bar) {
      bar.style.width = `${percent}%`;
    }

    if (valueLabel) {
      valueLabel.textContent = `${Math.round(categoryWeights[category] * 100)}%`;
    }

    itemElement.setAttribute('data-value', `Categoria: ${category} • Faturamento: ${formatCurrency(revenue)}`);
    itemElement.onmousemove = (event) => {
      handleChartHover(event, `${category}`, `Faturamento: ${formatCurrency(revenue)}`);
    };
    itemElement.onmouseleave = hideTooltip;
  });
}

function renderTableRows() {
  if (!demandTableBody) {
    return;
  }

  const rows = getVisibleDemandas();
  if (!rows.length) {
    demandTableBody.innerHTML = `
      <tr>
        <td colspan="6">Nenhum dado encontrado para a data selecionada.</td>
      </tr>
    `;
    return;
  }

  demandTableBody.innerHTML = rows
    .map((item) => {
      const dia = item.data.toLocaleDateString('pt-BR', { weekday: 'short' });
      const data = item.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `
        <tr>
          <td>${data}</td>
          <td>${dia}</td>
          <td>${formatCurrency(item.receita)}</td>
          <td>${item.itens}</td>
          <td>${item.vendas}</td>
          <td>${formatCurrency(item.receita / 12)}</td>
        </tr>
      `;
    })
    .join('');
}

function buildSmoothPath(points) {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlX1 = previous.x + (current.x - previous.x) * 0.5;
    const controlY1 = previous.y;
    const controlX2 = current.x - (current.x - previous.x) * 0.5;
    const controlY2 = current.y;

    path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${current.x} ${current.y}`;
  }

  return path;
}

function renderSalesChart() {
  if (!salesForecastChart) {
    return;
  }

  const series = getVisibleDemandas().map((item) => ({
    dia: item.data.toLocaleDateString('pt-BR', { weekday: 'short' }),
    value: item.receita,
    temperatura: item.temperatura,
    data: item.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }));

  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 42 };
  const maxValue = Math.max(...series.map((item) => item.value), 6000);
  const xStep = (width - padding.left - padding.right) / Math.max(series.length - 1, 1);

  const points = series.map((item, index) => {
    const x = padding.left + index * xStep;
    const y = height - padding.bottom - (item.value / maxValue) * (height - padding.top - padding.bottom);
    return { ...item, x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = maxValue - (maxValue / 4) * i;
    const y = height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom);
    return { value, y };
  });

  const grid = yTicks.map((tick) => `
    <g>
      <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4 6" />
      <text x="${padding.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="10" fill="#a48177">${Math.round(tick.value / 1000)}k</text>
    </g>
  `).join('');

  const verticalGrid = points.map((point) => `
    <line x1="${point.x}" y1="${padding.top}" x2="${point.x}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 8" />
  `).join('');

  const labelsMarkup = series.map((item, index) => {
    const x = padding.left + index * xStep;
    return `<text x="${x}" y="${height - 8}" font-size="10" fill="#a48177" text-anchor="middle">${item.dia}</text>`;
  }).join('');

  salesForecastChart.innerHTML = `
    <defs>
      <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#d96f6d" stop-opacity="0.38" />
        <stop offset="100%" stop-color="#d96f6d" stop-opacity="0.05" />
      </linearGradient>
    </defs>
    <g>
      ${grid}
      ${verticalGrid}
      <path d="${areaPath}" fill="url(#salesFill)" />
      <path d="${linePath}" fill="none" stroke="#d96f6d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${points.map((point) => `
        <g>
          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="4.5"
            fill="#f0b45d"
            stroke="#d96f6d"
            stroke-width="2"
            data-label="${point.data} • ${point.dia}"
            data-value="Receita: ${formatCurrency(point.value)} • Temp. máx.: ${point.temperatura.toFixed(1)}°C"
          ></circle>
        </g>
      `).join('')}
      ${labelsMarkup}
    </g>
  `;

  salesForecastChart.querySelectorAll('circle').forEach((circle) => {
    circle.addEventListener('mousemove', (event) => {
      handleChartHover(event, circle.dataset.label, circle.dataset.value);
    });
    circle.addEventListener('mouseleave', hideTooltip);
  });
}

function renderTemperatureChart() {
  if (!tempChart) {
    return;
  }

  const pointsData = getVisibleDemandas().map((item) => ({
    dia: item.data.toLocaleDateString('pt-BR', { weekday: 'short' }),
    value: item.temperatura,
    receita: item.receita,
    data: item.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }));

  const width = 760;
  const height = 180;
  const padding = { top: 12, right: 18, bottom: 26, left: 38 };
  const max = Math.max(...pointsData.map((point) => point.value), 30);
  const min = Math.min(...pointsData.map((point) => point.value), 15);
  const xStep = (width - padding.left - padding.right) / Math.max(pointsData.length - 1, 1);

  const points = pointsData.map((point, index) => {
    const x = padding.left + index * xStep;
    const y = height - padding.bottom - ((point.value - min) / (max - min || 1)) * (height - padding.top - padding.bottom);
    return { ...point, x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const value = max - ((max - min) / 3) * i;
    const y = height - padding.bottom - ((value - min) / (max - min || 1)) * (height - padding.top - padding.bottom);
    return { value, y };
  });

  const grid = yTicks.map((tick) => `
    <g>
      <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4 6" />
      <text x="${padding.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="10" fill="#a48177">${tick.value.toFixed(0)}°</text>
    </g>
  `).join('');

  const verticalGrid = points.map((point) => `
    <line x1="${point.x}" y1="${padding.top}" x2="${point.x}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 8" />
  `).join('');

  tempChart.innerHTML = `
    <defs>
      <linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#8ad3b3" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#8ad3b3" stop-opacity="0.04" />
      </linearGradient>
    </defs>
    <g>
      ${grid}
      ${verticalGrid}
      <path d="${areaPath}" fill="url(#tempFill)" />
      <path d="${linePath}" fill="none" stroke="#8ad3b3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${points.map((point) => `
        <g>
          <circle
            cx="${point.x}"
            cy="${point.y}"
            r="3.8"
            fill="#8ad3b3"
            data-label="${point.data} • ${point.dia}"
            data-value="Temp. máx.: ${point.value.toFixed(1)}°C • Receita: ${formatCurrency(point.receita)}"
          />
        </g>
      `).join('')}
    </g>
  `;

  tempChart.querySelectorAll('circle').forEach((circle) => {
    circle.addEventListener('mousemove', (event) => {
      handleChartHover(event, circle.dataset.label, circle.dataset.value);
    });
    circle.addEventListener('mouseleave', hideTooltip);
  });
}

function renderDashboard() {
  applyDayFilterMode();
  updateDaySummary();
  updateForecastSummary();
  renderWeekdayBars();
  renderCategoryBreakdown();
  renderTableRows();
  renderSalesChart();
  renderTemperatureChart();
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = (data && data.message) || (data && data.raw) || 'Erro na requisição.';
    throw new Error(message);
  }

  return data === null ? {} : data;
}

async function checkSession() {
  try {
    const data = await apiFetch('/api/session');

    if (data.ok && data.user) {
      loginView?.classList.add('hidden');
      dashboardView?.classList.remove('hidden');
      renderDashboard();
      return;
    }
  } catch (error) {
    console.error(error);
  }

  loginView?.classList.remove('hidden');
  dashboardView?.classList.add('hidden');
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  const username = document.getElementById('username')?.value.trim();
  const password = document.getElementById('password')?.value.trim();

  try {
    const data = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.ok) {
      await checkSession();
    }
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await apiFetch('/api/logout', { method: 'POST' });
    await checkSession();
  } catch (error) {
    console.error(error);
  }
});

horizonRange?.addEventListener('input', () => {
  renderDashboard();
});

document.getElementById('daySearchInput')?.addEventListener('change', () => {
  renderDashboard();
});

document.getElementById('clearDayFilterBtn')?.addEventListener('click', () => {
  const input = document.getElementById('daySearchInput');
  if (input) {
    input.value = '';
  }
  renderDashboard();
});

checkSession();
