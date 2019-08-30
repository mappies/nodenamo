import Const from "./const";
import { Reflector } from './reflector';

const excludedColumns = [<string>Const.HashColumn, <string>Const.RangeColumn, <string>Const.IdColumn];

export class EntityFactory
{
    static create<T>(type:{new(...args: any[]):T}, data:any):T
    {
        let result:any = new type();

        //Get column names mapping 
        let columnNames:any = getColumnNameMapping(result);

        //Get data prefix
        let dataPrefix = Reflector.getDataPrefix(result);

        for(let property of Object.keys(data))
        {
            if(excludedColumns.includes(property)) continue;

            let descriptor = getPropertyDescriptor(result, property);

            if(!descriptor)
            {
                //It is a regular property.
                result[columnNames[property]] = removePrefixIfAny(data[property], dataPrefix);
            }
        }

        return result;
    }
}

function getPropertyDescriptor(obj: any, prop: string) : PropertyDescriptor 
{
    let result;

    do 
    {
        result = Object.getOwnPropertyDescriptor(obj, prop);
    } 
    while (!result && (obj = Object.getPrototypeOf(obj)));

    return result;
}

function getColumnNameMapping(obj:object): any
{
    let columnNames:any = {}; //{customName: propertyName}

    for(let column of Reflector.getColumns(obj))
    {
        let tokens = column.split('#'); //customName#propertyName

        columnNames[tokens[0]] = tokens.length === 1 ? tokens[0] : tokens[1];
    }

    return columnNames;
}

function removePrefixIfAny(value:any, prefix:string): any
{
    if(typeof value === 'string')
    {
        return value.replace(new RegExp(`^${prefix}#`), '');
    }

    return value;
}