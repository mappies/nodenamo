export class Representation
{
    public data:any;

    constructor(public tableName:string, public hash:any, public range:any, public id:any, public originalData:object)
    {
        this.data = Object.assign({}, originalData);

        let getPropertyValue = function(d:any, properyNameOrNames:string|string[]) : any
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
        
        this.id = getPropertyValue(originalData, id);
        this.hash = getPropertyValue(originalData, hash);
        this.range = getPropertyValue(originalData, range);
    }
};