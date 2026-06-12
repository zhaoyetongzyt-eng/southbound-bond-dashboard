# 南向通机构研究面板

一个可直接部署到 GitHub Pages 的静态研究网站。当前包含：

- 开始指引页：投资人与做市商分开展示
- 41 家南向通银行投资人，以及基金公司、券商、保险及理财机构研究池
- 可在机构详情中编辑投资偏好、关注期限、币种与收益率研究区间
- 债券通官方公布的 22 家南向通做市商名单
- 搜索、筛选、详情弹窗
- 将当前筛选后的投资人数据导出为 CSV
- 浏览器内 JSON 编辑、保存、恢复与导出
- 明确区分公开披露、研究推断和行业估计

## 公开网站

- Vercel：<https://southbound-bond-dashboard.vercel.app/>
- GitHub Pages：<https://zhaoyetongzyt-eng.github.io/southbound-bond-dashboard/>

## 本地运行

```bash
python3 -m http.server 8000
```

打开 `http://localhost:8000`。

## 更新数据

1. 点击页面右上角“编辑数据”。
2. 修改 JSON 并保存到浏览器进行预览。
3. 点击“导出 JSON”，用导出的文件替换 `data/institutions.json`。
4. 提交到 GitHub，GitHub Pages 会自动更新。

## 部署到 GitHub Pages

在 GitHub 新建仓库后，将本目录提交并推送。进入仓库：

`Settings` → `Pages` → `Build and deployment` → `Deploy from a branch` → 选择 `main` 和 `/ (root)`。

## 研究限制

公开资料通常不披露单家机构的南向通实际持仓、内部收益率门槛或完整投资授权。面板中的收益率为研究区间，不是机构报价，也不构成投资建议。
