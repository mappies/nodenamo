import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";
import { Add } from './add';
import { Delete } from './delete';
import { Remove } from './remove';
import { WithVersionCheck } from './withVersionCheck';
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class Set implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, setExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object)
    {

        if(this.params === undefined) this.params = <any>{};

        if(this.params.updateExpression === undefined) this.params.updateExpression = {};

        if(this.params.updateExpression.set === undefined) this.params.updateExpression.set = [];

        this.params.updateExpression.set = this.params.updateExpression.set.concat(setExpressions);
        
        this.params.expressionAttributeNames = expressionAttributeNames ? Object.assign(Object.assign({}, this.params.expressionAttributeNames), expressionAttributeNames) : this.params.expressionAttributeNames;
        this.params.expressionAttributeValues = expressionAttributeValues ? Object.assign(Object.assign({}, this.params.expressionAttributeValues), expressionAttributeValues) : this.params.expressionAttributeValues;

        return this;
    }

    remove(removeExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Remove
    {
        return new Remove(this.manager, this.type, this.id, this.params, removeExpressions, expressionAttributeNames, expressionAttributeValues);
    }

    add(addExpressions:string[], expressionAttributeNames?:object, expressionAttributeValues?:object): Add
    {
        return new Add(this.manager, this.type, this.id, this.params, addExpressions, expressionAttributeNames, expressionAttributeValues);
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

    async execute(transaction?:DynamoDbTransaction): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, this.params, transaction).execute();
    }
};