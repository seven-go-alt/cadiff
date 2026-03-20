import React, { useState, useCallback } from 'react'

const API_BASE = '/api'

/**
 * Upload panel with two modes:
 *   - "upload": drag-and-drop two local .xlsx files
 *   - "git":    enter GitHub/GitLab blob URLs + optional token
 */
export default function UploadPanel({ onResult, onLoading }) {
  const [mode, setMode] = useState('upload')
  const [oldFile, setOldFile] = useState(null)
  const [newFile, setNewFile] = useState(null)
  const [oldUrl, setOldUrl] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [token, setToken] = useState('')
  const [sheet, setSheet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setLoad = v => { setLoading(v); onLoading?.(v) }

  // ── Submit handlers ──────────────────────────────────────
  const handleUploadSubmit = async () => {
    if (!oldFile || !newFile) return
    setError(null)
    setLoad(true)
    try {
      const fd = new FormData()
      fd.append('old_file', oldFile)
      fd.append('new_file', newFile)
      if (sheet.trim()) fd.append('sheet', sheet.trim())

      const res = await fetch(`${API_BASE}/diff/upload`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      onResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoad(false)
    }
  }

  const handleGitSubmit = async () => {
    if (!oldUrl.trim() || !newUrl.trim()) return
    setError(null)
    setLoad(true)
    try {
      const res = await fetch(`${API_BASE}/diff/git`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_url: oldUrl.trim(),
          new_url: newUrl.trim(),
          token: token.trim() || null,
          sheet: sheet.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }
      onResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoad(false)
    }
  }

  const canSubmitUpload = oldFile && newFile && !loading
  const canSubmitGit    = oldUrl.trim() && newUrl.trim() && !loading

  return (
    <div className="card upload-panel">
      {/* Mode switcher */}
      <div className="mode-tabs">
        <button
          id="mode-tab-upload"
          className={`mode-tab${mode === 'upload' ? ' active' : ''}`}
          onClick={() => setMode('upload')}
        >
          📁 上传文件
        </button>
        <button
          id="mode-tab-git"
          className={`mode-tab${mode === 'git' ? ' active' : ''}`}
          onClick={() => setMode('git')}
        >
          🔗 Git URL
        </button>
      </div>

      <div className="upload-body">
        {mode === 'upload' ? (
          <UploadMode
            oldFile={oldFile} setOldFile={setOldFile}
            newFile={newFile} setNewFile={setNewFile}
          />
        ) : (
          <GitMode
            oldUrl={oldUrl} setOldUrl={setOldUrl}
            newUrl={newUrl} setNewUrl={setNewUrl}
            token={token}   setToken={setToken}
          />
        )}

        {/* Shared: optional sheet filter */}
        <div className="form-group" style={{ maxWidth: 260 }}>
          <label className="form-label" htmlFor="sheet-filter">指定 Sheet（可选）</label>
          <input
            id="sheet-filter"
            className="input"
            placeholder="全部 sheets"
            value={sheet}
            onChange={e => setSheet(e.target.value)}
          />
        </div>

        {error && (
          <div className="error-msg" role="alert">
            ⚠️ {error}
          </div>
        )}

        <div className="submit-row">
          <button
            id="btn-diff"
            className="btn btn-primary"
            disabled={mode === 'upload' ? !canSubmitUpload : !canSubmitGit}
            onClick={mode === 'upload' ? handleUploadSubmit : handleGitSubmit}
          >
            {loading ? '对比中…' : '开始对比 →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── File drop zone ───────────────────────────────────────── */
function DropZone({ id, label, file, onFile }) {
  const [drag, setDrag] = useState(false)

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.xlsx')) onFile(f)
  }, [onFile])

  return (
    <label
      htmlFor={id}
      className={`drop-zone${drag ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input
        id={id}
        type="file"
        accept=".xlsx"
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f) }}
      />
      <span className="drop-icon">{file ? '✅' : '📂'}</span>
      {file
        ? <span className="drop-filename">{file.name}</span>
        : <span className="drop-label">{label}<br /><small>拖放或点击选择 .xlsx</small></span>
      }
    </label>
  )
}

function UploadMode({ oldFile, setOldFile, newFile, setNewFile }) {
  return (
    <div className="upload-row">
      <div className="form-group">
        <label className="form-label">旧版本文件（Before）</label>
        <DropZone id="drop-old" label="旧版本 .xlsx" file={oldFile} onFile={setOldFile} />
      </div>
      <div className="form-group">
        <label className="form-label">新版本文件（After）</label>
        <DropZone id="drop-new" label="新版本 .xlsx" file={newFile} onFile={setNewFile} />
      </div>
    </div>
  )
}

function GitMode({ oldUrl, setOldUrl, newUrl, setNewUrl, token, setToken }) {
  return (
    <>
      <div className="url-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="url-old">旧版本 URL（GitHub / GitLab blob 或 raw）</label>
          <input
            id="url-old"
            className="input"
            placeholder="https://github.com/owner/repo/blob/abc123/data.xlsx"
            value={oldUrl}
            onChange={e => setOldUrl(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="url-new">新版本 URL</label>
          <input
            id="url-new"
            className="input"
            placeholder="https://github.com/owner/repo/blob/def456/data.xlsx"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
        </div>
      </div>
      <div className="url-row-single">
        <div className="form-group">
          <label className="form-label" htmlFor="git-token">Access Token（私有仓库可选）</label>
          <input
            id="git-token"
            className="input"
            type="password"
            placeholder="ghp_… 或 glpat_…"
            value={token}
            onChange={e => setToken(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
    </>
  )
}
