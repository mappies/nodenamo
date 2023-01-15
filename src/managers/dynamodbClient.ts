import { AWSError, Request } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDB, DynamoDBClient as DynamoClient, QueryCommand, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export class DynamoDBClient {
    constructor(private client:DynamoClient) {
        // super();
    }

    marshallKeys = [ 'Key', 'ExpressionAttributeValues' ]

    private marshall<T>(obj: T): T {
        let cp = {...{}, ...obj }
        for (let key of this.marshallKeys)
        {
            cp[key] = obj[key]? marshall(obj[key]): undefined; 
        }
        return cp;
    }

    private unmarshall<T>(obj: T): T {
        
        for (let key of this.marshallKeys)
        {
            obj[key] = obj[key]? unmarshall(obj[key]): undefined; 
        }
        return obj;
    }

    get(query: any): any {
        query = this.marshall(query);
        return { 
            promise: this.client.send(new QueryCommand(query)).then(
                res => res.Items?.map(item => this.unmarshall(item))
            )
        }
        // return this.client.get(query);
    }

    query(query: any): any {
        query = this.marshall(query);
        return { 
            promise: this.client.send(new QueryCommand(query)).then(
                res => res.Items?.map(item => this.unmarshall(item))
            )
        }
        // return this.client.query(query);
    }

    transactWrite(items: { TransactItems: any}): any {
        items = {TransactItems: items.TransactItems.map(item => this.marshall(item))};
        return { 
            promise: this.client.send(new TransactWriteItemsCommand(items))
        }
        // return this.client.transactWrite(items);
    }
}