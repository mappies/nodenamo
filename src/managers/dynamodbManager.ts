import { DocumentClient, QueryInput, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { RepresentationFactory } from '../representationFactory';
import { Reflector } from '../reflector';
import {Const} from '../const';
import { EntityFactory } from '../entityFactory';
import { NodenamoError } from '../errors/nodenamoError';
import { DynamoDB } from 'aws-sdk/clients/all';
import { IDynamoDbManager } from '../interfaces/iDynamodbManager';
import { VersionError } from '../errors/versionError';

export class DynamoDbManager implements IDynamoDbManager
{
    constructor(private client:DocumentClient)
    {
        
    }

    async put<T extends object>(type:{new(...args: any[]):T}, object:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>
    {
        transaction = transaction || new DynamoDbTransaction(this.client);

        let instance = Object.assign(new type(), object);
        let representations = RepresentationFactory.get(instance);

        let additionalParams:any = {
            ConditionExpression: '(attribute_not_exists(#hash) AND attribute_not_exists(#range))',
            ExpressionAttributeNames: {'#hash': Const.HashColumn, '#range': Const.RangeColumn}
        };

        if(params && params.conditionExpression)
        {
            additionalParams['ConditionExpression'] =  ` AND (${params.conditionExpression})`;
        }

        if(params && params.expressionAttributeNames)
        {
            changeColumnNames(instance, params.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = Object.assign(params.expressionAttributeNames, additionalParams['ExpressionAttributeNames']);
        }

        if(params && params.expressionAttributeValues)
        {
            addColumnValuePrefix(instance, params.expressionAttributeValues, params.expressionAttributeNames);
            additionalParams['ExpressionAttributeValues'] = params.expressionAttributeValues;
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

        let attributeValues = {':objid': <any>id};
        let attributeNames = {'#objid': Const.IdColumn};
        addColumnValuePrefix(obj, attributeValues, attributeNames)

        let query:QueryInput = {
            TableName: tableName,
            KeyConditionExpression: '#objid = :objid',
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
            IndexName: Const.IdIndexName,
            Limit: 1
        };

        do
        {
            let response =  await this.client.query(query).promise();

            if(response.Items && response.Items.length > 0)
            {
                return EntityFactory.create(type, response.Items[0]);
            }

            query.ExclusiveStartKey = response.LastEvaluatedKey;
        }
        while(query.ExclusiveStartKey);

        return undefined;
    }

    async find<T extends object>(type:{new(...args: any[]):T}, 
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, 
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key})
                                 : Promise<{items:T[], lastEvaluatedKey: DocumentClient.Key}>
    {
        let obj:T = new type();

        let tableName = Reflector.getTableName(obj);

        let additionalParams = {};

        if(keyParams && keyParams.expressionAttributeNames)
        {
            changeColumnNames(obj, keyParams.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = keyParams.expressionAttributeNames;
        }

        if(keyParams && keyParams.expressionAttributeValues)
        {
            addColumnValuePrefix(obj, keyParams.expressionAttributeValues, keyParams.expressionAttributeNames);
            additionalParams['ExpressionAttributeValues'] = keyParams.expressionAttributeValues;
        }

        if(filterParams && filterParams.expressionAttributeNames)
        {
            changeColumnNames(obj, filterParams.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = Object.assign(filterParams.expressionAttributeNames, additionalParams['ExpressionAttributeNames']);
        }

        if(filterParams && filterParams.expressionAttributeValues)
        {
            addColumnValuePrefix(obj, filterParams.expressionAttributeValues, filterParams.expressionAttributeNames);
            additionalParams['ExpressionAttributeValues'] = Object.assign(filterParams.expressionAttributeValues, additionalParams['ExpressionAttributeValues']);
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

        return {items: Object.values(result), lastEvaluatedKey: response.LastEvaluatedKey}
    }

    async update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction)
    {
        let instance = new type();
        let tableName = Reflector.getTableName(instance);
        let tableVersioning = Reflector.getTableVersioning(instance);
        let versioningRequired = tableVersioning || (params && params.versionCheck);

        //Calculate new representations
        let rows = await this.getById(id, type); 
        
        if(rows.length === 0)
        {
            throw new Error(`Could not update the object '${id}' because it could not be found.`);
        }

        let getKey = (o:object) => `${o[Const.HashColumn]}|${o[Const.RangeColumn]}`;

        let currentRepresentationKeys = {};
        for(let row of rows)
        {
            currentRepresentationKeys[getKey(row)] = row;
        }

        //Must assign data to `instance` so it has @DBColumn() and @DBTable() metadata.
        let desiredObject = Object.assign(instance, Object.assign(Object.assign({}, rows[0]), obj));

        //If versionCheck, use the version from the original object.
        //Else, RepresentationFactory.get() will increment the version from DB.
        if(versioningRequired)
        {
            let version = Reflector.getObjectVersion(obj);
            Reflector.setObjectVersion(desiredObject, version);
        }

        //Create new representations
        let newRepresentations = RepresentationFactory.get(desiredObject)
        if(newRepresentations.length === 0)
        {
            throw new NodenamoError(`Could not create a data representation for '${JSON.stringify(obj)}'.  Try adding @DBColumn({hash:true}) to one its column.`);
        }

        //Setup additionalParams
        let additionalParams:any = {};
        
        if(versioningRequired)
        {
            additionalParams.ConditionExpression = '(#objver < :objver)';
            additionalParams.ExpressionAttributeNames = {'#objver': Const.VersionColumn};
            additionalParams.ExpressionAttributeValues = {':objver': newRepresentations[0].data[Const.VersionColumn]};
        }

        if(params && params.conditionExpression)
        {
            additionalParams['ConditionExpression'] = additionalParams['ConditionExpression'] 
                                                        ? `${additionalParams['ConditionExpression']} and (${params.conditionExpression})`
                                                        : params.conditionExpression;
        }
        
        if(params && params.expressionAttributeNames)
        {
            changeColumnNames(obj, params.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = Object.assign(params.expressionAttributeNames, additionalParams['ExpressionAttributeNames']);
        }

        if(params && params.expressionAttributeValues)
        {
            addColumnValuePrefix(obj, params.expressionAttributeValues, params.expressionAttributeNames);
            additionalParams['ExpressionAttributeValues'] = Object.assign(params.expressionAttributeValues, additionalParams['ExpressionAttributeValues']);
        }
        
        transaction = transaction || new DynamoDbTransaction(this.client);

        //Update/delete rows
        for(let representation of newRepresentations)
        {
            let representationKey = getKey(representation);

            let putParams = {
                TableName: tableName,
                Item: representation.data,
                ...additionalParams
            };
            
            transaction.add({Put: putParams});

            delete currentRepresentationKeys[representationKey];
        }

        //Delete entries with old keys
        for(let entry of Object.values(currentRepresentationKeys))
        {
            let deleteParam = {
                TableName: tableName,
                Key: {}
            }

            deleteParam.Key[Const.HashColumn] = entry[Const.HashColumn];
            deleteParam.Key[Const.RangeColumn] = entry[Const.RangeColumn];
            
            transaction.add({Delete: deleteParam});
        }

        try
        {
            await transaction.commit();
        }
        catch(e)
        {
            //Check if the failure was caused from a version check.
            if(versioningRequired)
            {
                let currentObject:T;
                try
                {
                    currentObject = await this.getOne(type, id);
                }
                catch(e2)
                {
                    throw e;
                }
                
                if(currentObject && Reflector.getObjectVersion(currentObject) >= newRepresentations[0].data[Const.VersionColumn])
                {
                    throw new VersionError(`Could not update the object '${id}' because it has been overwritten by the writes of others.`);
                }
            }

            throw e;
        }
    }


    async delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>
    {
        let obj:T = new type();
        let tableName = Reflector.getTableName(obj);

        let additionalParams:any = {};

        if(params && params.conditionExpression)
        {
            additionalParams['ConditionExpression'] = params.conditionExpression;
        }

        if(params && params.expressionAttributeNames)
        {
            changeColumnNames(obj, params.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = params.expressionAttributeNames;
        }

        if(params && params.expressionAttributeValues)
        {
            addColumnValuePrefix(obj, params.expressionAttributeValues, params.expressionAttributeNames);
            additionalParams['ExpressionAttributeValues'] = params.expressionAttributeValues;
        }

        let rows = await this.getById(id, type);

        transaction = transaction || new DynamoDbTransaction(this.client);

        
        for(let row of rows)
        {
            let query = {
                TableName: tableName,
                Key: {},
                ...additionalParams
            };
            query.Key[Const.HashColumn] = row[Const.HashColumn];
            query.Key[Const.RangeColumn] = row[Const.RangeColumn];

            transaction.add({Delete: query});
        }

        await transaction.commit();
    }

    private async getById<T extends object>(id:string|number, type?:{new(...args: any[]):T}): Promise<object[]>
    {
        let obj:T = new type();
        let tableName = Reflector.getTableName(obj);

        let getAttributeValues = {':objid': <any>id};
        addColumnValuePrefix(obj, getAttributeValues,{'#objid': Const.IdColumn})

        let query:QueryInput = {
            TableName: tableName,
            KeyConditionExpression: '#objid = :objid',
            ExpressionAttributeNames: {'#objid': Const.IdColumn},
            ExpressionAttributeValues: getAttributeValues,
            IndexName: Const.IdIndexName
        };
        
        let result:object[] = [];

        do
        {
            let response =  await this.client.query(query).promise();

            if(response.Items)
            {
                result = result.concat(response.Items)
            }

            query.ExclusiveStartKey = response.LastEvaluatedKey;
        }
        while(query.ExclusiveStartKey);

        return result;
    }

    async createTable<T extends object>(type?:{new(...args: any[]):T}, params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number}, dynamoDb?:DynamoDB): Promise<void>
    {
        let query = {
            AttributeDefinitions: [ 
                { AttributeName: 'objid', AttributeType: 'S' },
                { AttributeName: 'hash', AttributeType: 'S' },
                { AttributeName: 'range', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'hash', KeyType: 'HASH' },
                { AttributeName: 'range', KeyType: 'RANGE' }
            ],
            GlobalSecondaryIndexes: [
                { 
                    IndexName: 'objid-index', 
                    KeySchema: [ 
                        { AttributeName: "objid", KeyType: "HASH" }
                    ],
                    Projection: {
                        ProjectionType: "ALL"
                    }
                }
            ],

            TableName: Reflector.getTableName(new type())
        }

        if(params && params.onDemand)
        {
            query['BillingMode'] = 'PAY_PER_REQUEST';
        }

        if(params && (params.readCapacityUnits || params.writeCapacityUnits))
        {
            query['BillingMode'] = 'PROVISIONED';
            query['ProvisionedThroughput'] = {
                ReadCapacityUnits: params.readCapacityUnits,
                WriteCapacityUnits: params.writeCapacityUnits
            };
            query['GlobalSecondaryIndexes'][0]['ProvisionedThroughput'] = Object.assign({}, query['ProvisionedThroughput']);
        }

        await (dynamoDb || new DynamoDB(this.client['options'])).createTable(query).promise();
    }

    async deleteTable<T extends object>(type?:{new(...args: any[]):T}, dynamoDb?:DynamoDB): Promise<void>
    {
        let query = {
            TableName: Reflector.getTableName(new type())
        };

        await (dynamoDb || new DynamoDB(this.client['options'])).deleteTable(query).promise();
    }
}


function addColumnValuePrefix(obj:object, expressionAttributeValues:object, expressionAttributeNames:object): void
{
    let hashes = Reflector.getHashKeys(obj).map(k => k.includes('#') ? k.split('#')[1] : k);
    let id = Const.IdColumn;
    let prefix = Reflector.getDataPrefix(obj);
    let isStringColumn = false;

    //When there is no hashes, ID is the hash
    if(hashes.length === 0) hashes.push(Reflector.getIdKey(obj));

    let columnsWithPrefix = [...hashes, id, Const.HashColumn, Const.IdColumn];

    for(let key of Object.keys(expressionAttributeValues))
    {
        let originalValue = (<any>expressionAttributeValues)[key];
        let newValue = originalValue;

        if(columnsWithPrefix.includes(key.replace(/^:/, ''))) //A value key may start with :
        {
            newValue = `${prefix}#${newValue}`;
            isStringColumn = true;
        }

        if(expressionAttributeNames && columnsWithPrefix.includes(expressionAttributeNames[key.replace(/^:/,'#')]))
        {
            isStringColumn = true;
        }

        (<any>expressionAttributeValues)[key] = isStringColumn ? String(newValue) : newValue;
    }
}

function changeColumnNames(obj:object, expressionAttributeNames:object): void
{
    let hashes = Reflector.getHashKeys(obj).map(k => k.includes('#') ? k.split('#')[1] : k);
    let ranges = Reflector.getRangeKeys(obj).map(k => k.includes('#') ? k.split('#')[1] : k);
    let columns = Reflector.getColumns(obj);
    
    //When there is no hashes, ID is the hash
    if(hashes.length === 0) hashes.push(Reflector.getIdKey(obj));
    
    for(let key of Object.keys(expressionAttributeNames))
    {
        let propertyName = (<any>expressionAttributeNames)[key];
        let columnName = propertyName;

        //Change propertyNames to customNames (customName#propertyName)
        for(let column of columns)
        {
            if(!column.includes('#')) continue;
            
            let tokens = column.split('#');
            if(propertyName === tokens[1])
            {
                propertyName = tokens[1];
                columnName = tokens[0];
                break;
            }
        }

        //Change to hash or range
        if(hashes.includes(propertyName))
        {
            columnName = 'hash';
        }
        else if(ranges.includes(propertyName))
        {
            columnName = 'range';
        }

        (<any>expressionAttributeNames)[key] = columnName;
    }
}