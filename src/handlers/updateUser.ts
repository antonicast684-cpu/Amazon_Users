import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { badRequest, internalError, ok, notFound } from './lib/response';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from './lib/dynamodb';
import { withCORS } from './common/cors';

const USERS_TABLE = process.env.USERS_TABLE;

async function updateUserHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.id;
    if (!userId) {
      return notFound("El ID del usuario es requerido en la ruta.");
    }

    const callerId = event.requestContext.authorizer?.userId;

    if (callerId !== userId) {
      return badRequest("Solo puedes actualizar tu propio usuario");
    }

    const body = JSON.parse(event.body ?? "{}");
    const { name } = body;

    if (!name) {
      return badRequest("Se necesita el nombre para actualizar");
    }

    // Se utiliza 'userid' coincidiendo con la Primary Key de DynamoDB
    const existing = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userid: userId } })
    );

    if (!existing.Item) {
      return notFound("El usuario no se encontró");
    }

    const now = new Date().toISOString();
    await dynamo.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userid: userId },
        UpdateExpression: "SET #name = :name, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: { ":name": name, ":updatedAt": now }
      })
    );

    return ok({ message: "Usuario actualizado." });

  } catch (error) {
    console.error("Error en updateUser: ", error);
    return internalError();
  }
}
export const updateUser = withCORS(updateUserHandler);