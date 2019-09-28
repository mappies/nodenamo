import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { By } from "./by";
import { Filter } from "./filter";
import { Limit } from "./limit";
import { Using } from "./using";
import { Order } from './order';
import { Resume } from "./resume";
import { Execute } from "./execute";
import Const from "../../const";

export class ListFrom
{
    private keyParams:any;
    
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])})
    {
        this.keyParams = 
        {
            keyConditions: '#hash = :hash',
            expressionAttributeNames: {'#hash': Const.HashColumn},
            expressionAttributeValues: {':hash': Const.DefaultHashValue}
        }
    }

    by(hash:string|number|boolean, rangeValueBeginsWith?:string|number|boolean): By
    {
        return new By(this.manager, this.type, hash, rangeValueBeginsWith);
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
};