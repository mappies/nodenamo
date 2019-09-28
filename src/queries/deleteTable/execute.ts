import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";

export class Execute
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])})
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.deleteTable(this.type);
    }
}