import { CreateTableCommandOutput, DeleteTableCommandOutput } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { assert } from 'chai';
import { IMock, It, Mock } from 'typemoq';

import { DBColumn, DBTable } from '../../src';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';

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
    let mockedClient:IMock<DynamoDBDocumentClient>;
    let called:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDBDocumentClient>();
        called = false;
    });

    it('createTable() - on demand', async () =>
    {
        
        mockedClient
        .setup(db => db.send(It.is((p:any) => !!p.input.TableName && p.input.BillingMode === 'PAY_PER_REQUEST')))
        .callback(()=>called=true).returns(async () => {return {} as CreateTableCommandOutput})

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.createTable(Entity, {onDemand:true});

        assert.isTrue(called);
    });

    it('createTable() - provisioned capacity', async () =>
    {
        mockedClient.setup(db => db.send(It.is((p:any) => !!p.input.TableName 
                                                              && p.input.BillingMode === 'PROVISIONED'
                                                              && p.input?.ProvisionedThroughput?.ReadCapacityUnits === 2
                                                              && p.input.ProvisionedThroughput.WriteCapacityUnits === 3
                                                              && p.input?.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput?.ReadCapacityUnits === 2
                                                              && p.input?.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput?.WriteCapacityUnits === 3)))
                      .callback(()=>called=true).returns(async () => {return {} as CreateTableCommandOutput} );

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.createTable(Entity, {readCapacityUnits:2, writeCapacityUnits:3});

        assert.isTrue(called);
    });

    it('deleteTable()', async () =>
    {
        mockedClient.setup(db => db.send(It.is((p:any) => !!p.input.TableName))).callback(()=>called=true).returns(async () => {return {} as DeleteTableCommandOutput});

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.deleteTable(Entity);

        assert.isTrue(called);
    });
});