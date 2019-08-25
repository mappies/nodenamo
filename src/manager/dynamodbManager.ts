import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { RepresentationFactory } from '../representationFactory';
import { Reflector } from '../reflector';

function addColumnValuePrefix(obj:object, expressionAttributeValues:object): void
{
    let hashes = Reflector.getHashKeys(obj);
    let id = Reflector.getIdKey(obj);
    let prefix = Reflector.getDataPrefix(obj);

    let columnsWithPrefix = [...hashes, id];

    for(let key of Object.keys(expressionAttributeValues))
    {
        let originalValue = (<any>expressionAttributeValues)[key];
        let newValue = originalValue;

        if(columnsWithPrefix.includes(key))
        {
            newValue = `${prefix}#${newValue}`;
        }

        (<any>expressionAttributeValues)[key] = newValue;
    }
}

function changeColumnNames(obj:object, expressionAttributeNames:object): void
{
    let hashes = Reflector.getHashKeys(obj);

    for(let key of Object.keys(expressionAttributeNames))
    {
        let originalValue = (<any>expressionAttributeNames)[key];
        let newValue = originalValue;

        if(hashes.includes(originalValue))
        {
            newValue = 'hash';
        }

        (<any>expressionAttributeNames)[key] = newValue;
    }
}

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
            addColumnValuePrefix(obj, params.expressionAttributeValues);
            additionalParams['ExpressionAttributeValues'] = params.expressionAttributeValues;
        }

        if(params && params.expressionAttributeNames)
        {
            changeColumnNames(obj, params.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = params.expressionAttributeNames;
        }

        for(let representation of representations)
        {console.log(representation, additionalParams)
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