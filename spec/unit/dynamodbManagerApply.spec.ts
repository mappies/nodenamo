import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { TransactWriteItem, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { DBTable, DBColumn } from '../../src';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import {Const} from '../../src/const';
import { VersionError } from '../../src/errors/versionError';
import AggregateError from 'aggregate-error';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

describe('DynamoDbManager.Apply()', function ()
{
    let mockedClient:IMock<DynamoDBDocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let updated1:boolean;
    let updated2:boolean;
    let representationsToUpdateCreatedFromStronglyConsistentRead:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDBDocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        updated1 = false;
        updated2 = false;
        representationsToUpdateCreatedFromStronglyConsistentRead = false;
    });

    it('apply() - set', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:string;
        };
        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created'});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {set: ['set1', 'set2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - remove', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:string;

            @DBColumn()
            name:string;

            @DBColumn()
            created:string;
        };
        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created'});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'REMOVE remove1,remove2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'REMOVE remove1,remove2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {remove: ['remove1', 'remove2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - add', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created'});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - delete', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };
    
        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created'});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {delete: ['delete1', 'delete2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - set/add/delete/remove', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created'});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ADD add1,add2 REMOVE remove1,remove2 SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'DELETE delete1,delete2 ADD add1,add2 REMOVE remove1,remove2 SET set1,set2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {set: ['set1', 'set2'], remove: ['remove1', 'remove2'], add: ['add1', 'add2'], delete: ['delete1', 'delete2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a condition', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created'});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ConditionExpression === 'condition'))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ConditionExpression === 'condition'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a version check', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:2});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a version check (false)', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:2});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            !t.Update.ExpressionAttributeNames['#objver'] &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ExpressionAttributeValues[':objver'] &&
            !t.Update.ExpressionAttributeValues[':objverincrementby'] &&
            !t.Update.ConditionExpression))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2 ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            !t.Update.ExpressionAttributeNames['#objver'] &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            !t.Update.ExpressionAttributeValues[':objver'] &&
            !t.Update.ExpressionAttributeValues[':objverincrementby'] &&
            !t.Update.ConditionExpression))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: false}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a version check (table-level)', async () =>
    {
        @DBTable({versioning:true})
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:2});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a version check (table-level) will not be overridden by withVersionCheck(false)', async () =>
    {
        @DBTable({versioning:true})
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:2});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: false}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a condition and a version check', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;

            @DBColumn()
            created:number;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:2});

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#1' &&
            t.Update.Key?.range['S'] === 'nodenamo' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver) and (condition)'))).callback(()=>updated1=true);

        mockedTransaction.setup((tx:DynamoDbTransaction) => tx.add(It.is((t:TransactWriteItem) =>
            !!t.Update &&
            t.Update.TableName === 'Entity' &&
            t.Update.Key?.hash['S'] === 'entity#nodenamo' &&
            t.Update.Key?.range['S'] === 'nodenamo#1' &&
            t.Update.UpdateExpression === 'ADD add1,add2,#objver :objverincrementby ' &&
            t.Update.ExpressionAttributeNames?.['#k'] === 'key' &&
            t.Update.ExpressionAttributeNames['#objver'] === Const.VersionColumn &&
            t.Update.ExpressionAttributeValues?.[':v']['N'] === '42' &&
            t.Update.ExpressionAttributeValues?.[':objver']['N'] === '2' &&
            t.Update.ExpressionAttributeValues?.[':objverincrementby']['N'] === '1' &&
            t.Update.ConditionExpression === '(#objver <= :objver) and (condition)'))).callback(()=>updated2=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);

        assert.isTrue(updated1);
        assert.isTrue(updated2);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a version check - failed because of versioning', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:1});
        
        //Simulate object changes from objver 1 to 2.
        let getResponse = <any>{Item:
            marshall({hash: 'hash', range: 'range', id:1, objver: 2, name:'Some One'}),
        };

        let calledGetOne = false;

        mockedClient.setup(q => q.send(It.is((p: GetItemCommand) => !!p.input.TableName && p.input.Key?.[Const.HashColumn]['S'] === 'entity#1' && p.input.Key?.[Const.RangeColumn]['S'] === 'nodenamo')))
                    .callback(()=>calledGetOne=true)
                    .returns(()=>new Promise((resolve)=>resolve(getResponse)));

        mockedTransaction.setup(t => t.commit()).throws(new AggregateError([new Error('Simulated error - ConditionalCheckFailed')]));

        let manager = new DynamoDbManager(mockedClient.object);
        let error:Error|undefined = undefined;
        try
        {
            await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.instanceOf(error, VersionError);
        assert.isTrue(calledGetOne);
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    it('apply() - with a version check - failed because of a non-versioning issue', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({ id:true })
            id:number;

            @DBColumn()
            name:string;
        };

        setupStronglyConsistentRead({hash: 'nodenamoentity#1', range: 'nodenamo', objid:"nodenamoentity#1", id:1, name:'Some One', created:'created', objver:1});

        mockedTransaction.setup(t => t.commit()).throws(new Error('Simulated error'));

        let manager = new DynamoDbManager(mockedClient.object);
        let error:Error|undefined = undefined;
        try
        {
            await manager.apply(Entity, 1, {updateExpression: {add: ['add1', 'add2']}, conditionExpression: 'condition', expressionAttributeNames: {'#k':'key'}, expressionAttributeValues: {':v': 42}, versionCheck: true}, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.notInstanceOf(error, VersionError);
        assert.equal(error?.message, 'Simulated error');
        assert.isTrue(representationsToUpdateCreatedFromStronglyConsistentRead);
    });

    function setupStronglyConsistentRead(expectedItem:object)
    {
        let stronglyConsistentResponse = <any>{Item:<any>marshall(expectedItem)}

        mockedClient.setup(c => c.send(It.is((p: GetItemCommand) =>
            !!p.input.TableName
            && p.input.Key?.[Const.HashColumn]['S'] === 'entity#1'
            && p.input.Key?.[Const.RangeColumn]['S'] === 'nodenamo' 
            && p.input.ConsistentRead === true)))
            .callback(()=>representationsToUpdateCreatedFromStronglyConsistentRead=true)
            .returns(()=> new Promise((resolve) => resolve(stronglyConsistentResponse)));
    }
});