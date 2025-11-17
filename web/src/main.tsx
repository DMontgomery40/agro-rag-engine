import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
// CSS MUST be loaded in exact order to match /gui for ADA compliance
import './styles/tokens.css'
import './styles/main.css' // Inline styles from /gui/index.html
// inline-gui-styles.css is intentionally not imported due to duplicate/invalid blocks.
import './styles/style.css'
import './styles/global.css'
import './styles/micro-interactions.css'
import './styles/storage-calculator.css'
import './styles/slider-polish.css' // Range input polish for onboarding sliders

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
