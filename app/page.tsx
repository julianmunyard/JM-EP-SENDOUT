'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { SiSpotify, SiApplemusic, SiSoundcloud, SiYoutubemusic, SiBandcamp, SiTidal } from 'react-icons/si';
import { AudioPlayer } from '@/app/components/audio/audio-player';
import type { AudioTrack } from '@/app/types/audio';

// The app is served under munyard.art/ep (Next.js basePath). basePath auto-prefixes
// /_next, next/link and next/image, but NOT hardcoded public-asset paths in plain
// <img>/<audio>/@font-face — so prefix those manually with BP.
const BP = '/ep';

const DSP_LINKS = [
  { name: 'Spotify',       url: '#', Icon: SiSpotify },
  { name: 'Apple Music',   url: '#', Icon: SiApplemusic },
  { name: 'SoundCloud',    url: '#', Icon: SiSoundcloud },
  { name: 'YouTube Music', url: '#', Icon: SiYoutubemusic },
  { name: 'Bandcamp',      url: '#', Icon: SiBandcamp },
  { name: 'Tidal',         url: '#', Icon: SiTidal },
];

function DspBar() {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 6px 4px',
      color: '#fff',
    }}>
      {DSP_LINKS.map(({ name, url, Icon }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <Icon size={22} />
        </a>
      ))}
    </div>
  );
}

function PixelLock({ size = 28 }: { size?: number }) {
  // 8 wide × 10 tall grid. '#' = filled, '.' = empty
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
  const cols = 8
  const rows = 10
  return (
    <svg
      width={size * (cols / rows)}
      height={size}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      style={{ filter: 'drop-shadow(1px 1px 0 #000) drop-shadow(-1px 0 0 #000) drop-shadow(0 -1px 0 #000)' }}
    >
      {grid.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1.05} height={1.05} fill="#fff" /> : null
        )
      )}
    </svg>
  )
}

interface WindowProps {
  title: string
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  initialPosition?: { x: number; y: number }
  width?: number
  height?: number
  zIndex: number
  onBringToFront: () => void
  allowScroll?: boolean
  translucent?: boolean
  backgroundImage?: string
  tileBackground?: boolean
  chromeColor?: string
  chromeBorder?: string
  chromeTextColor?: string
  innerColor?: string
  innerBorder?: string
  innerTextColor?: string
  titleBarLeft?: React.ReactNode
}

const Window = ({
  title, isOpen, onClose, children, initialPosition = { x: 100, y: 100 },
  width = 400, height = 300, zIndex, onBringToFront, allowScroll = true,
  translucent = false, backgroundImage, tileBackground = false,
  chromeColor = '#001180', chromeBorder = '#fff', chromeTextColor = '#fff',
  innerColor = '#001180', innerBorder = '#fff', innerTextColor = '#fff',
  titleBarLeft,
}: WindowProps) => {
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return initialPosition
    const maxX = Math.max(0, window.innerWidth - width)
    const maxY = Math.max(0, window.innerHeight - height)
    return {
      x: Math.max(0, Math.min(initialPosition.x, maxX)),
      y: Math.max(0, Math.min(initialPosition.y, maxY)),
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  // Constrain position to screen bounds
  const constrainPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y }
    
    const maxX = window.innerWidth - width
    const maxY = window.innerHeight - height
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    }
  }, [width, height])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (isDragging) {
      const newPos = constrainPosition(
        clientX - dragOffset.x,
        clientY - dragOffset.y
      )
      setPosition(newPos)
    }
  }, [isDragging, dragOffset, constrainPosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }, [handleMove])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [handleMove])

  const handleStart = (clientX: number, clientY: number, target: HTMLElement) => {
    if (target.closest('.window-controls')) return
    onBringToFront()
    setIsDragging(true)
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY, e.target as HTMLElement)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement)
    }
  }

  const handleEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
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
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd])

  // Update position when window size changes or component mounts
  useEffect(() => {
    if (isOpen) {
      const constrainedPos = constrainPosition(position.x, position.y)
      if (constrainedPos.x !== position.x || constrainedPos.y !== position.y) {
        setPosition(constrainedPos)
      }
    }
  }, [isOpen, position.x, position.y, constrainPosition])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const constrainedPos = constrainPosition(position.x, position.y)
      setPosition(constrainedPos)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [position.x, position.y, constrainPosition])

  if (!isOpen) return null

  return (
    <div
      ref={windowRef}
      onMouseDown={onBringToFront}
      className="window-glow"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width,
        height,
        zIndex,
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      <div style={{
        background: backgroundImage
          ? (tileBackground
              ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImage}) 0 0 repeat`
              : `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImage}) center / cover no-repeat`)
          : chromeColor,
        border: `1px solid ${chromeBorder}`,
        borderRadius: '8px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px'
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            minHeight: '20px',
            marginBottom: '8px',
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <button
            className="window-controls"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              width: '16px',
              height: '16px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: chromeTextColor,
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
          {titleBarLeft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              {titleBarLeft}
            </div>
          )}
          <div style={{ flex: 1 }}></div>
          <span style={{
            fontFamily: 'Ishmeria, NewYork, Times, serif',
            fontSize: '16px',
            color: chromeTextColor,
            letterSpacing: '0',
            textTransform: 'uppercase',
          }}>
            {title}
          </span>
        </div>

        <div style={{
          flex: 1,
          background: backgroundImage ? 'transparent' : innerColor,
          color: innerTextColor,
          border: `1px solid ${innerBorder}`,
          borderRadius: '6px',
          overflow: allowScroll ? 'auto' : 'hidden',
          padding: '12px'
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

interface PlayerWindowProps {
  isOpen: boolean
  onClose: () => void
  zIndex: number
  onBringToFront: () => void
}

const PlayerWindow = ({ isOpen, onClose, zIndex, onBringToFront }: PlayerWindowProps) => {
  const tracks: AudioTrack[] = [
    { id: 't1', title: 'BACK OF MY CAR',           artist: '', duration: 0, audioUrl: `${BP}/songs/back-of-my-car.mp3`,         storagePath: '', locked: true },
    { id: 't2', title: 'GET UP',                   artist: '', duration: 0, audioUrl: `${BP}/songs/get-up.mp3`,                 storagePath: '' },
    { id: 't3', title: 'LOVING SPELL',             artist: '', duration: 0, audioUrl: `${BP}/songs/loving-spell.mp3`,           storagePath: '', locked: true },
    { id: 't4', title: 'MILLIONAIRE',              artist: '', duration: 0, audioUrl: `${BP}/songs/millionaire.mp3`,            storagePath: '', locked: true },
    { id: 't5', title: 'NEVER GONNA (GIVE YOU UP)',artist: '', duration: 0, audioUrl: `${BP}/songs/never-gonna-give-you-up.mp3`,storagePath: '', locked: true },
    { id: 't6', title: "THE RAIN (IT'S POURING)",  artist: '', duration: 0, audioUrl: `${BP}/songs/the-rain-its-pouring.mp3`,   storagePath: '', locked: true },
    { id: 't7', title: 'YOU HAD IT COMING',        artist: '', duration: 0, audioUrl: `${BP}/songs/you-had-it-coming.mp3`,      storagePath: '', locked: true },
  ]

  // Keep the big desktop size everywhere, but on a narrow phone clamp the
  // width to the viewport (hard edges) and centre it horizontally.
  const PLAYER_W = 420
  const PLAYER_H = 620
  const [layout, setLayout] = useState(() => {
    if (typeof window === 'undefined') return { width: PLAYER_W, height: PLAYER_H, x: 60, y: 80 }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(PLAYER_W, vw)
    const height = Math.min(PLAYER_H, vh - 16)
    const x = Math.max(0, Math.round((vw - width) / 2))
    const y = vw <= 768 ? Math.max(8, Math.round((vh - height) / 2)) : 80
    return { width, height, x, y }
  })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.min(PLAYER_W, vw)
      const height = Math.min(PLAYER_H, vh - 16)
      const x = Math.max(0, Math.round((vw - width) / 2))
      const y = vw <= 768 ? Math.max(8, Math.round((vh - height) / 2)) : 80
      setLayout({ width, height, x, y })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return (
    <Window
      title="Player"
      isOpen={isOpen}
      onClose={onClose}
      onBringToFront={onBringToFront}
      zIndex={zIndex}
      allowScroll={true}
      translucent={true}
      backgroundImage={`${BP}/player-bg.gif`}
      initialPosition={{ x: layout.x, y: layout.y }}
      width={layout.width}
      height={layout.height}
    >
      <div style={{ color: '#fff' }}>
        <AudioPlayer
          tracks={tracks}
          cardId="label5-blanket-player"
          lockedMessages={[
            `${BP}/locked-messages/uh-uh-uhh.mp3`,
            `${BP}/locked-messages/you-cant-play-this-one-yet-buddy.mp3`,
            `${BP}/locked-messages/transfer-me.mp3`,
          ]}
          foregroundColor="#fff"
          fontFamily="ChiKareGo2, pixChicago, Monaco, monospace"
          reverbConfig={{
            mix: 0,
            width: 0.8,
            damp: 0.5,
            roomSize: 0.75,
            predelayMs: 20,
            enabled: true,
          }}
        />
        <DspBar />
      </div>
    </Window>
  )
}

interface SimpleWindowProps {
  isOpen: boolean
  onClose: () => void
  zIndex: number
  onBringToFront: () => void
}

interface SongFolder {
  id: string
  title: string
  artwork: string
  inspiration: string
  references: string[]
}

const ABOUT_SONGS: SongFolder[] = [
  { id: 'back-of-my-car', title: 'BACK OF MY CAR',           artwork: `${BP}/song-artwork.png`,      inspiration: 'Inspiration notes for Back Of My Car go here.',        references: [] },
  { id: 'get-up',         title: 'GET UP',                   artwork: `${BP}/song-artwork.png`,      inspiration: 'The System were a big influence on this tune, particularly the album X-Periment from 84.', references: [`${BP}/inspo/get-up/the-system-1.jpeg`, `${BP}/inspo/get-up/the-system-studio.jpg`] },
  { id: 'loving-spell',   title: 'LOVING SPELL',             artwork: `${BP}/song-loving-spell.png`, inspiration: 'Inspiration notes for Loving Spell go here.',          references: [] },
  { id: 'millionaire',    title: 'MILLIONAIRE',              artwork: `${BP}/song-millionaire.png`,  inspiration: 'Inspiration notes for Millionaire go here.',           references: [] },
  { id: 'never-gonna',    title: 'NEVER GONNA (GIVE YOU UP)',artwork: `${BP}/song-never-gonna.png`,  inspiration: 'Inspiration notes for Never Gonna go here.',           references: [] },
  { id: 'the-rain',       title: "THE RAIN (IT'S POURING)",  artwork: `${BP}/song-artwork.png`,      inspiration: "Inspiration notes for The Rain (It's Pouring) go here.", references: [] },
  { id: 'you-had-it',     title: 'YOU HAD IT COMING',        artwork: `${BP}/song-you-had-it.png`,   inspiration: 'Inspiration notes for You Had It Coming go here.',     references: [] },
]

function NavArrow({ direction, disabled, onClick }: { direction: 'back' | 'forward', disabled: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '0 2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.25 : 1,
        color: 'inherit',
        fontFamily: 'pixChicago, Monaco, monospace',
        fontSize: '14px',
        lineHeight: 1,
        fontWeight: 'bold',
        letterSpacing: '-2px',
        imageRendering: 'pixelated',
      }}
      aria-label={direction === 'back' ? 'Back' : 'Forward'}
    >
      {direction === 'back' ? '◄◄' : '►►'}
    </button>
  )
}

const AboutWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => {
  const [history, setHistory] = useState<string[]>(['home'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const currentView = history[historyIndex]

  const navigate = (view: string) => {
    const newHistory = [...history.slice(0, historyIndex + 1), view]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const goBack = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1)
  }

  const goForward = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1)
  }

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1

  const currentSong = currentView.startsWith('song:')
    ? ABOUT_SONGS.find(s => s.id === currentView.slice(5))
    : null
  const inSongsFolder = currentView === 'songs'

  const titleForView = currentSong
    ? currentSong.title
    : inSongsFolder
      ? 'SONG REFERENCES & INSPO'
      : 'About'

  const showArrows = currentView !== 'home'

  return (
    <Window
      title={titleForView}
      isOpen={isOpen}
      onClose={onClose}
      onBringToFront={onBringToFront}
      zIndex={zIndex}
      initialPosition={{ x: 520, y: 80 }}
      width={typeof window !== 'undefined' && window.innerWidth <= 768 ? Math.min(340, window.innerWidth - 16) : 600}
      height={typeof window !== 'undefined' && window.innerWidth <= 768 ? Math.min(400, window.innerHeight - 80) : 500}
      chromeColor="#ffffff"
      chromeBorder="#000"
      chromeTextColor="#000"
      innerColor="#ffffff"
      innerBorder="#000"
      innerTextColor="#000"
      titleBarLeft={showArrows ? (
        <>
          <NavArrow direction="back" disabled={!canGoBack} onClick={goBack} />
          <NavArrow direction="forward" disabled={!canGoForward} onClick={goForward} />
        </>
      ) : undefined}
    >
      <div style={{ height: '100%', position: 'relative', paddingRight: '15px' }}>
        <div
          className="about-scroll-content"
          style={{
            fontSize: '10px',
            lineHeight: '1.5',
            height: '100%',
            overflow: 'auto'
          }}
        >
        {currentSong ? (
          <div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-start' }}>
              <img
                src={currentSong.artwork}
                alt={currentSong.title}
                style={{ width: '120px', height: '120px', imageRendering: 'pixelated', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  {currentSong.title}
                </p>
                <p style={{ fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                  {currentSong.inspiration}
                </p>
              </div>
            </div>
            <p style={{ fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
              INSPO
            </p>
            {currentSong.references.length === 0 ? (
              <p style={{ fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '12px', opacity: 0.6, fontStyle: 'italic' }}>
                Drop reference images here. (Empty for now.)
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {currentSong.references.map((ref, i) => (
                  <img key={i} src={ref} alt="" style={{ width: '100%', border: '1px solid #000', borderRadius: '6px', imageRendering: 'pixelated' }} />
                ))}
              </div>
            )}
          </div>
        ) : inSongsFolder ? (
          /* Songs folder: all vinyls packed like a mac folder */
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
          }}>
            {ABOUT_SONGS.map(song => {
              const locked = song.id !== 'get-up'
              return (
                <div
                  key={song.id}
                  onClick={() => { if (!locked) navigate(`song:${song.id}`) }}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-disabled={locked}
                  onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) navigate(`song:${song.id}`) }}
                  style={{
                    width: '84px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    padding: '4px',
                  }}
                >
                  <div style={{ position: 'relative', width: '64px', height: '64px', marginBottom: '4px' }}>
                    <img
                      src={song.artwork}
                      alt={song.title}
                      style={{
                        width: '64px',
                        height: '64px',
                        imageRendering: 'pixelated',
                        objectFit: 'cover',
                        filter: locked ? 'brightness(0.4)' : 'none',
                      }}
                    />
                    {locked && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <PixelLock size={28} />
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'ChiKareGo2, pixChicago, monospace',
                    fontSize: '11px',
                    color: '#000',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    opacity: locked ? 0.6 : 1,
                  }}>
                    {song.title}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
        <>
        {/* Home: SONG REFERENCES & INSPO folder */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '16px',
        }}>
          <div
            onClick={() => navigate('songs')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('songs') }}
            style={{
              width: '110px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <img
              src={`${BP}/icon-mixer.png`}
              alt="Song references and inspo"
              style={{
                width: '72px',
                height: '72px',
                imageRendering: 'pixelated',
                marginBottom: '4px',
                objectFit: 'contain',
              }}
            />
            <span style={{
              fontFamily: 'ChiKareGo2, pixChicago, monospace',
              fontSize: '11px',
              color: '#000',
              textAlign: 'center',
              lineHeight: 1.1,
            }}>
              SONG REFERENCES & INSPO
            </span>
          </div>
        </div>

          <p style={{ marginBottom: '16px', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
            THIS EP IS WHAT CAME OUT OF A YEAR SPENT DIGGING DEEP INTO THE RARER, MORE OBSCURE SIDE OF EARLY 80S MUSIC.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
            I WROTE THIS COLLECTION OF TUNES AS IF IT WAS 1984 AND I ROLLED INTO THE STUDIO WITH A ROLAND JUNO 60,
            A LINNDRUM, AND ONE ENGINEER, PLAYING ALL THE PARTS AND ARRANGING THEM.
            MENTALLY THAT&apos;S WHERE I WAS, BUT I RECORDED IT IN MY HOME STUDIO.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
            I WAS HEAVILY INSPIRED BY SONGS RELEASED ON REISSUE LABELS LIKE NUMERO
            GROUP AND THE LIKES. 80S BOOGIE WAS A LOT LIKE 60&rsquo;S SOUL IN THAT WAY —
            THERE WAS JUST SO MUCH OF IT CREATED AND NOT ALL OF IT WAS SUCCESSFUL, SO
            YOU HAVE THESE GREAT TRACKS THAT GOT LOST ALONG THE WAY. THAT&apos;S THE WORLD I WANTED THESE SONGS TO LIVE IN.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
            I PLAYED, ARRANGED AND WROTE IT ALL.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
          THANK YOU FOR TAKING THE TIME TO LISTEN.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
            - JULIAN
          </p>
        </>
        )}
        </div>
      </div>
    </Window>
  )
}

const MunyardMixerWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => {
  // CHANGE THIS HEX CODE TO ANY COLOR YOU WANT
  const buttonColor = '#ffffffff'; // Red - paste your hex code here
  
  return (
    <Window
      title="Munyard Mixer"
      isOpen={isOpen}
      onClose={onClose}
      onBringToFront={onBringToFront}
      zIndex={zIndex}
      initialPosition={{ x: 150, y: 200 }}
      width={400}
      height={300}
      chromeColor="#ffffff"
      chromeBorder="#000"
      chromeTextColor="#000"
      innerColor="#ffffff"
      innerBorder="#000"
      innerTextColor="#000"
    >
      <div style={{ fontSize: '13px', textAlign: 'center' }}>
        <p style={{ marginBottom: '12px', fontWeight: 'normal', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>THE MUNYARD MIXER</p>
        
        <p style={{ marginBottom: '12px', lineHeight: '1.4', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
          IT&apos;S THIS CUSTOM WEB TOOL I CREATED THAT LETS ARTISTS HAVE THEIR OWN STEM 
          PLAYER, WHICH ALLOWS FANS TO DIVE INTO TRACKS STEM BY STEM AND REMIX THEM 
          LIVE IN THEIR BROWSER.
        </p>

        <p style={{ marginBottom: '15px', lineHeight: '1.4', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
          IN A WORLD WHERE EVERYTHING&apos;S BECOMING INCREASINGLY AI-GENERATED AND DISTANT, 
          I THINK PEOPLE ARE CRAVING THAT HANDS-ON, TACTILE CONNECTION WITH MUSIC.
        </p>

        <a 
          href="https://munyardmixer.com/artist/jules-red-theme/millionaire"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: buttonColor, // BUTTON COLOR - CHANGE THE HEX CODE ABOVE
            border: '2px solid black',
            borderRadius: '6px',
            padding: '6px 12px',
            textDecoration: 'none',
            color: 'black',
            fontFamily: 'ChiKareGo2, NewYork, Times, serif',
            fontSize: '13px'
          }}
        >
          VISIT MUNYARD MIXER
        </a>
      </div>
    </Window>
  )
}

const InstagramWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => {
  const contentRef = useRef<HTMLDivElement>(null)

  const instagramEmbeds = [
    {
      url: "https://www.instagram.com/reel/C8jY0FmSVVo/?utm_source=ig_embed&utm_campaign=loading",
      id: "C8jY0FmSVVo"
    },
    {
      url: "https://www.instagram.com/reel/C5O4q7LS4Zn/?utm_source=ig_embed&utm_campaign=loading", 
      id: "C5O4q7LS4Zn"
    },
    {
      url: "https://www.instagram.com/reel/C9gsFPwyydd/?utm_source=ig_embed&utm_campaign=loading",
      id: "C9gsFPwyydd"
    },
    {
      url: "https://www.instagram.com/reel/C9MHLVxS2W_/?utm_source=ig_embed&utm_campaign=loading",
      id: "C9MHLVxS2W_"
    }
  ]

  useEffect(() => {
    if (isOpen && contentRef.current) {
      // Clear previous content
      contentRef.current.innerHTML = ''
      
      // Create all iframes in a scrollable container
      instagramEmbeds.forEach((embed, index) => {
        const iframe = document.createElement('iframe')
        iframe.src = `https://www.instagram.com/p/${embed.id}/embed/`
        iframe.width = '100%'
        iframe.height = '600'
        iframe.frameBorder = '0'
        iframe.scrolling = 'no'
        iframe.style.border = 'none'
        iframe.style.borderRadius = '4px'
        iframe.style.marginBottom = '20px'
        
        if (contentRef.current) {
          contentRef.current.appendChild(iframe)
        }
      })
    }
  }, [isOpen])

  return (
    <Window
      title="Instagram"
      isOpen={isOpen}
      onClose={onClose}
      onBringToFront={onBringToFront}
      zIndex={zIndex}
      initialPosition={{ x: 400, y: 150 }}
      width={420}
      height={700}
      allowScroll={true}
      chromeColor="#ffffff"
      chromeBorder="#000"
      chromeTextColor="#000"
      innerColor="#ffffff"
      innerBorder="#000"
      innerTextColor="#000"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0', fontFamily: 'ChiKareGo2, NewYork, Times, serif', fontSize: '13px' }}>
           
          </p>
        </div>

        <div 
          ref={contentRef}
          style={{
            flex: 1,
            background: '#f8f8f8',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'auto',
            padding: '10px'
          }}
        />

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <a 
            href="https://www.instagram.com/julianmunyard/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#ffffffff',
              border: '1px outset #6b555bff',
              padding: '6px 12px',
              textDecoration: 'none',
              color: 'black',
              fontFamily: 'ChiKareGo2, NewYork, Times, serif',
              fontSize: '11px',
              borderRadius: '4px'
            }}
          >
            VISIT PAGE
          </a>
        </div>
      </div>
    </Window>
  )
}

const PHOTOS = [
  'vinyl-art-1.jpg',
  'vinyl-art-2.jpg',
  'vinyl-art-6.jpg',
  'vinyl-art-8.jpg',
  'vinyl-art-9.jpg',
  'vinyl-art-10.jpg',
  'vinyl-art-11.jpg',
  'attic.jpg',
  'attic-2.jpg',
]

const PhotosWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => (
  <Window
    title="Photos"
    isOpen={isOpen}
    onClose={onClose}
    onBringToFront={onBringToFront}
    zIndex={zIndex}
    initialPosition={{ x: 260, y: 140 }}
    width={typeof window !== 'undefined' && window.innerWidth <= 768 ? Math.min(340, window.innerWidth - 16) : 600}
    height={typeof window !== 'undefined' && window.innerWidth <= 768 ? Math.min(400, window.innerHeight - 80) : 500}
    chromeColor="#ffffff"
    chromeBorder="#000"
    chromeTextColor="#000"
    innerColor="#ffffff"
    innerBorder="#000"
    innerTextColor="#000"
  >
    <div
      data-no-drag
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '6px',
      }}
    >
      {PHOTOS.map((name) => (
        <a
          key={name}
          href={`${BP}/photos/${name}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', border: '1px solid #000', background: '#000', lineHeight: 0 }}
        >
          <img
            src={`${BP}/photos/${name}`}
            alt=""
            loading="lazy"
            style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }}
          />
        </a>
      ))}
    </div>
  </Window>
)

const VideoWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => (
  <Window
    title="Video Player"
    isOpen={isOpen}
    onClose={onClose}
    onBringToFront={onBringToFront}
    zIndex={zIndex}
    allowScroll={false}
    initialPosition={{ x: 100, y: 200 }}
    width={400}
    height={400}
    chromeColor="#ffffff"
    chromeBorder="#000"
    chromeTextColor="#000"
    innerColor="#ffffff"
    innerBorder="#000"
    innerTextColor="#000"
  >
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          background: '#000',
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid #000'
        }}
      >
        <video
          src={`${BP}/giorgio.mp4`}
          muted
          autoPlay
          loop
          playsInline
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover'
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            backgroundImage: 'radial-gradient(#000 0.3px, transparent 0.5px)',
            backgroundSize: '1.5px 1.5px'
          }}
        />
      </div>
    </div>
  </Window>
)

export default function Home() {
  const [openWindows, setOpenWindows] = useState<Record<string, boolean>>({
    player: false,
    about: false,
    mixer: false,
    instagram: false,
    video: false,
    photos: false,
    folder: false
  })

  // Open the default windows after mount — avoids SSR hydration sizing them
  // for desktop on mobile (the "massive on first load" bug).
  useEffect(() => {
    setOpenWindows(prev => ({ ...prev, player: true, about: true }))
  }, [])

  const [windowZIndices, setWindowZIndices] = useState<Record<string, number>>({
    player: 5,
    about: 12,
    mixer: 7,
    instagram: 8,
    video: 9,
    photos: 11
  })

  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [cursorTrail, setCursorTrail] = useState<Array<{ x: number; y: number; id: number }>>([])
  const trailIdRef = useRef(0)

  const openWindow = (windowId: string) => {
    setOpenWindows(prev => ({ ...prev, [windowId]: true }))
    // Automatically bring newly opened window to front
    const maxZ = Math.max(...Object.values(windowZIndices))
    setWindowZIndices(prev => ({ ...prev, [windowId]: maxZ + 1 }))
  }

  const closeWindow = (windowId: string) => {
    setOpenWindows(prev => ({ ...prev, [windowId]: false }))
  }

  const bringToFront = (windowId: string) => {
    const maxZ = Math.max(...Object.values(windowZIndices))
    setWindowZIndices(prev => ({ ...prev, [windowId]: maxZ + 1 }))
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setCursorPosition({ x: e.clientX, y: e.clientY })
    
    const newTrailPoint = { x: e.clientX, y: e.clientY, id: trailIdRef.current++ }
    setCursorTrail(prev => [...prev, newTrailPoint].slice(-200))
  }, [])

  useEffect(() => {
    const handleMouseLeave = () => {
      setCursorTrail([])
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [handleMouseMove])

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorTrail(prev => prev.slice(1))
    }, 15)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'pixChicago';
          src: url('${BP}/fonts/pixChicago.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        @font-face {
          font-family: 'VCR_OSD_MONO';
          src: url('${BP}/fonts/VCR_OSD_MONO_1.001.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        @font-face {
          font-family: 'NewYork';
          src: url('${BP}/fonts/new-york.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        @font-face {
          font-family: 'Ishmeria';
          src: url('${BP}/fonts/Ishmeria.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
        }

        @font-face {
          font-family: 'ChiKareGo2';
          src: url('${BP}/fonts/ChiKareGo2.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        .about-scroll-content::-webkit-scrollbar {
          display: none;
        }

        .about-scroll-content {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'ChiKareGo2', 'pixChicago', Monaco, monospace;
          background: url('${BP}/player-bg.png') repeat,
                      linear-gradient(135deg, #008080 0%, #20b2aa 100%);
          background-size: 256px 256px, cover;
          overflow: hidden;
          height: 100vh;
        
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 768px) {
          body {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
          }

          .desk-icon {
            min-width: 64px !important;
            padding: 6px !important;
          }
          .desk-icon img {
            width: 44px !important;
            height: 44px !important;
          }
          .desk-icon span {
            font-size: 11px !important;
          }

          .desk-icon-about    { top: 6% !important;  left: 6% !important;  right: auto !important; }
          .desk-icon-player   { top: 6% !important;  right: 6% !important; left: auto !important; }
          .desk-icon-video    { top: 28% !important; left: 6% !important;  right: auto !important; }
          .desk-icon-photos   { top: 28% !important; right: 6% !important; left: auto !important; }
          .desk-icon-instagram{ top: 50% !important; left: 6% !important;  right: auto !important; }
        }

        * {
  




<div 
  className="retro-cursor"
  style={{
    left: cursorPosition.x,
    top: cursorPosition.y,
    transform: 'translate(-2px, -2px)',
    // Add different styles based on cursor state
    background: cursorState === 'grab' ? 'white' : 
                cursorState === 'grabbing' ? 'white' : 
                cursorState === 'pointer' ? 'white' : 'white',
    // Different shapes for different states
    clipPath: cursorState === 'pointer' ? 'polygon(0% 0%, 0% 70%, 25% 55%, 45% 100%, 55% 95%, 35% 50%, 100% 50%)' : 'none',
    width: cursorState === 'grab' || cursorState === 'grabbing' ? '14px' : '12px',
    height: cursorState === 'grab' || cursorState === 'grabbing' ? '14px' : '12px',
    borderRadius: cursorState === 'grab' || cursorState === 'grabbing' ? '2px' : '0px'
  }}
/>



        @media (hover: none) and (pointer: coarse) {
          .retro-cursor {
            display: none;
          }
        }
        `}</style>

        <div style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            <h1 style={{
              fontFamily: 'ChiKareGo2, NewYork, Times, serif',
              fontSize: '24px',
              margin: 0,
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
            </h1>
            <p style={{
              fontFamily: 'ChiKareGo2, NewYork, Times, serif',
              fontSize: '16px',
              margin: 0,
              letterSpacing: '1px'
            }}>
            </p>
          </div>

          <>
            <div
              className="desk-icon desk-icon-about"
              onClick={() => openWindow('about')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openWindow('about');
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                position: 'absolute', top: '11%', left: '6%',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'transparent',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img
                src={`${BP}/icon-about.png`}
                alt="About"
                style={{
                  width: '56px',
                  height: '56px',
                  marginBottom: '4px',
                  objectFit: 'contain',
                }}
              />
              <span style={{ 
                fontFamily: 'ChiKareGo2, pixChicago, Monaco, monospace', 
                fontSize: '13px', 
                color: 'white',
                textAlign: 'center'
              }}>
                ABOUT
              </span>
            </div>

            <div
              className="desk-icon desk-icon-player"
              onClick={() => openWindow('player')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openWindow('player');
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                position: 'absolute', top: '6%', right: '7%',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'transparent',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img
                src={`${BP}/icon-player.png`}
                alt="Player"
                style={{
                  width: '56px',
                  height: '56px',
                  marginBottom: '4px',
                  objectFit: 'contain',
                }}
              />
              <span style={{ 
                fontFamily: 'ChiKareGo2, pixChicago, Monaco, monospace', 
                fontSize: '13px', 
                color: 'white',
                textAlign: 'center'
              }}>
                PLAYER
              </span>
            </div>

            <div
              className="desk-icon desk-icon-video"
              onClick={() => openWindow('video')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openWindow('video');
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                position: 'absolute', top: '42%', left: '46%',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'transparent',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img
                src={`${BP}/icon-video.png`}
                alt="Video"
                style={{
                  width: '56px',
                  height: '56px',
                  marginBottom: '4px',
                  objectFit: 'contain',
                }}
              />
              <span style={{ 
                fontFamily: 'ChiKareGo2, pixChicago, Monaco, monospace', 
                fontSize: '13px', 
                color: 'white',
                textAlign: 'center'
              }}>
                VIDEO
              </span>
            </div>

            <div
              className="desk-icon desk-icon-photos"
              onClick={() => openWindow('photos')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openWindow('photos');
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                position: 'absolute', top: '80%', left: '12%',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'transparent',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img
                src={`${BP}/folder-icon.png`}
                alt="Photos"
                style={{
                  width: '56px',
                  height: '56px',
                  marginBottom: '4px',
                  objectFit: 'contain',
                  imageRendering: 'pixelated',
                }}
              />
              <span style={{
                fontFamily: 'ChiKareGo2, pixChicago, Monaco, monospace',
                fontSize: '13px',
                color: 'white',
                textAlign: 'center'
              }}>
                PHOTOS
              </span>
            </div>

            <div
              className="desk-icon desk-icon-instagram"
              onClick={() => openWindow('instagram')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                openWindow('instagram');
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              display: 'flex',
                position: 'absolute', top: '64%', right: '11%',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              background: 'transparent',
              padding: '8px',
              borderRadius: '4px',
              minWidth: '80px'
            }}
          >
            <img
              src={`${BP}/icon-instagram.png`}
              alt="Instagram"
              style={{
                width: '56px',
                height: '56px',
                marginBottom: '4px',
                objectFit: 'contain'
              }}
            />
            <span style={{ 
              fontFamily: 'ChiKareGo2, pixChicago, Monaco, monospace', 
              fontSize: '13px', 
              color: 'white',
              textAlign: 'center'
            }}>
              INSTAGRAM
            </span>
          </div>
        </>

        <PlayerWindow 
          isOpen={openWindows.player} 
          onClose={() => closeWindow('player')}
          zIndex={windowZIndices.player}
          onBringToFront={() => bringToFront('player')}
        />
        
        <AboutWindow 
          isOpen={openWindows.about} 
          onClose={() => closeWindow('about')}
          zIndex={windowZIndices.about}
          onBringToFront={() => bringToFront('about')}
        />
        
        <MunyardMixerWindow
          isOpen={openWindows.mixer} 
          onClose={() => closeWindow('mixer')}
          zIndex={windowZIndices.mixer}
          onBringToFront={() => bringToFront('mixer')}
        />
        
        <VideoWindow 
          isOpen={openWindows.video} 
          onClose={() => closeWindow('video')}
          zIndex={windowZIndices.video}
          onBringToFront={() => bringToFront('video')}
        />
        
        <InstagramWindow
          isOpen={openWindows.instagram}
          onClose={() => closeWindow('instagram')}
          zIndex={windowZIndices.instagram}
          onBringToFront={() => bringToFront('instagram')}
        />

        <PhotosWindow
          isOpen={openWindows.photos}
          onClose={() => closeWindow('photos')}
          zIndex={windowZIndices.photos}
          onBringToFront={() => bringToFront('photos')}
        />

        <div 
          className="retro-cursor"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
            transform: 'translate(-2px, -2px)'
          }}
        />

        {cursorTrail.map((point, index) => (
          <div
            key={point.id}
            className="cursor-trail"
            style={{
              left: point.x,
              top: point.y,
              transform: 'translate(-1px, -1px)',
              opacity: (index + 1) / cursorTrail.length,
              scale: 0.9 - (index * 0.05)
            }}
          />
        ))}
      </div>
    </>
  )
}