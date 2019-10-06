import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

export class Execute
{
    constructor(private manager:IDynamoDbManager, 
                private type:{new(...args: any[])}, 
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key,projections?:string[]})
    {

    }

    async execute<T extends object>(): Promise<{items:T[],lastEvaluatedKey:string}>
    {
        let result = await this.manager.find(this.type, this.keyParams, this.filterParams, this.params);
        
        return {
            items: result ? result.items : [], 
            lastEvaluatedKey: result && result.lastEvaluatedKey ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64') : undefined
        };
    }
}