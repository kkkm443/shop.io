import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// CodeSandbox 전용 전역변수 — GitHub Pages에서는 undefined 처리됨
declare global {
  var __firebase_config: string | undefined
  var __app_id: string | undefined
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
