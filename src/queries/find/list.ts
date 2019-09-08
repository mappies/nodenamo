import { DynamoDbManager } from "../../managers/dynamodbManager";
import { ListFrom } from './listFrom';

export class List
{
    constructor(private manager:DynamoDbManager)
    {
        return this;
    }

    from(type:{new(...args: any[])}): ListFrom
    {
        return new ListFrom(this.manager, type);
    }
}