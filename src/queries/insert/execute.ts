import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { Reexecutable } from '../Reexecutable';

export class Execute extends Reexecutable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, private transaction?:DynamoDbTransaction)
    {
        super();
    }

    async execute(): Promise<void>
    {
        return await super.execute(async ()=>
        {
            return await this.manager.put(this.type, this.obj, this.params, this.transaction, this.transaction === undefined);
        });
    }
}