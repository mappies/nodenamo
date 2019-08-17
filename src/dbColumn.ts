import "reflect-metadata";
import Const from './const';

function appendMetadataAsArray(key:any, value:any, target:object)
{
    let values = [];

    if(Reflect.hasMetadata(key, target))
    {
        values = Reflect.getMetadata(key, target);
    }

    values.push(value);

    Reflect.defineMetadata(key, values, target);
}

function addHashRangeKeyPairMetadata(key:any, name:string, hash:any, range:any, target:object)
{
    let obj:any = {};

    if(Reflect.hasMetadata(key, target))
    {
        obj = Reflect.getMetadata(key, target);
    }

    if(name in obj)
    {
        if(hash) obj[name].hashes.push(hash);
        if(range) obj[name].ranges.push(range);
    }
    else
    {
        if(hash) obj[name] = {hashes: [hash], ranges: []};
        if(range) obj[name] = {hashes: [], ranges: [range]};
    }
    
    Reflect.defineMetadata(key, obj, target);
}

export function DBColumn(params:{id?:boolean, name?:string, hash?:boolean|string, range?:boolean|string} = {}) 
{
    return function(target: Object, propertyName: string): void
    {
        let value = params.name || propertyName;
        
        if(params.name)
        {
            value = `${value}#${propertyName}`;
        }

        appendMetadataAsArray(Const.DBColumn, value, target);

        if(params.id)
        {
            Reflect.defineMetadata(Const.IdKey, value, target);
        }

        if(params.hash)
        {
            if(params.hash === true)
            {
                appendMetadataAsArray(Const.HashKey, value, target);
            }
            else
            {
                addHashRangeKeyPairMetadata(Const.HashRangeKey, params.hash, value, undefined, target);
            }
        }

        if(params.range)
        {
            if(params.range === true)
            {
                appendMetadataAsArray(Const.RangeKey, value, target);
            }
            else
            {
                addHashRangeKeyPairMetadata(Const.HashRangeKey, params.range, undefined, value, target);
            }
        }
    }
}
