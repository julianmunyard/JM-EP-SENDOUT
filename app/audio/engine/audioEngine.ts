// src/audio/engine/audioEngine.ts
// Superpowered AudioWorklet engine for LinkLobby audio card
// Ported from Munyard Mixer's thomasAudioEngine.js pattern
//
// Play/pause is decoupled from AudioContext state:
// - Play = AudioContext.resume() (for browser policy) + send play command to processor
// - Pause = send stop command to processor (context stays running, processor outputs silence)
// - Track loading is done via Superpowered.downloadAndDecode() inside the processor
//
import { SuperpoweredGlue, SuperpoweredWebAudio } from '@superpoweredsdk/web'

import type { AudioEngineCallbacks, VarispeedMode } from './types'
import type { ReverbConfig } from '@/app/types/audio'

const processorUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/processors/audioCardProcessor.js`
  : ''

class AudioEngine {
  private webaudioManager: any = null
  private superpowered: any = null
  private processorNode: any = null
  private started = false
  private isLoadedFlag = false
  private isPlayingFlag = false
  private currentUrl: string | null = null
  private durationSeconds = 0
  private currentTimeSeconds = 0
  private callbacks: AudioEngineCallbacks = {}
  private silentAudioElement: HTMLAudioElement | null = null
  private isIOS = false
  private audioUnlocked = false
  private pendingPlayAfterLoad = false

  async init(): Promise<void> {
    if (this.started) return

    try {
      // Detect iOS (including iPadOS which reports as Mac)
      this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      // iOS 17+: Set audio session to "playback" so Web Audio plays through
      // even when the ringer/silent switch is off. The default "auto" may
      // use "ambient" which mutes Web Audio when the ringer is off.
      // Pre-iOS 17 devices rely on the ensureUnlocked() silent audio trick.
      if ((navigator as any).audioSession) {
        (navigator as any).audioSession.type = 'playback'
      }

      // Initialize Superpowered with local WASM (absolute URL so blob Workers can resolve it)
      const wasmUrl = `${window.location.origin}/superpowered/superpowered.wasm`

      // Pre-check WASM availability before handing off to Superpowered.
      // This prevents Superpowered's internal fetch from throwing an unhandled
      // rejection that triggers the Next.js dev error overlay.
      const probe = await fetch(wasmUrl, { method: 'HEAD' }).catch(() => null)
      if (!probe || !probe.ok) {
        console.warn('AudioEngine: WASM not available, deferring init')
        return
      }

      // Set the CDN URL so blob Workers (track loader) can also resolve it
      SuperpoweredGlue.wasmCDNUrl = wasmUrl
      this.superpowered = await SuperpoweredGlue.Instantiate(
        'ExampleLicenseKey-WillExpire-OnNextUpdate',
        wasmUrl
      )
      this.webaudioManager = new SuperpoweredWebAudio(48000, this.superpowered)

      // Message handler for events from the AudioWorklet processor
      const onMessageFromProcessor = (message: any) => {
        if (message.event === 'ready') {
          console.log('AudioEngine: Superpowered processor ready')
        }

        if (message.event === 'loaded') {
          this.durationSeconds = message.data.duration
          this.isLoadedFlag = true
          console.log(`AudioEngine: Track loaded (${this.durationSeconds.toFixed(2)}s)`)

          // Processor sets playing=true after loadAsset (matches old behavior where
          // processAudio always ran when loaded). If we don't want audio yet, send
          // stop BEFORE firing callbacks — this way autoplay's play() arrives after
          // the stop and correctly overrides it.
          if (this.pendingPlayAfterLoad) {
            this.pendingPlayAfterLoad = false
            this.isPlayingFlag = true
            console.log('AudioEngine: auto-play after pending load')
            // Re-resume context — the original gesture may have expired during download.
            // Also re-send play command and schedule verification to ensure audio starts.
            if (this.processorNode.context.state !== 'running') {
              this.processorNode.context.resume()
            }
            this.processorNode.sendMessageToAudioScope({
              type: 'command',
              data: { command: 'play' }
            })
            this.schedulePlaybackVerification()
          } else if (!this.isPlayingFlag) {
            // Nobody requested play — silence the processor
            this.processorNode.sendMessageToAudioScope({
              type: 'command',
              data: { command: 'stop' }
            })
          }

          if (this.callbacks.onLoaded) {
            this.callbacks.onLoaded(this.durationSeconds)
          }
        }

        if (message.event === 'progress') {
          this.currentTimeSeconds = message.data.currentTime
          this.durationSeconds = message.data.duration
          if (this.callbacks.onProgress) {
            this.callbacks.onProgress(message.data.currentTime, message.data.duration)
          }
        }

        if (message.event === 'ended') {
          this.isPlayingFlag = false
          // Processor already set playing=false — no need to suspend context
          if (this.callbacks.onEnded) {
            this.callbacks.onEnded()
          }
        }

        if (message.event === 'error') {
          console.error('AudioEngine processor error:', message.data.message)
          if (this.callbacks.onError) {
            this.callbacks.onError(message.data.message)
          }
        }
      }

      // Create AudioWorklet node (same as Munyard Mixer)
      this.processorNode = await this.webaudioManager.createAudioNodeAsync(
        processorUrl,
        'AudioCardProcessor',
        onMessageFromProcessor
      )

      // Connect to audio output — use the node's own context to avoid mismatch
      this.processorNode.connect(this.processorNode.context.destination)

      // DO NOT explicitly suspend the context here.
      // Browser autoplay policy already suspends new AudioContexts created outside
      // user gestures. Explicitly suspending before the context has ever processed
      // a frame can cause resume() to fail in certain timing conditions (e.g. when
      // the AudioPlayer mounts after a measurement cycle in scatter/freeform mode).
      // play() calls context.resume() which handles both browser auto-suspension
      // and any other suspended state.

      this.started = true
      console.log('AudioEngine initialized (Superpowered)')
    } catch (error) {
      // Don't throw — transient fetch failures during dev HMR are expected.
      // The component will retry init on next mount. Audio simply won't load
      // until the WASM fetch succeeds.
      console.warn('AudioEngine init deferred (WASM fetch failed, will retry):', error)
    }
  }

  isInitialized(): boolean {
    return this.started
  }

  /**
   * iOS silent audio unlock — pre-iOS 17 fallback.
   * Plays a silent <audio> element to switch the audio session from
   * "ambient" (ringer channel, muted by silent switch) to "playback"
   * (media channel, plays through silent switch). On iOS 17+ the
   * navigator.audioSession.type = "playback" API handles this instead.
   * Must be called in a user gesture handler.
   */
  private ensureUnlocked(): void {
    if (!this.isIOS || this.audioUnlocked) return

    if (!this.silentAudioElement) {
      const audio = document.createElement('audio')
      audio.loop = true
      audio.volume = 0.001
      audio.preload = 'auto'
      audio.controls = false
      ;(audio as any).disableRemotePlayback = true
      audio.setAttribute('playsinline', 'true')
      audio.setAttribute('webkit-playsinline', 'true')
      ;(audio as any).playsInline = true
      audio.style.display = 'none'

      const huffman = (count: number, repeatStr: string): string => {
        let e = repeatStr
        for (; count > 1; count--) e += repeatStr
        return e
      }
      const silence = "data:audio/mpeg;base64,//uQx" + huffman(23, "A") + "WGluZwAAAA8AAAACAAACcQCA" + huffman(16, "gICA") + huffman(66, "/") + "8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkI" + huffman(320, "A") + "//sQxAADgnABGiAAQBCqgCRMAAgEAH" + huffman(15, "/") + "7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq" + huffman(18, "/") + "9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAw" + huffman(97, "V") + "Q=="
      audio.src = silence
      audio.load()

      document.body.appendChild(audio)
      this.silentAudioElement = audio
    }

    this.silentAudioElement.play()
      .then(() => {
        this.audioUnlocked = true
        console.log('iOS media channel unlocked')
        if (this.processorNode?.context.state !== 'running') {
          this.processorNode.context.resume()
        }
      })
      .catch((err: unknown) => {
        console.warn('Silent audio unlock failed:', err)
      })
  }

  async loadTrack(url: string): Promise<void> {
    if (!this.processorNode) {
      // Engine not ready yet (transient init failure during dev HMR).
      // Silently bail — play() will retry loadTrack when the engine recovers.
      return
    }

    // Don't reload if same URL — but fire onLoaded so new listeners sync state
    if (this.currentUrl === url && this.isLoadedFlag) {
      if (this.callbacks.onLoaded) {
        this.callbacks.onLoaded(this.durationSeconds)
      }
      return
    }

    // Stop current playback
    if (this.isPlayingFlag) {
      this.pause()
    }

    this.isLoadedFlag = false
    this.currentUrl = url
    this.currentTimeSeconds = 0
    this.durationSeconds = 0

    // Send loadTrack command to processor
    // The processor calls Superpowered.downloadAndDecode() internally
    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'loadTrack', url }
    })
  }

  /**
   * Play — synchronous call in user gesture callstack.
   * context.resume() MUST be called synchronously (no awaits before it)
   * or mobile browsers won't honour the gesture.
   * Playback verification retries after 200ms (matching Munyard Mixer pattern).
   */
  play(): void {
    if (!this.processorNode) {
      console.warn('Cannot play: not initialized')
      return
    }

    // iOS/iPadOS: unlock media channel so audio plays through silent switch.
    // On iOS 17+ the audioSession.type = "playback" (set in init) handles this,
    // but older iOS needs the silent <audio> element trick.
    if (this.isIOS) {
      this.ensureUnlocked()
    }

    // Resume AudioContext — MUST be synchronous in user gesture callstack.
    // On mobile, context is auto-suspended by browser policy; this is the
    // only chance to resume it. On desktop, context may also be suspended.
    // NEVER put an await before this line — it breaks the gesture context.
    const resumePromise = this.processorNode.context.resume()

    // If track hasn't loaded yet (mobile: downloadAndDecode may have failed
    // while context was auto-suspended), re-send loadTrack now that context
    // is resumed, and auto-play when the track finishes loading.
    if (!this.isLoadedFlag) {
      if (this.currentUrl) {
        this.processorNode.sendMessageToAudioScope({
          type: 'command',
          data: { command: 'loadTrack', url: this.currentUrl }
        })
        this.pendingPlayAfterLoad = true
        this.isPlayingFlag = true
        console.log('AudioEngine: play pending (track loading after context resume)')
      } else {
        console.warn('Cannot play: no track URL')
      }
      return
    }

    // Track is loaded — send play command (resets ended state in processor)
    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'play' }
    })

    this.isPlayingFlag = true
    console.log('AudioEngine: play (context.state:', this.processorNode.context.state + ')')

    // Insurance: when context confirms running, re-send play command.
    // context.resume() is called synchronously above (preserving user gesture),
    // but the state transition may not be instant. The Promise resolves when
    // the context is actually 'running'.
    if (resumePromise) {
      resumePromise.then(() => {
        if (this.isPlayingFlag && this.processorNode && this.isLoadedFlag) {
          this.processorNode.sendMessageToAudioScope({
            type: 'command',
            data: { command: 'play' }
          })
        }
      }).catch(() => {
        // Swallow — verification retries handle failures
      })
    }

    // Verify playback started — retries multiple times with increasing delays
    this.schedulePlaybackVerification()
  }

  /**
   * After play(), verify audio is actually progressing. If not, retry.
   * Retries up to 5 times with increasing delays. Each retry:
   * 1. Checks context.state and calls resume() if not 'running'
   * 2. Re-sends play command to the processor
   * 3. Schedules next verification
   */
  private schedulePlaybackVerification(attempt = 0): void {
    const maxAttempts = 5
    const delays = [150, 300, 500, 1000, 2000]
    const delay = delays[Math.min(attempt, delays.length - 1)]
    const initialTime = this.currentTimeSeconds

    setTimeout(() => {
      if (!this.isPlayingFlag || !this.isLoadedFlag || !this.processorNode) return

      const progressed = this.currentTimeSeconds > initialTime + 0.005
      if (!progressed) {
        const ctxState = this.processorNode.context.state
        if (attempt < maxAttempts) {
          console.log(`AudioEngine: playback not progressing (attempt ${attempt + 1}/${maxAttempts}, context: ${ctxState}), retrying...`)
          // Ensure context is running
          if (ctxState !== 'running') {
            this.processorNode.context.resume()
          }
          // Re-send play command
          this.processorNode.sendMessageToAudioScope({
            type: 'command',
            data: { command: 'play' }
          })
          // Schedule next verification
          this.schedulePlaybackVerification(attempt + 1)
        } else {
          console.warn(`AudioEngine: playback not progressing after ${maxAttempts} attempts (context: ${ctxState})`)
        }
      }
    }, delay)
  }

  pause(): void {
    if (!this.processorNode) return

    this.pendingPlayAfterLoad = false

    // Send stop command to processor — silences output without suspending context.
    // AudioContext stays running; the processor's playing flag gates audio output.
    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'stop' }
    })

    this.isPlayingFlag = false
    console.log('AudioEngine: pause')
  }

  seek(position: number): void {
    if (!this.processorNode || !this.isLoadedFlag) return

    // Clamp to valid range
    const clampedPosition = Math.max(0, Math.min(position, this.durationSeconds))
    const positionMs = clampedPosition * 1000

    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'seek', positionMs }
    })

    this.currentTimeSeconds = clampedPosition
    console.log(`AudioEngine: seek to ${clampedPosition.toFixed(2)}s`)
  }

  setVarispeed(speed: number, mode: VarispeedMode): void {
    if (!this.processorNode) return

    const clampedSpeed = Math.max(0.5, Math.min(1.5, speed))
    const isNatural = mode === 'natural'

    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'setVarispeed', speed: clampedSpeed, isNatural }
    })
  }

  setReverbConfig(config: ReverbConfig): void {
    if (!this.processorNode) return

    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: {
        command: 'setReverbConfig',
        config: {
          enabled: config.enabled ?? (config.mix > 0),
          mix: config.mix,
          roomSize: config.roomSize,
          damp: config.damp,
          width: config.width,
          predelayMs: config.predelayMs,
        }
      }
    })
  }

  setReverbMix(mix: number): void {
    if (!this.processorNode) return

    const clampedMix = Math.max(0, Math.min(1, mix))

    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'setReverbMix', mix: clampedMix }
    })
  }

  setLooping(enabled: boolean): void {
    if (!this.processorNode) return

    this.processorNode.sendMessageToAudioScope({
      type: 'command',
      data: { command: 'setLooping', enabled }
    })

    console.log(`Looping ${enabled ? 'enabled' : 'disabled'}`)
  }

  getCurrentTime(): number {
    return this.currentTimeSeconds
  }

  getDuration(): number {
    return this.durationSeconds
  }

  isPlaying(): boolean {
    return this.isPlayingFlag
  }

  isLoaded(): boolean {
    return this.isLoadedFlag
  }

  setCallbacks(callbacks: AudioEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  getContextState(): AudioContextState | 'uninitialized' {
    if (!this.processorNode) return 'uninitialized'
    return this.processorNode.context.state
  }

  /**
   * Returns the underlying AudioContext so callers can insert nodes
   * (e.g. a GainNode for volume control) into the audio graph.
   */
  getAudioContext(): AudioContext | null {
    return this.processorNode?.context ?? null
  }

  /**
   * Returns the processor AudioWorklet node so callers can reconnect
   * it through additional nodes (e.g. gain → destination).
   */
  getProcessorNode(): any {
    return this.processorNode
  }

  /**
   * Check if the engine has been initialized (AudioContext created).
   * Used by useAudioPlayer to decide whether to defer track loading.
   */
  isStarted(): boolean {
    return this.started
  }

  /**
   * Set a pending track URL without requiring engine initialization.
   * The URL will be loaded when play() is called and triggers init.
   */
  setPendingTrack(url: string): void {
    this.currentUrl = url
    this.isLoadedFlag = false
    this.currentTimeSeconds = 0
    this.durationSeconds = 0
  }

  destroy(): void {
    if (this.isPlayingFlag) {
      this.pause()
    }

    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.processorNode) {
      this.processorNode.context.close()
    }

    this.webaudioManager = null

    if (this.silentAudioElement) {
      this.silentAudioElement.pause()
      this.silentAudioElement.src = ''
      if (this.silentAudioElement.parentNode) {
        this.silentAudioElement.parentNode.removeChild(this.silentAudioElement)
      }
      this.silentAudioElement = null
    }

    this.started = false
    this.isLoadedFlag = false
    this.isPlayingFlag = false
    this.pendingPlayAfterLoad = false
    this.currentUrl = null
    this.superpowered = null
    this.audioUnlocked = false

    console.log('AudioEngine destroyed')
  }
}

// Singleton instance
let instance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!instance) {
    instance = new AudioEngine()
  }
  return instance
}

export { AudioEngine }
