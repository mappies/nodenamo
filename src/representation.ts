import {Const} from './const';
import { Key } from './Key';

export class Representation
{

    constructor(public tableName?:string, public hash?:any, public range?:any, public objId?:string, public data?:any)
    {

    }

    static create(tableName:string, dataPrefix:string = '', hash:any, range:any, id:string, originalData:object): Representation[]
    {
        let hashValues = [];
        
        if(Array.isArray(originalData[Key.parse(hash).targetName]))
        {
            hashValues = originalData[Key.parse(hash).targetName].map(propertyValue => addDataPrefix(dataPrefix, propertyValue));
        }
        else if(hash === Const.IdUniquenessHash)
        {
            hashValues = [addDataPrefix(dataPrefix,  getPropertyValue(originalData, id))];
        }
        else if(hash)
        {
            hashValues = [addDataPrefix(dataPrefix, getPropertyValue(originalData, hash))];
        }
        else
        {
            hashValues = [addDataPrefix(dataPrefix, Const.DefaultHashValue)];
        }
    
        let result:Representation[] = [];
    
        for(let hashValue of hashValues)
        {
            result = result.concat(createRepresentationForHash(tableName, dataPrefix, hash, hashValue, range, id, originalData));
        }
    
        return result;
    }
};

function createRepresentationForHash(tableName:string, dataPrefix:string = '', hash:any, hashValue:any, range:any, id:string, originalData:object): Representation[]
{
    let rangeValues = [];
    
    if(Array.isArray(originalData[Key.parse(range).targetName]))
    {
        rangeValues = originalData[Key.parse(range).targetName];
    }
    else if(range === Const.IdUniquenessRange)
    {
        rangeValues = [Const.IdUniquenessRange];
    }
    else
    {
        rangeValues = [getPropertyValue(originalData, range)];
    }

    let result:Representation[] = [];

    for(let rangeValue of rangeValues)
    {
        result.push(createRepresentationForHashRange(tableName, dataPrefix, hash, hashValue, rangeValue, id, originalData));
    }

    return result;
}



function createRepresentationForHashRange(tableName: string, dataPrefix:string = '', hash:any, hashValue:any, rangeValue:any, id:string, originalData:object): Representation
{
    let result = new Representation(tableName);

    result.data = Object.assign({}, originalData);

    result.objId = addDataPrefix(dataPrefix, getPropertyValue(result.data, id));
    result.hash = hashValue;

    if(hash === undefined && rangeValue === undefined)
    {
        result.range = `${Const.DefaultRangeValue}#${getPropertyValue(result.data, id)}`
    }
    else if((hash !== undefined && rangeValue === undefined) || (rangeValue === Const.IdUniquenessRange))
    {
        result.range = `${Const.DefaultRangeValue}`;
    }
    else
    {
        if(hash === undefined)
        {
            result.range = `${rangeValue}#${getPropertyValue(result.data, id)}`;
        }
        else
        {
            result.range = rangeValue;
        }
    }

    if(typeof result.range === 'number')
    {
        result.range = String(result.range);
    }

    result.data[Const.IdColumn] = result.objId = result.objId === undefined ? undefined : String(result.objId);
    result.data[Const.HashColumn] = result.hash = result.hash === undefined ? undefined : String(result.hash);
    result.data[Const.RangeColumn] = result.range = result.range === undefined ? undefined : String(result.range);
    
    return result;
}

function getPropertyValue(d:any, properyNameOrNames:string|string[]) : any
{
    if(properyNameOrNames === undefined) return undefined;

    let propertyNames = Array.isArray(properyNameOrNames) ? properyNameOrNames : [properyNameOrNames];

    let propertyValues:any[] = [];

    for(let propertyName of propertyNames)
    {
        //A custom column name uses `targetName#originalName` format.
        let key = Key.parse(propertyName);
        let value = d[key.targetName];
        
        propertyValues.push(value);
    }

    if(propertyValues.length === 0) return undefined
    if(propertyValues.length === 1) return propertyValues[0];

    return propertyValues.join('#');
}

function addDataPrefix(prefix:string, value:any):any
{
    if(value === undefined) return undefined;

    return prefix ? `${prefix}#${value}` : value;
}