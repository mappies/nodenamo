import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, QueryOutput, GetItemOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../../src';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import {Const} from '../../src/const';
import { AWSError } from 'aws-sdk/lib/error';
import { Request } from 'aws-sdk/lib/request';
import { VersionError } from '../../src/errors/versionError';
import AggregateError = require('aggregate-error');

describe('DynamoDbManager.Apply()', function ()
{
    let mockedClient:IMock<DocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let updated1:boolean;
    let updated2:boolean;
    let updated3:boolean;
    let called:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        updated1 = false;
        updated2 = false;
        updated3 = false;
        called = false;
    });

    it('apply() - set', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {set: ['set1', 'set2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - remove', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'REMOVE remove1,remove2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'REMOVE remove1,remove2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {remove: ['remove1', 'remove2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - add', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - delete', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {delete: ['delete1', 'delete2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - set/add/delete/remove', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ADD add1,add2 REMOVE remove1,remove2 SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ADD add1,add2 REMOVE remove1,remove2 SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {set: ['set1', 'set2'], remove: ['remove1', 'remove2'], add: ['add1', 'add2'], delete: ['delete1', 'delete2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a condition', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ConditionExpression === 'condition'))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ConditionExpression === 'condition'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a version check', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a version check (false)', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            !t.Update.ExpressionAttributeNames['#objver'] &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ExpressionAttributeValues[':objver'] &&
            !t.Update.ExpressionAttributeValues[':objverincrementby'] &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            !t.Update.ExpressionAttributeNames['#objver'] &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            !t.Update.ExpressionAttributeValues[':objver'] &&
            !t.Update.ExpressionAttributeValues[':objverincrementby'] &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: false}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a version check (table-level)', async () =>
    {
        @DBTable({versioning:true})
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a version check (table-level) will not be overridden by withVersionCheck(false)', async () =>
    {
        @DBTable({versioning:true})
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: false}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a condition and a version check', async () =>
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
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash1' &&
            t.Update.Key.range === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver) and (condition)'))).callback(()=>updated1=true);

        mockedTransaction.setup(t => t.add(It.is(t =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash === 'hash2' &&
            t.Update.Key.range === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver'] === 2 &&
            t.Update.ExpressionAttributeValues[':objverincrementby'] === 1 &&
            t.Update.ConditionExpression === '(#objver <= :objver) and (condition)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(updated1);
        assert.isTrue(updated2);
    });

    it('apply() - with a version check - failed because of versioning', async () =>
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
        let getResponse = getMockedGetResponse({Item: <any>
            {hash: 'hash', range: 'range', id:1, objver: 2, name:'Some One'},
        });

        let calledGetById = false;
        let calledGetOne = false;

        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1')))
                    .callback(()=>calledGetById=true)
                    .returns(()=>findResponse1.object);

        mockedClient.setup(q => q.get(It.is(p => !!p.TableName && p.Key[Const.HashColumn] === 'entity#1' && p.Key[Const.RangeColumn] === 'nodenamo')))
                    .callback(()=>calledGetOne=true)
                    .returns(()=>getResponse.object);

        mockedTransaction.setup(t => t.commit()).throws(new AggregateError([new Error('Simulated error - ConditionalCheckFailed')]));

        let manager = new DynamoDbManager(mockedClient.object);
        let error = undefined;
        try
        {
            await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.instanceOf(error, VersionError);
        assert.isTrue(calledGetById);
        assert.isTrue(calledGetOne);
    });

    it('apply() - with a version check - failed because of a non-versioning issue', async () =>
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
         let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});

        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1')))
                    .callback(()=>called=true)
                    .returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.commit()).throws(new Error('Simulated error'));

        let manager = new DynamoDbManager(mockedClient.object);
        let error = undefined;
        try
        {
            await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.notInstanceOf(error, VersionError);
        assert.equal(error.message, 'Simulated error');
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
