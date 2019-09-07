import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";
import { Limit } from './limit';
import { Using } from "./using";
import { Order } from "./order";
import { Resume } from "./resume";
import { Filter } from "./filter";

export class Where
{
    constructor(private manager:DynamoDbManager, 
                private type:{new(...args: any[])}, 
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    filter(filterParams:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}): Filter
    {
        return new Filter(this.manager, this.type, this.keyParams, filterParams);
    }

    limit(limit:number): Limit
    {
        return new Limit(this.manager, this.type, this.keyParams, undefined, undefined, limit);
    }

    using(indexName:string): Using
    {
        return new Using(this.manager, this.type, this.keyParams, undefined, undefined, indexName);
    }
    
    order(forward:boolean): Order
    {
        return new Order(this.manager, this.type, this.keyParams, undefined, undefined, forward);
    }    
    
    resume(key:string): Resume
    {
        return new Resume(this.manager, this.type, this.keyParams, undefined, undefined, key);
    }
    
    async execute<T extends object>(): Promise<{items:T[], lastEvaluatedKey:string}>
    {
        return await new Execute(this.manager, this.type, this.keyParams).execute();
    }
}