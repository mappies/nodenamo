import { DynamoDbManager } from '../../managers/dynamodbManager';
import { Into } from './into';

export class Insert 
{
    constructor(private manager:DynamoDbManager, private obj:object)
    {
        return this;
    }

    into(type:{new(...args: any[])}): Into
    {
        return new Into(this.manager, type, this.obj);
    }
};