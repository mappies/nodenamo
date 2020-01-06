import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class Execute
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, private transaction?:DynamoDbTransaction)
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.apply(this.type, this.id, this.params, this.transaction, this.transaction === undefined);
    }
}