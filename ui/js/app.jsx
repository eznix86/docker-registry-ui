import { createRoot, } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import '../css/app.css'
import { StrictMode } from 'react'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
    return pages[`./Pages/${name}.jsx`]
  },
  setup({ el, App, props }) {
    const root = createRoot(el)
    root.render(<StrictMode>
      <App {...props} />
    </StrictMode>)
  },
})