import React from 'react'

/**
 * Search input for filtering the diff table by keyword.
 *
 * @param {string}   query         - Current search query
 * @param {Function} onQueryChange - Called with new query string
 * @param {Array}    allRows       - (unused, kept for API compat)
 */
export default function SearchBar({ query, onQueryChange, allRows }) {
  return (
    <div className="search-input-wrap">
      <input
        id="diff-search"
        className="input"
        type="search"
        placeholder="搜索变更内容…"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        aria-label="搜索 diff 内容"
        style={{ maxWidth: 260 }}
      />
      {query && (
        <button
          className="btn btn-ghost"
          style={{ padding: '5px 10px', fontSize: 12 }}
          onClick={() => onQueryChange('')}
        >
          ✕
        </button>
      )}
    </div>
  )
}

