import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DBTable, DBColumn } from '../../src';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import {Const} from '../../src/const';
import AggregateError from 'aggregate-error';

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

describe('DynamoDbManager.Add()', function () 
{
    let mockedClient:IMock<DynamoDB>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let put:boolean;
    let committed:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDB>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).callback(()=>committed=true);
        put = false;
        committed = false;
    });

    it('put()', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>!!p.Put && !!p.Put.TableName && !!p.Put.Item && p.Put.Item[Const.VersionColumn] as any === 1 && p.Put.ConditionExpression === '(attribute_not_exists(#hash) AND attribute_not_exists(#range))' && p.Put.ExpressionAttributeNames['#hash'] === Const.HashColumn && p.Put.ExpressionAttributeNames['#range'] === Const.RangeColumn && !p.Put.ExpressionAttributeValues && !p.Put.ReturnValuesOnConditionCheckFailure))).callback(()=>put=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, undefined, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - with condition', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(!!p.Put && !!p.Put.TableName && !!p.Put.Item && p.Put.Item[Const.VersionColumn] as any === 1 && !!p.Put.ConditionExpression && !!p.Put.ExpressionAttributeNames && !!p.Put.ExpressionAttributeValues)))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, {conditionExpression:'a', expressionAttributeNames: {b:1}, expressionAttributeValues: {c:2}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column name changed', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p?.Put?.ExpressionAttributeNames?.['#a'] === 'hash' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, {conditionExpression:'#a', expressionAttributeNames: {'#a':'name'}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - objid column value is prefixed, id isn\'t', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p?.Put?.ExpressionAttributeValues?.['id'] as any === 123 && p?.Put?.ExpressionAttributeValues?.['objid'] as any === 'user#123' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(EntityWithDataPrefix, {}, {conditionExpression:'a', expressionAttributeValues: {id:123, objid:123}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column value prefixed', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p?.Put?.ExpressionAttributeValues?.['name'] as any === 'user#new name' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(EntityWithDataPrefix, {}, {conditionExpression:'a', expressionAttributeValues: {name:'new name'}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - failed from an error', async () =>
    {

        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).throws(new Error('Simulated error'));

        let manager = new DynamoDbManager(mockedClient.object);

        let error = undefined;
        try
        {
            await manager.put(Entity, {}, undefined, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.equal((error as any)?.message, 'Simulated error');
    });

    it('put() - failed from a ConditionalCheckFailed', async () =>
    {

        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).throws(new AggregateError([new Error('Simulated error - ConditionalCheckFailed')]));

        let manager = new DynamoDbManager(mockedClient.object);
        let error = undefined;
        try
        {
            await manager.put(Entity, {}, undefined, mockedTransaction.object);
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.isTrue((error as any)?.message?.includes('An object with the same ID or hash-range key already exists in \'Entity\' table'));
    });
});