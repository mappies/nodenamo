import {assert as assert} from 'chai';
import { DynamoDbManager } from '../src/manager/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DBTable, DBColumn } from '../src';
import { DynamoDbTransaction } from '../src/manager/dynamodbTransaction';
import { Put } from '../src/queries/put/put';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 123;
};

describe('DynamoDbManager', function () 
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
});