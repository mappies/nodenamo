import { DynamoDbManager } from "../../managers/dynamodbManager";
import { From } from './from';

export class Get
{
    constructor(private manager:DynamoDbManager, private id:string|number)
    {
        return this;
    }

    from(type:{new(...args: any[])}): From
    {
        return new From(this.manager, type, this.id);
    }
}