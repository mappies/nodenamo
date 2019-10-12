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

    static getTableVersioning(obj:object): boolean
    {
        return Reflect.getMetadata(Const.TableVersioning, obj) || false;
    }

    static setTableVersioning(obj:object, version:boolean): void
    {
        Reflect.defineMetadata(Const.TableVersioning, version, obj);
    }

    static getColumns(obj:object): string[]
    {
        return Reflect.getMetadata(Const.DBColumn, obj) || [];
    }

    static addColumn(obj:object, column:string): void
    {
        appendMetadataAsArray(Const.DBColumn, column, obj);
    }

    static getAllHashKeys(obj:object): string[]
    {
        let result = Reflector.getHashKeys(obj);

        let pairs = Object.values(Reflector.getHashRangeKeyPairs(obj));

        for(let pair of pairs)
        {
            result = result.concat(pair.hashes);
        }

        return result;
    }

    static getAllRangeKeys(obj:object): string[]
    {
        let result = Reflector.getRangeKeys(obj);

        let pairs = Object.values(Reflector.getHashRangeKeyPairs(obj));

        for(let pair of pairs)
        {
            result = result.concat(pair.ranges);
        }

        return result;
    }

    /**
     * Get a list of generic hash keys.  A generic hash key is a property with @DBColumn({hash:true})
     * This method does not return hash keys from a hash-range pair (those with @DBColumn({hash:string})
     * Use Reflector.getAllHashKeys() to get all hash keys.
     */
    static getHashKeys(obj:object): string[]
    {
        return Reflect.getMetadata(Const.HashKey, obj) || [];
    }
    
    static addHashKey(obj:object, key:string): void
    {
        appendMetadataAsArray(Const.HashKey, key, obj);
    }

    /**
     * Get a list of generic range keys.  A generic range key is a property with @DBColumn({range:true})
     * This method does not return range keys from a hash-range pair (those with @DBColumn({range:string})
     * Use Reflector.getAllRangeKeys() to get all range keys.
     */
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

    static getObjectVersion(obj:object): number
    {
        return Reflect.getMetadata(Const.ObjectVersion, obj) || 0;
    }

    static setObjectVersion(obj:object, version:number): void
    {
        Reflect.defineMetadata(Const.ObjectVersion, version, obj);
    }

    static incrementVersion(obj:object): void
    {
        let version = Reflector.getObjectVersion(obj);
        Reflector.setObjectVersion(obj, version+1);
    }
}