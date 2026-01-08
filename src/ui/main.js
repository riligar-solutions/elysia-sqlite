/**
 * SQLite Admin - Frontend
 * Estilo Notion - Minimalista e Funcional
 */

const API = "/admin/api";

// Estado
let state = {
  table: null,
  columns: [],
  page: 1,
  limit: 50,
  total: 0,
  sort: null,
  sortDir: "ASC",
  sqlMode: false,
};

// Elementos
const $ = (id) => document.getElementById(id);
const themeToggle = $("themeToggle");
const sqlRunnerBtn = $("sqlRunnerBtn");
const tablesList = $("tablesList");
const toolbar = $("toolbar");
const queryArea = $("queryArea");
const queryInput = $("queryInput");
const runBtn = $("runBtn");
const tableContainer = $("tableContainer");
const addBtn = $("addBtn");
const refreshBtn = $("refreshBtn");
const countInfo = $("countInfo");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const pageInput = $("pageInput");
const modal = $("modal");
const modalBody = $("modalBody");
const closeModal = $("closeModal");
const cancelBtn = $("cancelBtn");
const saveBtn = $("saveBtn");
const toast = $("toast");

// ========== TEMA ==========
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

// ========== TABELAS ==========
async function loadTables() {
  try {
    const res = await fetch(`${API}/tables`);
    const data = await res.json();

    if (!data.tables) {
      tablesList.innerHTML = '<div class="nav-item">Erro ao carregar</div>';
      return;
    }

    // Carregar contagem para cada tabela
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

    tablesList.innerHTML = tables
      .map(
        (t) => `
      <div class="nav-item" data-table="${t.name}">
        <i class="ti ti-table"></i>
        <span>${t.name}</span>
        <span class="badge">${t.count}</span>
      </div>
    `
      )
      .join("");

    tablesList.querySelectorAll(".nav-item").forEach((el) => {
      el.onclick = () => selectTable(el.dataset.table);
    });
  } catch (err) {
    showToast("Erro ao carregar tabelas", "error");
  }
}

// ========== SELECIONAR TABELA ==========
async function selectTable(name) {
  state.table = name;
  state.page = 1;
  state.sort = null;
  state.sqlMode = false;

  // UI
  queryArea.classList.remove("show");
  sqlRunnerBtn.classList.remove("active");
  toolbar.style.display = "flex";

  tablesList.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.table === name);
  });

  // Estrutura
  try {
    const res = await fetch(`${API}/table/${name}`);
    const data = await res.json();
    state.columns = data.columns || [];
  } catch {
    state.columns = [];
  }

  loadData();
}

// ========== CARREGAR DADOS ==========
async function loadData() {
  if (!state.table) return;

  const offset = (state.page - 1) * state.limit;
  let sql = `SELECT * FROM ${state.table}`;
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
    countInfo.textContent = `${state.total} registros`;
    pageInput.value = state.page;

    renderTable(data.columns, data.rows);
  } catch (err) {
    showToast("Erro ao carregar dados", "error");
  }
}

// ========== RENDERIZAR TABELA ==========
function renderTable(columns, rows) {
  if (!columns || !rows || rows.length === 0) {
    tableContainer.innerHTML = `<div class="empty"><i class="ti ti-inbox"></i><p>Sem dados</p></div>`;
    return;
  }

  const pk = state.columns.find((c) => c.pk === 1)?.name || columns[0];

  const html = `
    <table>
      <thead>
        <tr>
          ${columns
            .map(
              (c) => `
            <th data-col="${c}">
              ${c}
              ${
                state.sort === c
                  ? `<i class="ti ti-arrow-${
                      state.sortDir === "ASC" ? "up" : "down"
                    }"></i>`
                  : ""
              }
            </th>
          `
            )
            .join("")}
          <th style="width:40px"></th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr data-pk="${row[pk]}">
            ${columns
              .map(
                (c) =>
                  `<td class="${row[c] === null ? "null" : ""}">${
                    row[c] === null ? "null" : escapeHtml(String(row[c]))
                  }</td>`
              )
              .join("")}
            <td>
              <div class="row-actions">
                <button class="delete-btn" data-pk="${
                  row[pk]
                }"><i class="ti ti-trash"></i></button>
              </div>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = html;

  // Ordenação
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

  // Delete
  tableContainer.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      deleteRecord(btn.dataset.pk);
    };
  });
}

// ========== SQL RUNNER ==========
function toggleSqlMode() {
  state.sqlMode = !state.sqlMode;

  if (state.sqlMode) {
    queryArea.classList.add("show");
    sqlRunnerBtn.classList.add("active");
    toolbar.style.display = "none";
    tablesList
      .querySelectorAll(".nav-item")
      .forEach((el) => el.classList.remove("active"));
  } else {
    queryArea.classList.remove("show");
    sqlRunnerBtn.classList.remove("active");
    if (state.table) selectTable(state.table);
  }
}

async function runQuery() {
  const sql = queryInput.value.trim();
  if (!sql) return;

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

// ========== CRUD ==========
function openModal() {
  if (!state.table || state.columns.length === 0) return;

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

// ========== PAGINAÇÃO ==========
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

// ========== EVENTOS ==========
themeToggle.onclick = toggleTheme;
sqlRunnerBtn.onclick = toggleSqlMode;
runBtn.onclick = runQuery;
addBtn.onclick = openModal;
refreshBtn.onclick = loadData;
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

queryInput.onkeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runQuery();
  }
};

// ========== INIT ==========
initTheme();
loadTables();
