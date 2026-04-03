/// <reference types="vite/client" />
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
  useRouter,
  useLocation,
} from '@tanstack/react-router'
import { auth } from '~/lib/api-client'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PayTab' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function NavBar() {
  const [loggedIn, setLoggedIn] = useState(false)
  const router = useRouter()
  const location = useLocation()

  useEffect(() => {
    setLoggedIn(auth.isLoggedIn())
  }, [location.pathname])

  if (!loggedIn) return null

  const handleLogout = async () => {
    await auth.logout()
    router.navigate({ to: '/login' })
  }

  return (
    <nav className="nav">
      <span className="nav-brand">PayTab</span>
      <Link to="/" activeProps={{ 'data-active': 'true' } as any} activeOptions={{ exact: true }}>Dashboard</Link>
      <Link to="/groups" activeProps={{ 'data-active': 'true' } as any}>Groups</Link>
      <Link to="/friends" activeProps={{ 'data-active': 'true' } as any}>Friends</Link>
      <Link to="/settlements" activeProps={{ 'data-active': 'true' } as any}>Settlements</Link>
      <div className="nav-spacer" />
      <button onClick={handleLogout}>Logout</button>
    </nav>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <NavBar />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
