import { Suspense, StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'

import './creative.css'
import './editorial.css'
import RouteTransitionLoader from './components/RouteTransitionLoader.jsx'
import { GuestOnlyRoute, ProtectedRoute } from './components/routing/RouteGuards.jsx'
import AppShellLayout from './layouts/AppShellLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import EditorLayout from './layouts/EditorLayout.jsx'
import { initializeTheme } from './lib/theme.js'

const CreatePost = lazy(() => import('./pages/CreatePost.jsx'))
const CreativeLanding = lazy(() => import('./pages/CreativeLanding.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const DashboardDraftsPage = lazy(() => import('./pages/DashboardDraftsPage.jsx'))
const DashboardSettingsPage = lazy(() => import('./pages/DashboardSettingsPage.jsx'))
const HeroPage = lazy(() => import('./pages/HeroPage.jsx'))
const HomeFeedPage = lazy(() => import('./pages/HomeFeedPage.jsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const PostViewPage = lazy(() => import('./pages/PostViewPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx')
)

initializeTheme()

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ""
function clerkNavigate(to) {
  window.history.pushState(null, "", to)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function RouteFallback() {
  return <div className="app-shell__empty">Loading page...</div>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} navigate={clerkNavigate}>
      <BrowserRouter>
        <RouteTransitionLoader>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AppShellLayout />}>
                <Route index element={<HomeFeedPage />} />
                <Route path="home" element={<HomeFeedPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="profile/:username" element={<ProfilePage />} />
                <Route path="post/:id" element={<PostViewPage />} />

                <Route path="creative" element={<CreativeLanding />} />
                <Route path="classic" element={<LandingPage />} />
                <Route path="hero" element={<HeroPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<EditorLayout />}>
                    <Route path="editor" element={<CreatePost />} />
                    <Route path="editor/:postId" element={<CreatePost />} />
                  </Route>
                  <Route path="dashboard" element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/dashboard/posts" replace />} />
                    <Route path="posts" element={<Dashboard />} />
                    <Route path="drafts" element={<DashboardDraftsPage />} />
                    <Route path="settings" element={<DashboardSettingsPage />} />
                  </Route>
                </Route>

                <Route path="create-post" element={<Navigate to="/editor" replace />} />
              </Route>

              <Route element={<GuestOnlyRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="auth/login/*" element={<Login />} />
                  <Route path="auth/signup/*" element={<Signup />} />
                </Route>
              </Route>

              <Route path="login" element={<Navigate to="/auth/login" replace />} />
              <Route path="signup" element={<Navigate to="/auth/signup" replace />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </RouteTransitionLoader>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
