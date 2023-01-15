import { DynamoDBClient as DynamoClient, QueryCommand, TransactWriteItemsCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class NodenamoDynamoDBClient {
    constructor(private client:DynamoClient) {}

    marshallKeys = [ 'Key', 'ExpressionAttributeValues', 'ExclusiveStartKey', 'LastEvaluatedKey' ]

    private marsh<T>(obj: T): T {
        let cp = {...{}, ...obj }
        for (let key of this.marshallKeys)
        {
            cp[key] = obj[key]? marshall(obj[key]): undefined; 
        }
        return cp;
    }

    public get(query: any): { promise: any } {
        return { 
            promise: async () => new Promise(async (ress) => {
                    let results = await this.client.send(new GetItemCommand(this.marsh(query)));
                    results.Item = unmarshall(results.Item);
                    ress(results);
                })
        }
    }

    public query(query: any): { promise: any } {
        return { 
            promise: async () => new Promise(async (ress) => {
                let results = await this.client.send(new QueryCommand(this.marsh(query)));
                results.Items = results.Items?.map(item => unmarshall(item));
                ress(results);
            })
        }
    }

    public transactWrite(items: { TransactItems: any}): { promise: any, on: any } {
        items = {TransactItems: items.TransactItems.map(item => this.marsh(item))};
        return { 
            promise: async () => new Promise(async (ress) => {
                ress(await this.client.send(new TransactWriteItemsCommand(items)));
            }),
            on: () => {}
        }
    }
}