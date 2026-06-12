const DATA_URL = "data/institutions.json";
const STORAGE_KEY = "southbound-institution-research-v2";
let repoData;
let data;
let activeCategory = "全部";

const $ = (s) => document.querySelector(s);
const investorCategories = ["资管机构", "券商", "保险", "理财"];
const categoryLabels = { 资管机构: "基金公司", 保险: "保险", 理财: "理财", 券商: "券商" };

async function init() {
  repoData = await fetch(DATA_URL).then(r => r.json());
  const saved = localStorage.getItem(STORAGE_KEY);
  data = saved ? JSON.parse(saved) : structuredClone(repoData);
  render();
  bind();
}

function investors() {
  return data.institutions.filter(x => investorCategories.includes(x.category));
}

function filteredInvestors() {
  const q = $("#searchInput").value.trim().toLowerCase();
  return investors().filter(x => {
    const categoryMatch = activeCategory === "全部" || x.category === activeCategory;
    const text = [x.name, x.legalName, x.preference, ...(x.tags || [])].join(" ").toLowerCase();
    return categoryMatch && (!q || text.includes(q));
  });
}

function render() {
  $("#asOf").textContent = data.meta.updated;
  renderStats();
  renderTabs();
  renderCards();
  renderMarketMakers();
  renderSources();
}

function renderStats() {
  const rows = investors();
  const stats = [
    ["重点投资人", rows.length, "6基金 + 5券商 + 6保险 + 3理财"],
    ["基金公司", rows.filter(x => x.category === "资管机构").length, "主动及指数化固收"],
    ["券商", rows.filter(x => x.category === "券商").length, "交易及相对价值"],
    ["保险与理财", rows.filter(x => ["保险", "理财"].includes(x.category)).length, "长期配置与稳健票息"],
    ["做市商观察池", (data.marketMakers || []).length, "离岸做市及报价机构"]
  ];
  $("#stats").innerHTML = stats.map(x => `<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");
}

function renderTabs() {
  const cats = ["全部", ...investorCategories];
  $("#tabs").innerHTML = cats.map(cat => `<button class="tab ${activeCategory === cat ? "active" : ""}" data-category="${cat}">${cat === "资管机构" ? "基金公司" : cat}</button>`).join("");
}

function renderCards() {
  const rows = filteredInvestors();
  $("#investorCount").textContent = `当前显示 ${rows.length} / ${investors().length} 家重点机构`;
  $("#emptyState").classList.toggle("hidden", rows.length > 0);
  $("#institutionGrid").innerHTML = rows.map(x => `
    <article class="institution">
      <div class="institution-name"><h3>${x.name}</h3><p>${x.legalName}</p></div>
      <span class="badge category">${categoryLabels[x.category]}</span>
      <div class="preference">${x.preference}</div>
      <div class="mini-metric"><span>关注期限</span><strong>${x.tenor}</strong></div>
      <div class="mini-metric"><span>研究收益率</span><strong>${x.yield}</strong></div>
      <button class="card-action" data-id="${x.id}">详情</button>
    </article>`).join("");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const investorHeader = ["数据类型", "机构名称", "机构全称/英文名", "机构类别", "投资偏好/机构类型", "关注期限", "研究收益率区间", "证据等级", "公开来源"];
  const investorRows = filteredInvestors().map(x => [
    "投资人", x.name, x.legalName, categoryLabels[x.category], x.preference, x.tenor, x.yield, x.evidence, x.source
  ]);
  const makerRows = (data.marketMakers || []).map(x => [
    "做市商观察池", x.name, x.english, "做市商", x.type, "", "", "待核验", ""
  ]);
  const csv = [investorHeader, ...investorRows, ...makerRows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `南向通机构研究_${new Date().toISOString().slice(0, 10)}.csv`
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderMarketMakers() {
  $("#marketMakerList").innerHTML = (data.marketMakers || []).map((x, i) => `
    <article class="market-maker">
      <span class="market-index">${String(i + 1).padStart(2, "0")}</span>
      <div><h3>${x.name}</h3><p>${x.english}</p></div>
      <span class="badge market-type">${x.type}</span>
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
  $("#csvBtn").addEventListener("click", exportCsv);
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
