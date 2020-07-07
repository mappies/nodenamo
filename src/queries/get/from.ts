import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { StronglyConsistent } from './stronglyConsistent';

export class From
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private id?:string|number,
                private params?:{stronglyConsistent:boolean})
    {
        return this;
    }

    stronglyConsistent(stronglyConsistent:boolean) : StronglyConsistent
    {
        return new StronglyConsistent(this.manager, this.type, this.id, this.params, stronglyConsistent);
    }

    async execute<T extends object>(): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.id).execute();
    }
};
