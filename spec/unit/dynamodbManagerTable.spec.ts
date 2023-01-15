import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, CreateTableOutput, DeleteTableOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../../src';
import { AWSError } from 'aws-sdk/lib/error';
import { Request } from 'aws-sdk/lib/request';
import { DynamoDB } from 'aws-sdk/clients/all';
import { DynamoDBClient } from '../../src/managers/dynamodbClient';

@DBTable()
class Entity {
    @DBColumn({id:true})
    id:number = 123;

    @DBColumn({hash:true})
    name:string = 'some one';
};

;

describe('DynamoDbManager.create/deleteTable()', function () 
{
    let mockedClient:IMock<DynamoDBClient>;
    let mockedDynamoDb:IMock<DynamoDB>;
    let called:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDBClient>();
        mockedDynamoDb = Mock.ofType<DynamoDB>();
        called = false;
    });

    it('createTable() - on demand', async () =>
    {
        mockedDynamoDb.setup(db => db.createTable(It.is(p => !!p.TableName && p.BillingMode === 'PAY_PER_REQUEST'))).callback(()=>called=true).returns(()=>getMockedCreateTableResponse().object);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.createTable(Entity, {onDemand:true}, mockedDynamoDb.object);

        assert.isTrue(called);
    });

    it('createTable() - provisioned capacity', async () =>
    {
        mockedDynamoDb.setup(db => db.createTable(It.is(p => !!p.TableName 
                                                              && p.BillingMode === 'PROVISIONED'
                                                              && p.ProvisionedThroughput.ReadCapacityUnits === 2
                                                              && p.ProvisionedThroughput.WriteCapacityUnits === 3
                                                              && p.GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits === 2
                                                              && p.GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits === 3)))
                      .callback(()=>called=true).returns(()=>getMockedCreateTableResponse().object);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.createTable(Entity, {readCapacityUnits:2, writeCapacityUnits:3}, mockedDynamoDb.object);

        assert.isTrue(called);
    });

    it('deleteTable()', async () =>
    {
        mockedDynamoDb.setup(db => db.deleteTable(It.is(p => !!p.TableName))).callback(()=>called=true).returns(()=>getMockedDeleteTableResponse().object);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.deleteTable(Entity, mockedDynamoDb.object);

        assert.isTrue(called);
    });
});

function getMockedCreateTableResponse(response?:CreateTableOutput): IMock<Request<CreateTableOutput, AWSError>>
{
    let mock = Mock.ofType<Request<CreateTableOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}
function getMockedDeleteTableResponse(response?:DeleteTableOutput): IMock<Request<DeleteTableOutput, AWSError>>
{
    let mock = Mock.ofType<Request<DeleteTableOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}