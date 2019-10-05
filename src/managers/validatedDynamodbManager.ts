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
    constructor(private manager:DynamoDbManager)
    {
        
    }

    async put<T extends object>(type:{new(...args: any[]):T}, object:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>
    {
        validateType(type);
        validateKeyConditionExpression(type, params);

        await this.manager.put(type, object, params);
    }

    async getOne<T extends object>(type:{new(...args: any[]):T}, id:string|number): Promise<T>
    {
        validateType(type);
        
        return await this.manager.getOne(type, id);
    }

    async find<T extends object>(type:{new(...args: any[]):T}, 
                                 keyParams?:{keyConditions:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, 
                                 filterParams?: {filterExpression?:string, expressionAttributeValues?:object, expressionAttributeNames?:object},
                                 params?:{limit?:number, indexName?:string,order?:number,exclusiveStartKey?:DocumentClient.Key})
                                 : Promise<{items:T[], lastEvaluatedKey: DocumentClient.Key}>
    {
        validateType(type);
        validateKeyConditionExpression(type, keyParams);
        validateFilterConditionExpression(type, filterParams);

        return await this.manager.find(type, keyParams, filterParams, params);
    }

    async update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean}, transaction?:DynamoDbTransaction)
    {
        validateType(type);
        validateKeyConditionExpression(type, params);
        validateVersioning(type, params);

        await this.manager.update(type, id, obj, params);
    }


    async delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  params?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>
    {
        validateType(type);
        validateKeyConditionExpression(type, params);

        await this.manager.delete(type, id, params);
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
    if(Reflector.getIdKey(instance) === undefined)
    {
        throw new ValidationError(`Undefined ID property. Try adding @DBColumn({id:true}) to one of its property to represent a unique object ID.`);
    }
}

function validateVersioning<T extends object>(type:{new(...args: any[]):T}, params: {conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object, versionCheck?:boolean})
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
    let hashes = Reflector.getHashKeys(instance).map(hash => Key.parse(hash).propertyName);
    let ranges = Reflector.getRangeKeys(instance).map(range => Key.parse(range).propertyName);
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

    //expressionAttributeNames
    if(param.expressionAttributeNames)
    {
        for(let columnName of Object.values(param.expressionAttributeNames))
        {
            if(!columns.includes(columnName))
            {
                throw new ValidationError(`The property '${columnName}' specified in ExpressionAttributeNames is not a column.`);
            }

            if(!hashes.includes(columnName) && !ranges.includes(columnName))
            {
                throw new ValidationError(`The regular property '${columnName}' could not be used. A hash or a range property is expected.`);
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
    let hashes = Reflector.getHashKeys(instance).map(hash => Key.parse(hash).propertyName);
    let ranges = Reflector.getRangeKeys(instance).map(range => Key.parse(range).propertyName);
    let columns = Reflector.getColumns(instance).map(column => Key.parse(column).propertyName);

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