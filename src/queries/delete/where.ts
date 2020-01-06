import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import ITransactionable from '../../interfaces/iTransactionable';

export class Where implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    async execute(transaction?:DynamoDbTransaction): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, this.params, transaction).execute();
    }
}