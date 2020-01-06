import { DynamoDbTransaction } from '../managers/dynamodbTransaction';

export default interface ITransactionable
{
    execute(transaction?:DynamoDbTransaction);
}