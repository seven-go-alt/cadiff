import React from 'react'

/**
 * Renders a single table cell with character-level diff highlighting.
 *
 * @param {Array} segments  - [{text, op: "equal"|"delete"|"insert"}, ...]
 * @param {string} fallback - Plain text fallback when segments is null/empty
 */
export default function InlineCell({ segments, fallback = '' }) {
  if (!segments || segments.length === 0) {
    return <span>{fallback}</span>
  }

  return (
    <span>
      {segments.map((seg, i) => (
        <span key={i} className={`seg-${seg.op}`}>
          {seg.text}
        </span>
      ))}
    </span>
  )
}
