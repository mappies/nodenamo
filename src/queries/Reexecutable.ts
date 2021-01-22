import AggregateError from 'aggregate-error';

function sleep(ms:number)
{
    return new Promise((resolve)=>setTimeout(resolve, ms));
}

const random = (min, max) => {
    return Math.round((Math.random() * (max - min) + min));
};

const nonRetryableErrors = ['ItemCollectionSizeLimitExceeded', 'ConditionalCheckFailed', 'ProvisionedThroughputExceeded', 'ThrottlingError', 'ValidationError'];

export class Reexecutable
{
    constructor()
    {

    }

    async execute(func:Function): Promise<any>
    {
        let waitInMs = 150;
        let totalWaitInMs = 0;
        const maxWaitInMs = 5000;

        let allErrors = [];

        do
        {
            try
            {
                return await func();
            }
            catch(errors)
            {
                if(!(errors instanceof AggregateError)) throw errors;

                let hasTransactionError = false;

                for(let innerError of errors)
                {
                    if(nonRetryableErrors.find(e => innerError.message.includes(e)))
                    {
                        throw errors;
                    }

                    hasTransactionError = innerError.message.includes('TransactionConflict');
                }

                if(!hasTransactionError)
                {
                    throw errors;
                }

                //Must be a transaction-only error
                allErrors = allErrors.concat(errors);

                await sleep(waitInMs);

                totalWaitInMs += waitInMs;
                waitInMs = waitInMs < 500 ? waitInMs + 150 : random(450,800);
            }
        }
        while(totalWaitInMs <= maxWaitInMs);

        throw new AggregateError(allErrors);
    }
}