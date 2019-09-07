import { DynamoDbManager } from "../../managers/dynamodbManager";
import { Where } from './where';

export class From
{
    constructor(private manager:DynamoDbManager, private type:{new(...args: any[])})
    {
        return this;
    }

    where(params:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}): Where
    {
        return new Where(this.manager, this.type, params);
    }
};