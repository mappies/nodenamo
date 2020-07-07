import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Execute } from "./execute";

export class StronglyConsistent
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private id:string|number,
                private params:{stronglyConsistent?:boolean},
                private stronglyConsistent:boolean)
    {
        this.params = this.params || {};
        this.params.stronglyConsistent = this.stronglyConsistent;
    }

    async execute<T extends object>(): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.id, this.params).execute();
    }
}
