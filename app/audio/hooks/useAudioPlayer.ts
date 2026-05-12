'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAudioEngine } from '../engine/audioEngine'
import type { VarispeedMode } from '../engine/types'
import type { ReverbConfig } from '@/app/types/audio'

interface UseAudioPlayerOptions {
  cardId: string
  trackUrl?: string
  looping?: boolean
  autoplay?: boolean
  reverbConfig?: ReverbConfig
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
}

interface UseAudioPlayerReturn {
  isPlaying: boolean
  isLoaded: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  progress: number
  speed: number
  varispeedMode: VarispeedMode
  reverbMix: number

  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (position: number) => void
  setSpeed: (speed: number) => void
  setVarispeedMode: (mode: VarispeedMode) => void
  setReverbMix: (mix: number) => void
  loadTrack: (url: string) => void
  queuePlayOnLoad: () => void
}

export function useAudioPlayer(options: UseAudioPlayerOptions): UseAudioPlayerReturn {
  const { cardId, trackUrl, looping = false, autoplay = false, reverbConfig, onPlay, onPause, onEnded } = options

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeedState] = useState(1.0)
  const [varispeedMode, setVarispeedModeState] = useState<VarispeedMode>('natural')
  const [reverbMix, setReverbMixState] = useState(0)
  const userReverbMixRef = useRef<number | null>(null)

  const engineRef = useRef(getAudioEngine())
  const initPromiseRef = useRef<Promise<void> | null>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded
  const autoplayRef = useRef(autoplay)
  autoplayRef.current = autoplay
  const playOnNextLoadRef = useRef(false)
  const autoplayCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const engine = engineRef.current

    if (!initPromiseRef.current) {
      initPromiseRef.current = engine.init().then(() => {
        if (!engine.isInitialized()) {
          initPromiseRef.current = null
        }
      })
    }

    engine.setCallbacks({
      onProgress: (time, dur) => {
        setCurrentTime(time)
        setDuration(dur)
        setProgress(dur > 0 ? time / dur : 0)
      },
      onLoaded: (dur) => {
        setDuration(dur)
        setIsLoaded(true)
        setIsLoading(false)
        const shouldAutoplay = autoplayRef.current || playOnNextLoadRef.current
        playOnNextLoadRef.current = false
        if (shouldAutoplay && !engine.isPlaying()) {
          const tryAutoplay = () => {
            if (engine.isPlaying()) return
            engine.play()
            setIsPlaying(true)
          }

          tryAutoplay()

          if (engine.getContextState() !== 'running') {
            setIsPlaying(false)
            const onInteraction = () => {
              tryAutoplay()
              document.removeEventListener('click', onInteraction, true)
              document.removeEventListener('touchstart', onInteraction, true)
              document.removeEventListener('keydown', onInteraction, true)
            }
            document.addEventListener('click', onInteraction, true)
            document.addEventListener('touchstart', onInteraction, true)
            document.addEventListener('keydown', onInteraction, true)

            autoplayCleanupRef.current = () => {
              document.removeEventListener('click', onInteraction, true)
              document.removeEventListener('touchstart', onInteraction, true)
              document.removeEventListener('keydown', onInteraction, true)
            }
          }
        }
      },
      onEnded: () => {
        setIsPlaying(false)
        setProgress(1)
        if (onEndedRef.current) {
          onEndedRef.current()
        }
      },
      onError: (error) => {
        console.error('AudioEngine error:', error)
        setIsLoading(false)
      }
    })

    return () => {
      if (engine.isPlaying()) {
        engine.pause()
      }

      if (autoplayCleanupRef.current) {
        autoplayCleanupRef.current()
        autoplayCleanupRef.current = null
      }
    }
  }, [cardId])

  useEffect(() => {
    if (trackUrl) {
      loadTrack(trackUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackUrl])

  useEffect(() => {
    const engine = engineRef.current
    engine.setLooping(looping)
  }, [looping])

  useEffect(() => {
    if (!reverbConfig) return
    const engine = engineRef.current

    const apply = async () => {
      if (initPromiseRef.current) {
        await initPromiseRef.current
      }
      const effectiveMix = userReverbMixRef.current !== null
        ? userReverbMixRef.current
        : 0
      engine.setReverbConfig({ ...reverbConfig, mix: effectiveMix })
      if (userReverbMixRef.current !== null) {
        engine.setReverbMix(userReverbMixRef.current)
      }
    }
    apply()
  }, [reverbConfig])

  const loadTrack = useCallback(async (url: string) => {
    const engine = engineRef.current
    setIsLoading(true)
    setIsLoaded(false)
    try {
      if (initPromiseRef.current) {
        await initPromiseRef.current
      }
      await engine.loadTrack(url)
    } catch (error) {
      console.error('Failed to load track:', error)
      setIsLoading(false)
    }
  }, [])

  const play = useCallback(() => {
    const engine = engineRef.current
    engine.play()
    setIsPlaying(true)
    if (onPlay) onPlay()
  }, [onPlay])

  const pause = useCallback(() => {
    const engine = engineRef.current
    engine.pause()
    setIsPlaying(false)
    if (onPause) onPause()
  }, [onPause])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback((position: number) => {
    const engine = engineRef.current
    const dur = engine.getDuration()
    if (dur > 0) {
      const timeInSeconds = position * dur
      engine.seek(timeInSeconds)
    }
  }, [])

  const setSpeed = useCallback((newSpeed: number) => {
    const engine = engineRef.current
    engine.setVarispeed(newSpeed, varispeedMode)
    setSpeedState(newSpeed)
  }, [varispeedMode])

  const setVarispeedMode = useCallback((mode: VarispeedMode) => {
    const engine = engineRef.current
    engine.setVarispeed(speed, mode)
    setVarispeedModeState(mode)
  }, [speed])

  const setReverbMix = useCallback((mix: number) => {
    const engine = engineRef.current
    engine.setReverbMix(mix)
    setReverbMixState(mix)
    userReverbMixRef.current = mix
  }, [])

  const queuePlayOnLoad = useCallback(() => {
    playOnNextLoadRef.current = true
  }, [])

  return {
    isPlaying,
    isLoaded,
    isLoading,
    currentTime,
    duration,
    progress,
    speed,
    varispeedMode,
    reverbMix,
    play,
    pause,
    togglePlay,
    seek,
    setSpeed,
    setVarispeedMode,
    setReverbMix,
    loadTrack,
    queuePlayOnLoad,
  }
}
