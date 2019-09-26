import { DynamoDbManager } from "../../managers/dynamodbManager";

export class Execute
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])}, private params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number})
    {

    }

    async execute(): Promise<void>
    {
        await this.manager.createTable(this.type, this.params);
    }
}