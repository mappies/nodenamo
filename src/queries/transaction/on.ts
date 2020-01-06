import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from './execute';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import ITransactionable from '../../interfaces/iTransactionable';

export class Transaction 
{
    private transaction:DynamoDbTransaction;

    constructor(private manager:IDynamoDbManager, private operations:ITransactionable[])
    {
        return this;
    }

    async execute(): Promise<void>
    {
        this.transaction = new DynamoDbTransaction(this.manager.client);

        for(let operation of this.operations)
        {
            await operation.execute(this.transaction);
        }

        return await new Execute(this.transaction).execute();
    }
};