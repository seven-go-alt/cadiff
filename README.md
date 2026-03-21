# cadiff (Excel Diff Tool)

A full-stack web application designed to accurately compare two Excel (`.xlsx`) files. It provides Git-style line-by-line and character-by-character diffing, tailored specifically for game configuration data, structured spreadsheets, and complex datasets.

## ✨ Features

- **Accurate Row Matching**: Automatically detects ID columns (primary keys) to accurately pair modified rows, ensuring changes are naturally classified as modifications (`~`) rather than misleading delete + insert operations.
- **Character-Level Diffs**: Uses `diff-match-patch` to highlight exactly which characters changed *within* a single Excel cell (similar to `git diff --word-diff`).
- **Git Provider Integration**: Directly fetch and compare files via GitHub/GitLab repository URLs without downloading them locally.
- **Rich Visuals**: Semantic and visually distinct rows for Added (Green), Deleted (Red), and Modified (Teal/Amber) data.
- **Intelligent Fallback**: For sheets lacking an ID column, the engine uses sequence matching and positional pairing to gracefully align partial modifications. 
- **Large File Support**: Built with `react-window` for virtual scrolling, ensuring smooth performance even with tens of thousands of rows.
- **Advanced Filtering**: Quickly search for text or isolate changes by type (Added, Deleted, Modified).

## 🛠 Tech Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, OpenPyXL, `diff-match-patch`, `difflib`.
- **Frontend**: React, Vite, `react-window`.
- **Package Management**: Managed seamlessly with `uv` (backend) and `npm` (frontend).

---

## 🚀 项目部署与启动

### 1. 后端设置 (FastAPI)

请在项目根目录下安装依赖。本项目推荐使用 [uv](https://github.com/astral-sh/uv) 进行快速的后端生态包管理。

```bash
# 安装依赖并同步当前虚拟环境
uv sync

# 启动 FastAPI 服务器（默认运行在 http://localhost:8000）
uv run uvicorn backend.main:app --reload --port 8000
```

### 2. 前端设置 (React + Vite)

请在您的终端中新开一个标签页，并进入 `frontend` 文件夹：

```bash
cd frontend

# 安装 Node 依赖包
npm install

# 启动 Vite 开发服务器（默认运行在 http://localhost:5173）
npm run dev
```

### 3. 操作说明

1. 在浏览器中打开 http://localhost:5173。
2. 将需要对比的两个 `.xlsx` 文件分别拖拽到“旧版本”和“新版本”虚线框中。
3. 点击“开始对比”按钮，页面将生成并显示详细差异。
4. 或者，您也可以切换至“Git URL”选项卡，输入远程仓库链接和分支直接对比。

### 4. 强制结束服务

如果您在后台运行了这些服务，或者找不到当时启动服务的终端，可以在任意终端执行以下命令来强制清理占用端口（8000 和 5173）的进程：

```bash
lsof -ti :8000,5173 | xargs kill -9
```

---

## 🧠 Core Architecture

### Key-based vs Sequence-based Matching

The core logic handling Excel diffs is located in `backend/diff_engine.py`. To solve the classic problem of sorting/filtering obscuring row modifications, the tool uses a dual-path architecture:

1. **Key-based Matching (Primary):** The engine tests if the first column represents a relatively unique ID (≥70% uniqueness). If true, it runs `SequenceMatcher` strictly on keys. Rows with the same ID but completely different contents are guaranteed to be flagged as a strict "Modification", avoiding fragmented delete/insert spam.
2. **Sequence-based Matching (Fallback):** For data without keys, the engine falls back to standard diffing on tab-joined row strings, intelligently pairing unequal blocks positionally to preserve tracking of row edits.

---
*Created by Antigravity.*
