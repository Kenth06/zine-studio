import { useEffect, useState } from 'react'

const read = () => ({ w: window.innerWidth, h: window.innerHeight })

/** Window size, for fitting paper to the screen at true proportions. */
export function useViewport() {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const on = () => setVp(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}
