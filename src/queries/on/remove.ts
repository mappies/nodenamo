import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";
import { Set } from './set';
import { Delete } from './delete';
import { Add } from './add';
import { WithVersionCheck } from './withVersionCheck';

export class Remove
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, removeExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object)
    {

        if(this.params === undefined) this.params = <any>{};

        if(this.params.updateExpression === undefined) this.params.updateExpression = {};

        if(this.params.updateExpression.remove === undefined) this.params.updateExpression.remove = [];

        this.params.updateExpression.remove = this.params.updateExpression.remove.concat(removeExpressions);
        
        this.params.expressionAttributeNames = expressionAttributeNames ? Object.assign(Object.assign({}, this.params.expressionAttributeNames), expressionAttributeNames) : this.params.expressionAttributeNames;
        this.params.expressionAttributeValues = expressionAttributeValues ? Object.assign(Object.assign({}, this.params.expressionAttributeValues), expressionAttributeValues) : this.params.expressionAttributeValues;

        return this;
    }

    add(addExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Add
    {
        return new Add(this.manager, this.type, this.id, this.params, addExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    set(setExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Set
    {
        return new Set(this.manager, this.type, this.id, this.params, setExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    delete(deleteExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Delete
    {
        return new Delete(this.manager, this.type, this.id, this.params, deleteExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.id, this.params, versionCheck);
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.id, this.params, {conditionExpression, expressionAttributeNames, expressionAttributeValues})
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, this.params).execute();
    }
};