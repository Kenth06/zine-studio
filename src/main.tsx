import { Toasty } from '@cloudflare/kumo/components/toast'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Follow the system appearance. The zine canvas stays paper-coloured either way.
const media = window.matchMedia('(prefers-color-scheme: dark)')
const applyMode = () => document.documentElement.setAttribute('data-mode', media.matches ? 'dark' : 'light')
applyMode()
media.addEventListener('change', applyMode)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toasty>
      <App />
    </Toasty>
  </StrictMode>,
)
