import {assert as assert} from 'chai';
import { DynamoDbManager } from '../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient, GetItemOutput } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../src';
import { DynamoDbTransaction } from '../src/managers/dynamodbTransaction';
import { Reflector } from '../src/reflector';
import Const from '../src/const';
import { AWSError } from 'aws-sdk/lib/error';
import { Request, PromiseResult } from 'aws-sdk/lib/request';

@DBTable()
class Entity {
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
    let called:boolean;
    let committed:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        mockedTransaction.setup(t => t.commit()).callback(()=>committed=true);
        put = false;
        committed = false;
        called = false;
    });

    it('put()', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>!!p.Put && !!p.Put.TableName && !!p.Put.Item && !p.Put.ConditionExpression && !p.Put.ExpressionAttributeNames && !p.Put.ExpressionAttributeValues && !p.Put.ReturnValuesOnConditionCheckFailure))).callback(()=>put=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(new Entity(), undefined, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - with condition', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(!!p.Put && !!p.Put.TableName && !!p.Put.Item && !!p.Put.ConditionExpression && !!p.Put.ExpressionAttributeNames && !!p.Put.ExpressionAttributeValues)))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(new Entity(), {conditionExpression:'a', expressionAttributeNames: {b:1}, expressionAttributeValues: {c:2}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column name changed', async () =>
    {
        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeNames['#a'] === 'hash' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(new Entity(), {conditionExpression:'#a', expressionAttributeNames: {'#a':'name'}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - id column value prefixed', async () =>
    {
        let obj = new Entity();
        Reflector.setDataPrefix(obj, 'user');

        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeValues['id'] === 'user#123' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(obj, {conditionExpression:'a', expressionAttributeValues: {id:123}}, mockedTransaction.object);

        assert.isTrue(put);
        assert.isTrue(committed);
    });

    it('put() - hash column value prefixed', async () =>
    {
        let obj = new Entity();
        Reflector.setDataPrefix(obj, 'user');

        mockedTransaction.setup(t => t.add(It.is(p=>(p.Put.ExpressionAttributeValues['name'] === 'user#new name' )))).callback(()=>put=true);
        
        let manager = new DynamoDbManager(mockedClient.object);
        await manager.put(obj, {conditionExpression:'a', expressionAttributeValues: {name:'new name'}}, mockedTransaction.object);

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
});

function getMockedGetResponse(response:GetItemOutput): IMock<Request<GetItemOutput, AWSError>>
{
    let mock = Mock.ofType<Request<GetItemOutput, AWSError>>();
    mock.setup(r => r.promise()).returns(async()=><any>response);
    return mock;
}