const DATA_URL = "data/institutions.json";
const STORAGE_KEY = "southbound-institution-research-v4";
let repoData;
let data;
let activeCategory = "全部";

const $ = (s) => document.querySelector(s);
const investorCategories = ["银行", "资管机构", "券商", "保险", "理财"];
const categoryLabels = { 银行: "银行", 资管机构: "基金公司", 保险: "保险", 理财: "理财", 券商: "券商" };

async function init() {
  repoData = await fetch(DATA_URL).then(r => r.json());
  const saved = localStorage.getItem(STORAGE_KEY);
  data = saved ? JSON.parse(saved) : structuredClone(repoData);
  data.marketMakers = structuredClone(repoData.marketMakers);
  data.sources = structuredClone(repoData.sources);
  data.meta = structuredClone(repoData.meta);
  normalizeData(data);
  render();
  bind();
}

function normalizeData(value) {
  value.institutions.forEach(x => {
    if (!x.currency) x.currency = x.category === "银行" ? "多币种（待核验）" : "USD / CNH（估计）";
  });
}

function investors() {
  return data.institutions.filter(x => investorCategories.includes(x.category));
}

function filteredInvestors() {
  const q = $("#searchInput").value.trim().toLowerCase();
  return investors().filter(x => {
    const categoryMatch = activeCategory === "全部" || x.category === activeCategory;
    const text = [x.name, x.legalName, x.preference, x.currency, ...(x.tags || [])].join(" ").toLowerCase();
    return categoryMatch && (!q || text.includes(q));
  });
}

function render() {
  $("#asOf").textContent = data.meta.updated;
  $("#guideInvestorCount").textContent = investors().length;
  $("#guideMakerCount").textContent = (data.marketMakers || []).length;
  renderStats();
  renderTabs();
  renderCards();
  renderMarketMakers();
  renderSources();
}

function showView(name) {
  $("#guideView").classList.toggle("hidden", name !== "guide");
  $("#investorView").classList.toggle("hidden", name !== "investors");
  $("#makerView").classList.toggle("hidden", name !== "makers");
  $("#sourcePanel").classList.toggle("hidden", name !== "guide");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStats() {
  const rows = investors();
  const cats = ["银行", "资管机构", "券商", "保险", "理财"];
  $("#stats").innerHTML = cats.map(cat => `<div class="stat"><span>${categoryLabels[cat]}</span><strong>${rows.filter(x => x.category === cat).length}</strong><small>${cat === "银行" ? "南向通银行投资人" : "重点机构研究池"}</small></div>`).join("");
}

function renderTabs() {
  const cats = ["全部", ...investorCategories];
  $("#tabs").innerHTML = cats.map(cat => `<button class="tab ${activeCategory === cat ? "active" : ""}" data-category="${cat}">${categoryLabels[cat] || cat}</button>`).join("");
}

function renderCards() {
  const rows = filteredInvestors();
  $("#investorCount").textContent = `当前显示 ${rows.length} / ${investors().length} 家机构`;
  $("#emptyState").classList.toggle("hidden", rows.length > 0);
  $("#institutionGrid").innerHTML = rows.map(x => `
    <article class="institution">
      <div class="institution-name"><h3>${x.name}</h3><p>${x.legalName}</p></div>
      <span class="badge category">${categoryLabels[x.category]}</span>
      <div class="display-field preference-display"><span>投资偏好</span><p>${x.preference}</p></div>
      <div class="display-field"><span>关注期限</span><strong>${x.tenor}</strong></div>
      <div class="display-field"><span>币种</span><strong>${x.currency}</strong></div>
      <div class="display-field"><span>研究收益率</span><strong>${x.yield}</strong></div>
      <button class="card-action" data-detail-id="${x.id}">详情</button>
    </article>`).join("");
}

function escapeAttribute(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const header = ["机构名称", "机构全称", "机构类别", "投资偏好", "关注期限", "币种", "研究收益率区间", "证据等级", "公开来源"];
  const rows = filteredInvestors().map(x => [x.name, x.legalName, categoryLabels[x.category], x.preference, x.tenor, x.currency, x.yield, x.evidence, x.source]);
  const csv = [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `南向通投资人_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

function renderMarketMakers() {
  $("#marketMakerList").innerHTML = (data.marketMakers || []).map((x, i) => `
    <article class="market-maker">
      <span class="market-index">${String(i + 1).padStart(2, "0")}</span>
      <div><h3>${x.name}</h3><p>${x.english}</p></div>
    </article>`).join("");
}

function renderSources() {
  $("#sourceList").innerHTML = data.sources.map(s => `<a class="source-link" href="${s.url}" target="_blank" rel="noreferrer"><b>${s.title} ↗</b><small>${s.note}</small></a>`).join("");
}

function showDetail(id) {
  const x = data.institutions.find(i => i.id === id);
  $("#detailContent").innerHTML = `
    <div class="detail-head"><span class="badge category">${categoryLabels[x.category]} · ${x.evidence}级证据</span><h2>${x.name}</h2><p>${x.legalName}</p></div>
    <div class="detail-grid">
      <div class="detail-edit full">
        <h4>编辑研究字段</h4>
        <label><span>投资偏好</span><textarea id="detailPreference">${escapeAttribute(x.preference)}</textarea></label>
        <div class="detail-edit-row">
          <label><span>关注期限</span><input id="detailTenor" value="${escapeAttribute(x.tenor)}"></label>
          <label><span>币种</span><input id="detailCurrency" value="${escapeAttribute(x.currency)}"></label>
          <label><span>研究收益率</span><input id="detailYield" value="${escapeAttribute(x.yield)}"></label>
        </div>
        <button class="primary detail-save" data-save-id="${x.id}">保存并更新展示</button>
        <span class="detail-save-status" id="detailSaveStatus"></span>
      </div>
      ${x.rationale ? `<div class="detail-section full"><h4>研究判断</h4><p>${x.rationale}</p></div>` : ""}
      ${x.disclaimer ? `<div class="detail-section full"><h4>信息边界</h4><p>${x.disclaimer}</p></div>` : ""}
      <div class="detail-section full"><h4>公开来源</h4><a class="detail-link" href="${x.source}" target="_blank" rel="noreferrer">打开来源或机构官网 ↗</a></div>
    </div>`;
  $("#detailDialog").showModal();
}

function saveDetail(id) {
  const row = data.institutions.find(x => x.id === id);
  if (!row) return;
  row.preference = $("#detailPreference").value.trim();
  row.tenor = $("#detailTenor").value.trim();
  row.currency = $("#detailCurrency").value.trim();
  row.yield = $("#detailYield").value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderCards();
  $("#detailSaveStatus").textContent = "已保存并更新列表";
}

function bind() {
  document.addEventListener("click", e => e.target.closest("[data-view]") && showView(e.target.closest("[data-view]").dataset.view));
  $("#tabs").addEventListener("click", e => {
    if (!e.target.dataset.category) return;
    activeCategory = e.target.dataset.category;
    renderTabs(); renderCards();
  });
  $("#searchInput").addEventListener("input", renderCards);
  $("#csvBtn").addEventListener("click", exportCsv);
  $("#institutionGrid").addEventListener("click", e => e.target.dataset.detailId && showDetail(e.target.dataset.detailId));
  $("#detailContent").addEventListener("click", e => e.target.dataset.saveId && saveDetail(e.target.dataset.saveId));
  $("#methodBtn").addEventListener("click", () => $("#methodDialog").showModal());
  $("#editBtn").addEventListener("click", () => { $("#jsonEditor").value = JSON.stringify(data, null, 2); $("#editDialog").showModal(); });
  document.querySelectorAll("[data-close]").forEach(x => x.addEventListener("click", () => x.closest("dialog").close()));
  $("#saveBtn").addEventListener("click", () => {
    try { data = JSON.parse($("#jsonEditor").value); normalizeData(data); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); $("#editorError").textContent = ""; $("#editDialog").close(); render(); }
    catch (e) { $("#editorError").textContent = `JSON 格式错误：${e.message}`; }
  });
  $("#resetBtn").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); data = structuredClone(repoData); normalizeData(data); $("#jsonEditor").value = JSON.stringify(data, null, 2); render(); });
  $("#exportBtn").addEventListener("click", () => {
    try {
      const value = JSON.parse($("#jsonEditor").value);
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })), download: "institutions.json" });
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { $("#editorError").textContent = `JSON 格式错误：${e.message}`; }
  });
}
init().catch(e => { document.body.innerHTML = `<main><h1>数据加载失败</h1><p>${e.message}</p></main>`; });
