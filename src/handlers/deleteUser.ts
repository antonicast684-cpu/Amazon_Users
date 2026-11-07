import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { badRequest, internalError, ok, notFound, unauthorized } from './lib/response';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from './lib/dynamodb';
import { withCORS } from './common/cors';

const USERS_TABLE = process.env.USERS_TABLE;

async function deleteUserHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.id;
    if (!userId) {
      return notFound("El ID del usuario es requerido en la ruta.");
    }

    const callerId = event.requestContext.authorizer?.userId;

    if (!callerId || callerId !== userId) {
      return unauthorized("Solo puedes eliminar tu propia cuenta.");
    }

    // Usar 'userid' en minúsculas coincidiendo con la Primary Key de DynamoDB
    const existing = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userid: userId } })
    );

    if (!existing.Item) {
      return notFound("El usuario no existe en la base de datos.");
    }

    await dynamo.send(
      new DeleteCommand({
        TableName: USERS_TABLE,
        Key: { userid: userId }
      })
    );

    return ok({ message: "Usuario eliminado correctamente." });

  } catch (error) {
    console.error("Error en deleteUser: ", error);
    return internalError();
  }
}

export const deleteUser = withCORS(deleteUserHandler);