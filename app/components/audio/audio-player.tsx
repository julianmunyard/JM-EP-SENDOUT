'use client'

import { useState, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react'
import type { AudioTrack, ReverbConfig } from '@/app/types/audio'
import { useAudioPlayer } from '@/app/audio/hooks/useAudioPlayer'
import { ReverbKnob } from './reverb-knob'
import { TrackList } from './track-list'

interface AudioPlayerProps {
  tracks: AudioTrack[]
  cardId: string
  lockedMessages?: string[]
  looping?: boolean
  autoplay?: boolean
  reverbConfig?: ReverbConfig
  foregroundColor?: string
  fontFamily?: string
  className?: string
}

function formatPoolsuiteTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function poolsuiteHalftone(color: string): React.CSSProperties {
  const dot = `radial-gradient(circle, ${color} 0.9px, transparent 0.9px)`
  return {
    background: [
      `${dot} 0 0 / 4px 5.5px`,
      `${dot} 2px 2.75px / 4px 5.5px`,
    ].join(', '),
  }
}

function useSpeedSliderTouch(
  trackRef: React.RefObject<HTMLDivElement | null>,
  onSpeedChange: (speed: number) => void
) {
  const dragging = useRef(false)
  const locked = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const calcSpeed = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const speed = Math.round((0.5 + ratio * 1.0) * 100) / 100
    onSpeedChange(speed)
  }, [trackRef, onSpeedChange])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragging.current = true
    locked.current = false
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return
    if (!locked.current) {
      const dx = Math.abs(e.touches[0].clientX - startPos.current.x)
      const dy = Math.abs(e.touches[0].clientY - startPos.current.y)
      if (dy > dx) { dragging.current = false; return }
      locked.current = true
    }
    e.preventDefault()
    calcSpeed(e.touches[0].clientX)
  }, [calcSpeed])

  const onTouchEnd = useCallback(() => {
    dragging.current = false
    locked.current = false
  }, [])

  return { onTouchStart, onTouchMove, onTouchEnd }
}

export function AudioPlayer({
  tracks,
  cardId,
  lockedMessages,
  looping = false,
  autoplay = false,
  reverbConfig,
  foregroundColor = '#000',
  fontFamily = 'monospace',
  className = ''
}: AudioPlayerProps) {
  const firstUnlockedIndex = tracks.findIndex(t => !t.locked)
  const initialIndex = firstUnlockedIndex >= 0 ? firstUnlockedIndex : 0
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialIndex)

  const psColor = foregroundColor
  const psBorder = `1px solid ${psColor}`
  const psRadius = '4px'
  const psBox: React.CSSProperties = { border: psBorder, borderRadius: psRadius }
  const psFont: React.CSSProperties = { fontFamily, color: psColor }

  const placeholderTrack: AudioTrack = {
    id: 'placeholder',
    title: 'TRACK TITLE',
    artist: '',
    duration: 0,
    audioUrl: '',
    storagePath: ''
  }
  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : placeholderTrack
  const currentTrackUrl = currentTrack.audioUrl || undefined

  const player = useAudioPlayer({
    cardId,
    trackUrl: currentTrackUrl,
    looping,
    autoplay,
    reverbConfig,
    onEnded: () => {
      if (!looping && tracks.length > 1) {
        // skip to next unlocked track; if none, stop
        let nextIndex = (currentTrackIndex + 1) % tracks.length
        for (let i = 0; i < tracks.length; i++) {
          if (!tracks[nextIndex].locked) {
            player?.queuePlayOnLoad()
            setCurrentTrackIndex(nextIndex)
            return
          }
          nextIndex = (nextIndex + 1) % tracks.length
          if (nextIndex === currentTrackIndex) return
        }
      }
    }
  })

  const displayTitle = player.isLoading && !player.isLoaded ? 'Loading...' : currentTrack.title
  const displayArtist = player.isLoading && !player.isLoaded ? '' : currentTrack.artist

  const handleTrackSelect = (index: number) => {
    player.queuePlayOnLoad()
    setCurrentTrackIndex(index)
  }

  // When someone tries to play a locked track, play a cheeky voice message,
  // cycling through the list on each attempt. Reuses one element so a new
  // attempt cuts off the previous message instead of stacking.
  const lockedMsgRef = useRef<HTMLAudioElement | null>(null)
  const lockedMsgCursor = useRef(0)
  const handleLockedAttempt = useCallback(() => {
    if (!lockedMessages || lockedMessages.length === 0) return
    const url = lockedMessages[lockedMsgCursor.current % lockedMessages.length]
    lockedMsgCursor.current += 1
    let el = lockedMsgRef.current
    if (!el) {
      el = new Audio()
      lockedMsgRef.current = el
    }
    el.src = url
    el.currentTime = 0
    el.play().catch(() => {})
  }, [lockedMessages])

  // Find the nearest unlocked track in the given direction, wrapping around.
  // Returns null if there is no other unlocked track to move to.
  const findAdjacentUnlocked = (direction: 1 | -1): number | null => {
    if (tracks.length === 0) return null
    let idx = currentTrackIndex
    for (let i = 0; i < tracks.length; i++) {
      idx = (idx + direction + tracks.length) % tracks.length
      if (idx === currentTrackIndex) break
      if (!tracks[idx].locked) return idx
    }
    return null
  }

  const handlePlay = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation()
    player.togglePlay()
  }

  const progressPercent = player.progress * 100
  const varispeedPercent = ((player.speed - 0.5) / (1.5 - 0.5)) * 100

  const varispeedTrackRef = useRef<HTMLDivElement>(null)
  const speedTouch = useSpeedSliderTouch(varispeedTrackRef, player.setSpeed)

  return (
    <div className={`flex flex-col gap-2 p-2.5 ${className}`} style={psFont}>
      {/* ── Box 1: Title + time + transport ── */}
      <div className="px-3 py-2" style={psBox}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-2">
          <div className="text-sm font-bold" style={{ color: psColor }}>
            {displayTitle}
            {displayArtist && (
              <span className="font-normal opacity-50"> — {displayArtist}</span>
            )}
          </div>
          <div className="text-sm font-bold tabular-nums ml-auto" style={{ color: psColor, opacity: 0.5 }}>
            {formatPoolsuiteTime(player.currentTime)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div
            className="flex items-stretch flex-shrink-0 w-fit"
            style={{ border: psBorder, borderRadius: psRadius, overflow: 'hidden' }}
          >
            <button
              onClick={handlePlay}
              disabled={!currentTrack}
              className="flex items-center justify-center w-10 h-8"
              style={{ borderRight: psBorder, borderRadius: 0, background: 'transparent' }}
              aria-label="Play"
            >
              <Play size={14} strokeWidth={2} fill={psColor} stroke={psColor} />
            </button>

            <button
              onClick={handlePlay}
              disabled={!currentTrack}
              className="flex items-center justify-center w-10 h-8"
              style={{ borderRight: psBorder, borderRadius: 0, background: 'transparent' }}
              aria-label="Pause"
            >
              <Pause size={14} strokeWidth={2} fill={psColor} stroke={psColor} />
            </button>

            {tracks.length > 1 && (
              <button
                onClick={() => {
                  const prevIndex = findAdjacentUnlocked(-1)
                  if (prevIndex !== null) handleTrackSelect(prevIndex)
                }}
                className="flex items-center justify-center w-10 h-8"
                style={{ borderRight: psBorder, borderRadius: 0, background: 'transparent' }}
                aria-label="Previous track"
              >
                <SkipBack size={14} strokeWidth={2} fill={psColor} stroke={psColor} />
              </button>
            )}

            {tracks.length > 1 && (
              <button
                onClick={() => {
                  const nextIndex = findAdjacentUnlocked(1)
                  if (nextIndex !== null) handleTrackSelect(nextIndex)
                }}
                className="flex items-center justify-center w-10 h-8"
                style={{ borderRight: psBorder, borderRadius: 0, background: 'transparent' }}
                aria-label="Next track"
              >
                <SkipForward size={14} strokeWidth={2} fill={psColor} stroke={psColor} />
              </button>
            )}

            <button
              onClick={() => player.setReverbMix(player.reverbMix > 0 ? 0 : 0.3)}
              className="flex items-center justify-center w-10 h-8"
              style={{ borderRadius: 0, background: 'transparent' }}
              aria-label="Toggle reverb"
            >
              <Music size={14} strokeWidth={2} stroke={psColor} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Box 2 + 3: Progress + Varispeed + Reverb knob ── */}
      <div data-no-drag className="flex items-stretch gap-2">
        {/* Left: Progress + Varispeed */}
        <div className="flex-1 min-w-0 px-3 py-2" style={psBox}>
          {/* Progress bar — bordered rectangle */}
          <div
            className="relative w-full p-[3px] cursor-pointer"
            style={{ border: psBorder, touchAction: 'none' }}
            onMouseDown={(e) => {
              const el = e.currentTarget
              const seek = (clientX: number) => {
                const rect = el.getBoundingClientRect()
                player.seek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
              }
              seek(e.clientX)
              const onMove = (ev: MouseEvent) => seek(ev.clientX)
              const onUp = () => {
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
              }
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
            onTouchStart={(e) => {
              const el = e.currentTarget
              const seek = (clientX: number) => {
                const rect = el.getBoundingClientRect()
                player.seek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
              }
              seek(e.touches[0].clientX)
              const onMove = (ev: TouchEvent) => {
                ev.preventDefault()
                seek(ev.touches[0].clientX)
              }
              const onEnd = () => {
                el.removeEventListener('touchmove', onMove)
                el.removeEventListener('touchend', onEnd)
              }
              el.addEventListener('touchmove', onMove, { passive: false })
              el.addEventListener('touchend', onEnd)
            }}
          >
            <div className="relative w-full h-1">
              <div
                className="absolute top-0 left-0 h-full"
                style={{ width: `${progressPercent}%`, backgroundColor: psColor }}
              />
            </div>
          </div>

          {/* Time display under progress */}
          <div className="flex justify-between font-mono text-[10px] mt-1" style={{ color: psColor }}>
            <span>{formatPoolsuiteTime(player.currentTime)}</span>
            <span>{formatPoolsuiteTime(player.duration)}</span>
          </div>

          {/* Varispeed: speed + mode */}
          <div className="flex items-center justify-between mt-1.5 mb-1">
            <span className="text-[10px] font-bold tabular-nums" style={{ color: psColor }}>
              {player.speed.toFixed(2)}x
            </span>
            <button
              onClick={() =>
                player.setVarispeedMode(player.varispeedMode === 'timestretch' ? 'natural' : 'timestretch')
              }
              className="px-1.5 py-0 text-[8px] uppercase tracking-wider"
              style={{ border: psBorder, color: psColor, borderRadius: '3px', background: 'transparent' }}
            >
              {player.varispeedMode === 'timestretch' ? 'Stretch' : 'Natural'}
            </button>
          </div>

          {/* Varispeed slider — halftone fill */}
          <div
            className="relative"
            style={{ touchAction: 'pan-y', margin: '0 0 -14px 0', padding: '0 0 14px 0' }}
            onTouchStart={speedTouch.onTouchStart}
            onTouchMove={speedTouch.onTouchMove}
            onTouchEnd={speedTouch.onTouchEnd}
          >
            <div ref={varispeedTrackRef} className="relative h-5" style={{ zIndex: 0 }}>
              <div className="absolute inset-0" style={poolsuiteHalftone(psColor)} />
              {varispeedPercent > 0 && (
                <div
                  className="absolute top-0 left-0 h-full z-[1]"
                  style={{
                    width: `${varispeedPercent}%`,
                    backgroundColor: '#fff',
                    border: `1px solid ${psColor}`,
                    borderRadius: '3px',
                  }}
                />
              )}
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={player.speed}
                onChange={(e) => player.setSpeed(parseFloat(e.target.value))}
                className="absolute inset-0 z-10 cursor-pointer"
                style={{ opacity: 0 }}
                aria-label="Varispeed"
              />
            </div>
          </div>

          {/* Tick marks */}
          <div className="flex justify-between mt-0.5 px-0.5">
            {[0.5, 1.0, 1.5].map((tick) => (
              <span key={tick} className="text-[7px] tabular-nums" style={{ color: psColor, opacity: 0.3 }}>
                {tick}x
              </span>
            ))}
          </div>
        </div>

        {/* Right: Reverb knob */}
        <div
          className="flex flex-col items-center justify-center gap-1 flex-shrink-0 px-3 py-2"
          style={psBox}
        >
          <ReverbKnob
            mix={player.reverbMix}
            onMixChange={player.setReverbMix}
            foregroundColor={psColor}
            elementBgColor="transparent"
          />
        </div>
      </div>

      {/* ── Box 4: Track list (multi-track only) ── */}
      {tracks.length > 1 && (
        <div className="px-2 py-2" style={psBox}>
          <TrackList
            tracks={tracks}
            currentTrackIndex={currentTrackIndex}
            onTrackSelect={handleTrackSelect}
            onLockedAttempt={handleLockedAttempt}
            foregroundColor={psColor}
            elementBgColor="transparent"
          />
        </div>
      )}
    </div>
  )
}
