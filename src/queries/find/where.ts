import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { Limit } from './limit';
import { Using } from "./using";
import { Order } from "./order";
import { Resume } from "./resume";
import { Filter } from "./filter";
import { StronglyConsistent } from "./stronglyConsistent";

export class Where
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?: {projections?:string[]})
    {

    }

    filter(filterParams:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}): Filter
    {
        return new Filter(this.manager, this.type, this.keyParams, filterParams, this.params);
    }

    limit(limit:number, fetchSize?:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, undefined, this.params, limit, fetchSize);
    }

    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, undefined, this.params, indexName);
    }

    order(forward:boolean): Order
    {
        return new Order(this.manager, this.type, this.keyParams, undefined, this.params, forward);
    }

    resume(key:string): Resume
    {
        return new Resume(this.manager, this.type, this.keyParams, undefined, this.params, key);
    }

    stronglyConsistent(stronglyConsistent:boolean) : StronglyConsistent
    {
        return new StronglyConsistent(this.manager, this.type, this.keyParams, undefined, this.params, stronglyConsistent);
    }

    async execute<T extends object>(): Promise<{items:T[], lastEvaluatedKey:string, firstEvaluatedKey: string}>
    {
        return await new Execute(this.manager, this.type, this.keyParams, undefined, this.params).execute();
    }
}
