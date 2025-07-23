/*
 * Copyright (c) 2025 CANDIDE Labs. All rights reserved.
 *
 * This software contains confidential and proprietary information of CANDIDE Labs.
 * Any reproduction, modification, or distribution of this software, in whole or in part,
 * without the express written consent of CANDIDE Labs is strictly prohibited.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// Keep the import of the wallets file to eval so w3m package can initialise
// the required globals
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
