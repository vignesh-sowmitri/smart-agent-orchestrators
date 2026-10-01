import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrchestratorService } from '../../services/orchestrator.service';
import { TranscriptViewerComponent } from '../transcript-viewer/transcript-viewer.component';
import { SuggestionPanelComponent } from '../suggestion-panel/suggestion-panel.component';
import { FormRendererComponent } from '../form-renderer/form-renderer.component';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-sidebar-widget',
  standalone: true,
  imports: [FormsModule, TranscriptViewerComponent, SuggestionPanelComponent, FormRendererComponent],
  template: `
    <div class="widget-container">
      <!-- Header -->
      <header class="widget-header">
        <div class="brand">
          <span class="logo">⚡</span>
          <h1>Smart Agent Orchestrator</h1>
        </div>
        <div class="header-right">
          <div class="customer-info">
            <span class="customer-avatar">V</span>
            <div class="customer-details">
              <span class="customer-name">Vignesh Kumar</span>
              <span class="customer-account">ACC-29481</span>
            </div>
          </div>
          <div class="status">
            <label class="mode-toggle">
              <input type="checkbox" [checked]="!orchestrator.demoMode()" (change)="orchestrator.toggleMode()" />
              <span class="toggle-slider"></span>
            </label>
            <span class="status-text" [class.live]="!orchestrator.demoMode()">{{ orchestrator.demoMode() ? 'Demo Mode' : 'Live (Bedrock)' }}</span>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="widget-body">
        <div class="panel transcript-panel">
          <app-transcript-viewer />
        </div>
        <div class="panel suggestion-panel">
          <app-suggestion-panel />
        </div>
      </div>

      <!-- Form Overlay -->
      <app-form-renderer />

      <!-- Input Bar (Demo Mode) -->
      <footer class="input-bar">
        <div class="input-grid">
          <div class="input-group">
            <span class="input-label">👤 Vignesh Kumar (ACC-29481)</span>
            <div class="input-row">
              <input
                type="text"
                [(ngModel)]="customerText"
                (keydown.enter)="sendCustomerMessage()"
                placeholder="Customer says..."
                class="message-input customer-input"
              />
              <button (click)="sendCustomerMessage()" class="send-btn customer-btn">Send</button>
            </div>
          </div>
          <div class="input-group">
            <span class="input-label">🎧 Agent</span>
            <div class="input-row">
              <input
                type="text"
                [(ngModel)]="agentText"
                (keydown.enter)="sendAgentMessage()"
                placeholder="Agent responds..."
                class="message-input agent-input"
              />
              <button (click)="sendAgentMessage()" class="send-btn agent-btn">Send</button>
            </div>
          </div>
        </div>
        <div class="demo-hints">
          Try: "I was charged $50 twice last week" · "I need to renew my token" · "I want to cancel, it's too expensive"
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .widget-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0f0f23;
      color: #e0e0e0;
      font-family: 'Inter', -apple-system, sans-serif;
      position: relative;
    }
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: linear-gradient(135deg, #1a1a3e, #16213e);
      border-bottom: 1px solid #1f1f4a;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo { font-size: 22px; }
    .brand h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      background: linear-gradient(135deg, #6c63ff, #00e676);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .customer-info {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1f1f4a;
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid #2a2a6a;
    }
    .customer-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6c63ff, #00e676);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: white;
    }
    .customer-details {
      display: flex;
      flex-direction: column;
    }
    .customer-name {
      font-size: 12px;
      font-weight: 600;
      color: #e0e0e0;
    }
    .customer-account {
      font-size: 10px;
      color: #6c63ff;
    }
    .mode-toggle {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
      cursor: pointer;
    }
    .mode-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      inset: 0;
      background: #555;
      border-radius: 20px;
      transition: 0.3s;
    }
    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
    .mode-toggle input:checked + .toggle-slider {
      background: #00e676;
    }
    .mode-toggle input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }
    .status-text {
      font-size: 12px;
      color: #aaa;
    }
    .status-text.live {
      color: #00e676;
      font-weight: 600;
    }
    .widget-body {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 12px;
      overflow: hidden;
    }
    .panel {
      min-height: 0;
      overflow: hidden;
    }
    .input-bar {
      padding: 12px 20px;
      background: #16213e;
      border-top: 1px solid #1f1f4a;
    }
    .input-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .input-label {
      font-size: 11px;
      color: #888;
      font-weight: 600;
    }
    .input-row {
      display: flex;
      gap: 6px;
    }
    .message-input {
      flex: 1;
      background: #0f0f23;
      border: 1px solid #333;
      color: #f0f0f0;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    .customer-input:focus { border-color: #42a5f5; }
    .agent-input:focus { border-color: #66bb6a; }
    .send-btn {
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      color: white;
    }
    .customer-btn { background: linear-gradient(135deg, #1565c0, #42a5f5); }
    .agent-btn { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .send-btn:hover { opacity: 0.9; }
    .demo-hints {
      margin-top: 8px;
      font-size: 11px;
      color: #555;
      text-align: center;
    }

    @media (max-width: 768px) {
      .widget-body {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
    }
  `]
})
export class SidebarWidgetComponent {
  readonly orchestrator = inject(OrchestratorService);
  readonly ws = inject(WebSocketService);

  customerText = '';
  agentText = '';

  constructor() {
    this.orchestrator.startSession();
  }

  sendCustomerMessage(): void {
    if (!this.customerText.trim()) return;
    this.orchestrator.simulateCustomerMessage(this.customerText);
    this.customerText = '';
  }

  sendAgentMessage(): void {
    if (!this.agentText.trim()) return;
    this.orchestrator.simulateAgentMessage(this.agentText);
    this.agentText = '';
  }
}
