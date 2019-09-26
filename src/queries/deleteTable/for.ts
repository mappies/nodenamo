import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";

export class For
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])})
    {
        return this;
    }

    async execute(): Promise<void>
    {
        await new Execute(this.manager, this.type).execute();
    }
};