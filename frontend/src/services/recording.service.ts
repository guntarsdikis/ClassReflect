/*
  Lightweight MediaRecorder wrapper for browser audio recording.
  - Detects supported mime types
  - Exposes start/pause/resume/stop
  - Emits level meter values via callback (optional)
*/

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

export interface RecordingConfig {
  preferredMimeTypes?: string[]; // in priority order
  timesliceMs?: number; // chunk size for dataavailable
  audioBitsPerSecond?: number;
  enableLevelMeter?: boolean;
}

export interface RecordingCallbacks {
  onLevel?: (rms: number) => void;
  onError?: (err: Error) => void;
}

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private state: RecordingState = 'idle';
  private mimeType: string | undefined;
  private timesliceMs: number = 1000;
  private levelMeterEnabled = false;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private meterSource: MediaStreamAudioSourceNode | null = null;
  private meterRAF: number | null = null;
  private callbacks: RecordingCallbacks = {};

  constructor(private config: RecordingConfig = {}) {
    this.timesliceMs = config.timesliceMs ?? 1000;
    this.levelMeterEnabled = !!config.enableLevelMeter;
  }

  getState(): RecordingState {
    return this.state;
  }

  getMimeType(): string | undefined {
    return this.mimeType;
  }

  async isSupported(): Promise<boolean> {
    // Basic API presence
    if (typeof window === 'undefined') return false;
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return false;
    if (typeof MediaRecorder === 'undefined') return false;
    // Check at least one mime type
    const mime = this.pickSupportedMimeType();
    return !!mime;
  }

  pickSupportedMimeType(): string | undefined {
    const candidates = this.config.preferredMimeTypes ?? [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav',
    ];
    if (typeof MediaRecorder === 'undefined' || typeof (MediaRecorder as any).isTypeSupported !== 'function') {
      // Fallback: try the first candidate; it may still work in permissive browsers
      return candidates[0];
    }
    for (const type of candidates) {
      if ((MediaRecorder as any).isTypeSupported(type)) return type;
    }
    return undefined;
  }

  private setupLevelMeter(stream: MediaStream) {
    if (!this.levelMeterEnabled) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      const bufferLength = this.analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      this.meterSource = this.audioCtx.createMediaStreamSource(stream);
      this.meterSource.connect(this.analyser);
      const loop = () => {
        this.analyser!.getByteTimeDomainData(dataArray);
        // Compute RMS
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] - 128) / 128; // normalize -1..1
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        this.callbacks.onLevel?.(rms);
        this.meterRAF = requestAnimationFrame(loop);
      };
      this.meterRAF = requestAnimationFrame(loop);
    } catch (err: any) {
      // Level meter is optional; ignore errors
      console.warn('Level meter init failed:', err?.message || err);
    }
  }

  private teardownLevelMeter() {
    if (this.meterRAF) cancelAnimationFrame(this.meterRAF);
    this.meterRAF = null;
    try {
      this.meterSource?.disconnect();
    } catch {}
    try {
      this.analyser?.disconnect();
    } catch {}
    this.meterSource = null;
    this.analyser = null;
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  async start(callbacks?: RecordingCallbacks): Promise<void> {
    this.callbacks = callbacks || {};
    try {
      const constraints: MediaStreamConstraints = { audio: true, video: false };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const type = this.pickSupportedMimeType();
      if (!type) {
        throw new Error('No supported audio recording mime type on this browser.');
      }
      this.mimeType = type;

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: type,
        audioBitsPerSecond: this.config.audioBitsPerSecond ?? 128000,
      });

      this.chunks = [];
      this.mediaRecorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
      };
      this.mediaRecorder.onerror = (ev: MediaRecorderErrorEvent) => {
        const err = new Error(ev.error?.message || 'Recording error');
        this.callbacks.onError?.(err);
        this.state = 'error';
      };

      this.setupLevelMeter(this.stream);

      this.mediaRecorder.start(this.timesliceMs);
      this.state = 'recording';
    } catch (e: any) {
      const err = new Error(e?.message || 'Failed to start recording');
      this.callbacks.onError?.(err);
      this.state = 'error';
      throw err;
    }
  }

  pause(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
    }
  }

  async stop(): Promise<Blob> {
    if (!this.mediaRecorder) throw new Error('Not recording');
    if (this.state !== 'recording' && this.state !== 'paused') throw new Error('Invalid state to stop');

    const mime = this.mimeType || 'audio/webm';
    const chunks = this.chunks;

    const stopped = new Promise<void>((resolve) => {
      this.mediaRecorder!.onstop = () => resolve();
    });
    this.mediaRecorder.stop();
    await stopped;

    // Cleanup stream & meter
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.teardownLevelMeter();

    this.state = 'stopped';
    return new Blob(chunks, { type: mime });
  }

  destroy() {
    try { if (this.mediaRecorder && this.state === 'recording') this.mediaRecorder.stop(); } catch {}
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.teardownLevelMeter();
    this.state = 'idle';
  }
}

export function blobToFile(blob: Blob, filename: string): File {
  // Safari needs a proper File for Content-Type
  return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
}
