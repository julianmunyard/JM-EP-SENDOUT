'use client'

import { Play, Pause, Loader2 } from 'lucide-react'

interface PlayerControlsProps {
  isPlaying: boolean
  isLoaded: boolean
  isLoading: boolean
  onTogglePlay: () => void
  foregroundColor?: string
  elementBgColor?: string
  className?: string
}

export function PlayerControls({
  isPlaying,
  isLoaded,
  isLoading,
  onTogglePlay,
  foregroundColor,
  elementBgColor,
  className = ''
}: PlayerControlsProps) {
  const iconColor = foregroundColor || 'currentColor'
  const bgColor = elementBgColor || 'rgba(0, 0, 0, 0.1)'

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
      onTouchEnd={(e) => {
        if (!isLoaded && !isLoading) return
        e.preventDefault()
        e.stopPropagation()
        onTogglePlay()
      }}
      disabled={!isLoaded && !isLoading}
      className={`flex items-center justify-center transition-all relative z-10 h-11 w-11 rounded-full ${className}`}
      style={{
        backgroundColor: bgColor,
        opacity: !isLoaded && !isLoading ? 0.5 : 1,
        cursor: !isLoaded && !isLoading ? 'not-allowed' : 'pointer'
      }}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: iconColor }} />
      ) : isPlaying ? (
        <Pause className="h-5 w-5" style={{ color: iconColor }} />
      ) : (
        <Play className="h-5 w-5 ml-0.5" style={{ color: iconColor }} />
      )}
    </button>
  )
}
