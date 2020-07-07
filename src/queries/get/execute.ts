import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';

export class Execute
{
    constructor(private manager:IDynamoDbManager,
        private type:{new(...args: any[])},
        private id:string|number,
        private params?:{stronglyConsistent?:boolean})
    {

    }

    async execute<T extends object>(): Promise<T>
    {
        return await this.manager.getOne(this.type, this.id, this.params);
    }
}
