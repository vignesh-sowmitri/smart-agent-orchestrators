import { Component, inject, ElementRef, viewChild, effect } from '@angular/core';
import { OrchestratorService } from '../../services/orchestrator.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-transcript-viewer',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="transcript-container">
      <div class="transcript-header">
        <span class="pulse-dot" [class.active]="orchestrator.isListening()"></span>
        <h3>Live Transcript</h3>
      </div>
      <div class="transcript-messages" #scrollContainer>
        @for (msg of orchestrator.messages(); track msg.id) {
          <div class="message" [class]="msg.speaker">
            <span class="speaker-label">{{ msg.speaker === 'customer' ? '👤 Vignesh Kumar' : '🎧 Agent' }}</span>
            <p>{{ msg.text }}</p>
            <span class="timestamp">{{ msg.timestamp | date:'HH:mm:ss' }}</span>
          </div>
        }
        @empty {
          <div class="empty-state">
            <p>Waiting for conversation to begin...</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .transcript-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1a1a2e;
      border-radius: 12px;
      overflow: hidden;
    }
    .transcript-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
    }
    .transcript-header h3 {
      margin: 0;
      font-size: 14px;
      color: #e0e0e0;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #666;
    }
    .pulse-dot.active {
      background: #00e676;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .transcript-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .message {
      padding: 10px 14px;
      border-radius: 10px;
      max-width: 85%;
    }
    .message.customer {
      background: #0f3460;
      align-self: flex-start;
    }
    .message.agent {
      background: #1b4332;
      align-self: flex-end;
    }
    .speaker-label {
      font-size: 11px;
      color: #aaa;
      font-weight: 600;
    }
    .message p {
      margin: 4px 0;
      color: #f0f0f0;
      font-size: 13px;
      line-height: 1.4;
    }
    .timestamp {
      font-size: 10px;
      color: #666;
    }
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #555;
      font-style: italic;
    }
  `]
})
export class TranscriptViewerComponent {
  readonly orchestrator = inject(OrchestratorService);
  private scrollContainer = viewChild<ElementRef>('scrollContainer');

  constructor() {
    effect(() => {
      this.orchestrator.messages();
      setTimeout(() => {
        const el = this.scrollContainer()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }
}
