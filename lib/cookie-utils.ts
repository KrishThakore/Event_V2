// Utility functions to handle cookie parsing issues

export function clearProblematicCookies() {
  if (typeof window !== 'undefined') {
    // Clear any potentially problematic legacy cookies
    const cookiesToClear = [
      'auth.token',
      'auth.refreshToken',
      'sb-access-token',
      'sb-refresh-token'
    ]
    
    cookiesToClear.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
    })
  }
}

export function isBase64Encoded(str: string): boolean {
  try {
    return str.startsWith('base64-') && /^[A-Za-z0-9+/]*={0,2}$/.test(str.slice(7))
  } catch {
    return false
  }
}

export function safeBase64Decode(str: string): string | null {
  try {
    if (!str.startsWith('base64-')) return str
    const base64Part = str.slice(7)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Part)) return null
    return atob(base64Part)
  } catch {
    return null
  }
}
