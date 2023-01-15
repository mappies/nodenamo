import {assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { Transaction } from '../../src/queries/transaction/on';
import ITransactionable from '../../src/interfaces/iTransactionable';

@DBTable()
class Entity {
    @DBColumn({hash:true, id:true})
    id:number = 123;
};

describe('Query.Transaction', function () 
{
    let called1:boolean;
    let called2:boolean;
    let mockedManager:IMock<DynamoDbManager>;
    let mockedTransactionable1:IMock<ITransactionable>;
    let mockedTransactionable2:IMock<ITransactionable>;

    beforeEach(()=>
    {
        called1 = called2 = false;
        mockedManager = Mock.ofType<DynamoDbManager>();
        mockedTransactionable1 = Mock.ofType<ITransactionable>();
        mockedTransactionable2 = Mock.ofType<ITransactionable>();
    });

    it('transaction()', async ()=>
    {
        mockedTransactionable1.setup(t => t.execute(It.is(transaction => transaction !== undefined))).callback(()=>called1=true);
        mockedTransactionable2.setup(t => t.execute(It.is(transaction => transaction !== undefined))).callback(()=>called2=true);

        await new Transaction(mockedManager.object, [mockedTransactionable1.object, mockedTransactionable2.object]).execute();

        assert.isTrue(called1);
        assert.isTrue(called2);
    });
});