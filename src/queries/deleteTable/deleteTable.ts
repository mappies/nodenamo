import { DynamoDbManager } from "../../managers/dynamodbManager";
import { For } from './for';

export class DeleteTable
{
    constructor(private manager:DynamoDbManager)
    {
        return this;
    }

    for(type:{new(...args: any[])}): For
    {
        return new For(this.manager, type);
    }
}