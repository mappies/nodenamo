import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DynamoDB, CreateTableOutput, DeleteTableOutput, ServiceOutputTypes, CreateTableCommand, CreateTableCommandOutput, CreateTableCommandInput, DeleteTableCommandOutput } from '@aws-sdk/client-dynamodb';
import { DBTable, DBColumn } from '../../src';

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
    let mockedClient:IMock<DynamoDB>;
    let mockedDynamoDb:IMock<DynamoDB>;
    let called:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDB>();
        mockedDynamoDb = Mock.ofType<DynamoDB>();
        called = false;
    });

    it('createTable() - on demand', async () =>
    {
        mockedDynamoDb.setup(db => db.createTable(It.is((p:any) => !!p.TableName && p.BillingMode === 'PAY_PER_REQUEST'))).callback(()=>called=true).returns(async () => {return {} as CreateTableCommandOutput});

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.createTable(Entity, {onDemand:true}, mockedDynamoDb.object);

        assert.isTrue(called);
    });

    it('createTable() - provisioned capacity', async () =>
    {
        mockedDynamoDb.setup(db => db.createTable(It.is((p:CreateTableCommandInput) => !!p.TableName 
                                                              && p.BillingMode === 'PROVISIONED'
                                                              && p?.ProvisionedThroughput?.ReadCapacityUnits === 2
                                                              && p.ProvisionedThroughput.WriteCapacityUnits === 3
                                                              && p?.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput?.ReadCapacityUnits === 2
                                                              && p?.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput?.WriteCapacityUnits === 3)))
                      .callback(()=>called=true).returns(async () => {return {} as CreateTableCommandOutput} );

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.createTable(Entity, {readCapacityUnits:2, writeCapacityUnits:3}, mockedDynamoDb.object);

        assert.isTrue(called);
    });

    it('deleteTable()', async () =>
    {
        mockedDynamoDb.setup(db => db.deleteTable(It.is((p:any) => !!p.TableName))).callback(()=>called=true).returns(async () => {return {} as DeleteTableCommandOutput});

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.deleteTable(Entity, mockedDynamoDb.object);

        assert.isTrue(called);
    });
});