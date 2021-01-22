import { IDynamoDbManager } from '../../interfaces/iDynamodbManager';
import { Execute } from './execute';
import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';
import ITransactionable from '../../interfaces/iTransactionable';
import { Reexecutable } from '../Reexecutable';

export class Transaction extends Reexecutable
{
    private transaction:DynamoDbTransaction;

    constructor(private manager:IDynamoDbManager, private operations:ITransactionable[])
    {
        super();

        return this;
    }

    async execute(): Promise<void>
    {
        return super.execute(async ()=>
        {
            this.transaction = new DynamoDbTransaction(this.manager.client);

            for(let operation of this.operations)
            {
                await operation.execute(this.transaction);
            }

            return await new Execute(this.transaction).execute();
        });
    }
};