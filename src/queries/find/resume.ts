import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { Limit } from './limit';
import { Order } from "./order";
import { Using } from "./using";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { StronglyConsistent } from "./stronglyConsistent";

export class Resume
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key, projections?:string[], stronglyConsistent?:boolean},
                private startKey?:string)
    {
        let realParams:any = Object.assign({}, params);

        if(startKey)
        {
            try
            {
                realParams.exclusiveStartKey = JSON.parse(Buffer.from(startKey, 'base64').toString());
            }
            catch(e){}
        }

        this.params = realParams;
    }

    limit(limit:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, this.filterParams, this.params, limit);
    }

    order(forward:boolean): Order
    {
        return new Order(this.manager, this.type, this.keyParams, this.filterParams, this.params, forward);
    }

    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, this.filterParams, this.params, indexName);
    }

    stronglyConsistent(strongRead:boolean = true)
    {
        return new StronglyConsistent(this.manager, this.type, this.keyParams, this.filterParams, this.params, strongRead);
    }

    async execute<T extends object>(): Promise<{items:T[], lastEvaluatedKey:string}>
    {
        return await new Execute(this.manager, this.type, this.keyParams, this.filterParams, this.params).execute();
    }
}
