# Smart Agent Orchestrator - AWS Backend

## Architecture

```
Angular Frontend
      │
      ▼ (WebSocket)
API Gateway (WebSocket API)
      │
      ├── $connect    → connect.js    → DynamoDB (store session)
      ├── $disconnect → disconnect.js → DynamoDB (cleanup)
      └── message     → message.js    → Bedrock (Claude) → DynamoDB (history)
                                              │
                                              ▼
                                      AI Response sent back
                                      via WebSocket to frontend
```

## Prerequisites

1. AWS CLI configured with credentials
2. AWS SAM CLI installed (`pip install aws-sam-cli`)
3. Amazon Bedrock model access enabled for `anthropic.claude-3-haiku-20240307-v1:0`

### Enable Bedrock Model Access

1. Go to AWS Console → Amazon Bedrock → Model access
2. Request access to "Claude 3 Haiku" by Anthropic
3. Wait for approval (usually instant)

## Deploy

```bash
cd backend

# Install dependencies
npm install

# Build and deploy with SAM
sam build
sam deploy --guided
```

During `sam deploy --guided`, use these settings:
- Stack name: `smart-agent-orchestrator`
- Region: `us-east-1` (or your preferred region with Bedrock access)
- Allow SAM CLI to create IAM roles: `Y`
- Confirm all other defaults

## After Deployment

1. Copy the WebSocket URL from the output:
   ```
   WebSocketURL: wss://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
   ```

2. Update the Angular frontend environment file:
   ```typescript
   // src/environments/environment.ts
   export const environment = {
     production: false,
     wsUrl: 'wss://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod',
   };
   ```

3. Rebuild and run the frontend:
   ```bash
   cd ..
   ng serve
   ```

## What Bedrock Does

The message Lambda sends the full conversation history to Claude 3 Haiku with a system prompt that instructs it to:

1. **Detect intent** - Understands any phrasing, not just keywords
2. **Extract entities** - Amounts, dates, names, issue types from natural language
3. **Select workflow** - Picks the right form/action dynamically
4. **Pre-fill form data** - All fields populated from conversation context
5. **Generate agent response** - Natural, empathetic, contextual reply

### Example

Customer: "I was charged $50 twice on last Tuesday's invoice and I want my money back"

Bedrock returns:
```json
{
  "intent": "billing_inquiry",
  "confidence": 0.95,
  "action": "Process Refund",
  "description": "Customer reports duplicate $50 charge from last Tuesday. Requesting refund.",
  "workflowId": "billing_lookup",
  "formData": {
    "accountId": "ACC-29481",
    "period": "Last 7 days",
    "issueType": "Refund Request",
    "amount": "$50"
  },
  "agentResponse": "I can see the duplicate $50 charge from last Tuesday on your account. I've initiated the refund process for you. The amount will be credited back within 3-5 business days. Is there anything else I can help with?"
}
```

## Cost Estimate

- **Bedrock Claude 3 Haiku**: ~$0.00025 per request (very cheap)
- **API Gateway WebSocket**: $1 per million messages
- **DynamoDB**: Pay-per-request, negligible for demo
- **Lambda**: Free tier covers hackathon usage

**Total for hackathon demo: < $1**
