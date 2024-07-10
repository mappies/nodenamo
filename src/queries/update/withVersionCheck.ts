import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { ReturnValue } from '../../interfaces/returnValue';
import { Returning } from './returning';
import { Where } from './where';

export class WithVersionCheck implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, returnValue?:ReturnValue, versionCheck?:boolean}, versionCheck?:boolean)
    {
        this.params = this.params || {};
        this.params['versionCheck'] = versionCheck;
    }

    returning(returnValue:ReturnValue): Returning
    {
        return new Returning(this.manager, this.type, this.obj, this.params, returnValue);
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.obj, {...this.params, ...{conditionExpression, expressionAttributeNames, expressionAttributeValues}})
    }

    async execute<T extends object>(transaction?:DynamoDbTransaction): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.obj, this.params, transaction).execute();
    }
};