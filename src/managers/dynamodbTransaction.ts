import { TransactWriteItem, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import AggregateError from 'aggregate-error';

import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
const MAX_AWS_TRANSACTION_OPERATIONS = Number(process.env.MAX_AWS_TRANSACTION_OPERATIONS) || 25;

export class DynamoDbTransaction
{
    private operations:TransactWriteItem[];

    constructor(private client: DynamoDBDocumentClient)
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

                let transactionRequest = this.client.send(new TransactWriteItemsCommand({ TransactItems: transactions }));

                let errors = [];

                try
                {
                    await transactionRequest;
                }
                catch(e)
                {
                    try {
                        let error = JSON.parse(e.httpResponse.body.toString());

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
