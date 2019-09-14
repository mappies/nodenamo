import {assert as assert} from 'chai';
import { DynamoDbManager } from '../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, GetItemOutput, QueryOutput, DeleteItemOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../src';
import { DynamoDbTransaction } from '../src/managers/dynamodbTransaction';
import { Reflector } from '../src/reflector';
import Const from '../src/const';
import { AWSError } from 'aws-sdk/lib/error';
import { Request } from 'aws-sdk/lib/request';

@DBTable()
class Entity {
    @DBColumn({id:true})
    id:number = 123;

    @DBColumn({hash:true})
    name:string = 'some one';
};

@DBTable({dataPrefix:'user'})
class EntityWithDataPrefix {
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
    let put2:boolean;
    let called:boolean;
    let deleted:boolean;
    let deleted2:boolean;
    let committed:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).callback(()=>committed=true);
        put = false;
        put2 = false;
        committed = false;
        called = false;
        deleted = false;
        deleted2 = false;
    });

    it('put()', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>!!p.Put && !!p.Put.TableName && !!p.Put.Item && p.Put.ConditionExpression === '(attribute_not_exists(#hash) AND attribute_not_exists(#range))' && p.Put.ExpressionAttributeNames['#hash'] === Const.HashColumn && p.Put.ExpressionAttributeNames['#range'] === Const.RangeColumn && !p.Put.ExpressionAttributeValues && !p.Put.ReturnValuesOnConditionCheckFailure))).callback(()=>put=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, undefined, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - with condition', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(!!p.Put && !!p.Put.TableName && !!p.Put.Item && !!p.Put.ConditionExpression && !!p.Put.ExpressionAttributeNames && !!p.Put.ExpressionAttributeValues)))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, {conditionExpression:'a', expressionAttributeNames: {b:1}, expressionAttributeValues: {c:2}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column name changed', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeNames['#a'] === 'hash' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, {conditionExpression:'#a', expressionAttributeNames: {'#a':'name'}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - objid column value is prefixed, id isn\'t', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeValues['id'] === 123 && p.Put.ExpressionAttributeValues['objid'] === 'user#123' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(EntityWithDataPrefix, {}, {conditionExpression:'a', expressionAttributeValues: {id:123, objid:123}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column value prefixed', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeValues['name'] === 'user#new name' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(EntityWithDataPrefix, {}, {conditionExpression:'a', expressionAttributeValues: {name:'new name'}}, mockedTransaction.object);

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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
    });

    it('find() - pagination - more pages', async () =>
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
        let response2 = getMockedQueryResponse({LastEvaluatedKey: <any>'lek2', Items:<any>[{id:99, objid:99}]});

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
        assert.equal(entities.lastEvaluatedKey, <any>'lek2');
        assert.equal(entities.items.length, 2);
        assert.equal(entities.items[0].id, 42);
        assert.equal(entities.items[1].id, 99);
    });

    it('find() - pagination - last page', async () =>
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
        assert.equal(entities.lastEvaluatedKey, undefined);
        assert.equal(entities.items.length, 2);
        assert.equal(entities.items[0].id, 42);
        assert.equal(entities.items[1].id, 99);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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
        assert.equal(entities.items.length, 1);
        assert.equal(entities.items[0].id, 42);
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

        let errorIsThrown = false;

        try
        {
            await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);
        }
        catch
        {
            errorIsThrown = true;
        }

        assert.isTrue(errorIsThrown);
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
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'created' && t.Put.Item.name === 'New Two' && t.Put.ConditionExpression === 'condition' && t.Put.ExpressionAttributeNames['#n'] === 'name' && t.Put.ExpressionAttributeValues[':v'] === true))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'order' && t.Put.Item.name === 'New Two' && t.Put.ConditionExpression === 'condition' && t.Put.ExpressionAttributeNames['#n'] === 'name' && t.Put.ExpressionAttributeValues[':v'] === true))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, condition, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isFalse(deleted);
    });

    it('delete()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:42}, {hash: 'hash2', range: 'range2', id:42}]})
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#42'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete.TableName && t.Delete.Key.hash === 'hash1' && t.Delete.Key.range === 'range1'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete.TableName && t.Delete.Key.hash === 'hash2' && t.Delete.Key.range === 'range2'))).callback(()=>deleted2=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.delete(Entity, 42, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(deleted);
        assert.isTrue(deleted2);
    });

    it('delete() - with condition', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };
        
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:42}]})
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#42'))).callback(()=>called=true).returns(()=>findResponse.object);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete.TableName && t.Delete.Key.hash === 'hash1' && t.Delete.Key.range === 'range1' && t.Delete.ConditionExpression === 'condition' && t.Delete.ExpressionAttributeNames['#n'] === 'name' && t.Delete.ExpressionAttributeValues[':v'] === true))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.delete(Entity, 42,{conditionExpression: 'condition', expressionAttributeNames: {'#n': 'name'}, expressionAttributeValues: {':v': true}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(deleted)
    });

    it('delete() - nonexistent item', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[]})
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#42'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete.TableName && t.Delete.Key.hash === 'hash1' && t.Delete.Key.range === 'range1'))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.delete(Entity, 42, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isFalse(deleted)
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
function getMockedDeleteResponse(response:DeleteItemOutput): IMock<Request<DeleteItemOutput, AWSError>>
{
    let mock = Mock.ofType<Request<DeleteItemOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}