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

describe('DynamoDbManager.Update()', function ()
{
    let mockedClient:IMock<DocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let put:boolean;
    let put2:boolean;
    let put3:boolean;
    let called:boolean;
    let deleted:boolean;
    let deleted2:boolean;
    let desiredObjectCreatedFromStronglyConsistentRead:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        put = false;
        put2 = false;
        put3 = false;
        called = false;
        deleted = false;
        deleted2 = false;
        desiredObjectCreatedFromStronglyConsistentRead = false;
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

        setupStronglyConsistentRead({hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'});
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);
        assert.isTrue(called);
    });

    it('update() - full object change', async () =>
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

        setupStronglyConsistentRead({hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'});
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'new created' && t.Put.Item.name === 'New Two' && t.Put.Item.created === 'new created' && t.Put.Item.order === 'new order'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'new order' && t.Put.Item.name === 'New Two' && t.Put.Item.created === 'new created' && t.Put.Item.order === 'new order'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && t.Delete.Key.hash === 'entity#1' && t.Delete.Key.range === 'created'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && t.Delete.Key.hash === 'entity#1' && t.Delete.Key.range === 'order'))).callback(()=>deleted2=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two', created: "new created", order: "new order"}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isTrue(deleted);
        assert.isTrue(deleted2);
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
    });

    it('update() - key change', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({id:true})
            id:number;

            @DBColumn({hash:true})
            name:string;

            @DBColumn({range:true})
            created:number;
        };

        setupStronglyConsistentRead({hash: 'entity#nodenamo', range: 'created#1', id:1, name:'Some One', created:'created', order:'order'});
        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'entity#nodenamo', range: 'created#1', id:1, name:'Some One', created:'created', order:'order'},
            {hash: 'entity#Some One', range: 'created', id:1, name:'Some One', created:'created', order:'order'},
            {hash: 'entity#1', range: 'nodenamo', id:1, name:'Some One', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'nodenamo' && !t.Put.ConditionExpression && !t.Put.ExpressionAttributeNames))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && t.Put.Item.hash === 'entity#New Two' && t.Put.Item.range === 'created' && t.Put.ConditionExpression && !!t.Put.ExpressionAttributeNames['#hash'] && !!t.Put.ExpressionAttributeNames['#range']))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && t.Put.Item.hash === 'entity#nodenamo' && t.Put.Item.range === 'created#1' && !t.Put.ConditionExpression && !t.Put.ExpressionAttributeNames))).callback(()=>put3=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && t.Delete.Key.hash === 'entity#Some One' && t.Delete.Key.range === 'created'))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isTrue(put3);
        assert.isTrue(deleted);
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
    });

    it('update() - delta change', async () =>
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

        setupStronglyConsistentRead({hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'});
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'created' && !t.Put.ConditionExpression && t.Put.Item.name === 'New Two' && t.Put.Item.created === 'created' && t.Put.Item.order === 'order'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'order' && !t.Put.ConditionExpression && t.Put.Item.name === 'New Two' && t.Put.Item.created === 'created' && t.Put.Item.order === 'order'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isFalse(deleted);
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
    });

    it('update() - delta change, change from strongly consistent read reflected in transaction - when missing from getOneRows', async () =>
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

            @DBColumn()
            recentlyUpdatedField:number;
        };

        setupStronglyConsistentRead({hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order', recentlyUpdatedField:1}); //recentlyUpdatedField exists in strongly consistent read
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});//recentlyUpdatedField does NOT exist in eventually consistent read
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'created' && !t.Put.ConditionExpression && t.Put.Item.name === 'New Two' && t.Put.Item.created === 'created' && t.Put.Item.order === 'order' && t.Put.Item.recentlyUpdatedField === 1))).callback(()=>put=true); //recentlyUpdatedField included in update payload
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1' && t.Put.Item.range === 'order' && !t.Put.ConditionExpression && t.Put.Item.name === 'New Two' && t.Put.Item.created === 'created' && t.Put.Item.order === 'order' && t.Put.Item.recentlyUpdatedField === 1))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isFalse(deleted);
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'});
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}]});
        mockedClient.setup(q => q.query(It.is(p => !!p.TableName && p.IndexName === Const.IdIndexName && p.KeyConditionExpression === '#objid = :objid' && p.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.ExpressionAttributeValues[':objid'] === 'entity#1'))).callback(()=>called=true).returns(()=>findResponse.object);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1a' && t.Put.Item.range === 'created' && !!t.Put.ConditionExpression && t.Put.Item.id === '1a'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Put && !!t.Put.TableName && t.Put.Item.hash === 'entity#1a' && t.Put.Item.range === 'order' && !!t.Put.ConditionExpression && t.Put.Item.id === '1a'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key.hash === 'entity#1' && t.Delete.Key.range === 'created'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key.hash === 'entity#1' && t.Delete.Key.range === 'order'))).callback(()=>deleted2=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {id: '1a'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isTrue(deleted);
        assert.isTrue(deleted2);
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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
        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});

        //Simulate object changes from objver 1 to 2.
        let findResponse1 = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        let getResponse = getMockedGetResponse({Item: <any>
            {hash: 'hash', range: 'range', id:1, objver: 2, name:'Some One'},
        });

        let calledGetById = false;
        mockedClient.setup(q => q.query(It.is(p =>
            !!p.TableName
            && p.IndexName === Const.IdIndexName
            && p.KeyConditionExpression === '#objid = :objid'
            && p.ExpressionAttributeNames['#objid'] === Const.IdColumn
            && p.ExpressionAttributeValues[':objid'] === 'entity#1')))
            .callback(()=>calledGetById=true)
            .returns(()=>findResponse1.object);

        let calledGetOne = false;
        mockedClient.setup(q => q.get(It.is(p =>
            !!p.TableName
            && p.Key[Const.HashColumn] === 'entity#1'
            && p.Key[Const.RangeColumn] === 'nodenamo')))
            .callback(()=>calledGetOne=true)
            .returns(()=>getResponse.object);

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

        assert.isTrue(calledGetById);
        assert.isTrue(calledGetOne);
        assert.instanceOf(error, VersionError);
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
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

        setupStronglyConsistentRead({id:1, name:'Some One'});
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
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
    });

    it('put() - failed from an error', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };
        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.isAny())).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).throws(new Error('Simulated error'));

        let manager = new DynamoDbManager(mockedClient.object);

        let error = undefined;
        try
        {
            await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.equal(error.message, 'Simulated error');
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
    });

    it('put() - failed from a ConditionalCheckFailed', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };
        setupStronglyConsistentRead({hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'});

        let findResponse = getMockedQueryResponse({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ]});
        mockedClient.setup(q => q.query(It.isAny())).callback(()=>called=true).returns(()=>findResponse.object);

        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).throws(new AggregateError([new Error('Simulated error - ConditionalCheckFailed')]));

        let manager = new DynamoDbManager(mockedClient.object);
        let error = undefined;
        try
        {
            await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.isTrue(error.message.includes('An object with the same ID or hash-range key already exists in \'Entity\' table'));
        assert.isTrue(desiredObjectCreatedFromStronglyConsistentRead);
    });

    function setupStronglyConsistentRead(expectedItem:object)
    {
        let stronglyConsistentResponse = getMockedGetResponse(
            {Item:<any>expectedItem}
        );
        mockedClient.setup(q => q.get(It.is(p =>
            !!p.TableName
            && p.Key[Const.HashColumn] === 'entity#1'
            && p.Key[Const.RangeColumn] === 'nodenamo' 
            && p.ConsistentRead === true)))
            .callback(()=>desiredObjectCreatedFromStronglyConsistentRead=true)
            .returns(()=>stronglyConsistentResponse.object);
    }
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
