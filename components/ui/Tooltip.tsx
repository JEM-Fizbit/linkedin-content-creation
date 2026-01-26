'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom'
}

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      let top: number
      if (position === 'top') {
        top = triggerRect.top - tooltipRect.height - 6
      } else {
        top = triggerRect.bottom + 6
      }
      let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      // Keep tooltip within viewport
      if (left < 4) left = 4
      if (left + tooltipRect.width > window.innerWidth - 4) {
        left = window.innerWidth - tooltipRect.width - 4
      }
      if (top < 4) {
        top = triggerRect.bottom + 6
      }
      setCoords({ top, left })
    }
  }, [visible, position])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => { setVisible(false); setCoords(null) }}
    >
      {children}
      {visible && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none transition-opacity"
          style={coords ? { top: coords.top, left: coords.left, opacity: 1 } : { opacity: 0, top: 0, left: 0 }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
