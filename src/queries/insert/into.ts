import { Execute } from './execute';
import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Where } from './where';
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class Into implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object)
    {
        return this;
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.obj, {conditionExpression, expressionAttributeNames, expressionAttributeValues})
    }

    async execute(transaction?:DynamoDbTransaction): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.obj, undefined, transaction).execute();
    }
};