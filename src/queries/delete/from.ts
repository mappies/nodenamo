import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Where } from './where';
import { Execute } from "./execute";
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class From implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number)
    {
        return this;
    }

    where(params:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}): Where
    {
        return new Where(this.manager, this.type, this.id, params);
    }

    async execute(transaction?:DynamoDbTransaction): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, undefined, transaction).execute();
    }
};