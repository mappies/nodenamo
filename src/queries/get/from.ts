import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";

export class From
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id?:string|number)
    {
        return this;
    }

    async execute<T extends object>(): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.id).execute();
    }
};