import { DocumentClient, TransactWriteItem } from "aws-sdk/clients/dynamodb";

const MAX_AWS_TRANSACTION_OPERATIONS = 10;

export class DynamoDbTransactionManager
{
    private operations:TransactWriteItem[];

    constructor(private client: DocumentClient)
    {
        this.operations = [];
    }

    add(param:TransactWriteItem): DynamoDbTransactionManager
    {
        this.operations.push(param);

        return this;
    }

    async execute(): Promise<void>
    {
        for (let i=0; i < this.operations.length; i += MAX_AWS_TRANSACTION_OPERATIONS) 
        {
            const transactions = this.operations.slice(i, i + MAX_AWS_TRANSACTION_OPERATIONS);
            console.log(transactions)
            await this.client.transactWrite({ TransactItems: transactions }).promise();
        }
    }
};
