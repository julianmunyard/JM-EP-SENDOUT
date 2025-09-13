'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

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
}

const Window = ({ title, isOpen, onClose, children, initialPosition = { x: 100, y: 100 }, width = 400, height = 300, zIndex, onBringToFront, allowScroll = true }: WindowProps) => {
  const [position, setPosition] = useState(initialPosition)
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
        background: '#f5f5dc',
        border: '1px solid #000',
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
              color: '#000',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
          <div style={{ flex: 1 }}></div>
          <span style={{
            fontFamily: 'NewYork, Times, serif',
            fontSize: '14px',
            color: '#000',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '-1px',
            transform: 'scaleX(0.8) scaleY(1.4)',
            display: 'inline-block',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}>
            {title}
          </span>
        </div>

        <div style={{
          flex: 1,
          background: 'white',
          border: '1px solid #000',
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

interface Track {
  src: string
  title: string
}

const PlayerWindow = ({ isOpen, onClose, zIndex, onBringToFront }: PlayerWindowProps) => {
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const globalSongList: Track[] = [
    { src: "/songs/millionaire.mp3", title: "MILLIONAIRE" },
    { src: "/songs/do-it-again.mp3", title: "2. Do It Again" },
    { src: "/songs/interlude.mp3", title: "3. Interlude" },
    { src: "/songs/more-than-a-friend.mp3", title: "4. More Than a Friend" },
    { src: "/songs/never-gonna-(give-you-up).mp3", title: "5. Never Gonna (Give You Up)" },
    { src: "/songs/the-rain-(its-pouring).mp3", title: "6. The Rain (It's Pouring)" },
    { src: "/songs/you-had-it-coming.mp3", title: "7. You Had It Coming" }
  ]

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play()
    }
  }, [currentTrack, isPlaying])

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % globalSongList.length)
  }

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + globalSongList.length) % globalSongList.length)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const marqueeWrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);

  const [gapPx, setGapPx] = useState(60);
  const [speedSec, setSpeedSec] = useState(12);

  const measure = useCallback(() => {
    const wrap = marqueeWrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return;

    const wrapW = wrap.offsetWidth;
    const contentW = content.offsetWidth;

    const gap = Math.max(40, wrapW - contentW);
    setGapPx(gap);

    const pxPerSec = 40;
    const duration = Math.max(10, (contentW + gap) / pxPerSec);
    setSpeedSec(duration);
  }, []);

  const currentTitle = globalSongList[currentTrack]?.title ?? '';

  useLayoutEffect(() => {
    const wrap = marqueeWrapRef.current;
    if (!wrap) return;

    const isVisible = () =>
      wrap.offsetParent !== null && getComputedStyle(wrap).visibility !== 'hidden';

    const run = () => {
      if (!isVisible()) return;
      measure();
    };

    run();

    const raf1 = requestAnimationFrame(run);
    const t1 = setTimeout(run, 150);

    const fonts = (document as unknown as { fonts?: { ready: Promise<void> } }).fonts?.ready;
    let raf2: number | null = null;
    let t2: NodeJS.Timeout | null = null;
    if (fonts) {
      fonts.then(() => {
        raf2 = requestAnimationFrame(run);
        t2 = setTimeout(run, 300);
      });
    }

    const onLoad = () => requestAnimationFrame(run);
    window.addEventListener('load', onLoad);

    const ro = new ResizeObserver(run);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
      window.removeEventListener('load', onLoad);
      ro.disconnect();
    };
  }, [currentTitle, isOpen, measure]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume])

  return (
    <Window
      title="Player"
      isOpen={isOpen}
      onClose={onClose}
      onBringToFront={onBringToFront}
      zIndex={zIndex}
      allowScroll={false}
      initialPosition={{ x: 50, y: 150 }}
      width={typeof window !== 'undefined' && window.innerWidth <= 768 ? 320 : 420}
      height={typeof window !== 'undefined' && window.innerWidth <= 768 ? 160 : 180}
    >
      <div style={{ fontFamily: 'pixChicago, Monaco, monospace', fontSize: '8px' }}>
        <style>
          {`
            @keyframes jmMarqueeSeamless {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}
        </style>
        <div
          style={{
            background: '#fff9f0ff',
            border: '1px solid #000',
            borderRadius: '6px',
            padding: '8px',
            marginBottom: '8px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden'
          }}
        >
          <div
            ref={marqueeWrapRef}
            style={{ position: 'relative', width: '100%', overflow: 'hidden' }}
          >
            <div
              key={currentTitle}
              style={{
                display: 'flex',
                width: 'max-content',
                whiteSpace: 'nowrap',
                columnGap: `${gapPx}px`,
                animation: `jmMarqueeSeamless ${speedSec}s linear infinite`,
                willChange: 'transform',
                fontSize: '13px',
                fontWeight: 'normal',
                fontFamily: 'pixChicago, Monaco, monospace'
              }}
            >
              <span ref={contentRef}>{currentTitle}</span>
              <span>{currentTitle}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0px' }}>
            <button onClick={togglePlay} style={{
              background: '#f5f5dc',
              border: '1px solid #000',
              width: '50px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: '#000',
              lineHeight: '1',
              padding: '0',
              margin: '0',
              fontFamily: 'monospace',
              transform: isPlaying ? 'translateY(2px)' : 'translateY(0px)',
              transition: 'transform 0.1s ease',
              boxShadow: isPlaying ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
              ▶
            </button>
            <button onClick={togglePlay} style={{
              background: '#f5f5dc',
              border: '1px solid #000',
              width: '50px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: '#000',
              lineHeight: '1',
              padding: '0',
              margin: '0',
              fontFamily: 'monospace',
              transform: !isPlaying ? 'translateY(2px)' : 'translateY(0px)',
              transition: 'transform 0.1s ease',
              boxShadow: !isPlaying ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
              ⏸︎
            </button>
            <button onClick={prevTrack} style={{
              background: '#f5f5dc',
              border: '1px solid #000',
              width: '50px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: '#000',
              lineHeight: '1',
              padding: '0',
              margin: '0',
              fontFamily: 'monospace',
              transform: 'scale(1)',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(0.95)'}
            onMouseUp={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1)'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1)'}
            >
              ⏮︎
            </button>
            <button onClick={nextTrack} style={{
              background: '#f5f5dc',
              border: '1px solid #000',
              width: '50px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: '#000',
              lineHeight: '1',
              padding: '0',
              margin: '0',
              fontFamily: 'monospace',
              transform: 'scale(1)',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(0.95)'}
            onMouseUp={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1)'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.transform = 'scale(1)'}
            >
              ⏭︎
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            marginLeft: '8px'
          }}>
            <div style={{
              width: '20px',
              height: '24px',
              background: '#f5f5dc',
              border: '1px solid #000',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '4px',
              position: 'relative'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: 'black',
                position: 'relative',
                clipPath: 'polygon(0% 30%, 40% 30%, 100% 0%, 100% 100%, 40% 70%, 0% 70%)'
              }} />
            </div>
            
            <div style={{
              flex: 1,
              height: '24px',
              background: 'white',
              border: '0px solid #000',
              borderRadius: '3px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${volume * 100}%`,
                height: '100%',
                background: '#f5f5dc',
                border: '1px solid #000',
                borderBottom: '3px solid #000',
                borderRadius: '2px',
                transition: 'width 0.1s ease'
              }} />
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                  padding: 0
                }}
              />
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={globalSongList[currentTrack]?.src}
          onEnded={nextTrack}
          onTimeUpdate={() => {}}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedData={() => {
            if (audioRef.current) {
              audioRef.current.volume = volume;
            }
          }}
        />
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

const AboutWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => {
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollHeight, setScrollHeight] = useState(0)
  const [clientHeight, setClientHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (contentRef.current) {
      setScrollTop(contentRef.current.scrollTop)
      setScrollHeight(contentRef.current.scrollHeight)
      setClientHeight(contentRef.current.clientHeight)
    }
  }

  const handleScrollbarClick = (e: React.MouseEvent) => {
    if (contentRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickY = e.clientY - rect.top
      const scrollPercent = clickY / rect.height
      const newScrollTop = scrollPercent * (scrollHeight - clientHeight)
      contentRef.current.scrollTop = newScrollTop
    }
  }

  useEffect(() => {
    if (contentRef.current) {
      setScrollHeight(contentRef.current.scrollHeight)
      setClientHeight(contentRef.current.clientHeight)
    }
  }, [isOpen])

  const thumbHeight = 30;
  const thumbTop = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight) : 0
  const showScrollbar = scrollHeight > clientHeight

  return (
    <Window
      title="About Julian Munyard"
      isOpen={isOpen}
      onClose={onClose}
      onBringToFront={onBringToFront}
      zIndex={zIndex}
      initialPosition={{ x: 200, y: 100 }}
      width={typeof window !== 'undefined' && window.innerWidth <= 768 ? 340 : 600}
      height={typeof window !== 'undefined' && window.innerWidth <= 768 ? 400 : 500}
    >
      <div style={{ height: '100%', position: 'relative', paddingRight: '15px' }}>
        <div 
          ref={contentRef}
          className="about-scroll-content"
          onScroll={handleScroll}
          style={{ 
            fontSize: '10px', 
            lineHeight: '1.5',
            height: '100%',
            overflow: 'auto'
          }}
        >
<p style={{ marginBottom: '16px', textAlign: 'left', fontWeight: 'BOLD', fontFamily: 'NewYork, Times, serif', fontSize: '14px' }}>
            JULIAN MUNYARD EP
          </p>
          
          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            THESE ARE 7 UNRELEASED SONGS THAT I&apos;VE WRITTEN AND PRODUCED FOR MY NEW EP. 
            I HOPE YOU WILL FIND INTEREST IN WORKING WITH ME ON THIS RELEASE.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I&apos;M JULIAN MUNYARD — A 22-YEAR-OLD PRODUCER AND ARTIST FROM AUSTRALIA WHO&apos;S 
            SPENT THE LAST YEAR DIGGING DEEP INTO THE RARER, MORE OBSCURE SIDE OF EARLY 
            80S MUSIC, AND I BELIEVE TO HAVE COMPLETED MY FIRST EP INSPIRED BY THIS.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I WROTE THIS IS COLLECTIONS OF TUNES AS IF IT WAS 1984 AND I ROLLED INTO THE STUDIO WITH A ROLAND JUNO 60, 
            A LINNDRUM, AND ONE ENGINEER, PLAYING ALL THE PARTS AND ARRANGING THEM.
            MENTALLY THATS WHERE I WAS, BUT I RECORDED IT IN MY HOME!
            STUDIO.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I WAS HEAVILY INSPIRED FROM SONGS RELEASED ON REISSUE LABELS LIKE NUMERO 
            GROUP AND THE LIKES OF. 80S BOOGIE WAS A LOT LIKE 60&rsquo;S SOUL IN THAT WAY, 
            THERE WAS JUST SO MUCH OF IT CREATED AND NOT ALL OF IT WAS SUCCESSFUL, SO 
            YOU HAVE THESE GREAT TRACKS THAT GOT LOST ALONG THE WAY.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
          </p>


          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
           I&apos;VE SPENT THE LAST LITTLE WHILE WRITING AND PRODUCING THE MUSIC, AND NOW I FEEL IT&apos;S TIME TO DELIVER IT WELL.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I&apos;M NOT TRYING TO GET CAUGHT UP IN A "BIG ROLLOUT" MINDSET, BECAUSE I BELIEVE THIS CAN HINDER A PROJECT - BUT WHAT I REALLY CARE ABOUT IS HOW IT LOOKS, EVERYTHING SHOULD ALIGN AESTHETICALLY AND SONICALLY.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            THE REAL CATCH IS VIDEOS, WHICH FOR ME MEANS SHOOTING ON 16MM FILM OR VHS AND GETTING VISUALISERS FROM CREATORS LIKE <a href="https://www.jackh.ca/" target="_blank" rel="noopener noreferrer" style={{ color: 'red', textDecoration: 'underline' }}>DIGITAL JOY,</a> AND <a href="https://www.instagram.com/seanstle/" target="_blank" rel="noopener noreferrer" style={{ color: 'red', textDecoration: 'underline' }}>SEAN MCGUIRKWHO,</a> WHO I REALLY ADMIRE - A VIDEO BUDGET FOR THIS KIND OF THING WOULD GO A LONG WAY, BECAUSE I VIEW AESTHETIC AS VERY IMPORTANT FOR THE STYLE I'M GOING FOR.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I DON&apos;T WANT THESE THINGS FOR THE SAKE OF HAVING THEM, OR TO JUST SEEM COOL, I WANT TO BUILD A COMMUNITY OF PEOPLE THAT LIKE THESE THINGS. I THINK I&apos;VE TOUCHED ON THIS IN THE PAST WITH MY INSTAGRAM, BUT I WANT TO GO DEEPER.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I LOVE BUILDING WEBSITES, THE ONE THAT YOU&apos;RE ON RIGHT NOW WAS BUILT BY ME, AND I&apos;M EXCITED BY THE IDEA OF MAKING THESE MORE COMMUNITY BASED, WHERE I CAN SHARE THIS OLD STYLE WORLD WITH OTHERS, PEOPLE CAN HAVE ACCOUNTS, UPLOAD REMIXES OF SOME OF THE EP SONGS IF I PROVIDED STEMS, UPLOAD THEIR OWN MUSIC - I COULD GO A LOT OF DIFFERENT WAYS WITH IT.
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            I SEE MUSIC, WEBSITES AND VIDEOS TO BE AN ENTIRE UNIVERSE WHICH IS &apos;JULIAN&apos; 
          </p>

          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
          THANK YOU THANK YOU THANK YOU FOR TAKING TIME TO CHECK OUT MY MUSIC. 
          </p>        
          
          <p style={{ marginBottom: '16px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
            - JULIAN
          </p>                      
        </div>
        <div 
        />
      </div>
    </Window>
  )
}

const ContactWindow = ({ isOpen, onClose, zIndex, onBringToFront }: SimpleWindowProps) => (
  <Window
    title="Contact Info"
    isOpen={isOpen}
    onClose={onClose}
    onBringToFront={onBringToFront}
    zIndex={zIndex}
    initialPosition={{ x: 300, y: 250 }}
    width={300}
    height={180}
  >
    <div style={{ fontSize: '8px', textAlign: 'center' }}>
      <p style={{ marginBottom: '8px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>EMAIL:</p>
      <p style={{ marginBottom: '12px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>JULIAN.MUNYARD@GMAIL.COM</p>
      
      <p style={{ marginBottom: '8px', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>INSTAGRAM:</p>
      <a 
        href="https://www.instagram.com/julianmunyard/" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'blue', textDecoration: 'underline', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}
      >
        @JULIANMUNYARD
      </a>
    </div>
  </Window>
)

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
    >
      <div style={{ fontSize: '8px', textAlign: 'center' }}>
        <p style={{ marginBottom: '12px', fontWeight: 'normal', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>THE MUNYARD MIXER</p>
        
        <p style={{ marginBottom: '12px', lineHeight: '1.4', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
          IT&apos;S THIS CUSTOM WEB TOOL I CREATED THAT LETS ARTISTS HAVE THEIR OWN STEM 
          PLAYER, WHICH ALLOWS FANS TO DIVE INTO TRACKS STEM BY STEM AND REMIX THEM 
          LIVE IN THEIR BROWSER.
        </p>

        <p style={{ marginBottom: '15px', lineHeight: '1.4', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
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
            fontFamily: 'NewYork, Times, serif',
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
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0', fontFamily: 'NewYork, Times, serif', fontSize: '13px' }}>
           
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
              fontFamily: 'NewYork, Times, serif',
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
          src="/giorgio.mp4"
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
    contact: false,
    mixer: false,
    instagram: false,
    video: false,
    folder: false
  })

  const [windowZIndices, setWindowZIndices] = useState<Record<string, number>>({
    player: 10,
    about: 5,
    contact: 6,
    mixer: 7,
    instagram: 8,
    video: 9
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
          src: url('/fonts/pixChicago.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        @font-face {
          font-family: 'VCR_OSD_MONO';
          src: url('/fonts/VCR_OSD_MONO_1.001.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }

        @font-face {
          font-family: 'NewYork';
          src: url('/fonts/new-york.ttf') format('truetype');
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
          font-family: 'pixChicago', Monaco, monospace;
          background: url('/desktop-pattern.png') repeat,
                      linear-gradient(135deg, #008080 0%, #20b2aa 100%);
          background-size: 4px 4px, cover;
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
          
          <video
            src="/nyc-night-aerials.mp4"
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: 'fixed',
              top: '45%',
              left: '50%',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'translate(-50%, -50%) scale(1.8)',
              zIndex: -1,
            }}
          />
          
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
              fontFamily: 'NewYork, Times, serif',
              fontSize: '24px',
              margin: 0,
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
            </h1>
            <p style={{
              fontFamily: 'NewYork, Times, serif',
              fontSize: '16px',
              margin: 0,
              letterSpacing: '1px'
            }}>
            </p>
          </div>

          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div
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
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>📄</div>
              <span style={{ 
                fontFamily: 'pixChicago, Monaco, monospace', 
                fontSize: '8px', 
                color: 'white',
                textAlign: 'center'
              }}>
                ABOUT
              </span>
            </div>

            <div
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
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img 
                src="/1840045.png" 
                alt="Player" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  marginBottom: '4px',
                  imageRendering: 'pixelated' 
                }} 
              />
              <span style={{ 
                fontFamily: 'pixChicago, Monaco, monospace', 
                fontSize: '8px', 
                color: 'white',
                textAlign: 'center'
              }}>
                PLAYER
              </span>
            </div>

            <div
              onClick={() => openWindow('contact')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openWindow('contact');
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img 
                src="/mail-logo.png" 
                alt="Contact" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  marginBottom: '4px',
                  imageRendering: 'pixelated' 
                }} 
              />
              <span style={{ 
                fontFamily: 'pixChicago, Monaco, monospace', 
                fontSize: '8px', 
                color: 'white',
                textAlign: 'center'
              }}>
                CONTACT
              </span>
            </div>

            <div
              onClick={() => openWindow('mixer')}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openWindow('mixer');
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img 
                src="/mixer-8bit.png" 
                alt="Mixer" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  marginBottom: '4px',
                  imageRendering: 'pixelated' 
                }} 
              />
              <span style={{ 
                fontFamily: 'pixChicago, Monaco, monospace', 
                fontSize: '8px', 
                color: 'white',
                textAlign: 'center'
              }}>
                MIXER
              </span>
            </div>

            <div
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
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)',
                padding: '8px',
                borderRadius: '4px',
                minWidth: '80px'
              }}
            >
              <img 
                src="/8mm-transparent.png" 
                alt="Video" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  marginBottom: '4px',
                  imageRendering: 'pixelated' 
                }} 
              />
              <span style={{ 
                fontFamily: 'pixChicago, Monaco, monospace', 
                fontSize: '8px', 
                color: 'white',
                textAlign: 'center'
              }}>
                VIDEO
              </span>
            </div>

            <div
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
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)',
              padding: '8px',
              borderRadius: '4px',
              minWidth: '80px'
            }}
          >
            <img 
              src="/insta-8bit.png" 
              alt="Instagram" 
              style={{ 
                width: '32px', 
                height: '32px', 
                marginBottom: '4px',
                imageRendering: 'pixelated' 
              }} 
            />
            <span style={{ 
              fontFamily: 'pixChicago, Monaco, monospace', 
              fontSize: '8px', 
              color: 'white',
              textAlign: 'center'
            }}>
              INSTAGRAM
            </span>
          </div>
        </div>

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
        
        <ContactWindow 
          isOpen={openWindows.contact} 
          onClose={() => closeWindow('contact')}
          zIndex={windowZIndices.contact}
          onBringToFront={() => bringToFront('contact')}
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