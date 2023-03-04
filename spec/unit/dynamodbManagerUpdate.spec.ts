import { DynamoDB, QueryCommandOutput, TransactWriteItem } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import AggregateError = require('aggregate-error');
import { assert } from 'chai';
import { IMock, It, Mock } from 'typemoq';

import { DBColumn, DBTable } from '../../src';
import { Const } from '../../src/const';
import { VersionError } from '../../src/errors/versionError';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';

describe('DynamoDbManager.Update()', function ()
{
    let mockedClient:IMock<DynamoDB>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let put:boolean;
    let put2:boolean;
    let put3:boolean;
    let called:boolean;
    let deleted:boolean;
    let deleted2:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDB>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        put = false;
        put2 = false;
        put3 = false;
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

        let findResponse = ({Items: [{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}].map( item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
    });

    it('update() - full object change', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({hash: true})
            id:number;

            @DBColumn()
            name:string;

            @DBColumn({range:true})
            created:number;

            @DBColumn({range:true})
            order:number;
        };

        let findResponse = ({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup(t => t.add(It.is((t:TransactWriteItem) => !!t.Put && !!t.Put.TableName && t.Put?.Item?.hash?.['S'] === 'entity#1' && t.Put.Item.range['S'] === 'new created' && t.Put.Item.name['S'] === 'New Two' && t.Put.Item.created['S'] === 'new created' && t.Put.Item.order['S'] === 'new order'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item?.hash?.['S'] === 'entity#1' && t.Put.Item.range['S'] === 'new order' && t.Put.Item.name['S'] === 'New Two' && t.Put.Item.created['S'] === 'new created' && t.Put.Item.order['S'] === 'new order'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete && t.Delete.Key.hash['S'] === 'entity#1' && t.Delete.Key.range['S'] === 'created'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete && t.Delete.Key.hash['S'] === 'entity#1' && t.Delete.Key.range['S'] === 'order'))).callback(()=>deleted2=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two', created: "new created", order: "new order"}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isTrue(deleted);
        assert.isTrue(deleted2);
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

        let findResponse = ({Items: <any>[
            {hash: 'entity#nodenamo', range: 'created#1', id:1, name:'Some One', created:'created', order:'order'},
            {hash: 'entity#Some One', range: 'created', id:1, name:'Some One', created:'created', order:'order'},
            {hash: 'entity#1', range: 'nodenamo', id:1, name:'Some One', created:'created', order:'order'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);

        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && t.Put.Item.hash['S'] === 'entity#1' && t.Put.Item.range['S'] === 'nodenamo' && !t.Put.Item?.ConditionExpression && !t.Put.Item?.ExpressionAttributeNames))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && t.Put.Item.hash['S'] === 'entity#New Two' && t.Put.Item.range['S'] === 'created' && t.Put.ConditionExpression && !!t.Put.ExpressionAttributeNames['#hash'] && !!t.Put.ExpressionAttributeNames['#range']))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && t.Put.Item.hash['S'] === 'entity#nodenamo' && t.Put.Item.range['S'] === 'created#1' && !t.Put.ConditionExpression && !t.Put.ExpressionAttributeNames))).callback(()=>put3=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete && t.Delete.Key.hash['S'] === 'entity#Some One' && t.Delete.Key.range['S'] === 'created'))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
        assert.isTrue(put2);
        assert.isTrue(put3);
        assert.isTrue(deleted);
    });

    it('update() - delta change', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn({hash: true})
            id:number;

            @DBColumn()
            name:string;

            @DBColumn({range:true})
            created:number;

            @DBColumn({range:true})
            order:number;
        };

        let findResponse = ({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item.hash?.['S'] === 'entity#1' && t.Put.Item.range?.['S'] === 'created' && !t.Put?.ConditionExpression && t.Put.Item.name['S'] === 'New Two' && t.Put.Item.created['S'] === 'created' && t.Put.Item.order['S'] === 'order'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item.hash?.['S'] === 'entity#1' && t.Put.Item.range?.['S'] === 'order' && !t.Put?.ConditionExpression && t.Put.Item.name['S'] === 'New Two' && t.Put.Item.created['S'] === 'created' && t.Put.Item.order['S'] === 'order'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete))).callback(()=>deleted=true);

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
            @DBColumn({id:true, hash: true})
            id:number;

            @DBColumn()
            name:string;

            @DBColumn({range:true})
            created:number;

            @DBColumn({range:true})
            order:number;
        };

        let findResponse = ({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}].map( item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item.hash['S'] === 'entity#1a' && t.Put.Item.range['S'] === 'created' && !!t.Put.ConditionExpression && t.Put.Item.id['S'] === '1a'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item.hash['S'] === 'entity#1a' && t.Put.Item.range['S'] === 'order' && !!t.Put.ConditionExpression && t.Put.Item.id['S'] === '1a'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete && !!t.Delete.TableName && t.Delete.Key.hash['S'] === 'entity#1' && t.Delete.Key.range['S'] === 'created'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete && !!t.Delete.TableName && t.Delete.Key.hash['S'] === 'entity#1' && t.Delete.Key.range['S'] === 'order'))).callback(()=>deleted2=true);

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

        let findResponse = ({Items: <any>[{hash: 'entity#1', range: 'created', id:1, name:'Some One', created:'created', order:'order'}, {hash: 'entity#1', range: 'order', id:1, name:'Some Two', created:'created', order:'order'}].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item?.hash?.['S'] === 'entity#1' && t.Put.Item.range['S'] === 'created' && t.Put.Item.name['S'] === 'New Two' && t.Put.ConditionExpression === 'condition' && t.Put.ExpressionAttributeNames['#n'] === 'name' && t.Put.ExpressionAttributeValues[':v']['S'] === 'true'))).callback(()=>put=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Put && !!t.Put.TableName && t.Put.Item?.hash?.['S'] === 'entity#1' && t.Put.Item.range['S'] === 'order' && t.Put.Item.name['S'] === 'New Two' && t.Put.ConditionExpression === 'condition' && t.Put.ExpressionAttributeNames['#n'] === 'name' && t.Put.ExpressionAttributeValues[':v']['S'] === 'true'))).callback(()=>put2=true);
        mockedTransaction.setup(t => t.add(It.is((t:any) => !!t.Delete))).callback(()=>deleted=true);

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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async ()=>findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) =>
            !!t.Put
            && t.Put.Item.name['S'] === 'New Two'
            && t.Put.Item[Const.VersionColumn]['N'] === "2"
            // && t.Put.ConditionExpression === '(attribute_not_exists(#objver) OR #objver < :objver) AND(attribute_not_exists(#hash) AND attribute_not_exists(#range)'
            && t.Put.ExpressionAttributeNames['#objver'] === Const.VersionColumn
            && t.Put.ExpressionAttributeValues[':objver']['N'] === "2" ))).callback(()=>put=true);

        let manager = new DynamoDbManager(mockedClient.object);

        await manager.update(Entity, 1, {name: 'New Two'}, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(put);
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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) =>
            !!t.Put
            && t.Put.Item.name['S'] === 'New Two'
            && t.Put.Item[Const.VersionColumn]['N'] === '2'
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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) =>
            !!t.Put
            && t.Put.Item.name['S'] === 'New Two'
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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) =>
            !!t.Put
            && t.Put.Item.name['S'] === 'New Two'
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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1'))).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);
        mockedTransaction.setup(t => t.add(It.is((t:any) =>
            !!t.Put
            && t.Put.Item.name['S'] === 'New Two'
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
        @DBTable({versioning: true})
        class Entity
        {
            @DBColumn()
            id:number;

            @DBColumn()
            name:string;
        };

        //Simulate object changes from objver 1 to 2.
        let findResponse1 = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        let getResponse = ({Items: <any>
            [{hash: 'hash', range: 'range', id:1, objver: 2, name:'Some One'}].map( item => marshall(item)),
        });

        let calledGetById = false;
        mockedClient.setup(q => q.send(It.is((p:any) =>
            !!p.input.TableName
            && p.input.Key === undefined
            && p.input.IndexName === Const.IdIndexName
            && p.input.KeyConditionExpression === '#objid = :objid'
            && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn
            && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1')))
            .callback(()=>calledGetById=true)
            .returns(async ()=> findResponse1 as QueryCommandOutput);

        let calledGetOne = false;
        mockedClient.setup(q => q.send(It.is((p:any) =>
            !!p.input.TableName
            && p.input.Key !== undefined
            && p.input.Key?.[Const.HashColumn]['S'] === 'entity#1'
            && p.input.Key?.[Const.RangeColumn]['S']=== 'nodenamo')))
            .callback(()=>calledGetOne=true)
            .returns(async ()=>getResponse as QueryCommandOutput);

        mockedTransaction.setup(t => t.commit()).throws(new VersionError('Simulate conditional check failure'));

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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.is((p:any) =>
            !!p.input.TableName
            && p.input.IndexName === Const.IdIndexName
            && p.input.KeyConditionExpression === '#objid = :objid'
            && p.input.ExpressionAttributeNames['#objid'] === Const.IdColumn
            && p.input.ExpressionAttributeValues[':objid']['S'] === 'entity#1')))
            .returns(async () => findResponse as QueryCommandOutput);
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
        assert.equal(error?.['message'], 'Simulated error');
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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.isAny())).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);

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
        assert.equal(error?.['message'], 'Simulated error');
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

        let findResponse = ({Items: <any>[
            {hash: 'hash', range: 'range', id:1, objver: 1, name:'Some One'},
        ].map(item => marshall(item))});
        mockedClient.setup(q => q.send(It.isAny())).callback(()=>called=true).returns(async () => findResponse as QueryCommandOutput);

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
        assert.isTrue((error?.['message'] as any)?.includes('An object with the same ID or hash-range key already exists in \'Entity\' table'));
    });
});
