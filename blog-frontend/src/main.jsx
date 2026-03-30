import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import './creative.css'
import './editorial.css'
import { GuestOnlyRoute, LandingRoute, ProtectedRoute } from './components/routing/RouteGuards.jsx'
import AppShellLayout from './layouts/AppShellLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import EditorLayout from './layouts/EditorLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import { initializeTheme } from './lib/theme.js'
import CreatePost from './pages/CreatePost.jsx'
import CreativeLanding from './pages/CreativeLanding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DashboardDraftsPage from './pages/DashboardDraftsPage.jsx'
import DashboardSettingsPage from './pages/DashboardSettingsPage.jsx'
import HeroPage from './pages/HeroPage.jsx'
import HomeFeedPage from './pages/HomeFeedPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import Login from './pages/Login.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PostViewPage from './pages/PostViewPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import Signup from './pages/Signup.jsx'

initializeTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingRoute><CreativeLanding /></LandingRoute>} />
          <Route path="/classic" element={<LandingPage />} />
          <Route path="/hero" element={<HeroPage />} />
        </Route>

        <Route element={<GuestOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
          </Route>
        </Route>

        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShellLayout />}>
            <Route path="/home" element={<HomeFeedPage />} />
          </Route>
          <Route element={<EditorLayout />}>
            <Route path="/editor" element={<CreatePost />} />
          </Route>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/posts" replace />} />
            <Route path="posts" element={<Dashboard />} />
            <Route path="drafts" element={<DashboardDraftsPage />} />
            <Route path="settings" element={<DashboardSettingsPage />} />
          </Route>
        </Route>

        <Route element={<AppShellLayout />}>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/post/:id" element={<PostViewPage />} />
        </Route>

        <Route path="/create-post" element={<Navigate to="/editor" replace />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
