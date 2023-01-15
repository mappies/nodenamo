import { DynamoDB } from '@aws-sdk/client-dynamodb';

export class NodeNamoDynamoDB {
    constructor(options: any, private client = new DynamoDB(options)) {}

    createTable(query: any): { promise: any } {
        return { 
            promise: async () => new Promise(async () => await this.client.createTable(query))
        }
    }

    deleteTable(query: any): { promise: any } {
        return { 
            promise: async () => new Promise(async () => await this.client.deleteTable(query))
        }
    }
}