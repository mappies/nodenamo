import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Reflector } from "../../reflector";

export class Execute
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    async execute(): Promise<void>
    {
        let idColumn = Reflector.getIdKey(new this.type());
        
        await this.manager.update(this.type, this.obj[idColumn], this.obj, this.params);
    }
}