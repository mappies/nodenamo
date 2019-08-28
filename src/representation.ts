import Const from './const';
export class Representation
{
    public data:any;
    public hash:any;
    public range:any;
    public objId:any;

    constructor(public tableName:string, dataPrefix:string = '', hash:any, range:any, id:string, originalData:object)
    {
        this.data = Object.assign({}, originalData);

        this.objId = this.data[Const.IdColumn] = this.addDataPrefix(dataPrefix, this.getPropertyValue(this.data, id));
        this.hash = this.data[Const.HashColumn] = this.addDataPrefix(dataPrefix, this.getPropertyValue(this.data, hash));
        this.range = this.data[Const.RangeColumn] = this.getPropertyValue(this.data, range);
    }

    private getPropertyValue(d:any, properyNameOrNames:string|string[]) : any
    {
        if(properyNameOrNames === undefined) return undefined;

        let propertyNames = Array.isArray(properyNameOrNames) ? properyNameOrNames : [properyNameOrNames];

        let propertyValues:any[] = [];

        for(let propertyName of propertyNames)
        {
            //A custom column name uses `customName#originalName` format.
            let value = propertyName.includes('#') ? d[propertyName.split('#')[0]] : d[propertyName];
            
            propertyValues.push(value);
        }

        if(propertyValues.length === 0) return undefined
        if(propertyValues.length === 1) return propertyValues[0];

        return propertyValues.join('#');
    }

    private addDataPrefix(prefix:string, value:any):any
    {
        if(value === undefined) return undefined;

        return prefix ? `${prefix}#${value}` : value;
    }
};