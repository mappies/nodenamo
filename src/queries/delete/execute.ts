import { DynamoDbManager } from "../../managers/dynamodbManager";

export class Execute
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.delete(this.type, this.id, this.params);
    }
}