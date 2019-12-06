import { Reflector } from "./reflector";
import { Representation } from "./representation";
import {Const} from "./const";
import { Key } from "./Key";

export class RepresentationFactory
{
    static replaceEmptyString(obj:object, propertyName?:string)
    {
        if(!propertyName)
        {
            let copy = Object.assign({}, obj);

            for(let key of Object.keys(copy))
            {
                copy[key] = RepresentationFactory.replaceEmptyString(copy, key);
            }

            return copy;
        }
        else if(obj[propertyName] === '')
        {
            return Const.EmptyString;

        }
        else if(typeof obj[propertyName] === 'object' && !Array.isArray(obj[propertyName]))
        {
            return this.replaceEmptyString(obj[propertyName]);
        }
        return obj[propertyName];
    }

    static get(obj:any): Representation[]
    {
        let tableName = Reflector.getTableName(obj);
        let hashKeys = Reflector.getHashKeys(obj);
        let rangeKeys = Reflector.getRangeKeys(obj);
        let hashRangeKeyPairs = Reflector.getHashRangeKeyPairs(obj);
        let columns = Reflector.getColumns(obj);
        let idKey = Reflector.getIdKey(obj);
        let dataPrefix = Reflector.getDataPrefix(obj);
        let version = Reflector.getObjectVersion(obj) || obj[Const.VersionColumn] || 0;
        let data:any = {};
        for(let column of columns)
        {
            //A custom column name uses `targetName#originalName` format.
            let key = Key.parse(column);
            data[key.targetName] = obj[key.propertyName];
        }

        data = this.replaceEmptyString(data);

        data[Const.VersionColumn] = version + 1;

        let representations:Representation[] = [];

        //For ID uniqueness
        Array.prototype.push.apply(representations, Representation.create(tableName, dataPrefix, Const.IdUniquenessHash, Const.IdUniquenessRange, idKey, data));

        for(let hashKey of hashKeys)
        {
            if(rangeKeys.length === 0)
            {
                Array.prototype.push.apply(representations, Representation.create(tableName, dataPrefix, hashKey, undefined, idKey, data));
            }
            else
            {
                for(let rangeKey of rangeKeys)
                {
                    Array.prototype.push.apply(representations, Representation.create(tableName, dataPrefix, hashKey, rangeKey, idKey, data));
                }
            }
        }

        for(let hashRangeKeyPair of Object.values(hashRangeKeyPairs))
        {
            Array.prototype.push.apply(representations, Representation.create(tableName, dataPrefix, hashRangeKeyPair.hashes, hashRangeKeyPair.ranges, idKey, data));
        }

        //For listing
        if(rangeKeys.length === 0)
        {
            Array.prototype.push.apply(representations, Representation.create(tableName, dataPrefix, undefined, undefined, idKey, data));
        }
        else 
        {
            for(let rangeKey of rangeKeys)
            {
                Array.prototype.push.apply(representations, Representation.create(tableName, dataPrefix, undefined, rangeKey, idKey, data));
            }
        }

        return representations;
    }
};