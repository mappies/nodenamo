import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { From } from './from';

export class Find
{
    constructor(private manager:IDynamoDbManager, private projections?:string[])
    {
        
    }

    from(type:{new(...args: any[])}): From
    {
        return new From(this.manager, type, this.projections ? {projections:this.projections} : undefined);
    }
}