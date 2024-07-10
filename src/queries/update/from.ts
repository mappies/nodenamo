import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";
import { WithVersionCheck } from './withVersionCheck';
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { ReturnValue } from '../../interfaces/returnValue';
import { Returning } from './returning';

export class From implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object)
    {
        return this;
    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.obj, undefined, versionCheck);
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.obj, {conditionExpression, expressionAttributeNames, expressionAttributeValues})
    }

    returning(returnValue:ReturnValue): Returning
    {
        return new Returning(this.manager, this.type, this.obj, undefined, returnValue)
    }

    async execute<T extends object>(transaction?:DynamoDbTransaction): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.obj, undefined, transaction).execute();
    }
};