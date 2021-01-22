import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { Reexecutable } from '../Reexecutable';

export class Execute extends Reexecutable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, private transaction?:DynamoDbTransaction)
    {
        super();
    }

    async execute(): Promise<void>
    {
        return await super.execute(async ()=>
        {
            return await this.manager.delete(this.type, this.id, this.params, this.transaction, this.transaction === undefined);
        });
    }
}