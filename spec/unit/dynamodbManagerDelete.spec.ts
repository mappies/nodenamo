import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { QueryOutput } from '@aws-sdk/client-dynamodb';
import { DBTable, DBColumn } from '../../src';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import {Const} from '../../src/const';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';

describe('DynamoDbManager.Delete()', function () 
{
    let mockedClient:IMock<DynamoDBDocumentClient>;
    let mockedTransaction:IMock<DynamoDbTransaction>;
    let called:boolean;
    let deleted:boolean;
    let deleted2:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDBDocumentClient>();
        mockedTransaction = Mock.ofType<DynamoDbTransaction>();
        called = false;
        deleted = false;
        deleted2 = false;
    });

    it('delete()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:42}, {hash: 'hash2', range: 'range2', id:42}]})
        mockedClient.setup(q => q.send(It.is((p:QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid'] === 'entity#42'))).callback(()=>called=true).returns(()=>findResponse); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key?.hash === 'hash1' && t.Delete.Key?.range === 'range1'))).callback(()=>deleted=true);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key?.hash === 'hash2' && t.Delete.Key?.range === 'range2'))).callback(()=>deleted2=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.delete(Entity, 42, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(deleted);
        assert.isTrue(deleted2);
    });

    it('delete() - with condition', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };
        
        let findResponse = getMockedQueryResponse({Items: <any>[{hash: 'hash1', range: 'range1', id:42}]})
        mockedClient.setup(q => q.send(It.is((p:QueryCommand) => !!p.input.TableName && !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid'] === 'entity#42'))).callback(()=>called=true).returns(()=>findResponse);
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key?.hash === 'hash1' && t.Delete.Key?.range === 'range1' && t.Delete.ConditionExpression === 'condition' && t.Delete.ExpressionAttributeNames?.['#n'] === 'name' && t.Delete.ExpressionAttributeValues?.[':v'] === 'true'))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.delete(Entity, 42,{conditionExpression: 'condition', expressionAttributeNames: {'#n': 'name'}, expressionAttributeValues: {':v': true}}, mockedTransaction.object);

        assert.isTrue(called);
        assert.isTrue(deleted)
    });

    it('delete() - nonexistent item', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let findResponse = getMockedQueryResponse({Items: <any>[]})
        mockedClient.setup(q => q.send(It.is((p:QueryCommand) => !!p.input.TableName && p.input.IndexName === Const.IdIndexName && p.input.KeyConditionExpression === '#objid = :objid' && p.input.ExpressionAttributeNames?.['#objid'] === Const.IdColumn && p.input.ExpressionAttributeValues?.[':objid'] === 'entity#42'))).callback(()=>called=true).returns(()=>findResponse); 
        mockedTransaction.setup(t => t.add(It.is(t => !!t.Delete && !!t.Delete.TableName && t.Delete.Key?.hash === 'hash1' && t.Delete.Key?.range === 'range1'))).callback(()=>deleted=true);

        let manager = new DynamoDbManager(mockedClient.object);
        await manager.delete(Entity, 42, undefined, mockedTransaction.object);

        assert.isTrue(called);
        assert.isFalse(deleted)
    });
});

function getMockedQueryResponse(response: QueryOutput): Promise<QueryCommandOutput>
{
    return new Promise((resolve)=>resolve(<QueryCommandOutput>response));
}
