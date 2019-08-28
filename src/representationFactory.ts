import { Reflector } from "./reflector";
import { Representation } from "./representation";
import Const from "./const";

export class RepresentationFactory
{
    static get(obj:any): Representation[]
    {
        let tableName = Reflector.getTableName(obj);
        let hashKeys = Reflector.getHashKeys(obj);
        let rangeKeys = Reflector.getRangeKeys(obj);
        let hashRangeKeyPairs = Reflector.getHashRangeKeyPairs(obj);
        let columns = Reflector.getColumns(obj);
        let idKey = Reflector.getIdKey(obj);
        let dataPrefix = Reflector.getDataPrefix(obj);

        let data:any = {};
        for(let column of columns)
        {
            //A custom column name uses `customName#originalName` format.
            let propertyName = column.includes('#') ? column.split('#')[0] : column;
            let propertyOriginalName = column.includes('#') ? column.split('#')[1] : column;
            data[propertyName] = obj[propertyOriginalName];
        }

        let representations:Representation[] = [];

        for(let hashKey of hashKeys)
        {
            if(rangeKeys.length === 0)
            {
                representations.push(new Representation(tableName, dataPrefix, hashKey, undefined, data));
            }
            else
            {
                for(let rangeKey of rangeKeys)
                {
                    representations.push(new Representation(tableName, dataPrefix, hashKey, rangeKey, data));
                }
            }
        }

        for(let hashRangeKeyPair of Object.values(hashRangeKeyPairs))
        {
            representations.push(new Representation(tableName, dataPrefix, hashRangeKeyPair.hashes, hashRangeKeyPair.ranges, data));
        }

        if(idKey !== undefined && idKey !== '' && !hashKeys.includes(idKey))
        {
            representations.push(new Representation(tableName, dataPrefix, idKey, Const.NodeNamo, data));
        }

        return representations;
    }
};