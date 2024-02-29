import { Insert } from './queries/insert/insert';
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDbManager } from "./managers/dynamodbManager";
import { Get } from "./queries/get/get";
import { Find } from "./queries/find/find";
import { Delete } from "./queries/delete/delete";
import { List } from "./queries/find/list";
import { Update } from './queries/update/update';
import { CreateTable } from './queries/createTable/createTable';
import { DeleteTable } from './queries/deleteTable/deleteTable';
import { ValidatedDynamoDbManager } from './managers/validatedDynamodbManager';
import { IDynamoDbManager } from './interfaces/iDynamodbManager';
import { On } from './queries/on/on';
import { Transaction } from './queries/transaction/on';
import { Describe } from './queries/describe/describe';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import ITransactionable from './interfaces/iTransactionable';

const marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: false, 
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: true, 
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: false, 
  };

  const unmarshallOptions = 
  {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, 
  };

export class NodeNamo
{
    private manager:IDynamoDbManager

    constructor(private config: DynamoDBClientConfig, private client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient(config), {
           marshallOptions,
           unmarshallOptions
        }))
    {
        this.manager = new ValidatedDynamoDbManager(new DynamoDbManager(this.client));
    }

    insert(obj:object): Insert
    {
        return new Insert(this.manager, obj);
    }

    get(id:string|number): Get
    {
        return new Get(this.manager, id);
    }

    list(...projections:string[]): List
    {
        return new List(this.manager, projections);
    }

    find(...projections:string[]): Find
    {
        return new Find(this.manager, projections);
    }

    update(obj:object): Update
    {
        return new Update(this.manager, obj);
    }

    on(id:string|number): On
    {
        return new On(this.manager, id);
    }

    transaction(operations:ITransactionable[]): Transaction
    {
        return new Transaction(this.manager, operations);
    }
    
    delete(id:string|number): Delete
    {
        return new Delete(this.manager, id);
    }

    createTable(): CreateTable
    {
        return new CreateTable(this.manager);
    }

    deleteTable(): DeleteTable
    {
        return new DeleteTable(this.manager);
    }

    describe(type:{new(...args: any[])}): Describe
    {
        return new Describe(this.manager, type);
    }
};