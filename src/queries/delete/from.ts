import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Where } from './where';
import { Execute } from "./execute";

export class From
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private id:string|number)
    {
        return this;
    }

    where(params:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}): Where
    {
        return new Where(this.manager, this.type, this.id, params);
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id).execute();
    }
};