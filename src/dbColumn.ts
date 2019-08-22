import { Reflector } from "./reflector";

export function DBColumn(params:{id?:boolean, name?:string, hash?:boolean|string, range?:boolean|string} = {}) 
{
    return function(target: Object, propertyName: string): void
    {
        let value = params.name || propertyName;
        
        if(params.name)
        {
            value = `${value}#${propertyName}`;
        }

        Reflector.addColumn(target, value);

        if(params.id)
        {
            Reflector.setIdKey(target, value);
        }

        if(params.hash)
        {
            if(params.hash === true)
            {
                Reflector.addHashKey(target, value);
            }
            else
            {
                Reflector.setHashRangeKeyParis(target, params.hash, value, undefined);
            }
        }

        if(params.range)
        {
            if(params.range === true)
            {
                Reflector.addRangeKey(target, value);
            }
            else
            {
                Reflector.setHashRangeKeyParis(target, params.range, undefined, value);
            }
        }
    }
}
