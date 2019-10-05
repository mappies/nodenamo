import {Const} from './const';
import { Key } from './Key';

export class Representation
{

    constructor(public tableName?:string, public hash?:any, public range?:any, public objId?:string, public data?:any)
    {

    }

    static create(tableName:string, dataPrefix:string = '', hash:any, range:any, id:string, originalData:object): Representation[]
    {
        let rangeValues = [];

        if(range === undefined)
        {
            //Do nothing
        }
        if(Array.isArray(originalData[Key.parse(range).propertyName]))
        {
            rangeValues = originalData[Key.parse(range).propertyName];
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
            result.push(createRepresentation(tableName, dataPrefix, hash, rangeValue, id, originalData));
        }

        return result;
    }
};



function createRepresentation(tableName: string, dataPrefix:string = '', hash:any, rangeValue:any, id:string, originalData:object): Representation
{
    let result = new Representation(tableName);

    result.data = Object.assign({}, originalData);

    result.objId = addDataPrefix(dataPrefix, getPropertyValue(result.data, id));
    
    if(hash === Const.IdUniquenessHash)
    {
        result.hash = addDataPrefix(dataPrefix,  getPropertyValue(result.data, id));
    }
    else if(hash)
    {
        result.hash = addDataPrefix(dataPrefix, getPropertyValue(result.data, hash))
    }
    else
    {
        result.hash = addDataPrefix(dataPrefix, Const.DefaultHashValue);
    }

    if(rangeValue === undefined)
    {
        result.range = `${Const.DefaultRangeValue}#${getPropertyValue(result.data, id)}`
    }
    else if((rangeValue === Const.IdUniquenessRange))
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