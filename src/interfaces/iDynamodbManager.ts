import { DynamoDbTransaction } from '../managers/dynamodbTransaction';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface IDynamoDbManager
{
    client:DynamoDBDocumentClient;

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

    createTable<T extends object>(type?:{new(...args: any[]):T}, params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number}): Promise<void>;

    deleteTable<T extends object>(type?:{new(...args: any[]):T}): Promise<void>;
}
