import {
    DynamoDB,
    GetItemCommand,
    GetItemCommandOutput,
    QueryCommand,
    QueryCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import AggregateError = require('aggregate-error');
import { assert } from 'chai';
import { IMock, It, Mock } from 'typemoq';

import { DBColumn, DBTable } from '../../src';
import { Const } from '../../src/const';
import { VersionError } from '../../src/errors/versionError';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';

describe('DynamoDbManager.Apply()', function ()
{
    let mockedClient:IMock<DynamoDB>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let updated1:boolean;
    let updated2:boolean;
    let updated3:boolean;
    let called:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDB>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        updated1 = false;
        updated2 = false;
        updated3 = false;
        called = false;
    });


    function matches(val1?:any[], val2?: any[]): boolean {
        try {
            assert.deepEqual(val1, val2)
            return true;
        }
        catch(e){
            return false;
        }
    }

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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) =>
            !!p.input.TableName && p.input.IndexName === Const.IdIndexName 
            && p.input.KeyConditionExpression === '#objid = :objid' 
            && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn
            && p.input.ExpressionAttributeValues?.[':objid']['S'] === 'entity#1')
        )).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = {Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}].map(item => marshall(item))};
        mockedClient.setup(q => q.send(
            It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName )
        )).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);
        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'REMOVE remove1,remove2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'REMOVE remove1,remove2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = {Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}].map(item => marshall(item))};
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input?.ExpressionAttributeValues?.[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand)  => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand)  => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ADD add1,add2 REMOVE remove1,remove2 SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ADD add1,add2 REMOVE remove1,remove2 SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created'}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand)  => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1'))).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ConditionExpression === 'condition'))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any)  =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1'))).callback(()=>called=true).returns( async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            !t.Update.ExpressionAttributeNames['#objver'] &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            !t.Update.ExpressionAttributeValues[':objver'] &&
            !t.Update.ExpressionAttributeValues[':objverincrementby'] &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            !t.Update.ExpressionAttributeNames['#objver'] &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1'))).callback(()=>called=true).returns( async ()=> findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
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

        let findResponse = ({Items: <any>[{hash: 'hash1', range: 'range1', id:1, name:'Some One', created:'created', objver:2}, {hash: 'hash2', range: 'range2', id:1, name:'Some Two', created:'created', objver:2}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash1' &&
            t.Update.Key.range['S'] === 'range1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
            t.Update.ConditionExpression === '(#objver <= :objver) and (condition)'))).callback(()=>updated1=true);

        mockedTransaction.setup((t: any) => t.add(It.is((t: any) =>
            t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key.hash['S'] === 'hash2' &&
            t.Update.Key.range['S'] === 'range2' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues[':v']['S'] === '42' &&
            t.Update.ExpressionAttributeValues[':objver']['N'] === "2" &&
            t.Update.ExpressionAttributeValues[':objverincrementby']['N'] === "1" &&
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
         let findResponse1 = ({Items: [
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        let getResponse = ({Item: 
            marshall({hash: 'hash', range: 'range', id:1, objver: 2, name:'Some One'}),
        });

        let calledGetById = false;
        let calledGetOne = false;
        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] === 'entity#1')))
                    .callback(()=>calledGetById=true)
                    .returns(async ()=>findResponse1 as QueryCommandOutput);

        mockedClient.setup(q => q.send(It.is((p: GetItemCommand) => !!p.input.TableName && p.input.Key?.[Const.HashColumn]['S'] === 'entity#1' && p.input.Key?.[Const.RangeColumn]['S'] === 'nodenamo')))
                    .callback(()=>calledGetOne=true)
                    .returns(async ()=>getResponse as GetItemCommandOutput);

        mockedTransaction.setup((t: any) => t.commit()).throws(new AggregateError([new Error('Simulated error - ConditionalCheckFailed')]));

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
         let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});

        mockedClient.setup(q => q.send(It.is((p: QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid']['S'] as any === 'entity#1')))
                    .callback(()=>called=true)
                    .returns( async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup((t: any) => t.commit()).throws(new Error('Simulated error'));

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
        assert.equal(error?.['message'], 'Simulated error');
    });
});