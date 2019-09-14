import { DynamoDbManager } from '../../managers/dynamodbManager';
import { From } from './from';

export class Update 
{
    constructor(private manager:DynamoDbManager, private obj:object)
    {
        return this;
    }

    from(type:{new(...args: any[])}): From
    {
        return new From(this.manager, type, this.obj);
    }
};