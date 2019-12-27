import { DocumentClient} from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from '../managers/dynamodbTransaction';
import { DynamoDB } from 'aws-sdk/clients/all';

export interface IDynamoDbManager
{
    put<T extends object>(type:{new(...args: any[]):T}, object:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>;
   
    getOne<T extends object>(type:{new(...args: any[]):T}, id:string|number): Promise<T>;

    find<T extends object>(type:{new(...args: any[]):T}, 
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, 
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key})
                                 : Promise<{items:T[], lastEvaluatedKey: DocumentClient.Key}>;

    update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction): Promise<void>;

    apply<T extends object>(type:{new(...args: any[]):T}, id:string|number, params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction): Promise<void>;
    
    delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>;

    createTable<T extends object>(type?:{new(...args: any[]):T}, params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number}, dynamoDb?:DynamoDB): Promise<void>;

    deleteTable<T extends object>(type?:{new(...args: any[]):T}, dynamoDb?:DynamoDB): Promise<void>;
}