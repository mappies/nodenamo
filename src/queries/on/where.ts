import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from "./execute";
import { WithVersionCheck } from './withVersionCheck';
import ITransactionable from '../../interfaces/iTransactionable';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import { ReturnValue } from '../../interfaces/returnValue';
import { Returning } from './returning';

export class Where implements ITransactionable
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private id:string|number, private params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, condition:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
    {
        this.params.conditionExpression = condition?.conditionExpression;
        this.params.expressionAttributeNames = Object.assign(Object.assign({}, this.params.expressionAttributeNames), condition?.expressionAttributeNames);
        this.params.expressionAttributeValues = Object.assign(Object.assign({}, this.params.expressionAttributeValues), condition?.expressionAttributeValues);
    }

    returning(returnValue:ReturnValue): Returning
    {
        return new Returning(this.manager, this.type, this.id, this.params, returnValue);
    }

    withVersionCheck(versionCheck:boolean = true): WithVersionCheck
    {
        return new WithVersionCheck(this.manager, this.type, this.id, this.params, versionCheck);
    }

    async execute<T extends object>(transaction?:DynamoDbTransaction): Promise<T>
    {
        return await new Execute(this.manager, this.type, this.id, this.params, transaction).execute();
    }
}