import AggregateError from 'aggregate-error';
import {assert} from 'chai';
import { Mock } from 'typemoq';
import { Reexecutable } from '../../src/queries/Reexecutable';

describe('Reexecutable', function () 
{
    let called:number;
    let command:Reexecutable;
    
    beforeEach(()=>
    {
        called = 0;
        command = new Reexecutable();
    });

    it('execute() - no error', async ()=>
    {
        let aFunction = Mock.ofType<Function>();
        aFunction.setup(f=>f()).callback(()=>called++);

        await command.execute(aFunction.object);
        assert.equal(called, 1);
    });

    it('execute() - an error', async ()=>
    {
        let error;

        let throwAnErrorFunction = Mock.ofType<Function>();
        throwAnErrorFunction.setup(f=>f()).callback(()=>called++).throws(new Error('An error'));

        try
        {
            await command.execute(throwAnErrorFunction.object)
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.equal(error.message, 'An error');
        assert.equal(called, 1);
    });

    it('execute() - an aggregate error', async ()=>
    {
        let error;

        let throwAnAggregateErrorFunction = Mock.ofType<Function>();
        throwAnAggregateErrorFunction.setup(f=>f()).callback(()=>called++).throws(new AggregateError([new Error('An error 1'),new Error('An error 2')]));

        try
        {
            await command.execute(throwAnAggregateErrorFunction.object)
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.instanceOf(error, AggregateError);
        assert.isTrue(error.message.includes('An error 1'));
        assert.isTrue(error.message.includes('An error 2'));
        assert.equal(called, 1);
    });

    it('execute() - a transaction error and non-transaction error will not result in a retry', async ()=>
    {
        let error;

        let transactionErrors = new AggregateError([new Error('ConditionalCheckFailed:'),new Error('TransactionConflict:')]);
        
        let throwAnAggregateErrorFunction = Mock.ofType<Function>();
        throwAnAggregateErrorFunction.setup(f=>f()).callback(()=>called++).throws(transactionErrors);

        try
        {
            await command.execute(throwAnAggregateErrorFunction.object)
        }
        catch(e)
        {
            error = e;
        }

        assert.instanceOf(error, AggregateError);
        assert.isTrue(error.message.includes('ConditionalCheckFailed:'));
        assert.isTrue(error.message.includes('TransactionConflict:'));
        assert.equal(called, 1);
    });

    it('execute() - a transaction error', async ()=>
    {
        let error;

        let errors = new AggregateError([new Error('TransactionConflict:'),new Error('TransactionConflict:')]);
        
        let throwAnAggregateErrorFunction = Mock.ofType<Function>();
        throwAnAggregateErrorFunction.setup(f=>f()).callback(()=>called++).throws(errors);

        try
        {
            await command.execute(throwAnAggregateErrorFunction.object)
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.instanceOf(error, AggregateError);
        assert.isTrue(error.message.includes('TransactionConflict:'));
        assert.isTrue(called >= 9);
    }).timeout(12000);

    it('execute() - a transaction error but throw non-transaction error after a retry', async ()=>
    {
        let error;

        let transactionErrors = new AggregateError([new Error('TransactionConflict:'),new Error('TransactionConflict:')]);
        let notTransactionErrors = new AggregateError([new Error('ConditionalCheckFailed:'),new Error('None:')]);
        
        let throwAnAggregateErrorFunction = Mock.ofType<Function>();
        throwAnAggregateErrorFunction.setup(f=>f()).callback(()=>{throw ++called<3 ? transactionErrors : notTransactionErrors});

        try
        {
            await command.execute(throwAnAggregateErrorFunction.object)
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.instanceOf(error, AggregateError);
        assert.isTrue(error.message.includes('ConditionalCheckFailed:'));
        assert.isTrue(error.message.includes('None:'));
        assert.equal(called, 3);
    }).timeout(3000);

    it('execute() - a transaction error but succeeded after a retry', async ()=>
    {
        let error;

        let transactionErrors = new AggregateError([new Error('TransactionConflict:'),new Error('TransactionConflict:')]);
        
        let throwAnAggregateErrorFunction = Mock.ofType<Function>();
        throwAnAggregateErrorFunction.setup(f=>f()).callback(()=>{if(++called<2) throw transactionErrors});

        try
        {
            await command.execute(throwAnAggregateErrorFunction.object)
        }
        catch(e)
        {
            error = e;
        }

        assert.isUndefined(error);
        assert.equal(called, 2);
    }).timeout(3000);

});