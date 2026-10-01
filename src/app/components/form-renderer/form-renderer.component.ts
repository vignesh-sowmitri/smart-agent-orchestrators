import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrchestratorService } from '../../services/orchestrator.service';

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (orchestrator.activeForm(); as form) {
      <div class="form-overlay">
        <div class="form-card">
          <div class="form-header">
            <div>
              <h3>⚡ {{ form.title }}</h3>
              <p class="form-desc">{{ form.description }}</p>
            </div>
            <button class="close-btn" (click)="orchestrator.dismissForm()">✕</button>
          </div>
          <div class="form-body">
            @for (field of form.fields; track field.key) {
              <div class="form-field">
                <label [for]="field.key">
                  {{ field.label }}
                  @if (field.required) { <span class="required">*</span> }
                </label>
                @switch (field.type) {
                  @case ('select') {
                    <select [id]="field.key" [(ngModel)]="field.value">
                      <option value="">Select...</option>
                      @for (opt of field.options; track opt) {
                        <option [value]="opt">{{ opt }}</option>
                      }
                    </select>
                  }
                  @default {
                    <input
                      [id]="field.key"
                      [type]="field.type"
                      [(ngModel)]="field.value"
                      [placeholder]="'Enter ' + field.label"
                    />
                  }
                }
              </div>
            }
          </div>
          <div class="form-actions">
            <button class="btn-secondary" (click)="orchestrator.dismissForm()">Dismiss</button>
            <button class="btn-primary" (click)="onSubmit(form.fields)">Submit Action</button>
          </div>
          <div class="prefill-badge">🤖 Auto-filled by AI</div>
        </div>
      </div>
    }
  `,
  styles: [`
    .form-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(4px);
    }
    .form-card {
      background: #1e1e3a;
      border: 1px solid #6c63ff;
      border-radius: 14px;
      width: 90%;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(108, 99, 255, 0.2);
    }
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 20px;
      border-bottom: 1px solid #2a2a4a;
    }
    .form-header h3 {
      margin: 0;
      color: #fff;
      font-size: 16px;
    }
    .form-desc {
      margin: 4px 0 0;
      font-size: 12px;
      color: #aaa;
    }
    .close-btn {
      background: none;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
    }
    .form-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-field label {
      display: block;
      font-size: 12px;
      color: #bbb;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .required { color: #ff5252; }
    .form-field input,
    .form-field select {
      width: 100%;
      padding: 8px 12px;
      background: #0f0f2a;
      border: 1px solid #333;
      border-radius: 6px;
      color: #f0f0f0;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-field input:focus,
    .form-field select:focus {
      border-color: #6c63ff;
    }
    .form-actions {
      display: flex;
      gap: 10px;
      padding: 12px 20px;
      border-top: 1px solid #2a2a4a;
    }
    .btn-secondary {
      flex: 1;
      padding: 8px;
      background: #2a2a4a;
      color: #ccc;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-primary {
      flex: 2;
      padding: 8px;
      background: linear-gradient(135deg, #6c63ff, #3f51b5);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-primary:hover { opacity: 0.9; }
    .prefill-badge {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #00e676;
      background: rgba(0, 230, 118, 0.05);
      border-radius: 0 0 14px 14px;
    }
  `]
})
export class FormRendererComponent {
  readonly orchestrator = inject(OrchestratorService);

  onSubmit(fields: { key: string; value: string }[]): void {
    const formData: Record<string, string> = {};
    fields.forEach((f) => (formData[f.key] = f.value));
    this.orchestrator.submitForm(formData);
  }
}
