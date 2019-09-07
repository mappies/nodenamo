import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";
import { Limit } from './limit';
import { Order } from "./order";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Resume } from "./resume";

export class Using
{
    constructor(private manager:DynamoDbManager, 
                private type:{new(...args: any[])}, 
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key},
                private indexName?:string)
    {
        this.params = this.params || {};
        this.params.indexName = this.indexName;
    }

    limit(limit:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, this.filterParams, this.params, limit);
    }

    order(forward:boolean): Order
    {
        return new Order(this.manager, this.type, this.keyParams, this.filterParams, this.params, forward);
    }    
    
    resume(key:string): Resume
    {
        return new Resume(this.manager, this.type, this.keyParams, this.filterParams, this.params, key);
    }

    async execute<T extends object>(): Promise<{items:T[], lastEvaluatedKey:string}>
    {
        return await new Execute(this.manager, this.type, this.keyParams, this.filterParams, this.params).execute();
    }
}