import { Add } from "./queries/add/add";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { DynamoDbManager } from "./managers/dynamodbManager";
import { Reflector } from "./reflector";
import { NodenamoError } from "./errors/nodenamoError";

export class NodeNamo
{
    constructor(private client:DocumentClient)
    {

    }

    add(obj:object): Add
    {
        if(!Reflector.getIdKey(obj))
        {
            throw new NodenamoError(`Could not add an object because it has no ID property. Try adding @DBColumn({id:true}) to one of its property to represent a unique object ID.`)
        }

        return new Add(new DynamoDbManager(this.client), obj);
    }
};