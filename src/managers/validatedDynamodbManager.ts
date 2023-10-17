import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { DynamoDbManager } from './dynamodbManager';
import { Reflector } from '../reflector';
import { ValidationError } from '../errors/validationError';
import { isNullOrUndefined } from 'util';
import {Const} from '../const';
import { IDynamoDbManager } from '../interfaces/iDynamodbManager';
import { Key } from '../Key';

export class ValidatedDynamoDbManager implements IDynamoDbManager
{
    get client(): DocumentClient
    {
        return this.manager.client;
    }

    constructor(private manager:DynamoDbManager)
    {
        
    }

    async put<T extends object>(type:{new(...args: any[]):T}, obj:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction, autoCommit:boolean = true): Promise<void>
    {
        validateType(type);
        validateObject(type, obj);
        validateObjectId(obj ? obj[Key.parse(Reflector.getIdKey(new type())).propertyName] : undefined);
        validateKeyConditionExpression(type, params);

        await this.manager.put(type, obj, params, transaction, autoCommit);
    }

    async getOne<T extends object>(type:{new(...args: any[]):T}, id:string|number): Promise<T>
    {
        validateType(type);
        validateObjectId(id);
        
        return await this.manager.getOne(type, id);
    }

    async find<T extends object>(type:{new(...args: any[]):T}, 
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, 
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:string})
                                 : Promise<{items:T[], lastEvaluatedKey: string, firstEvaluatedKey: string}>
    {
        validateType(type);
        validateKeyConditionExpression(type, keyParams);
        validateFilterConditionExpression(type, filterParams);

        return await this.manager.find(type, keyParams, filterParams, params);
    }

    async update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction, autoCommit:boolean = true)
    {
        validateType(type);
        validateObject(type, obj);
        validateObjectId(id);
        validateKeyConditionExpression(type, params);
        validateVersioning(type, params);

        await this.manager.update(type, id, obj, params, transaction, autoCommit);
    }

    async apply<T extends object>(type:{new(...args: any[]):T}, id:string|number, params:{updateExpression:{set?:string[], remove?:string[], add?:string[], delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction, autoCommit:boolean = true)
    {
        validateType(type);
        validateObjectId(id);
        validateUpdateExpression(type, params);
        validateVersioning(type, params);
        await this.manager.apply(type, id, params, transaction, autoCommit)
    }

    async delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction, autoCommit:boolean = true): Promise<void>
    {
        validateType(type);
        validateObjectId(id);
        validateDeleteConditionExpression(type, params);

        await this.manager.delete(type, id, params, transaction, autoCommit);
    }

    async createTable<T extends object>(type?:{new(...args: any[]):T}, params?:{onDemand?:boolean, readCapacityUnits?:number, writeCapacityUnits?:number}): Promise<void>
    {
        validateType(type);

        await this.manager.createTable(type, params);
    }

    async deleteTable<T extends object>(type?:{new(...args: any[]):T}): Promise<void>
    {
        validateType(type);
        
        await this.manager.deleteTable(type);
    }
}

function validateObjectId(id:string|number)
{
    if(id === undefined || id === null || (typeof id === 'number' && isNaN(id)))
    {
        throw new ValidationError(`Expected an ID of an object to have a value. Found '${id}'`);
    }

    if(typeof id !== 'string' && typeof id !== 'number')
    {
        throw new ValidationError(`Expected an ID of an object to be either a string or a number. Found '${typeof id}'`)
    }
}

function validateType<T extends object>(type:{new(...args: any[]):T})
{
    if(!(type instanceof Function))
    {
        throw new ValidationError(`Expected a class definition but found '${JSON.stringify(type)}'.  Try passing a class instead of '${typeof type}'`)
    }
    let instance = new type();
    if(Reflector.getTableName(instance) === '')
    {
        throw new ValidationError(`Undefined table.  Try adding @DBTable() to the type.`);
    }
    let idKey = Reflector.getIdKey(instance);
    if(idKey === undefined)
    {
        throw new ValidationError(`Undefined ID property. Try adding @DBColumn({id:true}) to one of its property to represent a unique object ID.`);
    }
    let idKeyPropertyName = Key.parse(idKey).propertyName;
    let hashKeys = Reflector.getAllHashKeys(instance);
    if(hashKeys.some(k => Key.parse(k).propertyName === idKeyPropertyName))
    {
        throw new ValidationError(`The property '${idKeyPropertyName}' cannot be both ID and Hash columns.`);
    }
}

function validateObject<T extends object>(type:{new(...args: any[]):T}, obj:object)
{
    if(obj === undefined)
    {
        throw new ValidationError(`Expected an object but found '${obj}'`);
    }

    let columns = Reflector.getColumns(new type());

    if(columns.length === 0)
    {
        throw new ValidationError('Undefined columns. Try adding @DBColumn() to one or more properties.');
    }
    if(columns.some(c => {
        let value = obj[Key.parse(c).propertyName];
        return typeof value === 'string' && (<string>value).startsWith('nodenamo')
    }))
    {
        throw new ValidationError(`A column value cannot be one of the reserved keywords: '${Const.DefaultHashValue}'`);
    }
}

function validateVersioning<T extends object>(type:{new(...args: any[]):T}, params: {versionCheck?:boolean})
{
    if(params === undefined) return;

    let instance = new type();
    
    if(Reflector.getTableVersioning(instance) === true && params.versionCheck === false)
    {
        throw new ValidationError('versionCeck couldn\'t be set to false because versioning is enabled for this table.');
    }
}

function validateKeyConditionExpression<T extends object>(type:{new(...args: any[]):T}, param:{keyConditions?:string, conditionExpression?:string, expressionAttributeNames?:object, expressionAttributeValues?:object})
{
    if(param === undefined) return;
    
    let instance = new type();
    let hashes = Reflector.getAllHashKeys(instance).map(hash => Key.parse(hash).propertyName);
    let ranges = Reflector.getAllRangeKeys(instance).map(range => Key.parse(range).propertyName);
    let columns = Reflector.getColumns(instance).map(column => Key.parse(column).propertyName);

    hashes = [...hashes, Const.HashColumn];
    ranges = [...ranges, Const.RangeColumn];
    columns = [...columns, Const.HashColumn, Const.RangeColumn, Const.IdColumn];

    //conditionExpression
    if('conditionExpression' in param)
    {
        if(param.conditionExpression === undefined || param.conditionExpression.trim().length === 0)
        {
            throw new ValidationError(`ConditionExpression is not specified in ${JSON.stringify(param)}`);
        }
    }

    //keyConditions
    if('keyConditions' in param)
    {
        if(param.keyConditions === undefined || param.keyConditions.trim().length === 0)
        {
            throw new ValidationError(`KeyConditions is not specified in ${JSON.stringify(param)}`);
        }
    }


    let hasHash = false;
    let hasRange = false;

    //expressionAttributeNames
    if(param.expressionAttributeNames)
    {
        for(let columnName of Object.values(param.expressionAttributeNames))
        {
            if(!columns.includes(columnName))
            {
                throw new ValidationError(`The property '${columnName}' specified in ExpressionAttributeNames is not a column.`);
            }

            if(!hasHash) hasHash = hashes.includes(columnName);
            if(!hasRange) hasRange = ranges.includes(columnName);

            if(!hashes.includes(columnName) && !ranges.includes(columnName))
            {
                throw new ValidationError(`The regular property '${columnName}' could not be used. A hash or a range property is expected.`);
            }
        }
            
        if(!hasHash && hasRange)
        {
            throw new ValidationError('The operation could not be executed because a range value is given but its hash value is undefined.');
        }
    }

    //expressionAttributeValues
    if(param.expressionAttributeValues)
    {
        for(let key of Object.keys(param.expressionAttributeValues))
        {
            let value = param.expressionAttributeValues[key];

            if(isNullOrUndefined(value) || (typeof value === 'number' && isNaN(value)))
            {
                throw new ValidationError(`Invalid value of '${key}'.  Expected a value but found '${value}'`);
            }
        }
    }
}

function validateDeleteConditionExpression<T extends object>(type:{new(...args: any[]):T}, param:{conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
{
    if(param === undefined) return;
    
    let instance = new type();
    let hashes = Reflector.getAllHashKeys(instance).map(hash => Key.parse(hash).propertyName);
    let ranges = Reflector.getAllRangeKeys(instance).map(range => Key.parse(range).propertyName);
    let columns = Reflector.getColumns(instance).map(column => Key.parse(column).propertyName);
    
    //Add hash/rane/id column here because expressionAttributeNames may include one of those from keyConditions expression.
    columns = [...columns, Const.HashColumn, Const.RangeColumn, Const.IdColumn];

    //filterExpression
    if(param.conditionExpression === undefined || param.conditionExpression.trim().length === 0)
    {
        throw new ValidationError(`ConditionExpression is not specified in ${JSON.stringify(param)}`);
    }

    //expressionAttributeNames
    if(param.expressionAttributeNames)
    {
        for(let columnName of Object.values(param.expressionAttributeNames))
        {
            if(!columns.includes(columnName))
            {
                throw new ValidationError(`The property '${columnName}' specified in ExpressionAttributeNames is not a column.`);
            }

            if(hashes.includes(columnName))
            {
                throw new ValidationError(`The hash property '${columnName}' could not be used in a filter expression. Try using it in a keyConditions expression instead.`);
            }

            if(ranges.includes(columnName))
            {
                throw new ValidationError(`The hash property '${columnName}' could not be used in a filter expression. Try using it in a keyConditions expression instead.`);
            }
        }
    }

    //expressionAttributeValues
    if(param.expressionAttributeValues)
    {
        for(let key of Object.keys(param.expressionAttributeValues))
        {
            let value = param.expressionAttributeValues[key];

            if(isNullOrUndefined(value) || (typeof value === 'number' && isNaN(value)))
            {
                throw new ValidationError(`Invalid value of '${key}'.  Expected a value but found '${value}'`);
            }
        }
    }
}

function validateFilterConditionExpression<T extends object>(type:{new(...args: any[]):T}, param:{filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
{
    if(param === undefined) return;
    
    let instance = new type();
    let hashes = Reflector.getAllHashKeys(instance).map(hash => Key.parse(hash).propertyName);
    let ranges = Reflector.getAllRangeKeys(instance).map(range => Key.parse(range).propertyName);
    let columns = Reflector.getColumns(instance).map(column => Key.parse(column).propertyName);
    
    //Add hash/rane/id column here because expressionAttributeNames may include one of those from keyConditions expression.
    columns = [...columns, Const.HashColumn, Const.RangeColumn, Const.IdColumn];

    //filterExpression
    if(param.filterExpression === undefined || param.filterExpression.trim().length === 0)
    {
        throw new ValidationError(`FilterExpression is not specified in ${JSON.stringify(param)}`);
    }

    //expressionAttributeNames
    if(param.expressionAttributeNames)
    {
        for(let columnName of Object.values(param.expressionAttributeNames))
        {
            if(!columns.includes(columnName))
            {
                throw new ValidationError(`The property '${columnName}' specified in ExpressionAttributeNames is not a column.`);
            }

            if(hashes.includes(columnName))
            {
                throw new ValidationError(`The hash property '${columnName}' could not be used in a filter expression. Try using it in a keyConditions expression instead.`);
            }

            if(ranges.includes(columnName))
            {
                throw new ValidationError(`The hash property '${columnName}' could not be used in a filter expression. Try using it in a keyConditions expression instead.`);
            }
        }
    }

    //expressionAttributeValues
    if(param.expressionAttributeValues)
    {
        for(let key of Object.keys(param.expressionAttributeValues))
        {
            let value = param.expressionAttributeValues[key];

            if(isNullOrUndefined(value) || (typeof value === 'number' && isNaN(value)))
            {
                throw new ValidationError(`Invalid value of '${key}'.  Expected a value but found '${value}'`);
            }
        }
    }
}

function validateUpdateExpression<T extends object>(type:{new(...args: any[]):T}, param:{updateExpression:{set?:string[],remove?:string[],add?:string[],delete?:string[]}, conditionExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object})
{
    if(param === undefined)
    {
        throw new ValidationError('updateExpression is undefined.');
    }
    
    let instance = new type();
    let hashes = Reflector.getAllHashKeys(instance).map(hash => Key.parse(hash).propertyName);
    let ranges = Reflector.getAllRangeKeys(instance).map(range => Key.parse(range).propertyName);
    let columns = Reflector.getColumns(instance).map(column => Key.parse(column).propertyName);
    
    //Add hash/rane/id column here because expressionAttributeNames may include one of those from keyConditions expression.
    columns = [...columns, Const.HashColumn, Const.RangeColumn, Const.IdColumn];

    //updateExpression
    if( param.updateExpression === undefined 
        || 
        (
            (!param.updateExpression.set || param.updateExpression.set.length === 0)
             && 
            (!param.updateExpression.delete || param.updateExpression.delete.length === 0)
             && 
            (!param.updateExpression.add || param.updateExpression.add.length === 0)
             && 
            (!param.updateExpression.remove || param.updateExpression.remove.length === 0)))
    {
        throw new ValidationError(`updateExpression is not specified in ${JSON.stringify(param)}`);
    }

    //expressionAttributeNames
    if(param.expressionAttributeNames)
    {
        for(let attributeName of Object.keys(param.expressionAttributeNames))
        {
            let columnName = param.expressionAttributeNames[attributeName];

            if(!columns.includes(columnName))
            {
                throw new ValidationError(`The property '${columnName}' specified in ExpressionAttributeNames is not a column.`);
            }

            if(hashes.includes(columnName))
            {
                if(JSON.stringify(param.updateExpression).includes(attributeName))
                {
                    throw new ValidationError(`The hash property '${columnName}' could not be used in an update expression. Use NodeNamo.update() instead.`);
                }
            }

            if(ranges.includes(columnName))
            {
                if(JSON.stringify(param.updateExpression).includes(attributeName))
                {
                    throw new ValidationError(`The hash property '${columnName}' could not be used in an update expression. Use NodeNamo.update() instead.`);
                }
            }
        }
    }

    //expressionAttributeValues
    if(param.expressionAttributeValues)
    {
        for(let key of Object.keys(param.expressionAttributeValues))
        {
            let value = param.expressionAttributeValues[key];

            if(isNullOrUndefined(value) || (typeof value === 'number' && isNaN(value)))
            {
                throw new ValidationError(`Invalid value of '${key}'.  Expected a value but found '${value}'`);
            }
        }
    }
}