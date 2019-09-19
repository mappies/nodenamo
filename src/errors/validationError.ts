import {NodenamoError} from './nodenamoError';

export class ValidationError extends NodenamoError 
{
    constructor(m:string) 
    {
        super(m);
    }
};