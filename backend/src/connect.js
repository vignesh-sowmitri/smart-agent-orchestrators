const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const sessionId = event.queryStringParameters?.sessionId || connectionId;

  await ddb.send(new PutCommand({
    TableName: process.env.SESSION_TABLE,
    Item: {
      sessionId,
      connectionId,
      connectedAt: new Date().toISOString(),
      conversationHistory: [],
      ttl: Math.floor(Date.now() / 1000) + 86400, // 24hr TTL
    },
  }));

  console.log(`[Connect] Session: ${sessionId}, Connection: ${connectionId}`);
  return { statusCode: 200, body: 'Connected' };
};
