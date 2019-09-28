import { From } from './from';
import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';

export class Delete 
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