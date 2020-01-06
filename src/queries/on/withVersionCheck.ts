import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class WithVersionCheck implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, versionCheck?:boolean)
    {
        this.params = this.params || <any>{};
        this.params['versionCheck'] = versionCheck;
    }

    async execute(transaction?:DynamoDbTransaction): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, this.params, transaction).execute();
    }
};