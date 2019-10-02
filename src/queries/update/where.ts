import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { WithVersionCheck } from './withVersionCheck';

export class Where
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {

    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.obj, this.params, versionCheck);
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.obj, this.params).execute();
    }
}