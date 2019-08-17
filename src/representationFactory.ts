import { Reflector } from "./reflector";
import { Representation } from "./representation";
import Const from './const';

const reflector = new Reflector();

export class RepresentationFactory
{
    static get(obj:any): Representation[]
    {
        let tableName = reflector.getTableName(obj);
        let hashKeys = reflector.getHashKeys(obj);
        let rangeKeys = reflector.getRangeKeys(obj);
        let hashRangeKeyPairs = reflector.getHashRangeKeyPairs(obj);
        let columns = reflector.getColumns(obj);
        let idKey = reflector.getIdKey(obj);
        let dataPrefix = reflector.getDataPrefix(obj);

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
                representations.push(new Representation(tableName, dataPrefix, hashKey, undefined, idKey, data));
            }
            else
            {
                for(let rangeKey of rangeKeys)
                {
                    representations.push(new Representation(tableName, dataPrefix, hashKey, rangeKey, idKey, data));
                }
            }
        }

        for(let hashRangeKeyPair of Object.values(hashRangeKeyPairs))
        {
            representations.push(new Representation(tableName, dataPrefix, hashRangeKeyPair.hashes, hashRangeKeyPair.ranges, idKey, data));
        }

        return representations;
    }
};