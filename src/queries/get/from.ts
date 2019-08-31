import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";

export class From
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private id?:string|number)
    {
        return this;
    }

    async execute(): Promise<object>
    {
        return await new Execute(this.manager, this.type, this.id).execute();
    }
};