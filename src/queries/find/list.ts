import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { ListFrom } from './listFrom';

export class List
{
    constructor(private manager:IDynamoDbManager)
    {
        return this;
    }

    from(type:{new(...args: any[])}): ListFrom
    {
        return new ListFrom(this.manager, type);
    }
}