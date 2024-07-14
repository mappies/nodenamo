import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";
import { Set } from './set';
import { Remove } from './remove';
import { Add } from './add';
import { WithVersionCheck } from './withVersionCheck';
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { ReturnValue } from '../../interfaces/returnValue';
import { Returning } from './returning';

export class Delete implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean, returnValue?:ReturnValue}, deleteExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object)
    {

        if(this.params === undefined) this.params = <any>{};

        if(this.params.updateExpression === undefined) this.params.updateExpression = {};

        if(this.params.updateExpression.delete === undefined) this.params.updateExpression.delete = [];

        this.params.updateExpression.delete = this.params.updateExpression.delete.concat(deleteExpressions);
        
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

    remove(removeExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Remove
    {
        return new Remove(this.manager, this.type, this.id, this.params, removeExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.id, this.params, versionCheck);
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.id, this.params, {conditionExpression, expressionAttributeNames, expressionAttributeValues})
    }

    returning(returnValue:ReturnValue): Returning
    {
        return new Returning(this.manager, this.type, this.id, this.params, returnValue);
    }

    async execute<T extends object>(transaction?:DynamoDbTransaction): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.id, this.params, transaction).execute();
    }
};