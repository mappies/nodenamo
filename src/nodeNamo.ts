import { Put } from "./queries/put/put";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { DynamoDbManager } from "./manager/dynamodbManager";

export class NodeNamo
{
    constructor(private client:DocumentClient)
    {

    }

    put(data:object): Put
    {
        return new Put(new DynamoDbManager(this.client), data);
    }
};