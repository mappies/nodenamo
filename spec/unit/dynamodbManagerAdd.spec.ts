import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../../src';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import {Const} from '../../src/const';

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
    let mockedClient:IMock<DocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let put:boolean;
    let committed:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).callback(()=>committed=true);
        put = false;
        committed = false;
    });

    it('put()', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>!!p.Put && !!p.Put.TableName && !!p.Put.Item && p.Put.Item[Const.VersionColumn] === 1 && p.Put.ConditionExpression === '(attribute_not_exists(#hash) AND attribute_not_exists(#range))' && p.Put.ExpressionAttributeNames['#hash'] === Const.HashColumn && p.Put.ExpressionAttributeNames['#range'] === Const.RangeColumn && !p.Put.ExpressionAttributeValues && !p.Put.ReturnValuesOnConditionCheckFailure))).callback(()=>put=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(Entity, {}, undefined, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - with condition', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(!!p.Put && !!p.Put.TableName && !!p.Put.Item && p.Put.Item[Const.VersionColumn] === 1 && !!p.Put.ConditionExpression && !!p.Put.ExpressionAttributeNames && !!p.Put.ExpressionAttributeValues)))).callback(()=>put=true);
        
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
});