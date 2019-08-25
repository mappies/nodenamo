import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { RepresentationFactory } from '../representationFactory';

export class DynamoDbManager
{
    constructor(private client:DocumentClient)
    {
        
    }

    async put(obj:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction)
    {
        transaction = transaction || new DynamoDbTransaction(this.client);

        let representations = RepresentationFactory.get(obj);

        let additionalParams:any = {};

        if(params && params.conditionExpression)
        {
            additionalParams['ConditionExpression'] = params.conditionExpression;
        }

        if(params && params.expressionAttributeValues)
        {
            additionalParams['ExpressionAttributeValues'] = params.expressionAttributeValues;
        }

        if(params && params.expressionAttributeNames)
        {
            additionalParams['ExpressionAttributeNames'] = params.expressionAttributeNames;
        }

        for(let representation of representations)
        {
            transaction.add({
                Put: {
                    TableName: representation.tableName,
                    Item: representation.data,
                    ...additionalParams
                }
            })
        }

        await transaction.commit();
    }
}