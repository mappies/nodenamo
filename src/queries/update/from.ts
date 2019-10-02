import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { Where } from "./where";
import { WithVersionCheck } from './withVersionCheck';

export class From
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object)
    {
        return this;
    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.obj, undefined, versionCheck);
    }

    where(conditionExpression:string, expressionAttributeNames?:object, expressionAttributeValues?:object): Where
    {
        return new Where(this.manager, this.type, this.obj, {conditionExpression, expressionAttributeNames, expressionAttributeValues})
    }

    async execute(): Promise<void>
    {
        return await new Execute(this.manager, this.type, this.obj, undefined).execute();
    }
};