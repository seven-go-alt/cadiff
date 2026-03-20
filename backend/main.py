"""
main.py — FastAPI application for xlsx-diff web service.

Endpoints:
  POST /api/diff/upload   multipart: old_file, new_file, sheet?
  POST /api/diff/git      JSON: { old_url, new_url, sheet?, token? }

Run locally:
  uv run uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.diff_engine import diff_workbooks
from backend.git_provider import fetch_file

app = FastAPI(
    title="xlsx-diff API",
    description="Compare Excel files and return structured diff JSON",
    version="0.1.0",
)

# Allow all origins so the Vite dev server (localhost:5173) can call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

@app.post("/api/diff/upload")
async def diff_upload(
    old_file: UploadFile = File(..., description="Old xlsx file"),
    new_file: UploadFile = File(..., description="New xlsx file"),
    sheet: str | None = Form(None, description="Limit diff to this sheet name"),
) -> dict:
    """
    Accept two xlsx files via multipart upload and return a diff JSON.
    """
    for f in (old_file, new_file):
        if not f.filename or not f.filename.lower().endswith(".xlsx"):
            raise HTTPException(
                status_code=400,
                detail=f"File '{f.filename}' is not an .xlsx file.",
            )

    old_bytes = await old_file.read()
    new_bytes = await new_file.read()

    try:
        result = diff_workbooks(old_bytes, new_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Filter to a single sheet if requested
    if sheet:
        result["sheets"] = [s for s in result["sheets"] if s["name"] == sheet]
        if not result["sheets"]:
            raise HTTPException(
                status_code=404, detail=f"Sheet '{sheet}' not found in one or both files."
            )
        result["has_diff"] = any(s["has_diff"] for s in result["sheets"])

    return result


# ---------------------------------------------------------------------------
# Git URL endpoint
# ---------------------------------------------------------------------------

class GitDiffRequest(BaseModel):
    old_url: str
    new_url: str
    sheet: str | None = None
    token: str | None = None


@app.post("/api/diff/git")
async def diff_git(req: GitDiffRequest) -> dict:
    """
    Download two xlsx files from GitHub/GitLab (or any raw URL) and return diff JSON.
    """
    try:
        old_bytes, new_bytes = await _fetch_pair(req.old_url, req.new_url, req.token)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch file(s): {exc}",
        ) from exc

    try:
        result = diff_workbooks(old_bytes, new_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if req.sheet:
        result["sheets"] = [s for s in result["sheets"] if s["name"] == req.sheet]
        if not result["sheets"]:
            raise HTTPException(
                status_code=404, detail=f"Sheet '{req.sheet}' not found."
            )
        result["has_diff"] = any(s["has_diff"] for s in result["sheets"])

    return result


async def _fetch_pair(
    old_url: str, new_url: str, token: str | None
) -> tuple[bytes, bytes]:
    """Concurrently fetch both files."""
    import asyncio
    old_task = asyncio.create_task(fetch_file(old_url, token))
    new_task = asyncio.create_task(fetch_file(new_url, token))
    return await old_task, await new_task


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entrypoint for `uv run xlsx-diff-server`
# ---------------------------------------------------------------------------

def start() -> None:
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    start()
