import { DocumentClient, QueryInput, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { RepresentationFactory } from '../representationFactory';
import { Reflector } from '../reflector';
import Const from '../const';
import { EntityFactory } from '../entityFactory';

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

    async getOne<T extends object>(type:{new(...args: any[]):T}, id:string|number): Promise<T>
    {
        let obj:T = new type();
        let tableName = Reflector.getTableName(obj);
        let dataPrefix = Reflector.getDataPrefix(obj);

        let query = {
            TableName: tableName,
            Key: {
                'hash': `${dataPrefix}#${id}`,
                "range": Const.IdRangeKey
            }
        };

        let response =  await this.client.get(query).promise();
        
        return response.Item === undefined ? undefined : EntityFactory.create(type, response.Item);
    }

    async find<T extends object>(type:{new(...args: any[]):T}, 
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, 
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key})
                                 : Promise<{items:T[], LastEvaluatedKey: DocumentClient.Key}>
    {
        let obj:T = new type();

        let tableName = Reflector.getTableName(obj);

        let additionalParams = {};

        if(keyParams && keyParams.expressionAttributeValues)
        {
            addColumnValuePrefix(obj, keyParams.expressionAttributeValues);
            additionalParams['ExpressionAttributeValues'] = keyParams.expressionAttributeValues;
        }

        if(keyParams && keyParams.expressionAttributeNames)
        {
            changeColumnNames(obj, keyParams.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = keyParams.expressionAttributeNames;
        }

        if(filterParams && filterParams.expressionAttributeValues)
        {
            addColumnValuePrefix(obj, filterParams.expressionAttributeValues);
            additionalParams['ExpressionAttributeValues'] = Object.assign(filterParams.expressionAttributeValues, additionalParams['ExpressionAttributeValues']);
        }

        if(filterParams && filterParams.expressionAttributeNames)
        {
            changeColumnNames(obj, filterParams.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = Object.assign(filterParams.expressionAttributeNames, additionalParams['ExpressionAttributeNames']);
        }

        let query:QueryInput = {
            TableName: tableName,
            KeyConditionExpression: keyParams ? keyParams.keyConditions : undefined,
            FilterExpression: filterParams ? filterParams.filterExpression : undefined,
            IndexName: params ? params.indexName : undefined,
            Limit: params ? params.limit : undefined,
            ExclusiveStartKey: params ? params.exclusiveStartKey : undefined,
            ScanIndexForward: params && (params.order || 1) >= 0,
            ...additionalParams
        };

        let result:{} = {};
        let response:QueryOutput;
        let itemCount = 0;

        do
        {
            response =  await this.client.query(query).promise();

            for(let item of response.Items)
            {
                if(<any>item[Const.IdColumn] in result) continue;

                result[<any>item[Const.IdColumn]] = EntityFactory.create(type, item);
                
                if(!!params && !!params.limit && ++itemCount >= params.limit) break;
            }

            query.ExclusiveStartKey = response.LastEvaluatedKey;
        }
        while(response.LastEvaluatedKey && itemCount < params.limit)

        return {items: Object.values(result), LastEvaluatedKey: response.LastEvaluatedKey}
    }
}


function addColumnValuePrefix(obj:object, expressionAttributeValues:object): void
{
    let hashes = Reflector.getHashKeys(obj);
    let id = Const.IdColumn;
    let prefix = Reflector.getDataPrefix(obj);

    //When there is no hashes, ID is the hash
    if(hashes.length === 0) hashes.push(Reflector.getIdKey(obj));

    let columnsWithPrefix = [...hashes, id];

    for(let key of Object.keys(expressionAttributeValues))
    {
        let originalValue = (<any>expressionAttributeValues)[key];
        let newValue = originalValue;

        if(columnsWithPrefix.includes(key.replace(/^:/, ''))) //A value key may start with :
        {
            newValue = `${prefix}#${newValue}`;
        }

        (<any>expressionAttributeValues)[key] = newValue;
    }
}

function changeColumnNames(obj:object, expressionAttributeNames:object): void
{
    let hashes = Reflector.getHashKeys(obj);
    let ranges = Reflector.getRangeKeys(obj);
    
    //When there is no hashes, ID is the hash
    if(hashes.length === 0) hashes.push(Reflector.getIdKey(obj));
    
    for(let key of Object.keys(expressionAttributeNames))
    {
        let originalValue = (<any>expressionAttributeNames)[key];
        let newValue = originalValue;

        if(hashes.includes(originalValue))
        {
            newValue = 'hash';
        }

        if(ranges.includes(originalValue))
        {
            newValue = 'range';
        }


        (<any>expressionAttributeNames)[key] = newValue;
    }
}