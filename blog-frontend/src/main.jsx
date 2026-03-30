import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import LandingPage from './pages/LandingPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HeroPage from './pages/HeroPage.jsx'
import CreatePost from './pages/CreatePost.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import CreativeLanding from './pages/CreativeLanding.jsx'
import { initializeTheme } from './lib/theme.js'

initializeTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreativeLanding />} />
        <Route path="/classic" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hero" element={<HeroPage />} />
        <Route path="/create-post" element={<CreatePost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
