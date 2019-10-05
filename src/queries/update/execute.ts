import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Reflector } from "../../reflector";
import { Key } from '../../Key';

export class Execute
{
    constructor(private manager:IDynamoDbManager, private type:{new(...args: any[])}, private obj:object, private params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean})
    {

    }

    async execute(): Promise<void>
    {
        let idColumn = Reflector.getIdKey(new this.type());

        idColumn = Key.parse(idColumn).propertyName; //targetName#propertyName
        
        await this.manager.update(this.type, this.obj[idColumn], this.obj, this.params);
    }
}