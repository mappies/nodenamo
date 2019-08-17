import "reflect-metadata";
import Const from "./const";

export class Reflector
{
    getTableName(obj:object): string
    {
        return Reflect.getMetadata(Const.DBTable, obj) || '';
    }

    getColumns(obj:object): string[]
    {
        return Reflect.getMetadata(Const.DBColumn, obj) || [];
    }

    getHashKeys(obj:object): string[]
    {
        return Reflect.getMetadata(Const.HashKey, obj) || [];
    }

    getRangeKeys(obj:object): string[]
    {
        return Reflect.getMetadata(Const.RangeKey, obj) || [];
    }

    getHashRangeKeyPairs(obj:object): object
    {
        return Reflect.getMetadata(Const.HashRangeKey, obj) || {};
    }

    getIdKey(obj:object): string
    {
        return Reflect.getMetadata(Const.IdKey, obj) || '';
    }

    getDataPrefix(obj:object): string
    {
        return Reflect.getMetadata(Const.DataPrefix, obj) || '';
    }
}