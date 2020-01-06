import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Reflector } from "../../reflector";
import { Key } from '../../Key';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class Execute
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, private transaction?:DynamoDbTransaction)
    {

    }

    async execute(): Promise<void>
    {
        let key = Reflector.getIdKey(new this.type());

        await this.manager.update(this.type, this.obj[Key.parse(key).propertyName], this.obj, this.params, this.transaction, this.transaction === undefined);
    }
}