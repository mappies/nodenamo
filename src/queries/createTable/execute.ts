import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";

export class Execute
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number})
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.createTable(this.type, this.params);
    }
}