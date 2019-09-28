import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { Using } from "./using";
import { Limit } from "./limit";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Resume } from "./resume";

export class Order
{
    constructor(private manager:IDynamoDbManager, 
                private type:{new(...args: any[])}, 
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key},
                private forward?:boolean)
    {
        this.params = this.params || {};
        this.params.order = this.forward ? 1 : -1;
    }

    limit(limit:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, this.filterParams, this.params, limit);
    }
    
    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, this.filterParams, this.params, indexName);
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