import { DynamoDbManager } from "../../managers/dynamodbManager";

export class Execute
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])})
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.deleteTable(this.type);
    }
}