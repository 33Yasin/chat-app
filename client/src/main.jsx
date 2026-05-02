import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// React uygulamasını kök (root) elementine bağla ve başlat
createRoot(document.getElementById('root')).render(
  // Geliştirme aşamasında olası hataları tespit etmek için StrictMode
  <StrictMode>
    <App />
  </StrictMode>,
)
