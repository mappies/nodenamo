import { DynamoDbManager } from "../../managers/dynamodbManager";
import { From } from './from';

export class Find
{
    constructor(private manager:DynamoDbManager)
    {
        return this;
    }

    from(type:{new(...args: any[])}): From
    {
        return new From(this.manager, type);
    }
}