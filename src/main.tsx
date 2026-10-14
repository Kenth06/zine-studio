import { Toasty } from '@cloudflare/kumo/components/toast'
import { TooltipProvider } from '@cloudflare/kumo/components/tooltip'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delay={500}>
      <Toasty>
        <App />
      </Toasty>
    </TooltipProvider>
  </StrictMode>,
)
