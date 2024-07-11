import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { ReturnValue } from '../../interfaces/returnValue';
import { Returning } from './returning';

export class WithVersionCheck implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, versionCheck?:boolean)
    {
        this.params = this.params || <any>{};
        this.params['versionCheck'] = versionCheck;
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