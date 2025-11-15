import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<App />)
}

