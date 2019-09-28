import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { From } from './from';

export class Update 
{
    constructor(private manager:IDynamoDbManager, private obj:object)
    {
        return this;
    }

    from(type:{new(...args: any[])}): From
    {
        return new From(this.manager, type, this.obj);
    }
};