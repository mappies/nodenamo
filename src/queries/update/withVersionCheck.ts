import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";

export class WithVersionCheck
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, versionCheck?:boolean)
    {
        this.params = this.params || {};
        this.params['versionCheck'] = versionCheck;
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.obj, this.params).execute();
    }
};