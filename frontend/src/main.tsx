import { Buffer as BufferPolyfill } from 'buffer'

if (typeof (globalThis as any).Buffer === 'undefined') {
  ;(globalThis as any).Buffer = BufferPolyfill
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)