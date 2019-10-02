import { Reflector } from './reflector';

export function DBTable(params:{name?: string, dataPrefix?:string, versioning?:boolean} = {}) 
{
    return function(constructor:any): any
    {
        return function (...args:any[]): any {
            let instance = new constructor(...args);
            Reflector.setTableName(instance, params.name || constructor.name);
            Reflector.setDataPrefix(instance, (params.dataPrefix || constructor.name).toLowerCase());
            Reflector.setTableVersioning(instance, params.versioning);
            return instance;
        }
    };
};