import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";

export class Where
{
    constructor(private manager:DynamoDbManager, private obj:object, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.obj, this.params).execute();
    }
}