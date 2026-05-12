// audioCardProcessor.js
// Superpowered AudioWorklet processor for LinkLobby audio card
// Ported from Munyard Mixer's timelineProcessor.js + SuperpoweredRegion.js
// Single-track playback with AdvancedAudioPlayer + Reverb
//
// Play/pause is controlled by a `playing` flag in the processor.
// When playing=false, processAudio outputs silence (AudioContext stays running).
// AudioContext.resume() is only used on the main thread for browser autoplay policy.
// This decouples play/pause from AudioContext state transitions.

import { SuperpoweredWebAudio } from "/SP-es6.js";

class AudioCardProcessor extends SuperpoweredWebAudio.AudioWorkletProcessor {
  // Player and effects
  player = null;
  reverb = null;
  playerBuffer = null;
  reverbInputBuffer = null;
  reverbOutputBuffer = null;
  numOfFrames = 128;

  // State
  loaded = false;
  playing = false;  // Gated by play/stop commands — controls audio output
  trackUrl = null;
  audioDuration = 0;
  currentPlaybackRate = 1.0;
  isNaturalVarispeed = true;
  looping = true;
  ended = false;
  debugFirstProcess = true; // Log first processAudio call after load

  // Progress reporting
  lastProgressUpdate = 0;
  progressUpdateInterval = 10;

  onReady() {
    // Create AdvancedAudioPlayer
    // Same constructor args as SuperpoweredRegion in Munyard Mixer
    this.player = new this.Superpowered.AdvancedAudioPlayer(
      this.samplerate,
      2, 2, 0, 0.501, 2, false
    );
    this.player.outputSamplerate = this.samplerate;
    this.player.loopOnEOF = true;
    this.player.playbackRate = 1.0;
    this.player.timeStretching = false;
    this.player.pitchShiftCents = 0;

    // CRITICAL: Start player immediately (same as SuperpoweredRegion constructor line 42)
    // this.play() is called at end of constructor before any audio is loaded
    this.player.play();

    // Create Reverb (same as SuperpoweredTrack constructor)
    // Defaults must match DEFAULT_REVERB_CONFIG in src/types/audio.ts
    this.reverb = new this.Superpowered.Reverb(this.samplerate, 44100);
    this.reverb.enabled = false;
    this.reverb.mix = 0.0;
    this.reverb.roomSize = 0.5;
    this.reverb.damp = 0.5;
    this.reverb.width = 0.8;
    this.reverb.reverbPredelayMs = 20;
    this.reverb.lowCutHz = 0;

    // Pre-allocate buffers (NEVER allocate in audio loop!)
    this.playerBuffer = new this.Superpowered.Float32Buffer(this.numOfFrames * 2);
    this.reverbInputBuffer = new this.Superpowered.Float32Buffer(this.numOfFrames * 2);
    this.reverbOutputBuffer = new this.Superpowered.Float32Buffer(this.numOfFrames * 2);

    this.sendMessageToMainScope({ event: "ready" });
  }

  onMessageFromMainScope(message) {
    // Handle Superpowered download/decode callback
    // Same as timelineProcessor.js: if (message.SuperpoweredLoaded)
    if (message.SuperpoweredLoaded) {
      this.loadAsset(message.SuperpoweredLoaded);
      return;
    }

    if (message.type === "command") {
      this.handleCommand(message.data);
    }
  }

  loadAsset(SuperpoweredLoaded) {
    if (!SuperpoweredLoaded || SuperpoweredLoaded.url !== this.trackUrl) return;

    // Load decoded audio into player (same as SuperpoweredTrack.loadAudio)
    // Third arg = true (synchronous) — buffer is already decoded by downloadAndDecode,
    // openMemory just needs to parse headers. With false (async), durationMs=0 and
    // processStereo returns silence because the player hasn't finished loading yet.
    const pointer = this.Superpowered.arrayBufferToWASM(SuperpoweredLoaded.buffer);
    this.player.openMemory(pointer, false, true);
    this.regionPointer = pointer;
    SuperpoweredLoaded.buffer = null;

    // Get duration (same heuristic as Munyard Mixer SuperpoweredTrack.loadAudio)
    let durationSeconds = 0;
    const playerMs = this.player.durationMs || 0;
    if (playerMs > 0) {
      durationSeconds = playerMs / 1000;
    } else {
      const sizeInSamples = this.Superpowered.AudioInMemory.getSize(pointer);
      const sampleRate = this.Superpowered.AudioInMemory.getSamplerate(pointer);
      if (sizeInSamples > 0 && sampleRate > 0) {
        const candidateFrames = sizeInSamples / sampleRate;
        const candidateInterleaved = sizeInSamples / (sampleRate * 2);
        const candidates = [candidateFrames, candidateInterleaved].filter(v => v > 1);
        durationSeconds = candidates.length ? Math.max(...candidates) : 0;
      }
    }

    this.audioDuration = durationSeconds;

    // Set up loop points (same as Munyard Mixer SuperpoweredTrack.loadAudio)
    if (durationSeconds > 0) {
      try {
        const loopEndMs = Math.floor(durationSeconds * 1000);
        this.player.loopBetween(0, loopEndMs, true);
      } catch (e) {
        // loopOnEOF is fallback
      }
    }

    // Ensure player is positioned at start and playing
    this.player.setPosition(0);
    this.player.play();

    // Track is loaded and ready
    this.loaded = true;
    this.ended = false;
    this.playing = true;

    this.sendMessageToMainScope({
      event: "loaded",
      data: { duration: durationSeconds }
    });

    console.log("AudioCard: Track loaded (" + durationSeconds.toFixed(2) + "s)");
  }

  handleCommand(data) {
    switch (data.command) {
      case "loadTrack":
        this.loadTrack(data.url);
        break;

      case "play":
        console.log("AudioCard: play command received (loaded=" + this.loaded + ", ended=" + this.ended + ")");
        if (this.loaded) {
          if (this.ended) {
            this.player.setPosition(0);
            this.ended = false;
          }
          this.player.play();
          this.playing = true;
          this.debugFirstProcess = true; // Re-enable debug log for next processAudio
        }
        break;

      case "stop":
        this.playing = false;
        break;

      case "seek": {
        if (this.loaded) {
          this.player.setPosition(data.positionMs);
          this.ended = false;
        }
        break;
      }

      case "setVarispeed":
        // Same as SuperpoweredRegion.setVarispeed
        this.player.playbackRate = data.speed;
        this.currentPlaybackRate = data.speed;
        this.isNaturalVarispeed = data.isNatural;
        if (data.isNatural) {
          this.player.timeStretching = false;
          this.player.pitchShiftCents = 0;
        } else {
          this.player.timeStretching = true;
          this.player.pitchShiftCents = 0;
        }
        break;

      case "setReverbEnabled":
        if (this.reverb) this.reverb.enabled = data.enabled;
        break;

      case "setReverbMix":
        if (this.reverb) {
          this.reverb.mix = data.mix;
          this.reverb.enabled = data.mix > 0;
        }
        break;

      case "setReverbConfig":
        if (this.reverb) {
          const cfg = data.config;
          if (cfg.roomSize !== undefined) this.reverb.roomSize = cfg.roomSize;
          if (cfg.damp !== undefined) this.reverb.damp = cfg.damp;
          if (cfg.width !== undefined) this.reverb.width = cfg.width;
          if (cfg.predelayMs !== undefined) this.reverb.reverbPredelayMs = cfg.predelayMs;
          if (cfg.enabled !== undefined) this.reverb.enabled = cfg.enabled;
          if (cfg.mix !== undefined) this.reverb.mix = cfg.mix;
        }
        break;

      case "setLooping":
        this.looping = data.enabled;
        this.player.loopOnEOF = data.enabled;
        if (data.enabled && this.audioDuration > 0) {
          try {
            this.player.loopBetween(0, Math.floor(this.audioDuration * 1000), true);
          } catch (e) {}
        }
        break;

      default:
        console.warn("AudioCard: Unknown command: " + data.command);
    }
  }

  loadTrack(url) {
    this.loaded = false;
    this.ended = false;
    this.trackUrl = url;
    this.audioDuration = 0;

    // Download and decode via Superpowered (same as Munyard Mixer timeline)
    // SuperpoweredTimeline: this.Superpowered.downloadAndDecode(action.url, this.processorScope);
    this.Superpowered.downloadAndDecode(url, this);
  }

  processAudio(inputBuffer, outputBuffer, buffersize, parameters) {
    // Always clear output (same as SuperpoweredTimeline.processTimeline first line)
    this.Superpowered.memorySet(outputBuffer.pointer, 0, buffersize * 8);

    // Gate audio output: silence when not loaded, ended, or stopped.
    // The `playing` flag is set by play/stop commands from the main thread.
    // AudioContext stays running — the processor outputs silence instead of
    // relying on context.suspend() to prevent processAudio from being called.
    if (!this.loaded || this.ended || !this.playing) {
      return true;
    }

    // Debug: log first processAudio call after load
    if (this.debugFirstProcess) {
      this.debugFirstProcess = false;
      console.log("AudioCard: processAudio RUNNING (loaded=" + this.loaded + ", ended=" + this.ended + ", buffersize=" + buffersize + ")");
      console.log("AudioCard: player.getDisplayPositionMs()=" + this.player.getDisplayPositionMs());
      console.log("AudioCard: player.getDurationMs()=" + this.player.getDurationMs());
    }

    // Clear player buffer (same as SuperpoweredTrack.processTrack)
    this.Superpowered.memorySet(this.playerBuffer.pointer, 0, buffersize * 8);

    // Get audio from AdvancedAudioPlayer (handles time-stretching internally)
    // Same as SuperpoweredRegion.processRegion
    const hasAudio = this.player.processStereo(
      this.playerBuffer.pointer,
      true,
      buffersize,
      0.5
    );

    // Debug: check if processStereo returned audio
    if (this.lastProgressUpdate === 0) {
      let maxSample = 0;
      for (let i = 0; i < Math.min(buffersize * 2, 20); i++) {
        const v = Math.abs(this.playerBuffer.array[i]);
        if (v > maxSample) maxSample = v;
      }
      if (maxSample === 0) {
        console.log("AudioCard: processStereo returned silence (hasAudio=" + hasAudio + ", pos=" + this.player.getDisplayPositionMs() + "ms)");
      }
    }

    // Add dry signal to output (same loop as SuperpoweredRegion.processRegion)
    for (let i = 0; i < buffersize * 2; i++) {
      outputBuffer.array[i] += this.playerBuffer.array[i];
    }

    // Reverb processing (same as SuperpoweredRegion.processRegion reverb section)
    if (this.reverb && this.reverb.enabled && this.reverb.mix > 0) {
      this.Superpowered.memorySet(this.reverbInputBuffer.pointer, 0, buffersize * 8);
      this.Superpowered.memorySet(this.reverbOutputBuffer.pointer, 0, buffersize * 8);

      for (let i = 0; i < buffersize * 2; i++) {
        this.reverbInputBuffer.array[i] = this.playerBuffer.array[i];
      }

      this.reverb.samplerate = this.samplerate;
      const originalMix = this.reverb.mix;
      this.reverb.mix = 1.0;

      if (this.reverb.process(this.reverbInputBuffer.pointer, this.reverbOutputBuffer.pointer, buffersize)) {
        const dryAmount = 1.0 - originalMix;
        for (let i = 0; i < buffersize * 2; i++) {
          const wetOnly = this.reverbOutputBuffer.array[i] - (dryAmount * this.reverbInputBuffer.array[i]);
          outputBuffer.array[i] += wetOnly * originalMix;
        }
      }

      this.reverb.mix = originalMix;
    }

    // Progress reporting (same as SuperpoweredTimeline cursor updates)
    this.lastProgressUpdate++;
    if (this.lastProgressUpdate >= this.progressUpdateInterval) {
      this.lastProgressUpdate = 0;

      const positionMs = this.player.getDisplayPositionMs();
      const durationMs = this.player.getDurationMs();

      this.sendMessageToMainScope({
        event: "progress",
        data: {
          currentTime: positionMs / 1000,
          duration: durationMs / 1000
        }
      });

      // End-of-track detection (non-looping only)
      // Same as SuperpoweredTimeline loop detection
      if (!this.looping && durationMs > 0 && positionMs >= durationMs - 100) {
        this.ended = true;
        this.playing = false;
        this.sendMessageToMainScope({ event: "ended" });
      }
    }

    return true;
  }

  onDestruct() {
    if (this.player) { this.player.destruct(); this.player = null; }
    if (this.reverb) { this.reverb.destruct(); this.reverb = null; }
    if (this.playerBuffer) { this.playerBuffer.free(); this.playerBuffer = null; }
    if (this.reverbInputBuffer) { this.reverbInputBuffer.free(); this.reverbInputBuffer = null; }
    if (this.reverbOutputBuffer) { this.reverbOutputBuffer.free(); this.reverbOutputBuffer = null; }
  }
}

if (typeof AudioWorkletProcessor !== "undefined")
  registerProcessor("AudioCardProcessor", AudioCardProcessor);
export default AudioCardProcessor;
