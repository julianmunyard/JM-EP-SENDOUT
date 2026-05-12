export interface AudioTrack {
  id: string
  title: string
  artist: string
  duration: number
  audioUrl: string
  storagePath: string
  waveformData?: number[]
  albumArtUrl?: string
  albumArtStoragePath?: string
  locked?: boolean
}

export interface ReverbConfig {
  mix: number
  width: number
  damp: number
  roomSize: number
  predelayMs: number
  enabled: boolean
}

export const DEFAULT_REVERB_CONFIG: ReverbConfig = {
  mix: 0.3,
  width: 0.8,
  damp: 0.5,
  roomSize: 1.0,
  predelayMs: 20,
  enabled: false
}
