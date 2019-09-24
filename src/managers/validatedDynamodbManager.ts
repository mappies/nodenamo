import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDbTransaction } from './dynamodbTransaction';
import { DynamoDbManager } from './dynamodbManager';
import { Reflector } from '../reflector';
import { ValidationError } from '../errors/validationError';
import { isNullOrUndefined } from 'util';
import Const from '../const';

export class ValidatedDynamoDbManager
{
    constructor(private manager:DynamoDbManager)
    {
        
    }

    async put<T extends object>(type:{new(...args: any[]):T}, object:object, param?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>
    {
        validateType(type);
        validateConditionExpression(type, param);

        await this.manager.put(type, object, param);
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
        return await this.manager.find(type, keyParams, filterParams, params);
    }

    async update<T extends object>(type:{new(...args: any[]):T}, id:string|number, obj:object, param?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction)
    {
        validateType(type);
        validateConditionExpression(type, param);
        validateImmutableProperties(type, obj);

        await this.manager.update(type, id, obj, param);
    }


    async delete<T extends object>(type:{new(...args: any[]):T}, id:string|number,  param?:{conditionExpression:string, expressionAttributeValues?:object, expressionAttributeNames?:object}, transaction?:DynamoDbTransaction): Promise<void>
    {
        validateType(type);
        validateConditionExpression(type, param);

        await this.manager.delete(type, id, param);
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
    if(Reflector.getHashKeys(instance).length === 0)
    {
        throw new ValidationError(`Undefined Hash property. Try adding @DBColumn({hash:true}) to one of its property to represent a partition key for the object.`);
    }
}

function validateConditionExpression<T extends object>(type:{new(...args: any[]):T}, param:{conditionExpression?:string, expressionAttributeNames?:object, expressionAttributeValues?:object})
{
    if(param === undefined) return;
    
    let instance = new type();
    let hashes = Reflector.getHashKeys(instance).map(hash => hash.includes('#') ? hash.split('#')[1] : hash);
    let ranges = Reflector.getRangeKeys(instance).map(range => range.includes('#') ? range.split('#')[1] : range);

    //conditionExpression
    if(param.conditionExpression === undefined || param.conditionExpression.trim().length === 0)
    {
        throw new ValidationError(`ConditionExpression is not specified in ${JSON.stringify(param)}`);
    }

    //expressionAttributeNames
    if(param.expressionAttributeNames)
    {
        for(let columnName of Object.values(param.expressionAttributeNames))
        {
            if(!hashes.includes(columnName) && !ranges.includes(columnName))
            {
                throw new ValidationError(`The property '${columnName}' specified in ExpressionAttributeNames does not exists.`);
            }
        }
    }

    //expressionAttributeValues
    if(param.expressionAttributeValues)
    {
        for(let key of Object.keys(param.expressionAttributeValues))
        {
            let value = param.expressionAttributeValues[key];

            if(isNullOrUndefined(value) || isNaN(value))
            {
                throw new ValidationError(`Invalid value of '${key}'.  Expected a value but found '${value}'`);
            }
        }
    }
}

function validateImmutableProperties<T extends object>(type:{new(...args: any[]):T}, obj:object)
{
    let idProperty = Reflector.getIdKey(new type());

    let immutableProperties = [Const.IdColumn.toLowerCase()];
    
    //customName#propertyname
    if(idProperty.includes('#'))
    {
        immutableProperties = immutableProperties.concat(idProperty.split('#').map(p => p.toLowerCase()));
    }
    else
    {
        immutableProperties.push(idProperty);
    }

    for(let propertyName of Object.keys(obj))
    {
        if(immutableProperties.includes(propertyName.toLowerCase()))
        {
            throw new ValidationError(`Immutable property '${propertyName}' could not be updated.`);
        }
    }
}