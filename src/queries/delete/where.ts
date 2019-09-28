import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";

export class Where
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, this.params).execute();
    }
}