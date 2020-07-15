import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../../src';
import { AWSError } from 'aws-sdk/lib/error';
import { Request } from 'aws-sdk/lib/request';
import { Const } from '../../src/const';
import { Reflector } from '../../src/reflector';

describe('DynamoDbManager.Find()', function () 
{
    let mockedClient:IMock<DocumentClient>;
    let called:boolean;
    let obj:object;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        called = false;
        
        obj = {id:42};
        obj[Const.VersionColumn] = 1;
    });

    it('find()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => 
            !!p.TableName 
            && p.KeyConditionExpression === '#id = :id' 
            && p.ExpressionAttributeNames['#id'] === 'id' 
            && p.ExpressionAttributeValues[':id'] === 42
            && p.FilterExpression === undefined
            && p.ProjectionExpression === undefined))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'#id = :id', expressionAttributeNames: {'#id': 'id'}, expressionAttributeValues: {':id': 42}});

        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], {id:42});
        assert.equal(Reflector.getObjectVersion(entities.items[0]), 1);
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

        let response = getMockedQueryResponse({Items:<any>[obj]});

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

        let response1 = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === '#id = :id'
                                                    && p.ExpressionAttributeNames['#id'] === 'hash'
                                                    && p.ExpressionAttributeValues[':id'] === 'entity#42'))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'#id = :id', expressionAttributeNames:{'#id': 'id'}, expressionAttributeValues:{':id': 42}});
        
        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], {id:42});
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

        let response = getMockedQueryResponse({Items:<any>[obj]});

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
        let response1 = getMockedQueryResponse({LastEvaluatedKey: <any> {range:'lek1'}, Items:<any>[{id:42, hash: '42_hash', range: '42_range', objid:42}]});
        let response2 = getMockedQueryResponse({LastEvaluatedKey: <any> {range:'lek2'}, Items:<any>[{id:99, hash: '99_hash', range: '99_range', objid:99}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === undefined
                                                    && p.Limit === undefined))).callback(()=>page1called=true).returns(()=>response1.object);

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey?.range === <any>'lek1'
                                                    && p.Limit === undefined))).callback(()=>page2called=true).returns(()=>response2.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.isTrue(page1called);
        assert.isTrue(page2called);
        assert.deepEqual(entities.lastEvaluatedKey, {hash: '99_hash', range:'99_range'});
        assert.equal(entities.items.length, 2);
        assert.deepEqual(entities.items[0], {id:42});
        assert.deepEqual(entities.items[1], {id:99});
    });

    it('find() - pagination - more pages with a fetchSize', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let page1called = false;
        let page2called = false;
        let response1 = getMockedQueryResponse({LastEvaluatedKey: <any> {range:'lek1'}, Items:<any>[{id:42, hash: '42_hash', range: '42_range', objid:42}]});
        let response2 = getMockedQueryResponse({LastEvaluatedKey: <any> {range:'lek2'}, Items:<any>[{id:99, hash: '99_hash', range: '99_range', objid:99}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === undefined
                                                    && p.Limit === 5))).callback(()=>page1called=true).returns(()=>response1.object);

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey?.range === <any>'lek1'
                                                    && p.Limit === 5))).callback(()=>page2called=true).returns(()=>response2.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2, fetchSize:5});
        
        assert.isTrue(page1called);
        assert.isTrue(page2called);
        assert.deepEqual(entities.lastEvaluatedKey, {hash: '99_hash', range:'99_range'});
        assert.equal(entities.items.length, 2);
        assert.deepEqual(entities.items[0], {id:42});
        assert.deepEqual(entities.items[1], {id:99});
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
        let response1 = getMockedQueryResponse({LastEvaluatedKey: <any>{hash: 'lek1h', range:'lek1r'}, Items:<any>[{id:42, hash: '42_hash', range: '42_range', objid:42}]});
        let response2 = getMockedQueryResponse({Items:<any>[{id:99, hash:'99_hash', range: '99_range', objid:99}]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === undefined
                                                    && p.Limit === undefined))).callback(()=>page1called=true).returns(()=>response1.object);

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey?.hash === 'lek1h'
                                                    && p.ExclusiveStartKey?.range === 'lek1r'
                                                    && p.Limit === undefined))).callback(()=>page2called=true).returns(()=>response2.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.isTrue(page1called);
        assert.isTrue(page2called);
        assert.isUndefined(entities.lastEvaluatedKey);
        assert.equal(entities.items.length, 2);
        assert.deepEqual(entities.items[0], {id:42});
        assert.deepEqual(entities.items[1], {id:99});
    });

    it('find() - not skipping fetched items', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({LastEvaluatedKey: <any> {hash: 'lek1h', range: 'lek1r'}, 
                                                Items:<any>[
                                                    {id:42, hash: '42_hash', range: '42_range', objid:42},
                                                    {id:43, hash: '43_hash', range: '43_range', objid:43}
                                                    ,{id:99, hash: '99_hash', range: '99_range', objid:99}
                                                ]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === undefined
                                                    && p.Limit === undefined))).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.deepEqual(entities.lastEvaluatedKey, <any>{hash: '43_hash', range:'43_range'});
        assert.equal(entities.items.length, 2);
        assert.deepEqual(entities.items[0], {id:42});
        assert.deepEqual(entities.items[1], {id:43});
    });

    it('find() - not skipping fetched items - last page', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({LastEvaluatedKey: undefined, 
                                                Items:<any>[
                                                    {id:42, hash: '42_hash', range: '42_range', objid:42},
                                                    {id:43, hash: '43_hash', range: '43_range', objid:43}
                                                    ,{id:99, hash: '99_hash', range: '99_range', objid:99}
                                                ]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.FilterExpression === 'fcondition'
                                                    && p.ExclusiveStartKey === undefined
                                                    && p.Limit === undefined))).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.deepEqual(entities.lastEvaluatedKey, <any>{hash:'43_hash', range:'43_range'});
        assert.equal(entities.items.length, 2);
        assert.deepEqual(entities.items[0], {id:42});
        assert.deepEqual(entities.items[1], {id:43});
    });

    it('find() - index', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[obj]});

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
        assert.deepEqual(entities.items[0], {id:42});
    });

    it('find() - exclusive start key', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[obj]});

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
        assert.deepEqual(entities.items[0], {id:42});
    });

    it('find() - sort order - reversed', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.ScanIndexForward === false))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       undefined,
                                       {order:-1});
        
        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], {id:42});
    });

    it('find() - sort order - forwarded', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response1 = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => p.KeyConditionExpression === 'kcondition'
                                                    && p.ScanIndexForward === true))).callback(()=>called=true).returns(()=>response1.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       undefined,
                                       {order:1});
        
        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], {id:42});
    });

    it('find() - projections', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            propertyName1:string;

            @DBColumn({name:"targetName"})
            propertyName2:string;
        };

        let response = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => 
            !!p.TableName 
            && p.KeyConditionExpression === 'condition'
            && p.ExpressionAttributeNames['#newName'] === '42'
            && p.ExpressionAttributeNames['#propertyName1'] === 'propertyName1'
            && p.ExpressionAttributeNames['#propertyName2'] === 'targetName'
            && p.ExpressionAttributeNames[`#${Const.HashColumn}`] === Const.HashColumn
            && p.ExpressionAttributeNames[`#${Const.RangeColumn}`] === Const.RangeColumn
            && p.ExpressionAttributeNames[`#${Const.IdColumn}`] === Const.IdColumn
            && p.ExpressionAttributeNames[`#${Const.VersionColumn}`] === Const.VersionColumn
            && p.ProjectionExpression === `#propertyName1,#propertyName2,#${Const.HashColumn},#${Const.RangeColumn},#${Const.IdColumn},#${Const.VersionColumn}`))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'condition', expressionAttributeNames:{'#newName':'42'}},
                                       {},
                                       {projections: ["propertyName1", "propertyName2"]});

        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], <any>{id:42});
        assert.equal(Reflector.getObjectVersion(entities.items[0]), 1);
    });

    it('find() - projections - skipped unrecognized property', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            propertyName1:string;

            @DBColumn({name:"targetName"})
            propertyName2:string;
        };

        let response = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => 
            !!p.TableName 
            && p.KeyConditionExpression === 'condition' 
            && p.ExpressionAttributeNames['#newName'] === '42'
            && p.ExpressionAttributeNames['#propertyName1'] === 'propertyName1'
            && p.ExpressionAttributeNames[`#${Const.HashColumn}`] === Const.HashColumn
            && p.ExpressionAttributeNames[`#${Const.RangeColumn}`] === Const.RangeColumn
            && p.ExpressionAttributeNames[`#${Const.IdColumn}`] === Const.IdColumn
            && p.ExpressionAttributeNames[`#${Const.VersionColumn}`] === Const.VersionColumn
            && p.ProjectionExpression === `#propertyName1,#${Const.HashColumn},#${Const.RangeColumn},#${Const.IdColumn},#${Const.VersionColumn}`))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'condition', expressionAttributeNames:{'#newName':'42'}},
                                       {},
                                       {projections: ["invalidName", "propertyName1", "targetName"]});

        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], <any>{id:42});
        assert.equal(Reflector.getObjectVersion(entities.items[0]), 1);
    });

    it('find() - projections - empty array', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            propertyName1:string;

            @DBColumn({name:"targetName"})
            propertyName2:string;
        };

        let response = getMockedQueryResponse({Items:<any>[obj]});

        mockedClient.setup(q => q.query(It.is(p => 
            !!p.TableName 
            && p.KeyConditionExpression === 'condition' 
            && p.ProjectionExpression === undefined))).callback(()=>called=true).returns(()=>response.object);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'condition'},
                                       {},
                                       {projections: []});

        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], <any>{id:42});
        assert.equal(Reflector.getObjectVersion(entities.items[0]), 1);
    });
});

function getMockedQueryResponse(response:QueryOutput): IMock<Request<QueryOutput, AWSError>>
{
    let mock = Mock.ofType<Request<QueryOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}