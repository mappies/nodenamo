import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class Execute
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, private transaction?:DynamoDbTransaction)
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.put(this.type, this.obj, this.params, this.transaction, this.transaction === undefined);
    }
}