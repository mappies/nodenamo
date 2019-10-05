export class Key
{
    static parse(keyValue:string): { targetName:string, propertyName:string }
    {
        let index = keyValue ? keyValue.indexOf('#') : 0;

        if(index > 0)
        {
            return {targetName: keyValue.substr(0, index), propertyName: keyValue.substring(index + 1)};
        }
        else
        {
            return {targetName: keyValue, propertyName: keyValue};
        }
    }
}