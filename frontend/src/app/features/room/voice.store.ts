import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SocketService } from '../../core/services/socket.service';

/** ICE servers. STUN is enough for most NATs; add a TURN entry here later for
 *  users behind strict/symmetric NATs (relay only — still stores nothing). */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

type SignalKind = 'offer' | 'answer' | 'ice';

/**
 * Voice chat over a WebRTC audio **mesh**: each mic-on member connects directly
 * to every other mic-on member. The gateway only relays signaling (SDP/ICE) —
 * audio is peer-to-peer and never stored. Provided at the DrawingRoom scope.
 */
@Injectable()
export class VoiceStore {
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  private code = '';
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly audioEls = new Map<string, HTMLAudioElement>();
  private started = false;

  private readonly _micOn = signal(false);
  private readonly _connecting = signal(false);
  private readonly _peerCount = signal(0);
  readonly micOn = this._micOn.asReadonly();
  readonly connecting = this._connecting.asReadonly();
  /** Number of other people currently on a mic (for the UI badge). */
  readonly peerCount = computed(() => this._peerCount());

  /** Subscribe to signaling once the room is known. Does NOT open the mic. */
  init(code: string): void {
    this.code = code;

    this.socket
      .on<{ peers: string[] }>('voice:peers')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ peers }) => {
        // We're the newcomer → initiate an offer to each existing peer.
        for (const id of peers) void this.makeOffer(id);
      });

    this.socket
      .on<{ socketId: string }>('voice:peer-left')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ socketId }) => this.closePeer(socketId));

    this.socket
      .on<{ from: string; kind: SignalKind; data: unknown }>('voice:signal')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => void this.onSignal(msg));

    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Toggle the mic on/off (joins/leaves the voice mesh). */
  async toggle(): Promise<void> {
    if (this._micOn() || this._connecting()) {
      this.stop();
    } else {
      await this.start();
    }
  }

  private async start(): Promise<void> {
    this._connecting.set(true);
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      this._connecting.set(false);
      return; // permission denied / no mic
    }
    this.started = true;
    this._micOn.set(true);
    this._connecting.set(false);
    // Announce we're on a mic; the server replies with existing peers (voice:peers).
    this.socket.emit('voice:join', { code: this.code });
  }

  /** Leave voice: stop the mic, close every peer connection + audio element. */
  stop(): void {
    if (!this.started && !this._micOn()) return;
    this.socket.emit('voice:leave', { code: this.code });
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    this.started = false;
    this._micOn.set(false);
    this._connecting.set(false);
  }

  // ---- mesh plumbing ----
  private peer(id: string): RTCPeerConnection {
    let pc = this.peers.get(id);
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.localStream?.getTracks().forEach((t) => pc!.addTrack(t, this.localStream!));
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(id, 'ice', e.candidate.toJSON());
    };
    pc.ontrack = (e) => this.attachAudio(id, e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc!.connectionState)) this.closePeer(id);
    };
    this.peers.set(id, pc);
    this._peerCount.set(this.peers.size);
    return pc;
  }

  private async makeOffer(id: string): Promise<void> {
    const pc = this.peer(id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signal(id, 'offer', offer);
  }

  private async onSignal(msg: { from: string; kind: SignalKind; data: unknown }): Promise<void> {
    const { from, kind, data } = msg;
    if (kind === 'offer') {
      const pc = this.peer(from);
      await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signal(from, 'answer', answer);
    } else if (kind === 'answer') {
      await this.peers.get(from)?.setRemoteDescription(data as RTCSessionDescriptionInit);
    } else if (kind === 'ice') {
      try {
        await this.peers.get(from)?.addIceCandidate(data as RTCIceCandidateInit);
      } catch {
        /* candidate arrived before remote description — safe to drop */
      }
    }
  }

  private signal(to: string, kind: SignalKind, data: unknown): void {
    this.socket.emit('voice:signal', { code: this.code, to, kind, data });
  }

  private attachAudio(id: string, stream: MediaStream): void {
    let el = this.audioEls.get(id);
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      (el as HTMLAudioElement & { playsInline: boolean }).playsInline = true;
      el.style.display = 'none';
      document.body.appendChild(el);
      this.audioEls.set(id, el);
    }
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  }

  private closePeer(id: string): void {
    this.peers.get(id)?.close();
    this.peers.delete(id);
    const el = this.audioEls.get(id);
    if (el) {
      el.srcObject = null;
      el.remove();
      this.audioEls.delete(id);
    }
    this._peerCount.set(this.peers.size);
  }
}
