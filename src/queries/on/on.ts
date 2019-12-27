import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { From } from './from';

export class On 
{
    constructor(private manager:IDynamoDbManager, private id:string|number)
    {
        return this;
    }

    from(type:{new(...args: any[])}): From
    {
        return new From(this.manager, type, this.id);
    }
};