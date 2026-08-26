import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './phase2.css'
import './lesson-phase6.css'
import './interactive-workbench.css'
import './production.css'
import './license.css'
import './fieldops.css'
import './fieldops-controls.css'
import './fieldops-phase5.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
