import { Execute } from './execute';
import { DynamoDbManager } from '../../managers/dynamodbManager';
import { Where } from './where';
import { Into } from './into';

export class Add 
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