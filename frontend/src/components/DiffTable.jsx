import React, { useMemo } from 'react'
import InlineCell from './InlineCell.jsx'
import SearchBar from './SearchBar.jsx'

/**
 * Flatten all hunks in a sheet diff into a renderable row list.
 * Each row has an extra synthetic "hunk-header" type for the @@ line.
 */
function flattenSheet(sheet) {
  const flat = []
  for (const hunk of sheet.hunks) {
    flat.push({
      type: 'hunk-header',
      label: `@@ -${hunk.old_start},${hunk.old_count} +${hunk.new_start},${hunk.new_count} @@`,
    })
    for (const row of hunk.rows) {
      if (row.type === 'replace') {
        // Emit two rows: old (replace-old) and new (replace-new)
        flat.push({ ...row, type: 'replace-old' })
        flat.push({ ...row, type: 'replace-new' })
      } else {
        flat.push(row)
      }
    }
  }
  return flat
}

/** Check whether a flat row matches a search query. */
function rowMatchesQuery(row, q) {
  if (!q) return true
  const lower = q.toLowerCase()
  const cells = row.type === 'replace-old'
    ? (row.old_cells || [])
    : row.type === 'replace-new'
    ? (row.new_cells || [])
    : (row.old_cells || row.new_cells || [])
  return cells.some(c => c.toLowerCase().includes(lower))
}

/** Check whether a flat row passes the active type filter. */
function rowMatchesFilter(row, filter) {
  if (filter === 'all') return true
  if (row.type === 'hunk-header') return false // handled separately
  if (row.type === 'equal') return filter === 'all'
  if (filter === 'insert') return row.type === 'insert'
  if (filter === 'delete') return row.type === 'delete'
  if (filter === 'replace') return row.type === 'replace-old' || row.type === 'replace-new'
  return true
}

/** Determine CSS class for a row. */
function rowClass(type) {
  switch (type) {
    case 'delete':      return 'row-delete'
    case 'insert':      return 'row-insert'
    case 'replace-old': return 'row-replace-old'
    case 'replace-new': return 'row-replace-new'
    case 'equal':       return 'row-equal'
    default:            return ''
  }
}

/** The type indicator symbol in the leftmost cell. */
function typeChar(type) {
  if (type === 'delete')      return '删除'
  if (type === 'insert')      return '新增'
  if (type === 'replace-old') return '修改↑'
  if (type === 'replace-new') return '修改↓'
  return ' '
}

/** Generate Excel-style column letter (A, B, … Z, AA, AB …) */
function colLetter(i) {
  let n = i, label = ''
  do { label = String.fromCharCode(65 + (n % 26)) + label; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return label
}

// Filter button definitions
const FILTERS = [
  { key: 'all',     label: '全部' },
  { key: 'replace', label: '修改',  cls: 'ts-mod' },
  { key: 'insert',  label: '新增',  cls: 'ts-add' },
  { key: 'delete',  label: '删除',  cls: 'ts-del' },
]

/**
 * Main diff table component.
 *
 * @param {Object} sheet    - A sheet diff object from the backend
 *                           (with .headers, .stats, .hunks)
 */
export default function DiffTable({ sheet }) {
  const [query,  setQuery]  = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const [colWidths, setColWidths] = React.useState({})

  const handleMouseDown = (e, i) => {
    e.preventDefault()
    const startX = e.pageX
    const th = e.target.parentElement
    const startWidth = th.getBoundingClientRect().width

    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX))
      setColWidths(prev => ({ ...prev, [i]: newWidth }))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const flatRows = useMemo(() => flattenSheet(sheet), [sheet])

  // Derive column count and headers from backend data
  const { numCols, activeCols, colHeaders } = useMemo(() => {
    // Backend provides row-0 as headers
    const backendHeaders = sheet.headers || []

    // Also scan hunks to find the actual max col count
    let max = backendHeaders.length
    for (const row of flatRows) {
      const len = Math.max(
        (row.old_cells || []).length,
        (row.new_cells || []).length
      )
      if (len > max) max = len
    }

    // Build display headers: use backend name when available, fall back to letters
    const headers = []
    for (let i = 0; i < max; i++) {
      headers.push(backendHeaders[i] || colLetter(i))
    }

    // Find columns that actually contain data in the current hunks
    const active = []
    for (let i = 0; i < max; i++) {
      let hasData = false
      for (const row of flatRows) {
        if (row.type === 'hunk-header') continue
        const oldC = (row.old_cells || [])[i]
        const newC = (row.new_cells || [])[i]
        if ((oldC !== null && oldC !== undefined && String(oldC).trim() !== '') ||
            (newC !== null && newC !== undefined && String(newC).trim() !== '')) {
          hasData = true
          break
        }
      }
      if (hasData) {
        active.push(i)
      }
    }

    return { numCols: max, activeCols: active, colHeaders: headers }
  }, [flatRows, sheet.headers])

  // Apply filter + search to produce visible rows
  const visibleRows = useMemo(() => {
    const isSearching = !!query
    const isFiltering = filter !== 'all'

    if (!isSearching && !isFiltering) return flatRows

    const result = []
    for (const row of flatRows) {
      if (row.type === 'hunk-header') continue // never show @@ when filtering / searching
      if (row.type === 'equal' && (isSearching || isFiltering)) continue
      if (!rowMatchesFilter(row, filter)) continue
      if (!rowMatchesQuery(row, query)) continue
      result.push(row)
    }
    return result
  }, [flatRows, query, filter])

  const stats = sheet.stats || {}

  if (!sheet.has_diff) {
    return (
      <div className="no-diff-banner">
        ✅ 该 Sheet 无差异
      </div>
    )
  }

  const showRaw = filter === 'all' && !query
  const displayRows = showRaw ? flatRows : visibleRows

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* Stats + filter bar */}
      <div className="filter-bar">
        <div className="filter-btns" role="group" aria-label="变更类型过滤">
          {FILTERS.map(f => {
            // Show count badge for each filter type
            let count = null
            if (f.key === 'insert')  count = stats.added
            if (f.key === 'delete')  count = stats.deleted
            if (f.key === 'replace') count = stats.modified

            return (
              <button
                key={f.key}
                className={`filter-btn${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {count != null && count > 0 && (
                  <span className={`filter-count ${f.cls || ''}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <SearchBar query={query} onQueryChange={setQuery} allRows={flatRows} />
      </div>

      <div className="diff-table-wrap">
        <table
          className="diff-table"
          id={`panel-${sheet.name}`}
          role="tabpanel"
          aria-labelledby={`tab-${sheet.name}`}
        >
          <colgroup>
            <col style={{ width: 52 }} />
            <col style={{ width: 44 }} />
            <col style={{ width: 44 }} />
            {activeCols.map((ci) => (
              <col key={ci} style={{ width: colWidths[ci] || 200 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th aria-label="变更类型" />
              <th className="rn-head">旧行号</th>
              <th className="rn-head">新行号</th>
              {activeCols.map((ci) => {
                const h = colHeaders[ci] || ''
                return (
                  <th key={ci} title={h}>
                    {h}
                    <div
                      className="col-resizer"
                      onMouseDown={(e) => handleMouseDown(e, ci)}
                      onDoubleClick={() => setColWidths(prev => { const next = { ...prev }; delete next[ci]; return next; })}
                      title="双击恢复默认宽度，拖拽调整宽度"
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              if (row.type === 'hunk-header') {
                return (
                  <tr key={idx} className="hunk-header">
                    <td colSpan={3 + activeCols.length}>{row.label}</td>
                  </tr>
                )
              }

              const isOld = row.type === 'replace-old' || row.type === 'delete'
              const cells  = isOld
                ? (row.old_cells || [])
                : (row.new_cells || row.old_cells || [])

              // Pad cells to numCols
              const paddedCells = [...cells]
              while (paddedCells.length < numCols) paddedCells.push('')

              return (
                <tr key={idx} className={rowClass(row.type)}>
                  <td className="type-cell">{typeChar(row.type)}</td>
                  <td className="rn">
                    {(row.type !== 'insert' && row.type !== 'replace-new')
                      ? (row.old_row_no ?? '') : ''}
                  </td>
                  <td className="rn">
                    {(row.type !== 'delete' && row.type !== 'replace-old')
                      ? (row.new_row_no ?? '') : ''}
                  </td>
                  {activeCols.map((ci) => {
                    const cell = paddedCells[ci] || ''
                    let segments = null
                    if (row.type === 'replace-old' && row.inline) {
                      segments = row.inline[ci]?.filter(s => s.op !== 'insert') || null
                    } else if (row.type === 'replace-new' && row.inline) {
                      segments = row.inline[ci]?.filter(s => s.op !== 'delete') || null
                    }
                    // Only show inline when the cell actually changed
                    const changed = segments && segments.some(s => s.op !== 'equal')
                    return (
                      <td key={ci} className={changed ? 'cell-changed' : ''}>
                        <InlineCell segments={changed ? segments : null} fallback={cell} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {!showRaw && displayRows.length === 0 && (
          <div className="state-center" style={{ padding: '40px' }}>
            <span className="state-icon">🔍</span>
            <p>
              {query ? `未找到包含"${query}"的变更行` : '该类型暂无变更行'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
