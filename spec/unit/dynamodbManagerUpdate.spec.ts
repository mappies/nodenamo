import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../../src';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import {Const} from '../../src/const';
import { AWSError } from 'aws-sdk/lib/error';
import { Request } from 'aws-sdk/lib/request';
import { VersionError } from '../../src/errors/versionError';

describe('DynamoDbManager.Update()', function () 
{
    let mockedClient:IMock<DocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let put:boolean;
    let put2:boolean;
    let called:boolean;
    let deleted:boolean;
    let deleted2:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        put = false;
        put2 = false;
        called = false;
        deleted = false;
        deleted2 = false;
    });

    it('update() - no keys', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;

            @DBColumn()
            order:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        
        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({hash:true})
            id:number;

            @DBColumn()
            name:string;

            @DBColumn({range:true})
            created:number;

            @DBColumn({range:true})
            order:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'created' && t.Put.Item.name === 'New Two'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'order' && t.Put.Item.name === 'New Two'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isFalse(deleted);
    });

    it('update() - key changed', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({hash:true})
            id:number;

            @DBColumn()
            name:string;

            @DBColumn({range:true})
            created:number;

            @DBColumn({range:true})
            order:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1a' && t.Put.Item.range === 'created' && t.Put.Item.id === '1a'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1a' && t.Put.Item.range === 'order' && t.Put.Item.id === '1a'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key.hash === 'entity#1' && t.Delete.Key.range === 'created'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key.hash === 'entity#1' && t.Delete.Key.range === 'order'))).callback(()=>deleted2=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {id: '1a'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isTrue(deleted);
        assert.isTrue(deleted2);
    });

    it('update() - with condition', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({hash:true})
            id:number;

            @DBColumn()
            name:string;

            @DBColumn({range:true})
            created:number;

            @DBColumn({range:true})
            order:number;
        };

        let condition = {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'name'}, expressionAttributeValues: {':v': true}};

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'created' && t.Put.Item.name === 'New Two' && t.Put.ConditionExpression === 'condition' && t.Put.ExpressionAttributeNames['#n'] === 'name' && t.Put.ExpressionAttributeValues[':v'] === 'true'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'order' && t.Put.Item.name === 'New Two' && t.Put.ConditionExpression === 'condition' && t.Put.ExpressionAttributeNames['#n'] === 'name' && t.Put.ExpressionAttributeValues[':v'] === 'true'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, condition, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isFalse(deleted);
    });

    it('update() - with a version check (table-level)', async () =>
    {
        @DBTable({versioning:true})
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => 
            !!t.Put 
            && t.Put.Item.name === 'New Two'
            && t.Put.Item[Const.VersionColumn] === 2 
            && t.Put.ConditionExpression === '(#objver < :objver)'
            && t.Put.ExpressionAttributeNames['#objver'] === Const.VersionColumn
            && t.Put.ExpressionAttributeValues[':objver'] === 2 ))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update() - with a version check (table-level) (false)', async () =>
    {
        @DBTable({versioning:false})
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => 
            !!t.Put 
            && t.Put.Item.name === 'New Two'
            && t.Put.Item[Const.VersionColumn] === 2 
            && !t.Put.ConditionExpression
            && !t.Put.ExpressionAttributeNames 
            && !t.Put.ExpressionAttributeValues))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update() - with a version check (table-level) will not be overridden by withVersionCheck(false)', async () =>
    {
        @DBTable({versioning:true})
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => 
            !!t.Put 
            && t.Put.Item.name === 'New Two'
            && t.Put.Item[Const.VersionColumn] === 2 
            && t.Put.ConditionExpression === '(#objver < :objver)'
            && t.Put.ExpressionAttributeNames['#objver'] === Const.VersionColumn
            && t.Put.ExpressionAttributeValues[':objver'] === 2 ))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, {versionCheck:false}, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update() - with a version check', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => 
            !!t.Put 
            && t.Put.Item.name === 'New Two'
            && t.Put.Item[Const.VersionColumn] === 2 
            && t.Put.ConditionExpression === '(#objver < :objver)'
            && t.Put.ExpressionAttributeNames['#objver'] === Const.VersionColumn
            && t.Put.ExpressionAttributeValues[':objver'] === 2 ))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, {versionCheck:true}, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update() - with a condition and a version check', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => 
            !!t.Put 
            && t.Put.Item.name === 'New Two'
            && t.Put.Item[Const.VersionColumn] === 2 
            && t.Put.ConditionExpression === '(#objver < :objver) and (condition)'
            && t.Put.ExpressionAttributeNames['#objver'] === Const.VersionColumn
            && t.Put.ExpressionAttributeNames['#n'] === 'name'
            && t.Put.ExpressionAttributeValues[':objver'] === 2
            && t.Put.ExpressionAttributeValues[':n'] === true))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, {conditionExpression: "condition", expressionAttributeNames: {'#n': 'name'}, expressionAttributeValues: {'#n': true}, versionCheck:true}, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update() - with a version check - failed because of versioning', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        //Simulate object changes from objver 1 to 2.
        let findResponse1 = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        let findResponse2 = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 2, name:'Some One'},
        ]});

        let numberOfGetCalls = 0;
        mockedClient.setup(q => q.query(It.is(p => 
            !!p.TableName 
            && p.IndexName === Const.IdIndexName 
            && p.KeyConditionExpression === '#objid = :objid' 
            && p.ExpressionAttributeNames['#objid'] === Const.IdColumn 
            && p.ExpressionAttributeValues[':objid'] === 'entity#1')))
            .returns(()=>numberOfGetCalls++ === 0 ? findResponse1.object : findResponse2.object); 
        mockedTransaction.setup(t => t.commit()).throws(new Error('Simulate conditional check failure'));
        
        let manager = new DynamoDbManager(mockedClient.object);

        let error = undefined;

        try
        {
            await manager.update(Entity, 1, {name: 'New Two'}, {versionCheck:true}, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.instanceOf(error, VersionError);
    });

    it('update() - with a version check - failed because of a non-versioning issue', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.is(p => 
            !!p.TableName 
            && p.IndexName === Const.IdIndexName 
            && p.KeyConditionExpression === '#objid = :objid' 
            && p.ExpressionAttributeNames['#objid'] === Const.IdColumn 
            && p.ExpressionAttributeValues[':objid'] === 'entity#1')))
            .returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.commit()).throws(new Error('Simulated error'));
        
        let manager = new DynamoDbManager(mockedClient.object);

        let error = undefined;

        try
        {
            await manager.update(Entity, 1, {name: 'New Two'}, {versionCheck:true}, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.notInstanceOf(error, VersionError);
        assert.equal(error.message, 'Simulated error');
    });
});

function getMockedQueryResponse(response:QueryOutput): IMock<Request<QueryOutput, AWSError>>
{
    let mock = Mock.ofType<Request<QueryOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}