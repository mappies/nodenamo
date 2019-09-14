import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";
import { Where } from "./where";

export class From
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private obj:object)
    {
        return this;
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.obj, {conditionExpression, expressionAttributeNames, expressionAttributeValues})
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.obj, undefined).execute();
    }
};