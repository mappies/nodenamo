import "reflect-metadata";
import Const from './const';

export function DBTable(params:{name?: string, dataPrefix?:string} = {}) 
{
    return function(constructor:any): any
    {
        return function (...args:any[]): any {
            let instance = new constructor(...args);
            Reflect.defineMetadata(Const.DBTable, params.name || constructor.name, instance);
            Reflect.defineMetadata(Const.DataPrefix, (params.dataPrefix || constructor.name).toLowerCase(), instance);
            return instance;
        }
    };
};