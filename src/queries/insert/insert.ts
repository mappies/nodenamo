import { Into } from './into';
import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';

export class Insert 
{
    constructor(private manager:IDynamoDbManager, private obj:object)
    {
        return this;
    }

    into(type:{new(...args: any[])}): Into
    {
        return new Into(this.manager, type, this.obj);
    }
};