'use client'
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import WaveSurfer from 'wavesurfer.js'

// Global state for current song
let currentGlobalSong: { src: string; title: string } | null = null
let globalPlayerWavesurfer: WaveSurfer | null = null
let globalSongList: { src: string; title: string }[] = []
let globalSetters: {
  setCurrentSong: (song: { src: string; title: string } | null) => void
  setIsPlaying: (playing: boolean) => void
  skipToNext: () => void
  skipToPrevious: () => void
} | null = null

// Individual SongCard component (Spotify-style list item)
interface Props {
  src: string
  title: string
}

// Container component for song list
interface SongListProps {
  children: ReactNode
  title?: string
}

function SongList({ children, title = "PLAYLIST" }: SongListProps) {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
      maxWidth: '600px',
      margin: '20px auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: '#fff',
          fontFamily: 'monospace',
          letterSpacing: '2px',
          textShadow: '0 0 6px rgba(255,255,255,0.6)'
        }}>
          {title.toUpperCase()}
        </h3>
      </div>
      
      {/* Song list */}
      <div style={{
        padding: '8px'
      }}>
        {children}
      </div>
    </div>
  )
}

function SongCard({ src, title }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const song = { src, title }
    const existingIndex = globalSongList.findIndex(s => s.src === src)
    if (existingIndex === -1) globalSongList.push(song)
    return () => {
      const index = globalSongList.findIndex(s => s.src === src)
      if (index !== -1) globalSongList.splice(index, 1)
    }
  }, [src, title])

  useEffect(() => {
    const syncWithGlobal = () => {
      const isCurrentGlobalSong = currentGlobalSong?.src === src
      if (isCurrentGlobalSong && globalPlayerWavesurfer) {
        setIsPlaying(globalPlayerWavesurfer.isPlaying())
      } else {
        setIsPlaying(false)
      }
    }
    const interval = setInterval(syncWithGlobal, 100)
    return () => clearInterval(interval)
  }, [src])

  const togglePlay = () => {
    if (!globalSetters) return
    const isCurrentGlobalSong = currentGlobalSong?.src === src
    if (isCurrentGlobalSong) {
      if (globalPlayerWavesurfer) {
        if (globalPlayerWavesurfer.isPlaying()) {
          globalPlayerWavesurfer.pause()
          globalSetters.setIsPlaying(false)
        } else {
          globalPlayerWavesurfer.play()
          globalSetters.setIsPlaying(true)
        }
      }
    } else {
      currentGlobalSong = { src, title }
      globalSetters.setCurrentSong({ src, title })
      globalSetters.setIsPlaying(true)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(5px)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        marginBottom: '4px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: currentGlobalSong?.src === src
          ? 'inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 8px rgba(255,255,255,0.2)'
          : '0 2px 4px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = currentGlobalSong?.src === src
          ? 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 4px 8px rgba(255,255,255,0.1)'
          : '0 4px 8px rgba(0,0,0,0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = currentGlobalSong?.src === src
          ? 'inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 8px rgba(255,255,255,0.2)'
          : '0 2px 4px rgba(0,0,0,0.1)'
      }}
      onClick={togglePlay}
    >
      <button
        type="button"
        tabIndex={-1} // remove if you want keyboard focus here
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
        style={{
          // hard reset to avoid Safari / global CSS overriding the first button
          appearance: 'none' as any,
          WebkitAppearance: 'none',
          outline: 'none',
          boxShadow: 'none',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255,255,255,0.6)',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '8px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          // also guard against any user-agent default “white” state
          backgroundClip: 'padding-box'
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'rgba(255,255,255,0.9)'
          el.style.background = 'rgba(255, 255, 255, 0.2)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'rgba(255,255,255,0.6)'
          el.style.background = 'rgba(255, 255, 255, 0.1)'
        }}
        onFocus={(e) => {
          // keep the same translucent look even when focused
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'rgba(255, 255, 255, 0.15)'
          el.style.borderColor = 'rgba(255,255,255,0.8)'
        }}
        onBlur={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'rgba(255, 255, 255, 0.1)'
          el.style.borderColor = 'rgba(255,255,255,0.6)'
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)'
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'
        }}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 500,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            textShadow: '0 0 6px rgba(255,255,255,0.6)'
          }}
        >
          {title.toUpperCase()}
        </div>
      </div>

      {isPlaying && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '3px', height: '16px', backgroundColor: '#fff', borderRadius: '2px', animation: 'musicBounce 1.2s infinite ease-in-out', transformOrigin: 'bottom' }} />
          <div style={{ width: '3px', height: '12px', backgroundColor: '#fff', borderRadius: '2px', animation: 'musicBounce 1.2s infinite ease-in-out 0.1s', transformOrigin: 'bottom' }} />
          <div style={{ width: '3px', height: '8px', backgroundColor: '#fff', borderRadius: '2px', animation: 'musicBounce 1.2s infinite ease-in-out 0.2s', transformOrigin: 'bottom' }} />
        </div>
      )}
    </div>
  )
}

// Global Bottom Player Component
function GlobalPlayer() {
  const [currentSong, setCurrentSong] = useState<{ src: string; title: string } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const waveformRef = useRef<HTMLDivElement | null>(null)

  // Add CSS animation to document head
  useEffect(() => {
    const styleId = 'music-player-animations'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes musicBounce {
          0%, 80%, 100% { 
            transform: scaleY(0.5);
          }
          40% { 
            transform: scaleY(1);
          }
        }
      `
      document.head.appendChild(style)
    }

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  // Set global setters
  useEffect(() => {
    const skipToNext = () => {
      if (globalSongList.length === 0) return
      
      const currentIndex = currentGlobalSong 
        ? globalSongList.findIndex(song => song.src === currentGlobalSong!.src)
        : -1
      
      const nextIndex = (currentIndex + 1) % globalSongList.length
      const nextSong = globalSongList[nextIndex]
      
      currentGlobalSong = nextSong
      setCurrentSong(nextSong)
      setIsPlaying(true)
    }

    const skipToPrevious = () => {
      if (globalSongList.length === 0) return
      
      const currentIndex = currentGlobalSong 
        ? globalSongList.findIndex(song => song.src === currentGlobalSong!.src)
        : -1
      
      const prevIndex = currentIndex <= 0 
        ? globalSongList.length - 1 
        : currentIndex - 1
      const prevSong = globalSongList[prevIndex]
      
      currentGlobalSong = prevSong
      setCurrentSong(prevSong)
      setIsPlaying(true)
    }

    globalSetters = { setCurrentSong, setIsPlaying, skipToNext, skipToPrevious }
  }, [])

  // Spacebar and arrow key keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        return
      }

      // Only handle keys if there's a current song
      if (currentSong) {
        switch (event.code) {
          case 'Space':
            // Prevent default spacebar behavior (page scroll)
            event.preventDefault()
            togglePlay()
            break
          case 'ArrowRight':
            event.preventDefault()
            skipToNext()
            break
          case 'ArrowLeft':
            event.preventDefault()
            skipToPrevious()
            break
        }
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress)
    
    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [currentSong]) // Removed isPlaying from dependencies

  // Initialize global wavesurfer when song changes
  useEffect(() => {
    if (!currentSong || !waveformRef.current) return

    // Destroy existing instance
    if (globalPlayerWavesurfer) {
      globalPlayerWavesurfer.destroy()
    }

    // Create new instance
    globalPlayerWavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#fff',
      progressColor: '#999',
      height: 40,
      barWidth: 1,
      barRadius: 2,
      barGap: 1,
      cursorWidth: 0,
      normalize: true,
    })

    globalPlayerWavesurfer.load(currentSong.src)

    // Event listeners
    globalPlayerWavesurfer.on('ready', () => {
      setDuration(globalPlayerWavesurfer?.getDuration() || 0)
      if (isPlaying) {
        globalPlayerWavesurfer?.play()
      }
    })

    globalPlayerWavesurfer.on('audioprocess', () => {
      setCurrentTime(globalPlayerWavesurfer?.getCurrentTime() || 0)
    })

    globalPlayerWavesurfer.on('seek' as any, () => {
      setCurrentTime(globalPlayerWavesurfer?.getCurrentTime() || 0)
    })

    return () => {
      if (globalPlayerWavesurfer) {
        globalPlayerWavesurfer.destroy()
        globalPlayerWavesurfer = null
      }
    }
  }, [currentSong])

  // Handle play/pause state changes
  useEffect(() => {
    if (!globalPlayerWavesurfer) return
    
    if (isPlaying && !globalPlayerWavesurfer.isPlaying()) {
      globalPlayerWavesurfer.play()
    } else if (!isPlaying && globalPlayerWavesurfer.isPlaying()) {
      globalPlayerWavesurfer.pause()
    }
  }, [isPlaying])

  const togglePlay = () => {
    if (!currentSong) {
      // If no song is selected, start with the first song in the list
      if (globalSongList.length > 0) {
        const firstSong = globalSongList[0]
        currentGlobalSong = firstSong
        setCurrentSong(firstSong)
        setIsPlaying(true)
      }
      return
    }

    if (!globalPlayerWavesurfer) return
    
    if (globalPlayerWavesurfer.isPlaying()) {
      globalPlayerWavesurfer.pause()
      setIsPlaying(false)
    } else {
      globalPlayerWavesurfer.play()
      setIsPlaying(true)
    }
  }

  const skipToPrevious = () => {
    if (globalSetters) globalSetters.skipToPrevious()
  }

  const skipToNext = () => {
    if (globalSetters) globalSetters.skipToNext()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Always show the player (removed the early return)
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.3)'
    }}>
      {/* Previous Button */}
      <button
        onClick={skipToPrevious}
        disabled={globalSongList.length <= 1}
        style={{
          background: 'none',
          border: 'none',
          cursor: globalSongList.length <= 1 ? 'not-allowed' : 'pointer',
          padding: 0,
          width: '28px',
          height: '28px',
          flexShrink: 0,
          opacity: globalSongList.length <= 1 ? 0.3 : 1
        }}
        aria-label="Previous song"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
          <polygon points="11,7 5,12 11,17" />
          <polygon points="19,7 13,12 19,17" />
        </svg>
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={globalSongList.length === 0}
        style={{
          background: 'none',
          border: 'none',
          cursor: globalSongList.length === 0 ? 'not-allowed' : 'pointer',
          padding: 0,
          width: '32px',
          height: '32px',
          flexShrink: 0,
          opacity: globalSongList.length === 0 ? 0.3 : 1
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        )}
      </button>

      {/* Next Button */}
      <button
        onClick={skipToNext}
        disabled={globalSongList.length <= 1}
        style={{
          background: 'none',
          border: 'none',
          cursor: globalSongList.length <= 1 ? 'not-allowed' : 'pointer',
          padding: 0,
          width: '28px',
          height: '28px',
          flexShrink: 0,
          opacity: globalSongList.length <= 1 ? 0.3 : 1
        }}
        aria-label="Next song"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
          <polygon points="5,7 11,12 5,17" />
          <polygon points="13,7 19,12 13,17" />
        </svg>
      </button>

      <div style={{ minWidth: '150px', flexShrink: 0 }}>
        <div style={{ 
          fontWeight: '500', 
          fontSize: '14px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: '#fff',
          fontFamily: 'monospace',
          letterSpacing: '1px'
        }}>
          {currentSong ? currentSong.title.toUpperCase() : 'SELECT A SONG TO PLAY'}
        </div>
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#fff', 
        minWidth: '35px',
        textAlign: 'right'
      }}>
        {formatTime(currentTime)}
      </div>

      <div style={{ 
        flex: 1, 
        minWidth: 0,
        height: '40px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: currentSong ? 'transparent' : 'rgba(255,255,255,0.1)',
        borderRadius: '4px'
      }}>
        <div ref={waveformRef} style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }} />
        {!currentSong && (
          <div style={{
            color: '#fff',
            fontSize: '12px',
            opacity: 0.7,
            pointerEvents: 'none',
            fontFamily: 'monospace',
            letterSpacing: '1px'
          }}>
            NO SONG LOADED
          </div>
        )}
      </div>

      <div style={{ 
        fontSize: '12px', 
        color: '#fff', 
        minWidth: '35px'
      }}>
        {formatTime(duration)}
      </div>
    </div>
  )
}

// Export SongCard as default
export default SongCard

// Export GlobalPlayer and SongList separately 
export { GlobalPlayer, SongList }