'use client'

import type { AudioTrack } from '@/app/types/audio'

interface TrackListProps {
  tracks: AudioTrack[]
  currentTrackIndex: number
  onTrackSelect: (index: number) => void
  onLockedAttempt?: () => void
  foregroundColor?: string
  elementBgColor?: string
  className?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function TrackLock({ color = '#fff' }: { color?: string }) {
  const grid = [
    '..####..',
    '.##..##.',
    '.#....#.',
    '.#....#.',
    '########',
    '########',
    '########',
    '###..###',
    '###..###',
    '########',
  ]
  return (
    <svg
      width={10}
      height={12}
      viewBox="0 0 8 10"
      shapeRendering="crispEdges"
      style={{ flexShrink: 0, filter: 'drop-shadow(1px 0 0 #000) drop-shadow(0 1px 0 #000)' }}
    >
      {grid.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.05} height={1.05} fill={color} /> : null
        )
      )}
    </svg>
  )
}

export function TrackList({
  tracks,
  currentTrackIndex,
  onTrackSelect,
  onLockedAttempt,
  foregroundColor,
  elementBgColor,
  className = ''
}: TrackListProps) {
  if (tracks.length <= 1) return null

  const activeColor = foregroundColor || '#000'
  const bgColor = elementBgColor || 'transparent'

  return (
    <div data-no-drag className={`space-y-1 ${className}`}>
      {tracks.map((track, index) => {
        const isCurrent = index === currentTrackIndex
        const locked = !!track.locked

        return (
          <button
            key={track.id}
            onClick={() => { if (locked) { onLockedAttempt?.() } else { onTrackSelect(index) } }}
            aria-disabled={locked}
            className="group relative w-full px-3 py-2 rounded-md text-left transition-all"
            style={{
              backgroundColor: isCurrent ? `${activeColor}20` : bgColor,
              borderLeft: isCurrent ? `3px solid ${activeColor}` : '3px solid transparent',
              cursor: locked ? 'not-allowed' : 'pointer',
            }}
          >
            {locked && (
              <span
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  background: '#fff',
                  border: '1px solid #000',
                  color: '#000',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontFamily: 'ChiKareGo2, pixChicago, monospace',
                  whiteSpace: 'nowrap',
                  zIndex: 50,
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
                }}
              >
                this songs not out yet :)
              </span>
            )}
            <div style={{ opacity: locked ? 0.45 : 1 }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: activeColor }}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: activeColor }}
                  >
                    {track.title}
                  </div>
                  {locked && <TrackLock color={activeColor} />}
                </div>
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: activeColor }}
              >
                {formatTime(track.duration)}
              </span>
            </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
