import { useState, useEffect } from 'react'

// Minimal test version to check if React works
function App() {
  return (
    <div className="topbar">
      <h1>
        <span className="brand">AGRO</span>
        <span className="tagline">Another Good RAG Option</span>
      </h1>
      <div className="top-actions">
        <button id="btn-health">Health</button>
        <span id="health-status">—</span>
      </div>
    </div>
  )
}

export default App
