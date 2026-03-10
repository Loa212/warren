import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { applyAppTheme } from '@/lib/theme'

function RootLayout() {
  useEffect(() => {
    const saved = localStorage.getItem('warren:theme') ?? 'tokyo-night'
    applyAppTheme(saved)
  }, [])

  return <Outlet />
}

export const Route = createRootRoute({
  component: RootLayout,
})
