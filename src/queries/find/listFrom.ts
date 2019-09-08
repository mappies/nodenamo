import { DynamoDbManager } from "../../managers/dynamodbManager";
import { By } from "./by";

export class ListFrom
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])})
    {
        return this;
    }

    by(hash:string|number|boolean, rangeValueBeginsWith?:string|number|boolean): By
    {
        return new By(this.manager, this.type, hash, rangeValueBeginsWith);
    }
};