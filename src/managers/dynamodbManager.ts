import { CreateTableCommand, DeleteTableCommand, QueryInput, QueryOutput, GetItemInput, ScalarAttributeType, KeyType, ProjectionType } from '@aws-sdk/client-dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { RepresentationFactory } from '../representationFactory';
import { Reflector } from '../reflector';
import {Const} from '../const';
import { EntityFactory } from '../entityFactory';
import { NodenamoError } from '../errors/nodenamoError';
import { IDynamoDbManager } from '../interfaces/iDynamodbManager';
import { VersionError } from '../errors/versionError';
import { Key } from '../Key';
import AggregateError from 'aggregate-error';
import base64url from "base64url";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

export class DynamoDbManager implements IDynamoDbManager
{
    constructor(public client:DynamoDBDocumentClient)
    {

    }

    async put<T extends object>(type:{new(...args: any[]):T}, object:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction, autoCommit:boolean = true): Promise<void>
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
            additionalParams['ConditionExpression'] =  `${additionalParams.ConditionExpression} AND (${params.conditionExpression})`;
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

        if(!autoCommit) return;

        try
        {
            await transaction.commit();
        }
        catch(e)
        {
            if(params === undefined || params.conditionExpression === undefined)
            {
                if(e instanceof AggregateError && e.message.includes('ConditionalCheckFailed'))
                {
                    let tableName = Reflector.getTableName(instance);

                    throw new AggregateError([
                        new NodenamoError(`An object with the same ID or hash-range key already exists in '${tableName}' table.`),
                        e]);
                }
            }

            throw e;
        }
    }

    private async getOneRepresendationById<T extends object>(type:{new(...args: any[]):T}, id:string|number, params?:{stronglyConsistent?:boolean}): Promise<object>
    {
        let obj:T = new type();
        let stronglyConsistent = Reflector.getTableStronglyConsistent(obj) || params?.stronglyConsistent || false;
        let tableName = Reflector.getTableName(obj);
        let attributeValues = {
            ':hash': <any>id,
            ':range': <any>Const.DefaultRangeValue
        };
        let attributeNames = {
            '#hash': Const.HashColumn,
            '#range': Const.RangeColumn
        };
        addColumnValuePrefix(obj, attributeValues, attributeNames)

        let query:GetItemInput = {
            TableName: tableName,
            Key: {
                [Const.HashColumn]: attributeValues[':hash'],
                [Const.RangeColumn]:  attributeValues[':range']
            },
            ConsistentRead: stronglyConsistent
        };

        let response =  await this.client.send(new GetCommand(query))
        
        return response.Item;
    }

    async getOne<T extends object>(type:{new(...args: any[]):T}, id:string|number, params?:{stronglyConsistent?:boolean}): Promise<T>
    {
        const item =  await this.getOneRepresendationById(type,id,params);

        if(item)
        {
            return EntityFactory.create(type,item);
        }

        return undefined;
    }

    async find<T extends object>(type:{new(...args: any[]):T},
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, fetchSize?:number, indexName?:string,order?:number,exclusiveStartKey?:string,projections?:string[], stronglyConsistent?:boolean})
                                 : Promise<{items:T[], lastEvaluatedKey: string, firstEvaluatedKey: string}>
    {
        let obj:T = new type();

        let stronglyConsistent = Reflector.getTableStronglyConsistent(obj) || params?.stronglyConsistent || false;

        let tableName = Reflector.getTableName(obj);

        let additionalParams = {
            ExpressionAttributeNames:undefined,
            ExpressionAttributeValues:undefined
         };

        let projectedColumns = undefined
        if(params && params.projections && params.projections.length > 0)
        {
            projectedColumns = prepareProjectedColumnNames(obj, params.projections, additionalParams).join(',');
        }

        if(keyParams && keyParams.expressionAttributeNames)
        {
            changeColumnNames(obj, keyParams.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = Object.assign(keyParams.expressionAttributeNames, additionalParams.ExpressionAttributeNames);
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
        
        let exclusiveStartKey;
        if (params?.exclusiveStartKey)
        {
            try
            {
                exclusiveStartKey = JSON.parse(base64url.decode(Buffer.from(params.exclusiveStartKey).toString()));
            }
            catch(e){}
        }

        let query:QueryInput = {
            TableName: tableName,
            KeyConditionExpression: keyParams ? keyParams.keyConditions : undefined,
            FilterExpression: filterParams ? filterParams.filterExpression : undefined,
            IndexName: params ? params.indexName : undefined,
            Limit: params ? params.fetchSize : undefined,
            ExclusiveStartKey: exclusiveStartKey,
            ScanIndexForward: params && (params.order || 1) >= 0,
            ConsistentRead: params? stronglyConsistent : undefined,
            ProjectionExpression: projectedColumns,
            ...additionalParams
        };

        let result:{[key: string]: T} = {};
        let response:QueryOutput;
        let itemCount = 0;
        let firstItem;
        let lastItem;

        do
        {
            response =  await this.client.send(new QueryCommand(query));

            if (!firstItem) firstItem = response.Items[0];
            
            let processedItemCount = 0;
            
            for(let item of response.Items)
            {
                processedItemCount++;
                if(<any>item[Const.IdColumn] in result) continue;

                lastItem = item;

                result[<string><unknown>item[Const.IdColumn]] = EntityFactory.create(type, item);

                if(!!params && !!params.limit && ++itemCount >= params.limit)
                {
                    if(processedItemCount !== response.Items.length)
                    {
                        //Initiate lastEvaluationKey to an object so that it will be later set at the end of this method.
                        response.LastEvaluatedKey = {}
                    }
                    break;
                }
            }

            query.ExclusiveStartKey = response.LastEvaluatedKey;
        }
        while(response.LastEvaluatedKey && itemCount < params.limit)
        
        let items = Object.values(result);
        
        let lastEvaluatedKey: string
        if(response.LastEvaluatedKey && lastItem)
        {
            lastEvaluatedKey = base64url.encode(JSON.stringify({
                [Const.HashColumn]: lastItem[Const.HashColumn],
                [Const.RangeColumn]: lastItem[Const.RangeColumn]
            }));
        }

        let firstEvaluatedKey: string;
        if (firstItem)
        {
            firstEvaluatedKey = base64url(JSON.stringify({
                [Const.HashColumn]: firstItem[Const.HashColumn],
                [Const.RangeColumn]: firstItem[Const.RangeColumn],
            }));
        }
        
        return { items, lastEvaluatedKey, firstEvaluatedKey }
    }

    private assignExistingNonHashRangeValues(to:object,from:object):void
    {        
        for(let key of Object.keys(from))
        {
            if(from[key] !== undefined && key !== Const.HashColumn && key!== Const.RangeColumn)
            {
                to[key] = from[key];
            }
        }
    }    

    async update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, params?:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction, autoCommit:boolean = true)
    {
        let instance = new type();
        let tableName = Reflector.getTableName(instance);
        let tableVersioning = Reflector.getTableVersioning(instance);
        let versioningRequired = tableVersioning || (params && params.versionCheck);

        //Calculate new representations
        let [rows, stronglyConsistentRow ] = await Promise.all([this.getById(id, type), this.getOneRepresendationById(type,id,{ stronglyConsistent:true})]);
        
        if(rows.length === 0)
        {
            throw new Error(`Could not update the object '${id}' because it could not be found.`);
        }

        this.assignExistingNonHashRangeValues(rows[0],stronglyConsistentRow);

        let getKey = (o:object) => `${o[Const.HashColumn]}|${o[Const.RangeColumn]}`;

        let currentRepresentationKeys = {};
        for(let row of rows)
        {
            currentRepresentationKeys[getKey(row)] = row;
        }

        //To support delta update, all properties with undefined values are removed here.
        let noUndefinedValuesObject = {};
        for(let property of Object.keys(obj))
        {
            if(obj[property] !== undefined)
            {
                noUndefinedValuesObject[property] = obj[property];
            }
        }

        //Must assign data to `instance` so it has @DBColumn() and @DBTable() metadata.
        //EntityFactory is used here to convert an object with custom column names to an object with real property names/
        //And because of an object created by EntityFactory.create() will not have Const.VersionColumn property, we have to re-add it here as well.
        let desiredObject = Object.assign(instance, Object.assign(Object.assign({}, EntityFactory.create(type, rows[0])), noUndefinedValuesObject));
        desiredObject[Const.VersionColumn] = rows[0][Const.VersionColumn];

        //If versionCheck, use the version from the original object.
        //Else, RepresentationFactory.get() will increment the version from DB.
        if(versioningRequired)
        {
            let version = Reflector.getObjectVersion(obj);
            Reflector.setObjectVersion(desiredObject, version);
        }

        //Create new representations
        let newRepresentations = RepresentationFactory.get(desiredObject);

        if(newRepresentations.length === 0)
        {
            throw new NodenamoError(`Could not create a data representation for '${JSON.stringify(obj)}'.  Try adding @DBColumn({hash:true}) to one its column.`);
        }

        //Setup additionalParams
        let additionalParams:any = {};

        if(versioningRequired)
        {
            additionalParams.ConditionExpression = '(attribute_not_exists(#objver) OR #objver < :objver)';
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
            //Create an additional param object for each representation.
            //This is required because newKey extra conditional logic below.
            let representationAdditionalParam = JSON.parse(JSON.stringify(additionalParams));

            let representationKey = getKey(representation);

            //Check if the new representation's key does exists.
            //If it does not exist, it means the item has a new key.
            //When adding the new representation with a new key, make sure the new hash and range are not already exist.
            let newKey = !(representationKey in currentRepresentationKeys);

            if(newKey)
            {
                representationAdditionalParam.ConditionExpression =
                    (representationAdditionalParam.ConditionExpression ? `${representationAdditionalParam.ConditionExpression} AND` : '')
                    +
                    '(attribute_not_exists(#hash) AND attribute_not_exists(#range))'

                    representationAdditionalParam.ExpressionAttributeNames = Object.assign(representationAdditionalParam.ExpressionAttributeNames || {}, {'#hash': Const.HashColumn, '#range': Const.RangeColumn})
            }

            let putParams = {
                TableName: tableName,
                Item: representation.data,
                ...representationAdditionalParam
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

            deleteParam.Key = {
                [Const.HashColumn]: entry[Const.HashColumn],
                [Const.RangeColumn]: entry[Const.RangeColumn]
            };

            transaction.add({Delete: deleteParam});
        }

        if(!autoCommit) return;

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

            //Check ConditionalCheckFailed
            if(params === undefined || params.conditionExpression === undefined)
            {
                if(e instanceof AggregateError && e.message.includes('ConditionalCheckFailed'))
                {
                    let tableName = Reflector.getTableName(instance);

                    throw new AggregateError([
                        new NodenamoError(`An object with the same ID or hash-range key already exists in '${tableName}' table.`),
                        e]);
                }
            }

            throw e;
        }
    }

    async apply<T extends object>(type:{new(...args: any[]):T}, id:string|number, params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction, autoCommit:boolean = true)
    {
        let instance = new type();
        let tableName = Reflector.getTableName(instance);
        let tableVersioning = Reflector.getTableVersioning(instance);
        let versioningRequired = tableVersioning || (params && params.versionCheck);

        //Calculate new representations
        let stronglyConsistentRow = await this.getOneRepresendationById(type,id,{ stronglyConsistent:true });
        if(!stronglyConsistentRow)
        {
            throw new Error(`Could not update the object '${id}' because it could not be found.`);
        }
        
        //use representation factory to determine which rows to act on.
        let representations = RepresentationFactory.get(EntityFactory.create(type, stronglyConsistentRow));
        //Setup additionalParams
        let additionalParams:any = {};

        if(versioningRequired)
        {
            additionalParams.ConditionExpression = '(#objver <= :objver)';
            additionalParams.ExpressionAttributeNames = {'#objver': Const.VersionColumn};
            additionalParams.ExpressionAttributeValues = {':objver': stronglyConsistentRow[Const.VersionColumn], ':objverincrementby': 1};

            if(!params.updateExpression.add)
            {
                params.updateExpression.add = [];
            }

            params.updateExpression.add.push('#objver :objverincrementby');
        }
        
        if(params.conditionExpression)
        {
            additionalParams['ConditionExpression'] = additionalParams['ConditionExpression']
                                                        ? `${additionalParams['ConditionExpression']} and (${params.conditionExpression})`
                                                        : params.conditionExpression;
        }

        if(params.expressionAttributeNames)
        {
            changeColumnNames(instance, params.expressionAttributeNames)
            additionalParams['ExpressionAttributeNames'] = Object.assign(params.expressionAttributeNames, additionalParams['ExpressionAttributeNames']);
        }

        if(params.expressionAttributeValues)
        {
            addColumnValuePrefix(instance, params.expressionAttributeValues, params.expressionAttributeNames);
            additionalParams['ExpressionAttributeValues'] = Object.assign(params.expressionAttributeValues, additionalParams['ExpressionAttributeValues']);
        }
        
        transaction = transaction || new DynamoDbTransaction(this.client);

        let updateExpression = '';

        //Setup updateExpression
        if(params?.updateExpression?.set?.length > 0)
        {
            updateExpression = `SET ${params.updateExpression.set.join(',')} ${updateExpression}`;
        }
        if(params?.updateExpression?.remove?.length > 0)
        {
            updateExpression = `REMOVE ${params.updateExpression.remove.join(',')} ${updateExpression}`;
        }
        if(params?.updateExpression?.add?.length > 0)
        {
            updateExpression = `ADD ${params.updateExpression.add.join(',')} ${updateExpression}`;
        }
        if(params?.updateExpression?.delete?.length > 0)
        {
            updateExpression = `DELETE ${params.updateExpression.delete.join(',')} ${updateExpression}`;
        }
        
        for(let representation of representations)
        {
            transaction.add({Update: {
                TableName: tableName,
                Key: {
                    [Const.HashColumn]: representation[Const.HashColumn],
                    [Const.RangeColumn]: representation[Const.RangeColumn]
                },
                UpdateExpression: updateExpression,
                ...additionalParams
            }})
        }

        if(!autoCommit) return;

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

                if(currentObject && Reflector.getObjectVersion(currentObject) > stronglyConsistentRow[Const.VersionColumn])
                {
                    throw new VersionError(`Could not update the object '${id}' because it has been overwritten by the writes of others.`);
                }
            }

            throw e;
        }
    }

    async delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction, autoCommit:boolean = true): Promise<void>
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
            query.Key = query.Key;
            
            transaction.add({Delete: query});
        }

        if(!autoCommit) return;

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
            let response =  await this.client.send(new QueryCommand(query));

            if(response.Items)
            {
                result = result.concat(response.Items)
            }

            query.ExclusiveStartKey = response.LastEvaluatedKey;
        }
        while(query.ExclusiveStartKey);

        return result;
    }

    async createTable<T extends object>(type?:{new(...args: any[]):T}, params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number}): Promise<void>
    {
        let query = {
            AttributeDefinitions: [
                { AttributeName: 'objid', AttributeType: ScalarAttributeType.S },
                { AttributeName: 'hash', AttributeType: ScalarAttributeType.S },
                { AttributeName: 'range', AttributeType: ScalarAttributeType.S }
            ],
            KeySchema: [
                { AttributeName: 'hash', KeyType: KeyType.HASH },
                { AttributeName: 'range', KeyType: KeyType.RANGE }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'objid-index',
                    KeySchema: [
                        { AttributeName: "objid", KeyType: KeyType.HASH }
                    ],
                    Projection: {
                        ProjectionType: ProjectionType.ALL
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

        await this.client.send(new CreateTableCommand(query));
    }

    async deleteTable<T extends object>(type?:{new(...args: any[]):T}): Promise<void>
    {
        let query = {
            TableName: Reflector.getTableName(new type())
        };

        await this.client.send(new DeleteTableCommand(query));
    }
}


function addColumnValuePrefix(obj:object, expressionAttributeValues:object, expressionAttributeNames:object): void
{
    let hashes = Reflector.getAllHashKeys(obj).map(k => Key.parse(k).propertyName);
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

function prepareProjectedColumnNames(obj:object, propertyNames:string[], params:{ExpressionAttributeNames:object, ExpressionAttributeValues:object}): string[]
{
    let result = [];
    let table = {};

    let columns = Reflector.getColumns(obj);

    for(let column of columns)
    {
        let key = Key.parse(column);
        table[key.propertyName] = key.targetName;
    }

    for(let propertyName of propertyNames)
    {
        if(propertyName in table) //Only valid property names are changed
        {
            result.push(`#${propertyName}`);

            if(params.ExpressionAttributeNames === undefined) params.ExpressionAttributeNames = {};
            params.ExpressionAttributeNames[`#${propertyName}`] = table[propertyName];
        }
    }

    if(result.length > 0)
    {
        //Always return hash/range/id/version columns
        result.push(`#${Const.HashColumn}`);
        result.push(`#${Const.RangeColumn}`);
        result.push(`#${Const.IdColumn}`);
        result.push(`#${Const.VersionColumn}`);

        params.ExpressionAttributeNames[`#${Const.HashColumn}`] = Const.HashColumn;
        params.ExpressionAttributeNames[`#${Const.RangeColumn}`] = Const.RangeColumn;
        params.ExpressionAttributeNames[`#${Const.IdColumn}`] = Const.IdColumn;
        params.ExpressionAttributeNames[`#${Const.VersionColumn}`] = Const.VersionColumn;
    }

    return result;
}

function changeColumnNames(obj:object, expressionAttributeNames:object): void
{
    let hashes = Reflector.getAllHashKeys(obj).map(k => Key.parse(k).propertyName);
    let ranges = Reflector.getAllRangeKeys(obj).map(k => Key.parse(k).propertyName);
    let columns = Reflector.getColumns(obj);

    //When there is no hashes, ID is the hash
    if(hashes.length === 0) hashes.push(Reflector.getIdKey(obj));

    for(let key of Object.keys(expressionAttributeNames))
    {
        let propertyName = (<any>expressionAttributeNames)[key];
        let columnName = propertyName;

        //Change propertyNames to targetNames (targetName#propertyName)
        for(let column of columns)
        {
            if(!column.includes('#')) continue;

            let key = Key.parse(column);
            if(propertyName === key.propertyName)
            {
                propertyName = key.propertyName;
                columnName = key.targetName;
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
