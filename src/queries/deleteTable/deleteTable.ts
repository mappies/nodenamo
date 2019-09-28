import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { For } from './for';

export class DeleteTable
{
    constructor(private manager:IDynamoDbManager)
    {
        return this;
    }

    for(type:{new(...args: any[])}): For
    {
        return new For(this.manager, type);
    }
}