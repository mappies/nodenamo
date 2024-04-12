import { ConditionCheck, Delete, Put, TransactWriteItem, Update  } from "@aws-sdk/client-dynamodb";
import AggregateError from 'aggregate-error';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const MAX_AWS_TRANSACTION_OPERATIONS = Number(process.env.MAX_AWS_TRANSACTION_OPERATIONS) || 25;

// We need a type to represent @aws-sdk/client-dynamodb's TransactItem but in @aws-sdk/lib-dynamodb's way.
// The following type is the type of @aws-sdk/lib-dynamodb's TransactWriteCommandInput.TransactItems
// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/TransactWriteCommand/
export type TransactionItem = Omit<TransactWriteItem, "ConditionCheck" | "Put" | "Delete" | "Update"> & {
    ConditionCheck?: Omit<ConditionCheck, "Key" | "ExpressionAttributeValues"> & {
        Key: Record<string, any> | undefined;
        ExpressionAttributeValues?: Record<string, any>;
    };
    Put?: Omit<Put, "Item" | "ExpressionAttributeValues"> & {
        Item: Record<string, any> | undefined;
        ExpressionAttributeValues?: Record<string, any>;
    };
    Delete?: Omit<Delete, "Key" | "ExpressionAttributeValues"> & {
        Key: Record<string, any> | undefined;
        ExpressionAttributeValues?: Record<string, any>;
    };
    Update?: Omit<Update, "Key" | "ExpressionAttributeValues"> & {
        Key: Record<string, any> | undefined;
        ExpressionAttributeValues?: Record<string, any>;
    };
};

export class DynamoDbTransaction
{
    private operations:TransactionItem[];

    constructor(private client: DynamoDBDocumentClient)
    {
        
        this.operations = [];
    }

    add(param:TransactionItem): DynamoDbTransaction
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
                
                let transactionRequest = this.client.send(new TransactWriteCommand({ TransactItems: transactions }));

                let errors = [];

                try
                {
                    await transactionRequest;
                }
                catch(error)
                {
                    if (error.name === "TransactionCanceledException")
                    {
                        try {    
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
                                errors.push(new Error(error.Message));
                            }
    
                        } 
                        catch (err) 
                        {
                            errors.push(err);
                        }
                    }
                    else
                    {
                        errors.push(error)
                    }

                    throw new AggregateError([error, ...errors]);
                }
            }
        }
        finally
        {
            this.operations = [];
        }
    }
};
