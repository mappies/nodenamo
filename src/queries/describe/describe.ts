import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from './execute';

export class Describe
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])})
    {
        
    }

    async execute(): Promise<object>
    {
        return await new Execute(this.manager, this.type).execute();
    }
}