import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand,QueryCommand } from '@aws-sdk/lib-dynamodb';
import bycrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dynamo } from './lib/dynamodb';
import { badRequest, ok } from './lib/response';
import { User } from './types/user';
import { withCORS } from './common/cors';

const USERS_TABLE = process.env.USERS_TABLE;

async function registerHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
   try {
     const body = JSON.parse(event.body ?? "{}");
     const { email, password,name, role = "buyer" } = body;  


     if (!email || !password || !name) {     
    return badRequest("Email, password and name are required.");
     }

     const existing = await dynamo.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: "EmailIndex",
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: { ":email": email }
        })
     )

     if (existing.Items && existing.Items.length > 0) {
        return badRequest("User with this email already exists.");
     }

    const hashedPassword = await bycrypt.hash(password, 10);
    const now = new Date().toISOString(); 

    const user: User = {
        userid: uuidv4(),
        email,
        password: hashedPassword,
        name,
        role,
        createdAt: now,
        updatedAt: now
    }

     await dynamo.send(new PutCommand({TableName: USERS_TABLE, Item: user}));
     
     const {password: _, ...userPublic} = user

     return {statusCode: 200 , body: JSON.stringify({userPublic})};
     


   }catch (error) {
        console.error("error al registrar el usuario",error);
        return{
            statusCode: 500,
            body: JSON.stringify({message:"Hubo un error al registrar el usuario"})
        }
   }
        
}

export const register = withCORS(registerHandler);