const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  // In production, you'd query by connectionId GSI to find the session
  console.log(`[Disconnect] Connection: ${connectionId}`);
  return { statusCode: 200, body: 'Disconnected' };
};
