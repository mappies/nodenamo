import { Const } from './const';
import { Reflector } from './reflector';
import { Key } from './Key';

const excludedColumns = [<string>Const.HashColumn, <string>Const.RangeColumn, <string>Const.IdColumn, <string>Const.VersionColumn];

export class EntityFactory
{
    static create<T extends object>(type:{new(...args: any[]):T}, data:any):T
    {
        let result:T = new type();

        //Get column names mapping 
        let columnNames:any = getColumnNameMapping(result);

        //Get data prefix
        let dataPrefix = Reflector.getDataPrefix(result);

        for(let property of Object.keys(data))
        {
            if(property === Const.VersionColumn)
            {
                Reflector.setObjectVersion(result, data[property]);
                continue;
            }

            if(excludedColumns.includes(property)) continue;

            let descriptor = getPropertyDescriptor(result, property);

            if(!descriptor || (descriptor.writable && !descriptor.set))
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
    let columnNames:any = {}; //{targetName: propertyName}

    for(let column of Reflector.getColumns(obj))
    {
        let tokens = Key.parse(column); //targetName#propertyName

        columnNames[tokens.targetName] = tokens.propertyName;
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