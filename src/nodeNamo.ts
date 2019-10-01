import { Insert } from './queries/insert/insert';
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { DynamoDbManager } from "./managers/dynamodbManager";
import { Reflector } from "./reflector";
import { NodenamoError } from "./errors/nodenamoError";
import { Get } from "./queries/get/get";
import { Find } from "./queries/find/find";
import { Delete } from "./queries/delete/delete";
import { List } from "./queries/find/list";
import { Update } from './queries/update/update';
import { CreateTable } from './queries/createTable/createTable';
import { DeleteTable } from './queries/deleteTable/deleteTable';
import { ValidatedDynamoDbManager } from './managers/validatedDynamodbManager';
import { IDynamoDbManager } from './interfaces/iDynamodbManager';

export class NodeNamo
{
    private manager:IDynamoDbManager

    constructor(private client:DocumentClient)
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

    list(): List
    {
        return new List(this.manager);
    }

    find(): Find
    {
        return new Find(this.manager);
    }

    update(obj:object): Update
    {
        return new Update(this.manager, obj);
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
};