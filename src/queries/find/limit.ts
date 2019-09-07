import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";
import { Using } from "./using";
import { Order } from "./order";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Resume } from "./resume";

export class Limit
{
    constructor(private manager:DynamoDbManager, 
                private type:{new(...args: any[])}, 
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key},
                private limit?:number)
    {
        this.params = this.params || {};
        this.params.limit = this.limit;
    }

    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, this.filterParams, this.params, indexName);
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