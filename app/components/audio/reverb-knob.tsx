'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface ReverbKnobProps {
  mix: number
  onMixChange: (mix: number) => void
  foregroundColor?: string
  elementBgColor?: string
  className?: string
}

export function ReverbKnob({
  mix,
  onMixChange,
  foregroundColor,
  elementBgColor,
  className = ''
}: ReverbKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef<number>(0)
  const dragStartValue = useRef<number>(0)

  const activeColor = foregroundColor || '#000'
  const bgColor = elementBgColor || '#fff'

  const onMixChangeRef = useRef(onMixChange)
  onMixChangeRef.current = onMixChange

  const handleStart = (clientY: number) => {
    setIsDragging(true)
    dragStartY.current = clientY
    dragStartValue.current = mix
  }

  const handleMove = useCallback((clientY: number) => {
    const deltaY = dragStartY.current - clientY
    const sensitivity = 0.005
    const newMix = Math.max(0, Math.min(1, dragStartValue.current + deltaY * sensitivity))
    onMixChangeRef.current(newMix)
  }, [])

  const handleEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      handleMove(e.touches[0].clientY)
    }

    const handleMouseUp = () => handleEnd()
    const handleTouchEnd = () => handleEnd()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleMove, handleEnd])

  const minAngle = -135
  const maxAngle = 135
  const angle = minAngle + (maxAngle - minAngle) * mix

  const knobSize = 64
  const knobCenter = knobSize / 2
  const knobRadius = 20
  const innerTickR = 24
  const outerTickR = 28
  const indicatorEnd = knobCenter - knobRadius + 2

  return (
    <div data-no-drag className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        ref={knobRef}
        className="relative cursor-pointer select-none"
        style={{ width: knobSize, height: knobSize, touchAction: 'none' }}
        onMouseDown={(e) => handleStart(e.clientY)}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
      >
        <svg width={knobSize} height={knobSize} viewBox={`0 0 ${knobSize} ${knobSize}`}>
          {Array.from({ length: 11 }).map((_, i) => {
            const tickCount = 10
            const tickAngle = minAngle + ((maxAngle - minAngle) / tickCount) * i
            const tickRad = ((tickAngle - 90) * Math.PI) / 180

            const x1 = Math.round((knobCenter + innerTickR * Math.cos(tickRad)) * 100) / 100
            const y1 = Math.round((knobCenter + innerTickR * Math.sin(tickRad)) * 100) / 100
            const x2 = Math.round((knobCenter + outerTickR * Math.cos(tickRad)) * 100) / 100
            const y2 = Math.round((knobCenter + outerTickR * Math.sin(tickRad)) * 100) / 100

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={activeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )
          })}

          <circle
            cx={knobCenter}
            cy={knobCenter}
            r={knobRadius}
            fill={bgColor}
            stroke={activeColor}
            strokeWidth="2"
          />

          <line
            x1={knobCenter}
            y1={knobCenter}
            x2={knobCenter}
            y2={indicatorEnd}
            stroke={activeColor}
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              transformOrigin: 'center',
              transform: `rotate(${angle}deg)`
            }}
          />
        </svg>
      </div>

      <div className="flex items-center flex-col">
        <span className="font-mono font-bold text-xs" style={{ color: activeColor }}>
          REVERB
        </span>
        <span className="font-mono text-xs" style={{ color: activeColor }}>
          {Math.round(mix * 100)}%
        </span>
      </div>
    </div>
  )
}
