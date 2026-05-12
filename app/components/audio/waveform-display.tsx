'use client'

import { useRef, useEffect, useState } from 'react'

interface WaveformDisplayProps {
  showWaveform: boolean
  waveformData?: number[]
  progress: number
  currentTime: number
  duration: number
  onSeek: (position: number) => void
  foregroundColor?: string
  elementBgColor?: string
  className?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function WaveformDisplay({
  showWaveform,
  waveformData,
  progress,
  currentTime,
  duration,
  onSeek,
  foregroundColor,
  elementBgColor,
  className = ''
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const activeColor = foregroundColor || '#000'
  const inactiveColor = elementBgColor || '#e5e7eb'

  const handleSeek = (clientX: number) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const position = Math.max(0, Math.min(1, x / rect.width))
    onSeek(position)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleSeek(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    handleSeek(e.touches[0].clientX)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleSeek(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      handleSeek(e.touches[0].clientX)
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

  return (
    <div data-no-drag className={`space-y-2 ${className}`}>
      <div
        ref={containerRef}
        className="relative cursor-pointer select-none h-16"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ touchAction: 'none' }}
      >
        {showWaveform && waveformData && waveformData.length > 0 ? (
          <div className="flex items-center justify-between h-full gap-[1px]">
            {waveformData.map((peak, index) => {
              const barProgress = index / waveformData.length
              const isPlayed = barProgress <= progress
              const height = Math.max(4, peak * 100)

              return (
                <div
                  key={index}
                  className="flex-1 flex items-center justify-center"
                >
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isPlayed ? activeColor : inactiveColor
                    }}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-full flex items-center">
            <div className="relative w-full h-2 rounded-full" style={{ backgroundColor: inactiveColor }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: activeColor
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md"
                style={{
                  left: `${progress * 100}%`,
                  transform: `translate(-50%, -50%)`,
                  backgroundColor: activeColor
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between font-mono text-xs" style={{ color: activeColor }}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
