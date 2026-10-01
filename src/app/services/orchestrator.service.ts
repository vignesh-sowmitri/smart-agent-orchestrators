import { Injectable, signal, computed } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { TranscriptMessage, AISuggestion, WorkflowForm } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  readonly messages = signal<TranscriptMessage[]>([]);
  readonly suggestions = signal<AISuggestion[]>([]);
  readonly activeForm = signal<WorkflowForm | null>(null);
  readonly isListening = signal(false);
  readonly demoMode = signal(false);
  readonly sessionId = signal<string>(this.generateSessionId());

  readonly latestSuggestion = computed(() => {
    const all = this.suggestions();
    return all.length > 0 ? all[all.length - 1] : null;
  });

  constructor(private ws: WebSocketService) {
    this.ws.transcript$.subscribe((msg) => {
      this.messages.update((msgs) => [...msgs, msg]);
    });

    this.ws.suggestion$.subscribe((suggestion) => {
      this.suggestions.update((s) => [...s, suggestion]);
    });
  }

  toggleMode(): void {
    this.demoMode.update((v) => !v);
  }

  startSession(): void {
    this.ws.connect(this.sessionId());
    this.isListening.set(true);
  }

  stopSession(): void {
    this.ws.disconnect();
    this.isListening.set(false);
  }

  // Simulate sending agent/customer message (for demo purposes)
  simulateCustomerMessage(text: string): void {
    const msg: TranscriptMessage = {
      id: crypto.randomUUID(),
      speaker: 'customer',
      text,
      timestamp: new Date(),
    };
    this.messages.update((msgs) => [...msgs, msg]);

    if (this.demoMode()) {
      // Demo mode: local keyword matching
      this.simulateAIResponse(text);
    } else {
      // Live mode: send to backend via WebSocket
      this.ws.sendTranscript(msg);
      // Fallback to demo if not connected
      if (!this.ws.connected()) {
        this.simulateAIResponse(text);
      }
    }
  }

  simulateAgentMessage(text: string): void {
    const msg: TranscriptMessage = {
      id: crypto.randomUUID(),
      speaker: 'agent',
      text,
      timestamp: new Date(),
    };
    this.messages.update((msgs) => [...msgs, msg]);
  }

  dismissForm(): void {
    this.activeForm.set(null);
  }

  // Agent clicks action button on suggestion card → opens the form
  openWorkflowForm(workflowId: string, formData?: Record<string, string>): void {
    // Simulate CRM screen-pop: fill missing accountId and email with defaults
    const enriched = { ...formData };
    if (!enriched['accountId']) enriched['accountId'] = 'ACC-29481';
    if (!enriched['email']) enriched['email'] = 'vignesh@genesys.com';
    this.loadWorkflowForm(workflowId, enriched);
  }

  submitForm(formData: Record<string, string>): void {
    console.log('[Orchestrator] Form submitted:', formData);
    this.activeForm.set(null);

    // Use AI-generated response if available (from Bedrock), otherwise fallback to templates
    const latestSuggestion = [...this.suggestions()].reverse().find(s => s.workflowId);
    if (latestSuggestion?.agentResponse) {
      this.simulateAgentMessage(latestSuggestion.agentResponse);
    } else {
      const activeFormId = latestSuggestion?.workflowId || '';
      const response = this.generateAgentResponse(activeFormId, formData);
      this.simulateAgentMessage(response);
    }
  }

  private generateAgentResponse(workflowId: string, data: Record<string, string>): string {
    switch (workflowId) {
      case 'password_reset':
        return `I've sent a password reset link via ${data['method']} to ${data['email']}. Please check and follow the instructions to set a new password. Let me know if you need further help.`;

      case 'billing_lookup':
        return `I've raised a ${data['issueType']} request${data['amount'] ? ' for ' + data['amount'] : ''} on your account. You should see the resolution reflected within 3-5 business days. Is there anything else I can help with?`;

      case 'token_renewal':
        return `Your ${data['tokenType']} has been renewed successfully. The new token will be valid until ${data['expiry']}. You can start using it immediately.`;

      case 'retention_flow':
        return `I understand your concern. I've applied the "${data['offer']}" offer to your account. We value your business and hope this helps. Would you like to continue with your account?`;

      case 'plan_change':
        return `Great news! I've upgraded your account to the ${data['newPlan']} plan. The changes will take effect immediately. You'll see the updated features on your next login. Is there anything else I can help with?`;

      default:
        return `Done! Your request has been processed successfully. Is there anything else I can assist you with?`;
    }
  }

  // Demo: NLP-style entity extraction + intent detection
  // In production, this entire method is replaced by AWS Bedrock API call
  private simulateAIResponse(text: string): void {
    const lower = text.toLowerCase();
    const extracted = this.extractEntities(lower);
    let suggestion: AISuggestion | null = null;

    if (lower.includes('password') || lower.includes('can\'t log in') || lower.includes('login issue') || lower.includes('locked out')) {
      const method = lower.includes('sms') || lower.includes('phone') || lower.includes('text') ? 'SMS OTP'
        : lower.includes('security question') ? 'Security Questions'
        : 'Email Link';

      suggestion = {
        id: crypto.randomUUID(),
        intent: 'password_reset',
        confidence: 0.96,
        action: 'Send Password Reset',
        description: `Account locked/password issue. Reset method: ${method}. One-click to send reset.`,
        workflowId: 'password_reset',
        formData: { accountId: extracted.accountId, email: extracted.email, method },
        timestamp: new Date(),
      };
    } else if (lower.includes('renew') || lower.includes('token') || lower.includes('api key') || (lower.includes('expired') && !lower.includes('password'))) {
      const tokenType = lower.includes('oauth') ? 'OAuth Refresh Token'
        : lower.includes('service') ? 'Service Token'
        : 'API Access Token';
      suggestion = {
        id: crypto.randomUUID(),
        intent: 'token_renewal',
        confidence: 0.94,
        action: 'Renew Token Now',
        description: `Customer needs ${tokenType} renewal. All fields auto-filled from conversation context.`,
        workflowId: 'token_renewal',
        formData: { accountId: extracted.accountId, tokenType, expiry: this.getFutureDate(60) },
        timestamp: new Date(),
      };
    } else if (lower.includes('billing') || lower.includes('invoice') || lower.includes('charge') || lower.includes('payment') || lower.includes('refund')) {
      // Deep extraction: what specific billing issue?
      const issueType = lower.includes('overcharge') || lower.includes('charged extra') || lower.includes('charged twice') ? 'Overcharge'
        : lower.includes('missing') || lower.includes('not received') || lower.includes('where is') ? 'Missing Invoice'
        : lower.includes('refund') || lower.includes('money back') ? 'Refund Request'
        : lower.includes('failed') || lower.includes('declined') || lower.includes('not going through') ? 'Payment Failed'
        : 'Overcharge'; // default best guess

      // Extract time period from conversation
      const period = lower.includes('last week') || lower.includes('7 days') ? 'Last 7 days'
        : lower.includes('last month') || lower.includes('30 days') || lower.includes('recent') ? 'Last 30 days'
        : lower.includes('quarter') || lower.includes('90 days') || lower.includes('3 months') ? 'Last 90 days'
        : 'Last 30 days';

      suggestion = {
        id: crypto.randomUUID(),
        intent: 'billing_inquiry',
        confidence: 0.92,
        action: `Process ${issueType}`,
        description: `Detected: ${issueType} issue. Period: ${period}. ${extracted.amount ? 'Amount: ' + extracted.amount + '. ' : ''}All fields pre-filled — agent just confirms and submits.`,
        workflowId: 'billing_lookup',
        formData: { accountId: extracted.accountId, period, issueType, amount: extracted.amount },
        timestamp: new Date(),
      };
    } else if (lower.includes('upgrade') || lower.includes('downgrade') || lower.includes('change my plan') || lower.includes('switch plan') || lower.includes('change plan') || lower.includes('move me to')) {
      const newPlan = lower.includes('premium') ? 'Premium'
        : lower.includes('enterprise') ? 'Enterprise'
        : lower.includes('basic') ? 'Basic'
        : lower.includes('standard') ? 'Standard'
        : 'Premium';

      suggestion = {
        id: crypto.randomUUID(),
        intent: 'plan_change',
        confidence: 0.95,
        action: `Upgrade to ${newPlan}`,
        description: `Customer wants to switch to ${newPlan} plan. All fields pre-filled — confirm and process.`,
        workflowId: 'plan_change',
        formData: { accountId: extracted.accountId, currentPlan: 'Basic', newPlan, customerName: '', email: extracted.email },
        timestamp: new Date(),
      };
    } else if (lower.includes('cancel') || lower.includes('close account') || lower.includes('terminate') || lower.includes('stop service')) {
      const reason = lower.includes('expensive') || lower.includes('cost') || lower.includes('price') ? 'Too expensive'
        : lower.includes('not using') || lower.includes('don\'t use') ? 'Not using'
        : lower.includes('switch') || lower.includes('competitor') || lower.includes('another') ? 'Switching provider'
        : lower.includes('bad') || lower.includes('terrible') || lower.includes('worst') || lower.includes('frustrated') ? 'Poor experience'
        : 'Other';

      // AI recommends best retention offer based on reason
      const offer = reason === 'Too expensive' ? '20% discount 3 months'
        : reason === 'Not using' ? 'Free upgrade 1 month'
        : reason === 'Poor experience' ? 'Dedicated support'
        : 'Custom plan';

      suggestion = {
        id: crypto.randomUUID(),
        intent: 'account_cancellation',
        confidence: 0.91,
        action: 'Initiate Retention Flow',
        description: `Reason detected: "${reason}". Recommended offer: ${offer}. Agent can review and submit.`,
        workflowId: 'retention_flow',
        formData: { accountId: extracted.accountId, reason, offer },
        timestamp: new Date(),
      };
    } else {
      suggestion = {
        id: crypto.randomUUID(),
        intent: 'general_inquiry',
        confidence: 0.6,
        action: 'Search Knowledge Base',
        description: `Analyzing: "${text}". No specific workflow matched — searching knowledge base for relevant articles.`,
        timestamp: new Date(),
      };
    }

    // Simulate network delay (Bedrock response time)
    // Form does NOT auto-open. It appears as a suggestion card.
    // Agent opens it when ready by clicking the action button.
    setTimeout(() => {
      this.suggestions.update((s) => [...s, suggestion!]);
    }, 800);
  }

  // Simulates entity extraction (in production: Bedrock does this)
  private extractEntities(text: string): { accountId: string; email: string; amount: string } {
    // Extract dollar amounts
    const amountMatch = text.match(/\$?(\d+\.?\d*)/)
    const amount = amountMatch ? `$${amountMatch[1]}` : '';

    // In production, these come from CRM lookup based on caller ID / authenticated session
    return {
      accountId: 'ACC-29481',
      email: 'customer@example.com',
      amount,
    };
  }

  private getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private loadWorkflowForm(workflowId: string, prefillData?: Record<string, string>): void {
    const forms: Record<string, WorkflowForm> = {
      token_renewal: {
        id: 'token_renewal',
        title: '⚡ Token Renewal — Ready to Submit',
        description: 'AI extracted all details. Review and confirm.',
        fields: [
          { key: 'accountId', label: 'Account ID', type: 'text', value: prefillData?.['accountId'] || '', required: true },
          { key: 'tokenType', label: 'Token Type', type: 'select', value: prefillData?.['tokenType'] || '', options: ['API Access Token', 'OAuth Refresh Token', 'Service Token'], required: true },
          { key: 'expiry', label: 'New Expiry Date', type: 'date', value: this.getFutureDate(60), required: true },
        ],
      },
      billing_lookup: {
        id: 'billing_lookup',
        title: '💰 Billing Issue — Auto-Detected',
        description: 'AI identified the issue type and period from conversation. Confirm and process.',
        fields: [
          { key: 'accountId', label: 'Account ID', type: 'text', value: prefillData?.['accountId'] || '', required: true },
          { key: 'period', label: 'Billing Period', type: 'select', value: prefillData?.['period'] || '', options: ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom'], required: true },
          { key: 'issueType', label: 'Issue Type', type: 'select', value: prefillData?.['issueType'] || '', options: ['Overcharge', 'Missing Invoice', 'Refund Request', 'Payment Failed'], required: true },
          { key: 'amount', label: 'Disputed Amount', type: 'text', value: prefillData?.['amount'] || '', required: false },
        ],
      },
      retention_flow: {
        id: 'retention_flow',
        title: '🛡️ Retention — Reason & Offer Pre-Selected',
        description: 'AI detected cancellation reason and recommends best retention offer.',
        fields: [
          { key: 'accountId', label: 'Account ID', type: 'text', value: prefillData?.['accountId'] || '', required: true },
          { key: 'reason', label: 'Cancellation Reason', type: 'select', value: prefillData?.['reason'] || '', options: ['Too expensive', 'Not using', 'Switching provider', 'Poor experience', 'Other'], required: true },
          { key: 'offer', label: 'Recommended Offer', type: 'select', value: prefillData?.['offer'] || '', options: ['20% discount 3 months', 'Free upgrade 1 month', 'Dedicated support', 'Custom plan'], required: true },
        ],
      },
      password_reset: {
        id: 'password_reset',
        title: '🔐 Password Reset — One Click Away',
        description: 'AI selected reset method based on customer preference. Confirm to send.',
        fields: [
          { key: 'accountId', label: 'Account ID', type: 'text', value: prefillData?.['accountId'] || '', required: true },
          { key: 'email', label: 'Email Address', type: 'email', value: prefillData?.['email'] || '', required: true },
          { key: 'method', label: 'Reset Method', type: 'select', value: prefillData?.['method'] || 'Email Link', options: ['Email Link', 'SMS OTP', 'Security Questions'], required: true },
        ],
      },
      plan_change: {
        id: 'plan_change',
        title: '📦 Plan Change — Ready to Process',
        description: 'AI detected plan change request. Review details and confirm.',
        fields: [
          { key: 'accountId', label: 'Account ID', type: 'text', value: prefillData?.['accountId'] || '', required: true },
          { key: 'currentPlan', label: 'Current Plan', type: 'text', value: prefillData?.['currentPlan'] || 'Basic', required: true },
          { key: 'newPlan', label: 'New Plan', type: 'select', value: prefillData?.['newPlan'] || '', options: ['Basic', 'Standard', 'Premium', 'Enterprise'], required: true },
          { key: 'customerName', label: 'Customer Name', type: 'text', value: prefillData?.['customerName'] || '', required: false },
          { key: 'email', label: 'Email', type: 'email', value: prefillData?.['email'] || '', required: false },
        ],
      },
    };

    const form = forms[workflowId];
    if (form) {
      this.activeForm.set(form);
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
