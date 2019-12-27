import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";

export class WithVersionCheck
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params?:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, versionCheck?:boolean)
    {
        this.params = this.params || <any>{};
        this.params['versionCheck'] = versionCheck;
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.id, this.params).execute();
    }
};