import { DynamoDbManager } from "../../managers/dynamodbManager";

export class Execute
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private id:string|number)
    {

    }

    async execute<T extends object>(): Promise<T>
    {
        return await this.manager.getOne(this.type, this.id);
    }
}