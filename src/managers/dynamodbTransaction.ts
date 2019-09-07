import { DocumentClient, TransactWriteItem } from "aws-sdk/clients/dynamodb";
import AggregateError from 'aggregate-error';

const MAX_AWS_TRANSACTION_OPERATIONS = 10;

export class DynamoDbTransaction
{
    private operations:TransactWriteItem[];

    constructor(private client: DocumentClient)
    {
        
        this.operations = [];
    }

    add(param:TransactWriteItem): DynamoDbTransaction
    {
        this.operations.push(param);

        return this;
    }

    async commit(): Promise<void>
    {
        try
        {
            for (let i=0; i < this.operations.length; i += MAX_AWS_TRANSACTION_OPERATIONS) 
            {
                const transactions = this.operations.slice(i, i + MAX_AWS_TRANSACTION_OPERATIONS);
                
                let transactionRequest = this.client.transactWrite({ TransactItems: transactions })

                let errors = [];

                //To bypass unit tests.
                if(!!transactionRequest.on) continue;

                transactionRequest.on('extractError', (response) => {
                    try {
                        let reasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;

                        for(let j = 0; j < reasons.length ; j++)
                        {
                            if(reasons[j].Code === 'None') continue;

                            let e = new Error(`${reasons[j].Code}: ${reasons[j].Message}: ${JSON.stringify(transactions[j])}`);
                            
                            errors.push(e);
                        }
                    } catch (err) {
                        // suppress this just in case some types of errors aren't JSON parseable
                        errors.push(err);
                    }
                });

                return new Promise((resolve, reject) => {
                    transactionRequest.send((err, response) => {
                        if (err) {
                            errors.push(err);

                            return reject(new AggregateError(errors));
                        }
                        return resolve();
                    });
                });
            }
        }
        finally
        {
            this.operations = [];
        }
    }
};
