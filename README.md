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

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)

Navigate to the project root and install the dependencies. It's recommended to use [uv](https://github.com/astral-sh/uv) for fast backend management.

```bash
# Install dependencies and sync virtual environment
uv sync

# Start the FastAPI server (runs on http://localhost:8000)
uv run uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup (React + Vite)

Open a new terminal and navigate to the `frontend` folder.

```bash
cd frontend

# Install Node modules
npm install

# Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

### 3. Usage

1. Open http://localhost:5173 in your browser.
2. Drag and drop two `.xlsx` files into the "Old Version" and "New Version" targets.
3. Click "Compare Files" to view the detailed diff result.
4. Alternatively, switch to the "Git URL" tab to compare remote repository files.

---

## 🧠 Core Architecture

### Key-based vs Sequence-based Matching

The core logic handling Excel diffs is located in `backend/diff_engine.py`. To solve the classic problem of sorting/filtering obscuring row modifications, the tool uses a dual-path architecture:

1. **Key-based Matching (Primary):** The engine tests if the first column represents a relatively unique ID (≥70% uniqueness). If true, it runs `SequenceMatcher` strictly on keys. Rows with the same ID but completely different contents are guaranteed to be flagged as a strict "Modification", avoiding fragmented delete/insert spam.
2. **Sequence-based Matching (Fallback):** For data without keys, the engine falls back to standard diffing on tab-joined row strings, intelligently pairing unequal blocks positionally to preserve tracking of row edits.

---
*Created by Antigravity.*
