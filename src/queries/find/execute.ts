import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";

export class Execute
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])},
                private keyParams:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private filterParams?:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                private params?:{limit?:number, fetchSize?:number, indexName?:string, order?:number, exclusiveStartKey?:string, projections?:string[], stronglyConsistent?:boolean})
    {

    }

    async execute<T extends object>(): Promise<{items:T[],lastEvaluatedKey:string, firstEvaluatedKey: string}>
    {
        let result = await this.manager.find(this.type, this.keyParams, this.filterParams, this.params);

        return {
            items: result ? result.items : [],
            lastEvaluatedKey: result && result.lastEvaluatedKey,
            firstEvaluatedKey: result && result.firstEvaluatedKey
        };
    }
}
