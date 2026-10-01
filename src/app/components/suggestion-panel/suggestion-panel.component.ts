import { Component, inject } from '@angular/core';
import { OrchestratorService } from '../../services/orchestrator.service';
import { AISuggestion } from '../../models/interfaces';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-suggestion-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <div class="suggestion-container">
      <div class="suggestion-header">
        <h3>🧠 AI Suggestions</h3>
      </div>
      <div class="suggestions-list">
        @for (suggestion of orchestrator.suggestions(); track suggestion.id) {
          <div class="suggestion-card" [class.high-confidence]="suggestion.confidence > 0.85">
            <div class="intent-badge">
              <span class="intent-name">{{ suggestion.intent.replace('_', ' ') }}</span>
              <span class="confidence" [class.high]="suggestion.confidence > 0.85">
                {{ suggestion.confidence * 100 | number:'1.0-0' }}%
              </span>
            </div>
            <p class="description">{{ suggestion.description }}</p>
            <div class="action-row">
              @if (suggestion.workflowId) {
                <button class="action-btn" (click)="onActionClick(suggestion)">
                  ⚡ {{ suggestion.action }}
                </button>
              } @else {
                <span class="no-action">ℹ️ {{ suggestion.action }}</span>
              }
              <span class="time">{{ suggestion.timestamp | date:'HH:mm:ss' }}</span>
            </div>
          </div>
        }
        @empty {
          <div class="empty-state">
            <span class="icon">🤖</span>
            <p>AI is ready. Suggestions will appear as the conversation progresses.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .suggestion-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1a1a2e;
      border-radius: 12px;
      overflow: hidden;
    }
    .suggestion-header {
      padding: 12px 16px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
    }
    .suggestion-header h3 {
      margin: 0;
      font-size: 14px;
      color: #e0e0e0;
    }
    .suggestions-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .suggestion-card {
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 10px;
      padding: 12px;
      transition: border-color 0.3s;
    }
    .suggestion-card.high-confidence {
      border-color: #00e676;
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.15);
    }
    .intent-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .intent-name {
      text-transform: capitalize;
      font-weight: 600;
      font-size: 13px;
      color: #bb86fc;
    }
    .confidence {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      background: #333;
      color: #aaa;
    }
    .confidence.high {
      background: #1b4332;
      color: #00e676;
    }
    .description {
      font-size: 12px;
      color: #ccc;
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .action-btn {
      background: linear-gradient(135deg, #6c63ff, #3f51b5);
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .action-btn:hover {
      transform: scale(1.03);
    }
    .no-action {
      font-size: 12px;
      color: #888;
    }
    .time {
      font-size: 10px;
      color: #666;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #555;
      text-align: center;
    }
    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
  `]
})
export class SuggestionPanelComponent {
  readonly orchestrator = inject(OrchestratorService);

  onActionClick(suggestion: AISuggestion): void {
    if (suggestion.workflowId) {
      this.orchestrator.openWorkflowForm(suggestion.workflowId, suggestion.formData);
    }
  }
}
