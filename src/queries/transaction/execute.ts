import { DynamoDbTransaction } from '../../managers/dynamodbTransaction';

export class Execute
{
    constructor(private transaction:DynamoDbTransaction)
    {

    }

    async execute(): Promise<void>
    {
        await this.transaction.commit();
    }
}