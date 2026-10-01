export interface TranscriptMessage {
  id: string;
  speaker: 'customer' | 'agent';
  text: string;
  timestamp: Date;
}

export interface AISuggestion {
  id: string;
  intent: string;
  confidence: number;
  action: string;
  description: string;
  formData?: Record<string, string>;
  workflowId?: string;
  agentResponse?: string;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: 'transcript' | 'suggestion' | 'form_action' | 'connection';
  payload: any;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'date';
  value: string;
  options?: string[];
  required: boolean;
}

export interface WorkflowForm {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
}
