import { NodenamoDynamoDBClient } from '../managers/nodenamoDynamoDBClient';
import { DynamoDbTransaction } from '../managers/dynamodbTransaction';
import { NodeNamoDynamoDB } from '../managers/nodenamoDynamoDB';
import DynamoDB, { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface IDynamoDbManager
{
    client:NodenamoDynamoDBClient | DocumentClient;

    put<T extends object>(type:{new(...args: any[]):T}, object:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction, autoCommit?:boolean): Promise<void>;

    getOne<T extends object>(type:{new(...args: any[]):T}, id:string|number, params?:{stronglyConsistent?:boolean}): Promise<T>;

    find<T extends object>(type:{new(...args: any[]):T},
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, fetchSize?:number, indexName?:string, order?:number, exclusiveStartKey?:string, projections?:string[], stronglyConsistent?:boolean})
                                 : Promise<{items:T[], lastEvaluatedKey: string, firstEvaluatedKey: string}>;

    update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction, autoCommit?:boolean): Promise<void>;

    apply<T extends object>(type:{new(...args: any[]):T}, id:string|number, params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction, autoCommit?:boolean): Promise<void>;

    delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction, autoCommit?:boolean): Promise<void>;

    createTable<T extends object>(type?:{new(...args: any[]):T}, params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number}, dynamoDb?:NodeNamoDynamoDB | DynamoDB): Promise<void>;

    deleteTable<T extends object>(type?:{new(...args: any[]):T}, dynamoDb?:NodeNamoDynamoDB | DynamoDB): Promise<void>;
}
