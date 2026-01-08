/**
 * SQLite Admin - Frontend
 * Estilo Notion - Completo
 */

const API = "/admin/api";

// ========== STATE ==========
let state = {
  table: null,
  columns: [],
  rows: [],
  page: 1,
  limit: 50,
  total: 0,
  sort: null,
  sortDir: "ASC",
  sqlMode: false,
  filters: [],
  searchQuery: "",
  selectedRows: new Set(),
  views: JSON.parse(localStorage.getItem("sqliteAdminViews") || "{}"),
  currentView: "all",
  favorites: JSON.parse(localStorage.getItem("sqliteAdminFavorites") || "[]"),
  queryHistory: JSON.parse(localStorage.getItem("sqliteAdminHistory") || "[]"),
  allTables: [],
};

// ========== ELEMENTS ==========
const $ = (id) => document.getElementById(id);
const themeToggle = $("themeToggle");
const sqlRunnerBtn = $("sqlRunnerBtn");
const tablesList = $("tablesList");
const favoritesList = $("favoritesList");
const toolbar = $("toolbar");
const queryArea = $("queryArea");
const queryInput = $("queryInput");
const runBtn = $("runBtn");
const tableContainer = $("tableContainer");
const addBtn = $("addBtn");
const refreshBtn = $("refreshBtn");
const filterBtn = $("filterBtn");
const exportBtn = $("exportBtn");
const schemaBtn = $("schemaBtn");
const globalSearch = $("globalSearch");
const countInfo = $("countInfo");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const pageInput = $("pageInput");
const modal = $("modal");
const modalBody = $("modalBody");
const modalTitle = $("modalTitle");
const closeModal = $("closeModal");
const cancelBtn = $("cancelBtn");
const saveBtn = $("saveBtn");
const toast = $("toast");
const breadcrumb = $("breadcrumb");
const currentTableEl = $("currentTable");
const viewTabs = $("viewTabs");
const bulkBar = $("bulkBar");
const selectedCount = $("selectedCount");
const commandPalette = $("commandPalette");
const commandInput = $("commandInput");
const commandResults = $("commandResults");
const contextMenu = $("contextMenu");
const filterModal = $("filterModal");
const filterRows = $("filterRows");
const schemaModal = $("schemaModal");
const schemaBody = $("schemaBody");
const schemaTableName = $("schemaTableName");
const exportModal = $("exportModal");
const historyPanel = $("historyPanel");
const historyBtn = $("historyBtn");

// ========== THEME ==========
function initTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.body.dataset.theme = theme;
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.body.dataset.theme || "light";
  const next = current === "dark" ? "light" : "dark";
  document.body.dataset.theme = next;
  localStorage.setItem("theme", next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.body.dataset.theme === "dark";
  themeToggle.querySelector("i").className = isDark
    ? "ti ti-sun"
    : "ti ti-moon";
}

// ========== COLUMN TYPE ICONS ==========
function getColumnIcon(type, name) {
  const t = (type || "").toUpperCase();
  const n = (name || "").toLowerCase();

  if (n.includes("email")) return "✉";
  if (
    n.includes("date") ||
    n.includes("time") ||
    n === "criado_em" ||
    n === "data_pedido"
  )
    return "📅";
  if (n.includes("status")) return "🏷️";
  if (n.includes("cor") || n.includes("color")) return "🎨";
  if (
    t.includes("INT") ||
    t.includes("REAL") ||
    t.includes("FLOAT") ||
    t.includes("NUMERIC")
  )
    return "#";
  if (t.includes("BOOL")) return "☑";
  return "Aa";
}

// ========== TAG COLORS ==========
const tagColors = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];

function getTagColor(value) {
  if (!value) return "gray";
  const hash = String(value)
    .split("")
    .reduce((a, b) => a + b.charCodeAt(0), 0);
  return tagColors[hash % tagColors.length];
}

function isTagColumn(name) {
  const n = (name || "").toLowerCase();
  return (
    n.includes("status") ||
    n.includes("categoria") ||
    n.includes("category") ||
    n === "cor"
  );
}

// ========== TABLES ==========
async function loadTables() {
  try {
    const res = await fetch(`${API}/tables`);
    const data = await res.json();

    if (!data.tables) {
      tablesList.innerHTML = '<div class="nav-item">Erro ao carregar</div>';
      return;
    }

    state.allTables = data.tables;

    const tables = await Promise.all(
      data.tables.map(async (name) => {
        try {
          const countRes = await fetch(`${API}/table/${name}/count`);
          const countData = await countRes.json();
          return { name, count: countData.count || 0 };
        } catch {
          return { name, count: "?" };
        }
      })
    );

    renderTables(tables);
    renderFavorites(tables);
  } catch (err) {
    showToast("Erro ao carregar tabelas", "error");
  }
}

function renderTables(tables) {
  tablesList.innerHTML = tables
    .filter((t) => !state.favorites.includes(t.name))
    .map(
      (t) => `
      <div class="nav-item" data-table="${
        t.name
      }" oncontextmenu="showContextMenu(event, '${t.name}')">
        <i class="ti ti-table"></i>
        <span>${t.name}</span>
        <span class="star-btn ${
          state.favorites.includes(t.name) ? "active" : ""
        }" onclick="event.stopPropagation(); toggleFavorite('${t.name}')">
          <i class="ti ti-star${
            state.favorites.includes(t.name) ? "-filled" : ""
          }"></i>
        </span>
        <span class="badge">${t.count}</span>
      </div>
    `
    )
    .join("");

  tablesList.querySelectorAll(".nav-item").forEach((el) => {
    el.onclick = () => selectTable(el.dataset.table);
  });
}

function renderFavorites(tables) {
  if (state.favorites.length === 0) {
    favoritesList.innerHTML =
      '<div class="nav-item" style="opacity:0.5;font-size:12px">Nenhum favorito</div>';
    return;
  }

  favoritesList.innerHTML = state.favorites
    .map((name) => {
      const t = tables.find((tb) => tb.name === name) || { name, count: "?" };
      return `
        <div class="nav-item" data-table="${t.name}" oncontextmenu="showContextMenu(event, '${t.name}')">
          <i class="ti ti-star-filled" style="color:var(--yellow)"></i>
          <span>${t.name}</span>
          <span class="badge">${t.count}</span>
        </div>
      `;
    })
    .join("");

  favoritesList.querySelectorAll(".nav-item").forEach((el) => {
    el.onclick = () => selectTable(el.dataset.table);
  });
}

// ========== FAVORITES ==========
window.toggleFavorite = function (table) {
  const idx = state.favorites.indexOf(table);
  if (idx > -1) {
    state.favorites.splice(idx, 1);
  } else {
    state.favorites.push(table);
  }
  localStorage.setItem("sqliteAdminFavorites", JSON.stringify(state.favorites));
  loadTables();
};

// ========== SELECT TABLE ==========
async function selectTable(name) {
  state.table = name;
  state.page = 1;
  state.sort = null;
  state.sqlMode = false;
  state.filters = [];
  state.searchQuery = "";
  state.selectedRows.clear();
  globalSearch.value = "";

  queryArea.classList.remove("show");
  sqlRunnerBtn.classList.remove("active");
  toolbar.style.display = "flex";
  viewTabs.style.display = "flex";
  bulkBar.classList.remove("show");

  currentTableEl.textContent = name;

  tablesList.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.table === name);
  });
  favoritesList.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.table === name);
  });

  try {
    const res = await fetch(`${API}/table/${name}`);
    const data = await res.json();
    state.columns = data.columns || [];
  } catch {
    state.columns = [];
  }

  loadData();
}

// ========== LOAD DATA ==========
async function loadData() {
  if (!state.table) return;

  const offset = (state.page - 1) * state.limit;
  let sql = `SELECT * FROM ${state.table}`;

  // Add filters
  const whereClause = buildWhereClause();
  if (whereClause) sql += ` ${whereClause}`;

  if (state.sort) sql += ` ORDER BY ${state.sort} ${state.sortDir}`;
  sql += ` LIMIT ${state.limit} OFFSET ${offset}`;

  try {
    const [dataRes, countRes] = await Promise.all([
      fetch(`${API}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      }),
      fetch(`${API}/table/${state.table}/count`),
    ]);

    const data = await dataRes.json();
    const count = await countRes.json();

    if (!data.success) {
      showToast(data.error, "error");
      return;
    }

    state.total = count.count || 0;
    state.rows = data.rows || [];
    countInfo.textContent = `${state.total} registros`;
    pageInput.value = state.page;

    renderTable(data.columns, data.rows);
  } catch (err) {
    showToast("Erro ao carregar dados", "error");
  }
}

function buildWhereClause() {
  const conditions = [];

  // Filters
  state.filters.forEach((f) => {
    if (f.column && f.value) {
      if (f.operator === "LIKE") {
        conditions.push(`${f.column} LIKE '%${f.value}%'`);
      } else {
        conditions.push(`${f.column} ${f.operator} '${f.value}'`);
      }
    }
  });

  // Global search
  if (state.searchQuery && state.columns.length > 0) {
    const searchConditions = state.columns
      .filter((c) => c.type && c.type.toUpperCase().includes("TEXT"))
      .map((c) => `${c.name} LIKE '%${state.searchQuery}%'`);
    if (searchConditions.length > 0) {
      conditions.push(`(${searchConditions.join(" OR ")})`);
    }
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

// ========== RENDER TABLE ==========
function renderTable(columns, rows) {
  if (!columns || !rows || rows.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty">
        <i class="ti ti-inbox"></i>
        <p>Sem dados</p>
      </div>
    `;
    return;
  }

  const pk = state.columns.find((c) => c.pk === 1)?.name || columns[0];

  const html = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="check-col">
              <input type="checkbox" class="row-check" id="selectAll" ${
                state.selectedRows.size === rows.length ? "checked" : ""
              }>
            </th>
            ${columns
              .map((c) => {
                const colInfo =
                  state.columns.find((col) => col.name === c) || {};
                const icon = getColumnIcon(colInfo.type, c);
                return `
                  <th data-col="${c}">
                    <div class="col-header">
                      <span class="col-type">${icon}</span>
                      <span>${c}</span>
                      ${
                        state.sort === c
                          ? `<i class="ti ti-arrow-${
                              state.sortDir === "ASC" ? "up" : "down"
                            } col-sort"></i>`
                          : ""
                      }
                    </div>
                    <div class="col-resize"></div>
                  </th>
                `;
              })
              .join("")}
            <th style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const pkValue = row[pk];
              const isSelected = state.selectedRows.has(String(pkValue));
              return `
                <tr data-pk="${pkValue}" class="${
                isSelected ? "selected" : ""
              }">
                  <td class="check-col">
                    <input type="checkbox" class="row-check" data-pk="${pkValue}" ${
                isSelected ? "checked" : ""
              }>
                  </td>
                  ${columns
                    .map((c) => {
                      const value = row[c];
                      const isNull = value === null;
                      const isTag = isTagColumn(c);

                      if (isNull) {
                        return `<td class="null editable" data-col="${c}" data-pk="${pkValue}">null</td>`;
                      }

                      if (isTag) {
                        const color = getTagColor(value);
                        return `<td data-col="${c}" data-pk="${pkValue}"><span class="tag tag--${color}">${escapeHtml(
                          String(value)
                        )}</span></td>`;
                      }

                      return `<td class="editable" data-col="${c}" data-pk="${pkValue}">${escapeHtml(
                        String(value)
                      )}</td>`;
                    })
                    .join("")}
                  <td>
                    <div class="row-actions">
                      <button class="action-btn delete" data-pk="${pkValue}" title="Excluir">
                        <i class="ti ti-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    ${renderTableFooter(columns, rows)}
  `;

  tableContainer.innerHTML = html;
  attachTableEvents();
}

function renderTableFooter(columns, rows) {
  const aggs = columns.map((col) => {
    const values = rows.map((r) => r[col]).filter((v) => v !== null);
    const numValues = values.filter(
      (v) => typeof v === "number" || !isNaN(Number(v))
    );

    return {
      count: rows.length,
      unique: new Set(values).size,
      sum: numValues.reduce((a, v) => a + Number(v), 0),
      empty: rows.filter((r) => r[col] === null || r[col] === "").length,
    };
  });

  return `
    <div class="table-footer">
      <div class="footer-cell">${rows.length}</div>
      ${columns
        .map(
          (col, i) => `
        <div class="footer-cell" data-col="${col}" data-idx="${i}">
          <span class="footer-label">COUNT</span>${aggs[i].count}
        </div>
      `
        )
        .join("")}
      <div class="footer-cell" style="width:40px"></div>
    </div>
  `;
}

function attachTableEvents() {
  // Sort
  tableContainer.querySelectorAll("th[data-col]").forEach((th) => {
    th.onclick = () => {
      const col = th.dataset.col;
      if (state.sort === col) {
        state.sortDir = state.sortDir === "ASC" ? "DESC" : "ASC";
      } else {
        state.sort = col;
        state.sortDir = "ASC";
      }
      loadData();
    };
  });

  // Column resize
  tableContainer.querySelectorAll(".col-resize").forEach((handle) => {
    handle.onmousedown = startResize;
  });

  // Select all
  const selectAll = $("selectAll");
  if (selectAll) {
    selectAll.onchange = (e) => {
      state.selectedRows.clear();
      if (e.target.checked) {
        state.rows.forEach((row) => {
          const pk =
            state.columns.find((c) => c.pk === 1)?.name || Object.keys(row)[0];
          state.selectedRows.add(String(row[pk]));
        });
      }
      updateBulkBar();
      loadData();
    };
  }

  // Row checkboxes
  tableContainer.querySelectorAll("tbody .row-check").forEach((cb) => {
    cb.onchange = (e) => {
      const pk = e.target.dataset.pk;
      if (e.target.checked) {
        state.selectedRows.add(pk);
      } else {
        state.selectedRows.delete(pk);
      }
      updateBulkBar();
      e.target.closest("tr").classList.toggle("selected", e.target.checked);
    };
  });

  // Delete buttons
  tableContainer.querySelectorAll(".action-btn.delete").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteRecord(btn.dataset.pk);
    };
  });

  // Inline editing
  tableContainer.querySelectorAll("td.editable").forEach((td) => {
    td.ondblclick = () => startInlineEdit(td);
  });

  // Footer aggregation toggle
  tableContainer.querySelectorAll(".footer-cell[data-col]").forEach((cell) => {
    const aggTypes = ["COUNT", "UNIQUE", "SUM", "EMPTY"];
    let currentIdx = 0;

    cell.onclick = () => {
      currentIdx = (currentIdx + 1) % aggTypes.length;
      const col = cell.dataset.col;
      const idx = parseInt(cell.dataset.idx);
      const values = state.rows.map((r) => r[col]).filter((v) => v !== null);
      const numValues = values.filter(
        (v) => typeof v === "number" || !isNaN(Number(v))
      );

      let value;
      switch (aggTypes[currentIdx]) {
        case "COUNT":
          value = state.rows.length;
          break;
        case "UNIQUE":
          value = new Set(values).size;
          break;
        case "SUM":
          value = numValues.reduce((a, v) => a + Number(v), 0).toFixed(2);
          break;
        case "EMPTY":
          value = state.rows.filter(
            (r) => r[col] === null || r[col] === ""
          ).length;
          break;
      }

      cell.innerHTML = `<span class="footer-label">${aggTypes[currentIdx]}</span>${value}`;
    };
  });
}

// ========== INLINE EDITING ==========
function startInlineEdit(td) {
  const col = td.dataset.col;
  const pk = td.dataset.pk;
  const originalValue = td.textContent === "null" ? "" : td.textContent;

  td.classList.add("editing");
  td.innerHTML = `<input type="text" value="${escapeHtml(originalValue)}" />`;

  const input = td.querySelector("input");
  input.focus();
  input.select();

  input.onblur = () => saveInlineEdit(td, col, pk, originalValue, input.value);
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      input.blur();
    } else if (e.key === "Escape") {
      td.classList.remove("editing");
      td.textContent = originalValue || "null";
      if (!originalValue) td.classList.add("null");
    }
  };
}

async function saveInlineEdit(td, col, pk, originalValue, newValue) {
  td.classList.remove("editing");

  if (newValue === originalValue) {
    td.textContent = originalValue || "null";
    if (!originalValue) td.classList.add("null");
    return;
  }

  const pkCol =
    state.columns.find((c) => c.pk === 1)?.name || state.columns[0]?.name;

  try {
    const res = await fetch(`${API}/table/${state.table}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column: col,
        value: newValue,
        pkColumn: pkCol,
        pkValue: pk,
      }),
    });
    const result = await res.json();

    if (result.success) {
      td.textContent = newValue || "null";
      if (!newValue) td.classList.add("null");
      showToast("Atualizado!", "success");
    } else {
      td.textContent = originalValue || "null";
      showToast(result.error, "error");
    }
  } catch (err) {
    td.textContent = originalValue || "null";
    showToast("Erro ao atualizar", "error");
  }
}

// ========== COLUMN RESIZE ==========
let resizing = null;

function startResize(e) {
  e.preventDefault();
  const th = e.target.parentElement;
  resizing = {
    th,
    startX: e.pageX,
    startWidth: th.offsetWidth,
  };
  document.addEventListener("mousemove", doResize);
  document.addEventListener("mouseup", stopResize);
}

function doResize(e) {
  if (!resizing) return;
  const diff = e.pageX - resizing.startX;
  resizing.th.style.width = `${resizing.startWidth + diff}px`;
}

function stopResize() {
  resizing = null;
  document.removeEventListener("mousemove", doResize);
  document.removeEventListener("mouseup", stopResize);
}

// ========== BULK ACTIONS ==========
function updateBulkBar() {
  const count = state.selectedRows.size;
  if (count > 0) {
    bulkBar.classList.add("show");
    selectedCount.textContent = `${count} selecionado${count > 1 ? "s" : ""}`;
  } else {
    bulkBar.classList.remove("show");
  }
}

async function bulkDelete() {
  if (!confirm(`Excluir ${state.selectedRows.size} registros?`)) return;

  const pkCol =
    state.columns.find((c) => c.pk === 1)?.name || state.columns[0]?.name;

  for (const pk of state.selectedRows) {
    await fetch(`${API}/table/${state.table}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column: pkCol, value: pk }),
    });
  }

  state.selectedRows.clear();
  updateBulkBar();
  showToast("Excluídos!", "success");
  loadData();
  loadTables();
}

// ========== SQL RUNNER ==========
function toggleSqlMode() {
  state.sqlMode = !state.sqlMode;

  if (state.sqlMode) {
    queryArea.classList.add("show");
    sqlRunnerBtn.classList.add("active");
    toolbar.style.display = "none";
    viewTabs.style.display = "none";
    tablesList
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("active"));
    favoritesList
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("active"));
    currentTableEl.textContent = "SQL Runner";
  } else {
    queryArea.classList.remove("show");
    sqlRunnerBtn.classList.remove("active");
    if (state.table) selectTable(state.table);
  }
}

async function runQuery() {
  const sql = queryInput.value.trim();
  if (!sql) return;

  addToHistory(sql);

  try {
    const res = await fetch(`${API}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.error, "error");
      return;
    }

    if (data.rows) {
      state.rows = data.rows;
      state.columns = data.columns
        ? data.columns.map((c) => ({ name: c, type: "TEXT" }))
        : [];
      renderTable(data.columns, data.rows);
      countInfo.textContent = `${data.rows.length} registros`;
    } else {
      showToast(data.message, "success");
      loadTables();
    }
  } catch (err) {
    showToast("Erro ao executar query", "error");
  }
}

// ========== QUERY HISTORY ==========
function addToHistory(sql) {
  state.queryHistory = state.queryHistory.filter((h) => h.sql !== sql);
  state.queryHistory.unshift({ sql, timestamp: Date.now() });
  if (state.queryHistory.length > 20) state.queryHistory.pop();
  localStorage.setItem(
    "sqliteAdminHistory",
    JSON.stringify(state.queryHistory)
  );
}

function toggleHistoryPanel() {
  historyPanel.classList.toggle("show");
  if (historyPanel.classList.contains("show")) {
    renderHistory();
  }
}

function renderHistory() {
  historyPanel.innerHTML =
    state.queryHistory
      .map(
        (h) => `
    <div class="history-item" onclick="useHistoryItem('${escapeHtml(
      h.sql
    ).replace(/'/g, "\\'")}')">
      <span>${h.sql.substring(0, 50)}${h.sql.length > 50 ? "..." : ""}</span>
      <span class="time">${formatTime(h.timestamp)}</span>
    </div>
  `
      )
      .join("") ||
    '<div style="padding:8px;color:var(--text-secondary)">Nenhuma query</div>';
}

window.useHistoryItem = function (sql) {
  queryInput.value = sql;
  historyPanel.classList.remove("show");
};

function formatTime(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ========== FILTERS ==========
function openFilterModal() {
  filterModal.classList.add("show");
  renderFilterRows();
}

function closeFilterModalFn() {
  filterModal.classList.remove("show");
}

function renderFilterRows() {
  if (state.filters.length === 0) {
    state.filters.push({ column: "", operator: "=", value: "" });
  }

  filterRows.innerHTML = state.filters
    .map(
      (f, i) => `
    <div class="filter-row">
      <select class="filter-column" data-idx="${i}">
        <option value="">Coluna</option>
        ${state.columns
          .map(
            (c) =>
              `<option value="${c.name}" ${
                f.column === c.name ? "selected" : ""
              }>${c.name}</option>`
          )
          .join("")}
      </select>
      <select class="filter-operator" data-idx="${i}">
        <option value="=" ${f.operator === "=" ? "selected" : ""}>=</option>
        <option value="!=" ${f.operator === "!=" ? "selected" : ""}>≠</option>
        <option value=">" ${f.operator === ">" ? "selected" : ""}>></option>
        <option value="<" ${f.operator === "<" ? "selected" : ""}><</option>
        <option value="LIKE" ${
          f.operator === "LIKE" ? "selected" : ""
        }>contém</option>
      </select>
      <input type="text" class="filter-value" data-idx="${i}" value="${
        f.value
      }" placeholder="Valor">
      <button class="remove-filter" data-idx="${i}"><i class="ti ti-x"></i></button>
    </div>
  `
    )
    .join("");

  filterRows.querySelectorAll(".filter-column").forEach((el) => {
    el.onchange = (e) => {
      state.filters[parseInt(e.target.dataset.idx)].column = e.target.value;
    };
  });

  filterRows.querySelectorAll(".filter-operator").forEach((el) => {
    el.onchange = (e) => {
      state.filters[parseInt(e.target.dataset.idx)].operator = e.target.value;
    };
  });

  filterRows.querySelectorAll(".filter-value").forEach((el) => {
    el.oninput = (e) => {
      state.filters[parseInt(e.target.dataset.idx)].value = e.target.value;
    };
  });

  filterRows.querySelectorAll(".remove-filter").forEach((el) => {
    el.onclick = () => {
      state.filters.splice(parseInt(el.dataset.idx), 1);
      renderFilterRows();
    };
  });
}

function addFilter() {
  state.filters.push({ column: "", operator: "=", value: "" });
  renderFilterRows();
}

function applyFilters() {
  state.filters = state.filters.filter((f) => f.column && f.value);
  closeFilterModalFn();
  loadData();
}

function clearFilters() {
  state.filters = [];
  closeFilterModalFn();
  loadData();
}

// ========== GLOBAL SEARCH ==========
let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = e.target.value;
    state.page = 1;
    loadData();
  }, 300);
}

// ========== SCHEMA ==========
function openSchemaModal() {
  if (!state.table) return;
  schemaModal.classList.add("show");
  schemaTableName.textContent = state.table;

  schemaBody.innerHTML = `
    <table class="schema-table">
      <thead>
        <tr>
          <th>Coluna</th>
          <th>Tipo</th>
          <th>Nullable</th>
          <th>Default</th>
          <th>PK</th>
        </tr>
      </thead>
      <tbody>
        ${state.columns
          .map(
            (c) => `
          <tr>
            <td>${c.name}</td>
            <td>${c.type || "TEXT"}</td>
            <td>${c.notnull ? "NOT NULL" : "NULL"}</td>
            <td>${c.dflt_value || "-"}</td>
            <td>${c.pk ? '<i class="ti ti-key schema-pk"></i>' : "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// ========== EXPORT ==========
function openExportModal() {
  if (!state.table) return;
  exportModal.classList.add("show");
}

async function doExport() {
  const format = $("exportFormat").value;
  const scope = $("exportScope").value;

  let rows;
  if (scope === "selected") {
    const pkCol =
      state.columns.find((c) => c.pk === 1)?.name || state.columns[0]?.name;
    rows = state.rows.filter((r) => state.selectedRows.has(String(r[pkCol])));
  } else if (scope === "current") {
    rows = state.rows;
  } else {
    const res = await fetch(`${API}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: `SELECT * FROM ${state.table}` }),
    });
    const data = await res.json();
    rows = data.rows || [];
  }

  if (format === "csv") {
    exportCSV(rows);
  } else {
    exportJSON(rows);
  }

  exportModal.classList.remove("show");
}

function exportCSV(rows) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const body = rows
    .map((r) =>
      cols.map((c) => `"${String(r[c] || "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  downloadFile(`${state.table}.csv`, header + "\n" + body, "text/csv");
}

function exportJSON(rows) {
  downloadFile(
    `${state.table}.json`,
    JSON.stringify(rows, null, 2),
    "application/json"
  );
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exportado: ${filename}`, "success");
}

// ========== COMMAND PALETTE ==========
function toggleCommandPalette() {
  commandPalette.classList.toggle("show");
  if (commandPalette.classList.contains("show")) {
    commandInput.value = "";
    commandInput.focus();
    renderCommands();
  }
}

function renderCommands(query = "") {
  const q = query.toLowerCase();

  const tables = state.allTables
    .filter((t) => q === "" || t.toLowerCase().includes(q))
    .slice(0, 5)
    .map((t) => ({
      icon: "ti-table",
      label: t,
      action: () => {
        selectTable(t);
        toggleCommandPalette();
      },
    }));

  const actions = [
    {
      icon: "ti-plus",
      label: "Novo registro",
      shortcut: "N",
      action: () => {
        openModal();
        toggleCommandPalette();
      },
    },
    {
      icon: "ti-terminal-2",
      label: "SQL Runner",
      shortcut: "S",
      action: () => {
        toggleSqlMode();
        toggleCommandPalette();
      },
    },
    {
      icon: "ti-refresh",
      label: "Atualizar",
      shortcut: "R",
      action: () => {
        loadData();
        toggleCommandPalette();
      },
    },
    {
      icon: "ti-download",
      label: "Exportar",
      shortcut: "E",
      action: () => {
        openExportModal();
        toggleCommandPalette();
      },
    },
    {
      icon: "ti-filter",
      label: "Filtrar",
      shortcut: "F",
      action: () => {
        openFilterModal();
        toggleCommandPalette();
      },
    },
  ].filter((a) => q === "" || a.label.toLowerCase().includes(q));

  let html = "";

  if (tables.length > 0) {
    html += `<div class="command-section">Tabelas</div>`;
    html += tables
      .map(
        (t, i) => `
      <div class="command-item" data-action="table-${i}">
        <i class="ti ${t.icon}"></i>
        <span>${t.label}</span>
      </div>
    `
      )
      .join("");
  }

  if (actions.length > 0) {
    html += `<div class="command-section">Ações</div>`;
    html += actions
      .map(
        (a, i) => `
      <div class="command-item" data-action="action-${i}">
        <i class="ti ${a.icon}"></i>
        <span>${a.label}</span>
        ${a.shortcut ? `<span class="shortcut">${a.shortcut}</span>` : ""}
      </div>
    `
      )
      .join("");
  }

  commandResults.innerHTML =
    html || '<div class="command-item">Nenhum resultado</div>';

  // Attach events
  tables.forEach((t, i) => {
    const el = commandResults.querySelector(`[data-action="table-${i}"]`);
    if (el) el.onclick = t.action;
  });

  actions.forEach((a, i) => {
    const el = commandResults.querySelector(`[data-action="action-${i}"]`);
    if (el) el.onclick = a.action;
  });
}

// ========== CONTEXT MENU ==========
window.showContextMenu = function (e, table) {
  e.preventDefault();
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.classList.add("show");
  contextMenu.dataset.table = table;

  // Update favorite text
  const favItem = contextMenu.querySelector('[data-action="favorite"]');
  const isFav = state.favorites.includes(table);
  favItem.innerHTML = `<i class="ti ti-star${isFav ? "-off" : ""}"></i> ${
    isFav ? "Remover favorito" : "Favoritar"
  }`;
};

function hideContextMenu() {
  contextMenu.classList.remove("show");
}

function handleContextAction(action) {
  const table = contextMenu.dataset.table;
  hideContextMenu();

  switch (action) {
    case "favorite":
      toggleFavorite(table);
      break;
    case "schema":
      selectTable(table).then(() => openSchemaModal());
      break;
    case "export":
      selectTable(table).then(() => openExportModal());
      break;
    case "refresh":
      loadTables();
      break;
  }
}

// ========== CRUD ==========
function openModal() {
  if (!state.table || state.columns.length === 0) return;

  modalTitle.textContent = "Novo Registro";

  const fields = state.columns
    .filter((c) => c.pk !== 1)
    .map(
      (c) => `
      <div class="field">
        <label>${c.name} ${c.notnull ? "*" : ""}</label>
        <input type="text" name="${c.name}" placeholder="${c.type || "TEXT"}">
      </div>
    `
    )
    .join("");

  modalBody.innerHTML = fields || "<p>Sem campos editáveis</p>";
  modal.classList.add("show");
}

function closeModalFn() {
  modal.classList.remove("show");
}

async function saveRecord() {
  const inputs = modalBody.querySelectorAll("input");
  const data = {};

  inputs.forEach((input) => {
    if (input.value.trim()) data[input.name] = input.value.trim();
  });

  if (Object.keys(data).length === 0) return;

  try {
    const res = await fetch(`${API}/table/${state.table}/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();

    if (result.success) {
      closeModalFn();
      showToast("Registro criado!", "success");
      loadData();
      loadTables();
    } else {
      showToast(result.error, "error");
    }
  } catch (err) {
    showToast("Erro ao salvar", "error");
  }
}

async function deleteRecord(pk) {
  if (!confirm("Excluir registro?")) return;

  const pkCol =
    state.columns.find((c) => c.pk === 1)?.name || state.columns[0]?.name;

  try {
    const res = await fetch(`${API}/table/${state.table}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column: pkCol, value: pk }),
    });
    const result = await res.json();

    if (result.success) {
      showToast("Excluído!", "success");
      loadData();
      loadTables();
    } else {
      showToast(result.error, "error");
    }
  } catch (err) {
    showToast("Erro ao excluir", "error");
  }
}

// ========== PAGINATION ==========
function goPage(dir) {
  const maxPages = Math.ceil(state.total / state.limit) || 1;
  state.page = Math.max(1, Math.min(state.page + dir, maxPages));
  loadData();
}

// ========== UTILS ==========
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, type) {
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ========== SECTION COLLAPSE ==========
function initSectionCollapse() {
  $("favoritesTitle").onclick = () => {
    $("favoritesTitle").classList.toggle("collapsed");
    favoritesList.classList.toggle("collapsed");
  };

  $("tablesTitle").onclick = () => {
    $("tablesTitle").classList.toggle("collapsed");
    tablesList.classList.toggle("collapsed");
  };
}

// ========== EVENTS ==========
themeToggle.onclick = toggleTheme;
sqlRunnerBtn.onclick = toggleSqlMode;
runBtn.onclick = runQuery;
addBtn.onclick = openModal;
refreshBtn.onclick = loadData;
filterBtn.onclick = openFilterModal;
exportBtn.onclick = openExportModal;
schemaBtn.onclick = openSchemaModal;
globalSearch.oninput = handleSearch;
prevBtn.onclick = () => goPage(-1);
nextBtn.onclick = () => goPage(1);
pageInput.onchange = (e) => {
  state.page = parseInt(e.target.value) || 1;
  loadData();
};
closeModal.onclick = closeModalFn;
cancelBtn.onclick = closeModalFn;
saveBtn.onclick = saveRecord;
modal.onclick = (e) => {
  if (e.target === modal) closeModalFn();
};

// Filter modal
$("closeFilterModal").onclick = closeFilterModalFn;
$("addFilterBtn").onclick = addFilter;
$("applyFiltersBtn").onclick = applyFilters;
$("clearFiltersBtn").onclick = clearFilters;
filterModal.onclick = (e) => {
  if (e.target === filterModal) closeFilterModalFn();
};

// Schema modal
$("closeSchemaModal").onclick = () => schemaModal.classList.remove("show");
schemaModal.onclick = (e) => {
  if (e.target === schemaModal) schemaModal.classList.remove("show");
};

// Export modal
$("closeExportModal").onclick = () => exportModal.classList.remove("show");
$("cancelExportBtn").onclick = () => exportModal.classList.remove("show");
$("confirmExportBtn").onclick = doExport;
exportModal.onclick = (e) => {
  if (e.target === exportModal) exportModal.classList.remove("show");
};

// Bulk actions
$("bulkDeleteBtn").onclick = bulkDelete;
$("bulkExportBtn").onclick = () => {
  $("exportScope").value = "selected";
  openExportModal();
};
$("clearSelectionBtn").onclick = () => {
  state.selectedRows.clear();
  updateBulkBar();
  loadData();
};

// History
historyBtn.onclick = toggleHistoryPanel;

// Command palette
commandInput.oninput = (e) => renderCommands(e.target.value);
commandInput.onkeydown = (e) => {
  if (e.key === "Escape") toggleCommandPalette();
};

// Context menu
contextMenu.querySelectorAll(".context-item").forEach((el) => {
  el.onclick = () => handleContextAction(el.dataset.action);
});
document.onclick = hideContextMenu;

// Global keyboard shortcuts
document.onkeydown = (e) => {
  // Command palette
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    toggleCommandPalette();
  }

  // Run query
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && state.sqlMode) {
    e.preventDefault();
    runQuery();
  }

  // Escape to close modals
  if (e.key === "Escape") {
    if (commandPalette.classList.contains("show")) toggleCommandPalette();
    if (modal.classList.contains("show")) closeModalFn();
    if (filterModal.classList.contains("show")) closeFilterModalFn();
    if (schemaModal.classList.contains("show"))
      schemaModal.classList.remove("show");
    if (exportModal.classList.contains("show"))
      exportModal.classList.remove("show");
  }
};

queryInput.onkeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runQuery();
  }
};

// ========== INIT ==========
initTheme();
initSectionCollapse();
loadTables();
