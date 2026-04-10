import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { UIProvider } from './context/UIContext.jsx'
import { GlobalLoader, GlobalToast } from './components/GlobalUI.jsx'

import { AuthProvider } from './context/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <UIProvider>
      <AuthProvider>
        <GlobalLoader />
        <GlobalToast />
        <App />
      </AuthProvider>
    </UIProvider>
    </BrowserRouter>
  </React.StrictMode>,
)