import "reflect-metadata";
import {Const} from "./const";

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

function addMetadataAsObject(key:any, name:string, hash:any, range:any, target:object)
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

export class Reflector
{
    static getTableName(obj:object): string
    {
        return Reflect.getMetadata(Const.DBTable, obj) || '';
    }

    static setTableName(obj:object, tableName:string): void
    {
        Reflect.defineMetadata(Const.DBTable, tableName, obj);
    }

    static getColumns(obj:object): string[]
    {
        return Reflect.getMetadata(Const.DBColumn, obj) || [];
    }

    static addColumn(obj:object, column:string): void
    {
        appendMetadataAsArray(Const.DBColumn, column, obj);
    }

    static getHashKeys(obj:object): string[]
    {
        return Reflect.getMetadata(Const.HashKey, obj) || [];
    }
    
    static addHashKey(obj:object, key:string): void
    {
        appendMetadataAsArray(Const.HashKey, key, obj);
    }

    static getRangeKeys(obj:object): string[]
    {
        return Reflect.getMetadata(Const.RangeKey, obj) || [];
    }

    static addRangeKey(obj:object, key:string): void
    {
        appendMetadataAsArray(Const.RangeKey, key, obj);
    }

    static getHashRangeKeyPairs(obj:object): object
    {
        return Reflect.getMetadata(Const.HashRangeKey, obj) || {};
    }

    static setHashRangeKeyParis(obj:object, name:string, hash:string, range:string): void
    {
        addMetadataAsObject(Const.HashRangeKey, name, hash, range, obj);
    }

    static getIdKey(obj:object): string
    {
        return Reflect.getMetadata(Const.IdKey, obj) || undefined;
    }

    static setIdKey(obj:object, key:string): void
    {
        Reflect.defineMetadata(Const.IdKey, key, obj);
    }

    static getDataPrefix(obj:object): string
    {
        return Reflect.getMetadata(Const.DataPrefix, obj) || '';
    }

    static setDataPrefix(obj:object, prefix:string): void
    {
        Reflect.defineMetadata(Const.DataPrefix, prefix, obj);
    }
}