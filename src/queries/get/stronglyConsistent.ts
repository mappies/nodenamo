import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Execute } from "./execute";

export class StronglyConsistent
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private id:string|number,
                private strongRead:boolean = true)
    {

    }

    async execute<T extends object>(): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.id, this.strongRead).execute();
    }
}
