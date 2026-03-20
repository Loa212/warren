import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { InstallBanner } from '@/components/install-banner'
import { PinLockScreen } from '@/components/pin-lock-screen'
import { usePinLock } from '@/lib/pin-lock'
import { applyAppTheme } from '@/lib/theme'

function RootLayout() {
  useEffect(() => {
    const saved = localStorage.getItem('warren:theme') ?? 'tokyo-night'
    applyAppTheme(saved)
  }, [])

  const { isLocked } = usePinLock()

  return (
    <>
      <InstallBanner />
      {isLocked ? <PinLockScreen /> : <Outlet />}
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
