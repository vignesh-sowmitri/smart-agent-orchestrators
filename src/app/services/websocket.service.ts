import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { WebSocketMessage, TranscriptMessage, AISuggestion } from '../models/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  readonly connected = signal(false);
  readonly transcript$ = new Subject<TranscriptMessage>();
  readonly suggestion$ = new Subject<AISuggestion>();

  connect(sessionId: string): void {
    const url = `${environment.wsUrl}?sessionId=${sessionId}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.connected.set(true);
      this.reconnectAttempts = 0;
      console.log('[WS] Connected to orchestrator backend');
    };

    this.socket.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.socket.onclose = () => {
      this.connected.set(false);
      this.attemptReconnect(sessionId);
    };

    this.socket.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  sendTranscript(message: TranscriptMessage): void {
    this.send({
      type: 'transcript',
      payload: message,
      customerProfile: {
        name: 'Vignesh Kumar',
        accountId: 'ACC-29481',
        email: 'vignesh@genesys.com',
      }
    } as any);
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }

  private send(message: WebSocketMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'message', data: message }));
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'transcript':
        this.transcript$.next(message.payload as TranscriptMessage);
        break;
      case 'suggestion':
        this.suggestion$.next(message.payload as AISuggestion);
        break;
    }
  }

  private attemptReconnect(sessionId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(sessionId), 2000 * this.reconnectAttempts);
    }
  }
}
