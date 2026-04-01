'use client'

import { useEffect } from 'react'
import { clearProblematicCookies } from '@/lib/cookie-utils'

export default function CookieFix() {
  useEffect(() => {
    // Clear problematic cookies on client-side mount
    clearProblematicCookies()
  }, [])

  return null // This component doesn't render anything
}
