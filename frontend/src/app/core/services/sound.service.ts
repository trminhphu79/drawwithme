import { Injectable, signal } from '@angular/core';

/**
 * UI sound feedback.
 *  - Chat send / receive use bundled mp3 assets.
 *  - Reactions use a tiny Web Audio synth blip (no asset).
 * Honors a mute toggle; playback failures (autoplay policy) are swallowed.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly muted = signal(false);

  private readonly sendUrl = 'assets/sound/send-message.mp3';
  private readonly receiveUrl = 'assets/sound/receive_message.mp3';
  private ctx: AudioContext | null = null;

  toggleMute(): void {
    this.muted.update((m) => !m);
  }

  /** Outgoing message sent by this user. */
  sendMessage(): void {
    this.playClip(this.sendUrl);
  }

  /** Incoming message from someone else. */
  receiveMessage(): void {
    this.playClip(this.receiveUrl);
  }

  /** Quick rising blip for an emoji reaction. */
  pop(): void {
    if (this.muted()) return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playClip(url: string): void {
    if (this.muted()) return;
    try {
      // Fresh element each time so rapid sounds can overlap.
      const audio = new Audio(url);
      audio.volume = 0.6;
      void audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }
}
