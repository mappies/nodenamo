import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { Using } from "./using";
import { Limit } from "./limit";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Resume } from "./resume";
import { StronglyConsistent } from "./stronglyConsistent";

export class Order
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, fetchSize?:number, indexName?:string,order?:number,exclusiveStartKey?:string,projections?:string[], stronglyConsistent?:boolean},
                private forward?:boolean)
    {
        this.params = this.params || {};
        this.params.order = this.forward ? 1 : -1;
    }

    limit(limit:number, fetchSize?:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, this.filterParams, this.params, limit, fetchSize);
    }

    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, this.filterParams, this.params, indexName);
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
