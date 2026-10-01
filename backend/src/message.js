const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION });

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  const callbackUrl = `https://${domain}/${stage}`;

  const apigw = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });

  try {
    const body = JSON.parse(event.body);
    const { data } = body;
    const message = data.payload;

    // Only process customer messages for AI analysis
    if (message.speaker !== 'customer') {
      return { statusCode: 200, body: 'OK' };
    }

    // Customer profile from CRM (passed by frontend)
    const customerProfile = data.customerProfile || {
      name: 'Vignesh Kumar',
      accountId: 'ACC-29481',
      email: 'vignesh@genesys.com',
    };

    // Get session from DynamoDB (conversation history)
    const sessionId = data.payload.sessionId || connectionId;
    const session = await getSession(sessionId);
    const conversationHistory = session?.conversationHistory || [];

    // Add current message to history
    conversationHistory.push({
      role: message.speaker,
      content: message.text,
      timestamp: message.timestamp,
    });

    // Call Bedrock for intent detection + entity extraction
    const aiResult = await analyzeWithBedrock(conversationHistory, message.text, customerProfile);

    // Update session with new history
    await updateSession(sessionId, conversationHistory);

    // Send AI suggestion back to frontend via WebSocket
    const suggestion = {
      type: 'suggestion',
      payload: {
        id: generateId(),
        intent: aiResult.intent,
        confidence: aiResult.confidence,
        action: aiResult.action,
        description: aiResult.description,
        workflowId: aiResult.workflowId,
        formData: aiResult.formData,
        agentResponse: aiResult.agentResponse,
        timestamp: new Date().toISOString(),
      },
    };

    await apigw.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(suggestion),
    }));

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('[Message] Error:', error);
    return { statusCode: 500, body: 'Error processing message' };
  }
};

async function analyzeWithBedrock(conversationHistory, latestMessage, customerProfile) {
  const systemPrompt = `You are an AI assistant for a contact center agent. Your job is to analyze customer messages in real-time and provide actionable intelligence.

The authenticated customer on this call is:
- Name: ${customerProfile.name}
- Account ID: ${customerProfile.accountId}
- Email: ${customerProfile.email}

Always use these details in formData and agentResponse. The agentResponse must address the customer by name and reference their account ID and email where relevant.
Given the conversation history and the latest customer message, you must:
1. Detect the customer's intent
2. Extract all relevant entities (account IDs, amounts, dates, names, etc.)
3. Determine which workflow/action the agent should take
4. Pre-fill form data from the conversation context
5. Suggest a natural response the agent can use

Available workflows and their EXACT formData keys:

1. "billing_lookup" - For billing disputes, overcharges, missing invoices, refund requests, payment failures
   formData MUST use these exact keys:
   - "accountId": extract from conversation if mentioned, else use empty string
   - "period": one of "Last 7 days", "Last 30 days", "Last 90 days", "Custom" — infer from conversation context
   - "issueType": one of "Overcharge", "Missing Invoice", "Refund Request", "Payment Failed" — infer from conversation
   - "amount": extract exact dollar amount mentioned (e.g., "$50") or empty string

2. "password_reset" - For login issues, locked accounts, forgotten passwords, expired passwords
   formData MUST use these exact keys:
   - "accountId": extract from conversation if mentioned, else use empty string
   - "email": extract from conversation if mentioned, else use empty string
   - "method": one of "Email Link", "SMS OTP", "Security Questions" — infer from conversation or default to "Email Link"

3. "token_renewal" - For API token renewal, expired tokens, API key issues (NOT password issues)
   formData MUST use these exact keys:
   - "accountId": extract from conversation if mentioned, else use empty string
   - "tokenType": one of "API Access Token", "OAuth Refresh Token", "Service Token" — infer from conversation
   - "expiry": a date 60 days from now in YYYY-MM-DD format

4. "retention_flow" - For cancellation requests, account closure, service termination
   formData MUST use these exact keys:
   - "accountId": extract from conversation if mentioned, else use empty string
   - "reason": one of "Too expensive", "Not using", "Switching provider", "Poor experience", "Other" — infer from conversation
   - "offer": one of "20% discount 3 months", "Free upgrade 1 month", "Dedicated support", "Custom plan" — recommend best offer based on reason

5. "plan_change" - For plan upgrades, downgrades, subscription changes, switching plans
   formData MUST use these exact keys:
   - "accountId": extract from conversation if mentioned, else use empty string
   - "currentPlan": extract from conversation if mentioned, else use empty string
   - "newPlan": one of "Basic", "Standard", "Premium", "Enterprise" — extract from conversation or default to "Premium"
   - "customerName": extract customer's name from conversation if mentioned, else use empty string
   - "email": extract customer's email from conversation if mentioned, else use empty string

6. null - For general inquiries that don't match any workflow. formData should be {}

Respond ONLY with valid JSON in this exact format:
{
  "intent": "string (e.g., password_reset, billing_inquiry, token_renewal, account_cancellation, general_inquiry)",
  "confidence": number between 0.0 and 1.0,
  "action": "string - short action button label (e.g., 'Send Password Reset', 'Process Refund')",
  "description": "string - brief explanation of what was detected. Always start with the account ID and name like: 'ACC-29481 · Vignesh Kumar is requesting...' using the authenticated customer's accountId and name from the customer profile above",
  "workflowId": "string or null - one of the available workflows above",
  "formData": { use the EXACT keys specified above for the chosen workflow },
  "agentResponse": "string - a natural, empathetic response the agent can send to the customer after taking action"
}

Important rules:
- Use the EXACT formData keys listed above. Do not invent new keys.
- Extract REAL data from the conversation (amounts, dates, specifics the customer mentioned)
- The agentResponse should be professional, empathetic, and ALWAYS confirm the action was completed. Address the customer by name (${customerProfile.name}), reference their account (${customerProfile.accountId}) and email (${customerProfile.email}) where relevant. NEVER ask follow-up questions in agentResponse — the form handles missing details via dropdowns
- Confidence should reflect how certain you are about the intent (0.6 for vague, 0.95+ for very clear)
- If the customer says something like "thank you", "thanks", "ok", "bye", "that's all", "no more questions", or any closing/acknowledgment message, classify it as "general_inquiry" with workflowId: null and formData: {}. Do NOT repeat the previous workflow.
- Only trigger a workflow when the customer is clearly stating a NEW problem or request.
- If the customer mentions "upgrade", "downgrade", "change plan", "switch plan", or any plan-related request, ALWAYS use workflowId "plan_change" even if they haven't specified which plan. Default newPlan to "Premium" if not mentioned.
- NEVER generate an agentResponse that asks the customer for more information. The form handles missing details. The agentResponse must ALWAYS be a confirmation statement (e.g., "I've upgraded your plan to Premium").
- Respond with ONLY the JSON object, no markdown, no explanation`;

  const conversationText = conversationHistory
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const userPrompt = `Conversation so far:
${conversationText}

Latest customer message: "${latestMessage}"

Analyze and respond with JSON only.`;

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: process.env.BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const aiText = responseBody.content[0].text;

  // Parse JSON from Bedrock response
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('[Bedrock] Failed to parse response:', aiText);
  }

  // Fallback if parsing fails
  return {
    intent: 'general_inquiry',
    confidence: 0.5,
    action: 'Search Knowledge Base',
    description: 'Could not determine specific intent. Searching knowledge base.',
    workflowId: null,
    formData: {},
    agentResponse: 'Let me look into that for you. Could you provide more details?',
  };
}

async function getSession(sessionId) {
  const result = await ddb.send(new GetCommand({
    TableName: process.env.SESSION_TABLE,
    Key: { sessionId },
  }));
  return result.Item;
}

async function updateSession(sessionId, conversationHistory) {
  await ddb.send(new UpdateCommand({
    TableName: process.env.SESSION_TABLE,
    Key: { sessionId },
    UpdateExpression: 'SET conversationHistory = :history, lastActivity = :now',
    ExpressionAttributeValues: {
      ':history': conversationHistory,
      ':now': new Date().toISOString(),
    },
  }));
}

function generateId() {
  return `sug-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
