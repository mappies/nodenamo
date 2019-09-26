import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Execute } from "./execute";
import { WithCapacityOf } from './withCapacityOf';

export class For
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])})
    {
        return this;
    }

    withCapacityOf(readCapacityUnits:number, writeCapacityUnits:number)
    {
        return new WithCapacityOf(this.manager, this.type, readCapacityUnits, writeCapacityUnits);
    }

    async execute(): Promise<void>
    {
        await new Execute(this.manager, this.type, {onDemand: true}).execute();
    }
};