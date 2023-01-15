import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DynamoDB, QueryCommandOutput, QueryOutput, ServiceOutputTypes } from '@aws-sdk/client-dynamodb';
import { DBTable, DBColumn } from '../../src';
import { Const } from '../../src/const';
import { Reflector } from '../../src/reflector';
import { marshall } from '@aws-sdk/util-dynamodb';

describe('DynamoDbManager.Find()', function () 
{
    let mockedClient:IMock<DynamoDB>;
    let called:boolean;
    let obj:object;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDB>();
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

        let response = {Items: [obj].map(item => marshall(item))};

        mockedClient.setup(q => q.send(It.is((p:any) => 
             !!p.input.TableName 
            && p.input.KeyConditionExpression === '#id = :id' 
            && p.input.ExpressionAttributeNames['#id'] === 'id' 
            && p.input.ExpressionAttributeValues[':id']['N'] === "42"
            && p.input.FilterExpression === undefined
            && p.input.ProjectionExpression === undefined))).callback(()=>called=true).returns(async ()=>response as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'#id = :id', expressionAttributeNames: {'#id': 'id'}, expressionAttributeValues: {':id': 42}});

        assert.isTrue(called);
        assert.equal(entities.items.length, 1);
        assert.deepEqual(entities.items[0], {id:42});
        assert.equal(Reflector.getObjectVersion(entities.items[0]), 1);
    });

    [ 
        {tableStrongConsistent: true, callWithStrongConsistent: false, expectedQueryConsistentRead: true},
        {tableStrongConsistent: true, callWithStrongConsistent: true, expectedQueryConsistentRead: true},
        {tableStrongConsistent: undefined, callWithStrongConsistent: true, expectedQueryConsistentRead: true},
        {tableStrongConsistent: undefined, callWithStrongConsistent: false, expectedQueryConsistentRead: false},
        {tableStrongConsistent: false, callWithStrongConsistent: false, expectedQueryConsistentRead: false},
        {tableStrongConsistent: false, callWithStrongConsistent: true, expectedQueryConsistentRead: true},
        {tableStrongConsistent: true, callWithStrongConsistent: undefined, expectedQueryConsistentRead: true},
        {tableStrongConsistent: false, callWithStrongConsistent: undefined, expectedQueryConsistentRead: false},
        {tableStrongConsistent: undefined, callWithStrongConsistent: undefined, expectedQueryConsistentRead: false}
    ]
    .forEach(test => 
    { 
        it(`find() - Table.stronglyConsistent is ${test.tableStrongConsistent}, called with ${test.callWithStrongConsistent} should set Query.ConsistentRead to ${test.expectedQueryConsistentRead}`, async () =>
        {
            @DBTable({stronglyConsistent: test.tableStrongConsistent})
            class Entity
            {
                @DBColumn()
                id:number;
            };

            let response = ({Items:[obj].map(item => marshall(item))});

            mockedClient.setup(q => q.send(It.is((p:any) => 
                !!p.input.TableName 
                && p.input.KeyConditionExpression === '#id = :id' 
                && p.input.ExpressionAttributeNames['#id'] === 'id' 
                && p.input.ExpressionAttributeValues[':id']['N'] === "42"
                && p.input.FilterExpression === undefined
                && p.input.ProjectionExpression === undefined
                && p.input.ConsistentRead === test.expectedQueryConsistentRead
            ))).callback(()=>called=true).returns(async ()=>response as QueryCommandOutput);

            let manager = new DynamoDbManager(mockedClient.object);
            let entities = await manager.find(Entity, 
                                        {keyConditions:'#id = :id', expressionAttributeNames: {'#id': 'id'}, expressionAttributeValues: {':id': 42}},
                                        undefined,
                                        {stronglyConsistent: test.callWithStrongConsistent});

            assert.isTrue(called);
            assert.equal(entities.items.length, 1);
            assert.deepEqual(entities.items[0], {id:42});
            assert.equal(Reflector.getObjectVersion(entities.items[0]), 1);
        });
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

        let response = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName 
                                                    && p.input.KeyConditionExpression === '#id = :id' 
                                                    && p.input.ExpressionAttributeNames['#id'] === 'id' 
                                                    && p.input.ExpressionAttributeValues[':id']['N'] === "42"
                                                    && p.input.FilterExpression === '#created > :created' 
                                                    && p.input.ExpressionAttributeNames['#created'] === 'created' 
                                                    && p.input.ExpressionAttributeValues[':created']['N'] === "2019"))).callback(()=>called=true).returns(async ()=>response as QueryCommandOutput);

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

        let response1 = ({Items:<any>[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === '#id = :id'
                                                    && p.input.ExpressionAttributeNames['#id'] === 'hash'
                                                    && p.input.ExpressionAttributeValues[':id']['S'] === 'entity#42'))).callback(()=>called=true).returns(async ()=>response1 as QueryCommandOutput);

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

        let response = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName 
                                                    && p.input.ExpressionAttributeNames['#id'] === 'id' 
                                                    && p.input.ExpressionAttributeValues[':id']['N'] === "42"
                                                    && p.input.ExpressionAttributeNames['#objid'] === 'objid' 
                                                    && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#42'
                                                    && p.input.ExpressionAttributeNames['#name'] === 'hash' 
                                                    && p.input.ExpressionAttributeValues[':name']['S'] === 'entity#Some One'))).callback(()=>called=true).returns(async ()=>response as QueryCommandOutput);

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
        let response1 = ({LastEvaluatedKey: <any> {range:'lek1'}, Items:[{id:42, hash: '42_hash', range: '42_range', objid:42}].map(item => marshall(item))});
        let response2 = ({LastEvaluatedKey: <any> {range:'lek2'}, Items:[{id:99, hash: '99_hash', range: '99_range', objid:99}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                        && p.input.FilterExpression === 'fcondition'
                                                        && p.input.ExclusiveStartKey === undefined
                                                        && p.input.Limit === undefined))).callback(()=>page1called=true).returns(async ()=> response1 as QueryCommandOutput);
        
        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey?.range['S'] === 'lek1'
                                                    && p.input.Limit === undefined))).callback(()=>page2called=true).returns(async ()=> response2 as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.isTrue(page1called);
        assert.isTrue(page2called);
        assert.equal(entities.lastEvaluatedKey, "eyJoYXNoIjoiOTlfaGFzaCIsInJhbmdlIjoiOTlfcmFuZ2UifQ==");
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
        let response1 = ({LastEvaluatedKey: <any> {range:'lek1'}, Items:<any>[{id:42, hash: '42_hash', range: '42_range', objid:42}].map(item => marshall(item))});
        let response2 = ({LastEvaluatedKey: <any> {range:'lek2'}, Items:<any>[{id:99, hash: '99_hash', range: '99_range', objid:99}].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey === undefined
                                                    && p.input.Limit === 5))).callback(()=>page1called=true).returns(async ()=>response1 as QueryCommandOutput);

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey?.range['S'] === <any>'lek1'
                                                    && p.input.Limit === 5))).callback(()=>page2called=true).returns(async ()=>response2 as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2, fetchSize:5});
        
        assert.isTrue(page1called);
        assert.isTrue(page2called);
        assert.equal(entities.lastEvaluatedKey, "eyJoYXNoIjoiOTlfaGFzaCIsInJhbmdlIjoiOTlfcmFuZ2UifQ==");
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
        let response1 = ({LastEvaluatedKey: <any>{hash: 'lek1h', range:'lek1r'}, Items:<any>[{id:42, hash: '42_hash', range: '42_range', objid:42}].map(item => marshall(item))});
        let response2 = ({Items:<any>[{id:99, hash:'99_hash', range: '99_range', objid:99}].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey === undefined
                                                    && p.input.Limit === undefined))).callback(()=>page1called=true).returns( async ()=>response1 as QueryCommandOutput);

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey?.hash['S'] === 'lek1h'
                                                    && p.input.ExclusiveStartKey?.range['S'] === 'lek1r'
                                                    && p.input.Limit === undefined))).callback(()=>page2called=true).returns( async ()=>response2 as QueryCommandOutput);

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

        let response1 = ({LastEvaluatedKey: <any> {hash: 'lek1h', range: 'lek1r'}, 
                                                Items:[
                                                    {id:42, hash: '42_hash', range: '42_range', objid:42},
                                                    {id:43, hash: '43_hash', range: '43_range', objid:43}
                                                    ,{id:99, hash: '99_hash', range: '99_range', objid:99}
                                                ].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey === undefined
                                                    && p.input.Limit === undefined))).returns(async ()=>response1 as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.equal(entities.lastEvaluatedKey, 'eyJoYXNoIjoiNDNfaGFzaCIsInJhbmdlIjoiNDNfcmFuZ2UifQ==');
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

        let response1 = ({LastEvaluatedKey: undefined, 
                                                Items:<any>[
                                                    {id:42, hash: '42_hash', range: '42_range', objid:42},
                                                    {id:43, hash: '43_hash', range: '43_range', objid:43}
                                                    ,{id:99, hash: '99_hash', range: '99_range', objid:99}
                                                ].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey === undefined
                                                    && p.input.Limit === undefined))).returns(async ()=>response1 as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {limit:2});
        
        assert.equal(entities.lastEvaluatedKey, 'eyJoYXNoIjoiNDNfaGFzaCIsInJhbmdlIjoiNDNfcmFuZ2UifQ==');
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

        let response1 = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.IndexName === 'custom-index'))).callback(()=>called=true).returns(async ()=>response1 as QueryCommandOutput);

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

        let response1 = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.FilterExpression === 'fcondition'
                                                    && p.input.ExclusiveStartKey['hash']['S'] === '43_hash'
                                                    && p.input.ExclusiveStartKey['range']['S'] === '43_range'
                                                    ))).callback(()=>called=true).returns(async ()=>response1 as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entities = await manager.find(Entity, 
                                       {keyConditions:'kcondition'},
                                       {filterExpression:'fcondition'},
                                       {exclusiveStartKey:'eyJoYXNoIjoiNDNfaGFzaCIsInJhbmdlIjoiNDNfcmFuZ2UifQ=='});
        
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

        let response1 = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.ScanIndexForward === false))).callback(()=>called=true).returns(async ()=>response1 as QueryCommandOutput);

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

        let response1 = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => p.input.KeyConditionExpression === 'kcondition'
                                                    && p.input.ScanIndexForward === true))).callback(()=>called=true).returns(async ()=>response1 as QueryCommandOutput);

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

        let response = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => 
            !!p.input.TableName 
            && p.input.KeyConditionExpression === 'condition'
            && p.input.ExpressionAttributeNames['#newName'] === '42'
            && p.input.ExpressionAttributeNames['#propertyName1'] === 'propertyName1'
            && p.input.ExpressionAttributeNames['#propertyName2'] === 'targetName'
            && p.input.ExpressionAttributeNames[`#${Const.HashColumn}`] === Const.HashColumn
            && p.input.ExpressionAttributeNames[`#${Const.RangeColumn}`] === Const.RangeColumn
            && p.input.ExpressionAttributeNames[`#${Const.IdColumn}`] === Const.IdColumn
            && p.input.ExpressionAttributeNames[`#${Const.VersionColumn}`] === Const.VersionColumn
            && p.input.ProjectionExpression === `#propertyName1,#propertyName2,#${Const.HashColumn},#${Const.RangeColumn},#${Const.IdColumn},#${Const.VersionColumn}`))).callback(()=>called=true).returns(async()=>response as QueryCommandOutput);

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

        let response = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => 
            !!p.input.TableName 
            && p.input.KeyConditionExpression === 'condition' 
            && p.input.ExpressionAttributeNames['#newName'] === '42'
            && p.input.ExpressionAttributeNames['#propertyName1'] === 'propertyName1'
            && p.input.ExpressionAttributeNames[`#${Const.HashColumn}`] === Const.HashColumn
            && p.input.ExpressionAttributeNames[`#${Const.RangeColumn}`] === Const.RangeColumn
            && p.input.ExpressionAttributeNames[`#${Const.IdColumn}`] === Const.IdColumn
            && p.input.ExpressionAttributeNames[`#${Const.VersionColumn}`] === Const.VersionColumn
            && p.input.ProjectionExpression === `#propertyName1,#${Const.HashColumn},#${Const.RangeColumn},#${Const.IdColumn},#${Const.VersionColumn}`))).callback(()=>called=true).returns(async ()=>response as QueryCommandOutput);

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

        let response = ({Items:[obj].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p:any) => 
            !!p.input.TableName 
            && p.input.KeyConditionExpression === 'condition' 
            && p.input.ProjectionExpression === undefined))).callback(()=>called=true).returns(async ()=>response as QueryCommandOutput);

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