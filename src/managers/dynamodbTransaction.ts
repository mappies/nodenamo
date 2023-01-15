import AggregateError from 'aggregate-error';
import { TransactWriteItem } from 'aws-sdk/clients/dynamodb';

import { NodenamoDynamoDBClient } from './nodenamoDynamoDBClient';

const MAX_AWS_TRANSACTION_OPERATIONS = Number(process.env.MAX_AWS_TRANSACTION_OPERATIONS) || 25;

export class DynamoDbTransaction
{
    private operations:TransactWriteItem[];

    constructor(private client: NodenamoDynamoDBClient)
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

                transactionRequest.on('extractError', (response) => {
                    try {
                        let error = JSON.parse(response.httpResponse.body.toString());

                        if(error.CancellationReasons)
                        {
                            let reasons = error.CancellationReasons;

                            for(let j = 0; j < reasons.length ; j++)
                            {
                                if(reasons[j].Code === 'None') continue;

                                let e = new Error(`${reasons[j].Code}: ${reasons[j].Message}: ${JSON.stringify(transactions[j])}`);
                                
                                errors.push(e);
                            }
                        }
                        else
                        {
                            errors.push(new Error(error.message));
                        }

                    } catch (err) {
                        errors.push(err);
                    }
                });

                try
                {
                    await transactionRequest.promise();
                }
                catch(e)
                {
                    throw new AggregateError([e, ...errors]);
                }
            }
        }
        finally
        {
            this.operations = [];
        }
    }
};
