import { IDynamoDbManager } from "../../interfaces/iDynamodbManager";
import { Reflector } from '../../reflector';
import { Key } from "../../Key";

export class Execute
{
    constructor(private manager:IDynamoDbManager,
                private type:{new(...args: any[])})
    {

    }

    async execute<T extends object>(): Promise<object>
    {
        let obj = new this.type();
        let tableName = Reflector.getTableName(obj);
        let hashKeys = Reflector.getHashKeys(obj);
        let rangeKeys = Reflector.getRangeKeys(obj);
        let hashRangeKeyPairs = Reflector.getHashRangeKeyPairs(obj);
        let columns = Reflector.getColumns(obj);
        let idKey = Reflector.getIdKey(obj);
        let dataPrefix = Reflector.getDataPrefix(obj);

        let result:any = {
            table: tableName,
            dataPrefix: dataPrefix,
            properties: []
        };
        
        for(let column of columns)
        {
            let key = Key.parse(column);
            let propertyName = key.propertyName;

            let property = {
                name: propertyName
            }

            if(propertyName === idKey)
            {
                property['id'] = true;
            }

            if(hashKeys.includes(propertyName))
            {
                property['hash'] = true;
            }

            if(rangeKeys.includes(propertyName))
            {
                property['range'] = true;
            }

            for(let hashRangeKeyPairName of Object.keys(hashRangeKeyPairs))
            {
                let hashRangeKeyPair = hashRangeKeyPairs[hashRangeKeyPairName];

                if(hashRangeKeyPair.hashes.includes(propertyName))
                {
                    property['range'] = hashRangeKeyPairName;
                }
                
                if(hashRangeKeyPair.ranges.includes(propertyName))
                {
                    property['range'] = hashRangeKeyPairName;
                }
            }

            result['properties'].push(property)
        }

        return result;
    }
}
