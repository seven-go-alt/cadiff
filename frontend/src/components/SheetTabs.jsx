import React from 'react'

/**
 * Sheet tab navigation with per-sheet change stats.
 *
 * @param {Array}    sheets       - Sheet diff objects [{name, has_diff, stats}, ...]
 * @param {string}   activeSheet  - Currently active sheet name
 * @param {Function} onSelect     - Called with sheet name when user clicks a tab
 */
export default function SheetTabs({ sheets, activeSheet, onSelect }) {
  if (!sheets || sheets.length === 0) return null

  return (
    <div className="tabs" role="tablist" aria-label="Excel sheets">
      {sheets.map(sheet => {
        const s = sheet.stats || {}
        const hasChanges = sheet.has_diff && (s.added || s.deleted || s.modified)
        return (
          <button
            key={sheet.name}
            id={`tab-${sheet.name}`}
            className={`tab-btn${activeSheet === sheet.name ? ' active' : ''}`}
            role="tab"
            aria-selected={activeSheet === sheet.name}
            aria-controls={`panel-${sheet.name}`}
            onClick={() => onSelect(sheet.name)}
          >
            {sheet.name}
            {hasChanges ? (
              <span className="tab-stats">
                {s.added   > 0 && <span className="ts-add">+{s.added}</span>}
                {s.deleted > 0 && <span className="ts-del">−{s.deleted}</span>}
                {s.modified > 0 && <span className="ts-mod">~{s.modified}</span>}
              </span>
            ) : sheet.has_diff ? (
              <span className="tab-badge" />
            ) : (
              <span className="tab-ok">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
