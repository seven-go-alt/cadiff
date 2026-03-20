import React, { useState, useMemo } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import SheetTabs from './components/SheetTabs.jsx'
import DiffTable from './components/DiffTable.jsx'

export default function App() {
  const [diffResult, setDiffResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeSheet, setActiveSheet] = useState(null)

  const handleResult = result => {
    setDiffResult(result)
    // Auto-select first sheet with diff, or just first sheet
    const first = result.sheets.find(s => s.has_diff) || result.sheets[0]
    setActiveSheet(first?.name ?? null)
  }

  const currentSheet = useMemo(() => {
    if (!diffResult || !activeSheet) return null
    return diffResult.sheets.find(s => s.name === activeSheet) || null
  }, [diffResult, activeSheet])

  // Compute max column count across all hunks of the active sheet for consistent header
  const colCount = useMemo(() => {
    if (!currentSheet) return 0
    let max = 0
    for (const hunk of currentSheet.hunks) {
      for (const row of hunk.rows) {
        const len = Math.max(
          (row.old_cells || []).length,
          (row.new_cells || []).length
        )
        if (len > max) max = len
      }
    }
    return max
  }, [currentSheet])

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="logo">xlsx<span>-diff</span></div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Excel 文件差异对比工具
        </span>
      </header>

      <main className="app-main">
        {/* Upload / URL panel */}
        <UploadPanel onResult={handleResult} onLoading={setLoading} />

        {/* Loading */}
        {loading && (
          <div className="state-center">
            <div className="spinner" />
            <p>正在对比文件，请稍候…</p>
          </div>
        )}

        {/* Results */}
        {!loading && diffResult && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Sheet tabs */}
            <SheetTabs
              sheets={diffResult.sheets}
              activeSheet={activeSheet}
              onSelect={setActiveSheet}
            />

            {/* No diff at all */}
            {!diffResult.has_diff && (
              <div className="state-center">
                <span className="state-icon">🎉</span>
                <h3>文件完全一致</h3>
                <p>两个 Excel 文件内容相同，没有发现任何差异。</p>
              </div>
            )}

            {/* Active sheet diff */}
            {currentSheet && diffResult.has_diff && (
              <DiffTable sheet={currentSheet} colCount={colCount} />
            )}
          </div>
        )}

        {/* Welcome state */}
        {!loading && !diffResult && (
          <div className="state-center">
            <span className="state-icon">📊</span>
            <h3>Excel 差异对比</h3>
            <p>
              上传两个 .xlsx 文件，或粘贴 GitHub / GitLab 链接，<br />
              即可看到行级与字符级的精确差异。
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
