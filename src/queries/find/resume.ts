import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { Limit } from './limit';
import { Order } from "./order";
import { Using } from "./using";
import { StronglyConsistent } from "./stronglyConsistent";

export class Resume
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, fetchSize?:number, indexName?:string,order?:number,exclusiveStartKey?:string, projections?:string[], stronglyConsistent?:boolean},
                private startKey?:string)
    {
        let realParams:typeof params = Object.assign({}, params);

        if(startKey)
        {
            realParams.exclusiveStartKey = startKey
        }

        this.params = realParams;
    }

    limit(limit:number, fetchSize?:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, this.filterParams, this.params, limit, fetchSize);
    }

    order(forward:boolean): Order
    {
        return new Order(this.manager, this.type, this.keyParams, this.filterParams, this.params, forward);
    }

    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, this.filterParams, this.params, indexName);
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
