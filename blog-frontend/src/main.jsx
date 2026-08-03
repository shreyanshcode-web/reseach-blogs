/* eslint-disable react-refresh/only-export-components */
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
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      navigate={clerkNavigate}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorBackground: "#111111",
          colorPrimary: "#ffffff",
          colorText: "#F5F5F5",
          colorTextSecondary: "#A5A5A5",
          colorInputBackground: "#18181B",
          colorInputText: "#ffffff",
          borderRadius: "18px",
        },
        elements: {
          card: "bg-transparent shadow-none border-none p-0 m-0 w-full",
          rootBox: "w-full",
          formButtonPrimary:
            "w-full !bg-white !text-black hover:!bg-zinc-200 rounded-xl transition-all font-semibold py-3",
          socialButtonsBlockButton:
            "!bg-zinc-900 border border-white/10 !text-white hover:!bg-zinc-800 rounded-xl transition-all",
          formFieldInput:
            "!bg-zinc-900 border border-white/10 !text-white placeholder:text-zinc-500 rounded-xl transition-all focus:border-white/20",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          footer: "hidden",
          dividerText: "!text-zinc-500",
          dividerLine: "bg-white/10",
          formFieldLabel: "!text-zinc-400 font-medium",
          formFieldInputShowPasswordButton: "!text-zinc-400 hover:!text-white",
          identityPreviewText: "!text-white",
          identityPreviewEditButton: "!text-white hover:underline",
          socialButtonsBlockButtonText: "!text-white", // Target the button text directly to fix dark text on dark background
        },
      }}
    >
      <BrowserRouter>
        <RouteTransitionLoader>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route index element={<LandingPage />} />

              <Route element={<AppShellLayout />}>
                <Route path="home" element={<HomeFeedPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="profile/:username" element={<ProfilePage />} />
                <Route path="post/:id" element={<PostViewPage />} />

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

              <Route path="creative" element={<CreativeLanding />} />
              <Route path="classic" element={<LandingPage />} />
              <Route path="hero" element={<HeroPage />} />

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
