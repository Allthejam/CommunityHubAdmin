
'use client'

import { useState, useEffect } from 'react'

const QUERY = '(max-width: 768px)'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // This check is redundant with 'use client' but is good practice.
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(QUERY)
    
    // Set the initial state after the component has mounted on the client.
    const updateState = () => setIsMobile(mediaQuery.matches)
    updateState();

    mediaQuery.addEventListener('change', updateState);
    return () => mediaQuery.removeEventListener('change', updateState);
  }, [])

  return isMobile
}
