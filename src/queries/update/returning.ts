import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { WithVersionCheck } from './withVersionCheck';
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { ReturnValue } from '../../interfaces/returnValue';
import { Where } from './where';

export class Returning implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, returnValue?:ReturnValue, versionCheck?:boolean}, private returnValue?:ReturnValue)
    {
        this.params = this.params || {};
        this.params['returnValue'] = this.returnValue;
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.obj, {...this.params, ...{conditionExpression, expressionAttributeNames, expressionAttributeValues}})
    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.obj, this.params, versionCheck);
    }

    async execute<T extends object>(transaction?:DynamoDbTransaction): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.obj, this.params, transaction).execute();
    }
}