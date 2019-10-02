import {NodenamoError} from './nodenamoError';

export class VersionError extends NodenamoError 
{
    constructor(m:string) 
    {
        super(m);
    }
};