const DATA_URL = "data/institutions.json";
const STORAGE_KEY = "southbound-institution-research-v1";
let repoData;
let data;
let activeCategory = "全部";

const $ = (s) => document.querySelector(s);
const categoryLabels = { 银行: "BANK", 资管机构: "ASSET MANAGER", 保险: "INSURER", 理财: "WEALTH MANAGEMENT", 券商: "SECURITIES" };

async function init() {
  repoData = await fetch(DATA_URL).then(r => r.json());
  const saved = localStorage.getItem(STORAGE_KEY);
  data = saved ? JSON.parse(saved) : structuredClone(repoData);
  render();
  bind();
}

function render() {
  $("#asOf").textContent = data.meta.updated;
  renderStats();
  renderTabs();
  renderCards();
  renderSources();
}

function renderStats() {
  const cats = ["银行", "资管机构", "保险", "理财", "券商"];
  $("#stats").innerHTML = cats.map(cat => `<div class="stat"><strong>${data.institutions.filter(x => x.category === cat).length}</strong><span>${cat}</span></div>`).join("");
}

function renderTabs() {
  const cats = ["全部", "银行", "资管机构", "保险", "理财", "券商"];
  $("#tabs").innerHTML = cats.map(cat => `<button class="tab ${activeCategory === cat ? "active" : ""}" data-category="${cat}">${cat}</button>`).join("");
}

function renderCards() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const rows = data.institutions.filter(x => {
    const categoryMatch = activeCategory === "全部" || x.category === activeCategory;
    const text = [x.name, x.legalName, x.preference, ...(x.tags || [])].join(" ").toLowerCase();
    return categoryMatch && (!q || text.includes(q));
  });
  $("#emptyState").classList.toggle("hidden", rows.length > 0);
  $("#institutionGrid").innerHTML = rows.map(x => `
    <article class="institution">
      <div class="card-top"><span class="category">${categoryLabels[x.category]}</span><span class="evidence">${x.evidence}级证据</span></div>
      <h3>${x.name}</h3><p class="legal-name">${x.legalName}</p>
      <div class="tags">${x.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
      <div class="metrics">
        <div class="metric"><span>关注期限</span><strong>${x.tenor}</strong></div>
        <div class="metric"><span>研究收益率区间</span><strong>${x.yield}</strong></div>
      </div>
      <button class="card-action" data-id="${x.id}">查看研究摘要 →</button>
    </article>`).join("");
}

function renderSources() {
  $("#sourceList").innerHTML = data.sources.map((s, i) => `<a class="source-link" href="${s.url}" target="_blank" rel="noreferrer"><span>0${i + 1}</span><div>${s.title}<br><small>${s.note}</small></div><b>↗</b></a>`).join("");
}

function showDetail(id) {
  const x = data.institutions.find(i => i.id === id);
  $("#detailContent").innerHTML = `
    <div class="detail-head"><span class="category">${categoryLabels[x.category]} · ${x.evidence}级证据</span><h2>${x.name}</h2><p>${x.legalName}</p></div>
    <div class="detail-grid">
      <div class="detail-section"><h4>投资偏好</h4><p>${x.preference}</p></div>
      <div class="detail-section"><h4>期限与收益率</h4><p>主要关注 ${x.tenor}；研究收益率区间 ${x.yield}。</p></div>
      <div class="detail-section full"><h4>研究判断</h4><p>${x.rationale}</p></div>
      <div class="detail-section full"><h4>信息边界</h4><p>${x.disclaimer}</p></div>
      <div class="detail-section full"><h4>公开来源</h4><a class="detail-link" href="${x.source}" target="_blank" rel="noreferrer">打开来源或机构官网 ↗</a></div>
    </div>`;
  $("#detailDialog").showModal();
}

function bind() {
  $("#tabs").addEventListener("click", e => {
    if (!e.target.dataset.category) return;
    activeCategory = e.target.dataset.category;
    renderTabs(); renderCards();
  });
  $("#searchInput").addEventListener("input", renderCards);
  $("#institutionGrid").addEventListener("click", e => e.target.dataset.id && showDetail(e.target.dataset.id));
  $("#methodBtn").addEventListener("click", () => $("#methodDialog").showModal());
  $("#editBtn").addEventListener("click", () => { $("#jsonEditor").value = JSON.stringify(data, null, 2); $("#editDialog").showModal(); });
  document.querySelectorAll("[data-close]").forEach(x => x.addEventListener("click", () => x.closest("dialog").close()));
  $("#saveBtn").addEventListener("click", () => {
    try { data = JSON.parse($("#jsonEditor").value); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); $("#editorError").textContent = ""; $("#editDialog").close(); render(); }
    catch (e) { $("#editorError").textContent = `JSON 格式错误：${e.message}`; }
  });
  $("#resetBtn").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); data = structuredClone(repoData); $("#jsonEditor").value = JSON.stringify(data, null, 2); render(); });
  $("#exportBtn").addEventListener("click", () => {
    try {
      const value = JSON.parse($("#jsonEditor").value);
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })), download: "institutions.json" });
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { $("#editorError").textContent = `JSON 格式错误：${e.message}`; }
  });
}
init().catch(e => { document.body.innerHTML = `<main><h1>数据加载失败</h1><p>${e.message}</p></main>`; });
