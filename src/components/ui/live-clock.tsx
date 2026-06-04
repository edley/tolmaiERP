import { useState, useEffect } from 'react'

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={className}>
      {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      {' '}
      {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}
