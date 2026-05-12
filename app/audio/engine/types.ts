export type VarispeedMode = 'natural' | 'timestretch'

export interface AudioEngineState {
  isPlaying: boolean
  isLoaded: boolean
  currentTime: number
  duration: number
  progress: number
  speed: number
  varispeedMode: VarispeedMode
  reverbMix: number
}

export interface AudioEngineCallbacks {
  onProgress?: (time: number, duration: number) => void
  onEnded?: () => void
  onLoaded?: (duration: number) => void
  onError?: (error: string) => void
}
