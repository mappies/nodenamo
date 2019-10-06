import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Where } from './where';

export class From
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private params?:{projections?:string[]})
    {
        
    }

    where(keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}): Where
    {
        return new Where(this.manager, this.type, keyParams, this.params);
    }
};