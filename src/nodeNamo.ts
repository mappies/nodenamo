import { IDynamoDbManager } from './interfaces/iDynamodbManager';
import ITransactionable from './interfaces/iTransactionable';
import { NodenamoDynamoDBClient } from './managers/nodenamoDynamoDBClient';
import { DynamoDbManager } from './managers/dynamodbManager';
import { ValidatedDynamoDbManager } from './managers/validatedDynamodbManager';
import { CreateTable } from './queries/createTable/createTable';
import { Delete } from './queries/delete/delete';
import { DeleteTable } from './queries/deleteTable/deleteTable';
import { Describe } from './queries/describe/describe';
import { Find } from './queries/find/find';
import { List } from './queries/find/list';
import { Get } from './queries/get/get';
import { Insert } from './queries/insert/insert';
import { On } from './queries/on/on';
import { Transaction } from './queries/transaction/on';
import { Update } from './queries/update/update';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export class NodeNamo
{
    private manager:IDynamoDbManager

    constructor(private client:NodenamoDynamoDBClient | DocumentClient)
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