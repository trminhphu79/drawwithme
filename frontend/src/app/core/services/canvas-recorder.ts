/**
 * Records a <canvas> to a video file entirely in the browser (no server).
 * Uses MediaRecorder + canvas.captureStream — picks MP4/H.264 where the browser
 * supports it (iOS Safari, Chrome/Edge), falling back to WebM (Firefox).
 */
export interface RecorderResult {
  blob: Blob;
  /** File extension matching the chosen container ('mp4' | 'webm'). */
  ext: string;
  mime: string;
}

type CapturableCanvas = HTMLCanvasElement & { captureStream(fps?: number): MediaStream };

export class CanvasRecorder {
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private mime = '';

  /** Whether this browser can record a canvas at all. */
  static isSupported(): boolean {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      'captureStream' in HTMLCanvasElement.prototype
    );
  }

  /** Best container/codec this browser can actually record. */
  private static pickMime(): string {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E', // H.264 baseline — iOS Safari, modern Chrome/Edge
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
  }

  start(canvas: HTMLCanvasElement, opts: { fps: number; bitrate: number }): void {
    const stream = (canvas as CapturableCanvas).captureStream(opts.fps);
    this.mime = CanvasRecorder.pickMime();
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, {
      ...(this.mime ? { mimeType: this.mime } : {}),
      videoBitsPerSecond: opts.bitrate,
    });
    this.recorder.ondataavailable = (e) => {
      if (e.data?.size) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  /** Stop and resolve with the assembled video file. */
  stop(): Promise<RecorderResult> {
    return new Promise<RecorderResult>((resolve, reject) => {
      const rec = this.recorder;
      if (!rec) {
        reject(new Error('Recorder not started'));
        return;
      }
      rec.onstop = () => {
        const mime = this.mime || rec.mimeType || 'video/webm';
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        resolve({ blob: new Blob(this.chunks, { type: mime }), ext, mime });
      };
      if (rec.state !== 'inactive') rec.stop();
      else rec.onstop?.(new Event('stop'));
    });
  }

  /** Abort without producing a file (e.g. on close). */
  abort(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      /* ignore */
    }
  }
}
