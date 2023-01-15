import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { Limit } from './limit';
import { Order } from "./order";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Resume } from "./resume";
import { StronglyConsistent } from "./stronglyConsistent";

export class Using
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, fetchSize?:number, indexName?:string,order?:number,exclusiveStartKey?:string,projections?:string[], stronglyConsistent?:boolean},
                private indexName?:string)
    {
        this.params = this.params || {};
        this.params.indexName = this.indexName;
    }

    limit(limit:number, fetchSize?:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, this.filterParams, this.params, limit, fetchSize);
    }

    order(forward:boolean): Order
    {
        return new Order(this.manager, this.type, this.keyParams, this.filterParams, this.params, forward);
    }

    resume(key:string): Resume
    {
        return new Resume(this.manager, this.type, this.keyParams, this.filterParams, this.params, key);
    }

    stronglyConsistent(stronglyConsistent:boolean) : StronglyConsistent
    {
        return new StronglyConsistent(this.manager, this.type, this.keyParams, this.filterParams, this.params, stronglyConsistent);
    }

    async execute<T extends object>(): Promise<{items:T[], lastEvaluatedKey:string, firstEvaluatedKey: string}>
    {
        return await new Execute(this.manager, this.type, this.keyParams, this.filterParams, this.params).execute();
    }
}
