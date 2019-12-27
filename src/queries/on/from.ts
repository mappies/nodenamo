import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Set } from './set';
import { Add } from './add';
import { Delete } from './delete';
import { Remove } from './remove';

export class From
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number)
    {
        return this;
    }

    set(setExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Set
    {
        return new Set(this.manager, this.type, this.id, undefined, setExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    remove(removeExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Remove
    {
        return new Remove(this.manager, this.type, this.id, undefined, removeExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    add(addExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Add
    {
        return new Add(this.manager, this.type, this.id, undefined, addExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    delete(deleteExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Delete
    {
        return new Delete(this.manager, this.type, this.id, undefined, deleteExpressions, expressionAttributeNames, expressionAttributeValues);
    }
};