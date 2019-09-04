import {assert as assert} from 'chai';
import { DynamoDbManager } from '../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, GetItemOutput, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../src';
import { DynamoDbTransaction } from '../src/managers/dynamodbTransaction';
import { Reflector } from '../src/reflector';
import Const from '../src/const';
import { AWSError } from 'aws-sdk/lib/error';
import { Request, PromiseResult } from 'aws-sdk/lib/request';

@DBTable()
class Entity {
    @DBColumn({id:true})
    id:number = 123;

    @DBColumn({hash:true})
    name:string = 'some one';
};

describe('DynamoDbManager', function () 
{
    let mockedClient:IMock<DocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let put:boolean;
    let called:boolean;
    let committed:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).callback(()=>committed=true);
        put = false;
        committed = false;
        called = false;
    });

    it('put()', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>!!p.Put && !!p.Put.TableName && !!p.Put.Item && !p.Put.ConditionExpression && !p.Put.ExpressionAttributeNames && !p.Put.ExpressionAttributeValues && !p.Put.ReturnValuesOnConditionCheckFailure))).callback(()=>put=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(new Entity(), undefined, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - with condition', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(!!p.Put && !!p.Put.TableName && !!p.Put.Item && !!p.Put.ConditionExpression && !!p.Put.ExpressionAttributeNames && !!p.Put.ExpressionAttributeValues)))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(new Entity(), {conditionExpression:'a', expressionAttributeNames: {b:1}, expressionAttributeValues: {c:2}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column name changed', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeNames['#a'] === 'hash' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(new Entity(), {conditionExpression:'#a', expressionAttributeNames: {'#a':'name'}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - objid column value is prefixed, id isn\'t', async () =>
    {
        let obj = new Entity();
        Reflector.setDataPrefix(obj, 'user');

        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeValues['id'] === 123 && p.Put.ExpressionAttributeValues['objid'] === 'user#123' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(obj, {conditionExpression:'a', expressionAttributeValues: {id:123, objid:123}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column value prefixed', async () =>
    {
        let obj = new Entity();
        Reflector.setDataPrefix(obj, 'user');

        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeValues['name'] === 'user#new name' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(obj, {conditionExpression:'a', expressionAttributeValues: {name:'new name'}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('get()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let getResponse = getMockedGetResponse({Item:<any>{id:42}});

        mockedClient.setup(q => q.get(It.is(p => !!p.TableName && p.Key.hash === 'entity#42' && p.Key.range === Const.IdRangeKey))).callback(()=>called=true).returns(()=>getResponse.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entity = await manager.getOne(Entity, 42);

        assert.isTrue(called);
        assert.equal(entity.id, 42);
    });

    it('get() - not found', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let getResponse = getMockedGetResponse({});

        mockedClient.setup(q => q.get(It.is(p => !!p.TableName && p.Key.hash === 'entity#42' && p.Key.range === Const.IdRangeKey))).callback(()=>called=true).returns(()=>getResponse.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entity = await manager.getOne(Entity, 42);

        assert.isTrue(called);
        assert.isUndefined(entity);
    });

    it('find()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.KeyConditionExpression === '#id = :id' && p.ExpressionAttributeNames['#id'] === 'id' && p.ExpressionAttributeValues[':id'] === 42))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'#id = :id', expressionAttributeNames: {'#id': 'id'}, expressionAttributeValues: {':id': 42}});

        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });

    it('find() - filter', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            created:number;
        };

        let response = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => !!p.TableName 
                                                    && p.KeyConditionExpression === '#id = :id' 
                                                    && p.ExpressionAttributeNames['#id'] === 'id' 
                                                    && p.ExpressionAttributeValues[':id'] === 42
                                                    && p.FilterExpression === '#created > :created' 
                                                    && p.ExpressionAttributeNames['#created'] === 'created' 
                                                    && p.ExpressionAttributeValues[':created'] === 2019))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'#id = :id', expressionAttributeNames: {'#id': 'id'}, expressionAttributeValues: {':id': 42}},
                                       {filterExpression:'#created > :created', expressionAttributeNames: {'#created': 'created'}, expressionAttributeValues: {':created': 2019}});

        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });
    
    it('find() - id as the hash key', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({id:true})
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === '#id = :id'
                                                    && p.ExpressionAttributeNames['#id'] === 'hash'
                                                    && p.ExpressionAttributeValues[':id'] === 'entity#42'))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'#id = :id', expressionAttributeNames:{'#id': 'id'}, expressionAttributeValues:{':id': 42}});
        
        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });

    it('find() - objid and hash columns are prefixed but id in a table with another hash is\'t', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({id:true})
            id:number;

            @DBColumn({hash:true})
            name:number;

            @DBColumn()
            created:number;
        };

        let response = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => !!p.TableName 
                                                    && p.ExpressionAttributeNames['#id'] === 'id' 
                                                    && p.ExpressionAttributeValues[':id'] === 42
                                                    && p.ExpressionAttributeNames['#objid'] === 'objid' 
                                                    && p.ExpressionAttributeValues[':objid'] === 'entity#42'
                                                    && p.ExpressionAttributeNames['#name'] === 'hash' 
                                                    && p.ExpressionAttributeValues[':name'] === 'entity#Some One'))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition', expressionAttributeNames: {'#id': 'id'}, expressionAttributeValues: {':id': 42}},
                                       {filterExpression:'fcondition', expressionAttributeNames: {'#name': 'name', '#objid': 'objid'}, expressionAttributeValues: {':name': 'Some One', ':objid': 42}});

        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });

    it('find() - pagination', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let page1called = false;
        let page2called = false;
        let response1 = getMockedQueryResponse({LastEvaluatedKey: <any>'lek1', Items:<any>[{id:42, objid:42}]});
        let response2 = getMockedQueryResponse({Items:<any>[{id:99, objid:99}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === undefined))).callback(()=>page1called=true).returns(()=>response1.object);

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === <any>'lek1'))).callback(()=>page2called=true).returns(()=>response2.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.isTrue(page1called);
        assert.isTrue(page2called);
        assert.equal(entities.length, 2);
        assert.equal(entities[0].id, 42);
        assert.equal(entities[1].id, 99);
    });

    it('find() - index', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.IndexName === 'custom-index'))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {indexName:'custom-index'});
        
        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });

    it('find() - exclusive start key', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === <any>'lek'))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {exclusiveStartKey:<any>'lek'});
        
        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });

    it('find() - sort order - reversed', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.ScanIndexForward === false))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       undefined,
                                       {order:-1});
        
        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });

    it('find() - sort order - forwarded', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[{id:42}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.ScanIndexForward === true))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       undefined,
                                       {order:1});
        
        assert.isTrue(called);
        assert.equal(entities.length, 1);
        assert.equal(entities[0].id, 42);
    });
});

function getMockedGetResponse(response:GetItemOutput): IMock<Request<GetItemOutput, AWSError>>
{
    let mock = Mock.ofType<Request<GetItemOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}
function getMockedQueryResponse(response:QueryOutput): IMock<Request<QueryOutput, AWSError>>
{
    let mock = Mock.ofType<Request<QueryOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}