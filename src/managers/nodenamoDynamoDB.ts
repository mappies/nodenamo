import { DynamoDB } from '@aws-sdk/client-dynamodb';

export class NodeNamoDynamoDB {
    constructor(options: any, private client = new DynamoDB(options)) {}

    createTable(query: any): { promise: any } {
        return { 
            promise: async () => new Promise(async (ress) => {
                let res = await this.client.createTable(query);
                ress(res)
            })
        }
    }

    deleteTable(query: any): { promise: any } {
        return { 
            promise: async () => new Promise(async (ress) => {
                let res = await this.client.deleteTable(query);
                ress(res)
            })
        }
    }
}