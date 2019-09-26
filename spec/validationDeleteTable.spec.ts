import {assert as assert} from 'chai';
import { DynamoDbManager } from '../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DBTable, DBColumn } from '../src';
import { ValidatedDynamoDbManager } from '../src/managers/validatedDynamodbManager';
import { ValidationError } from '../src/errors/validationError';

@DBTable()
class Entity {
    @DBColumn({id:true})
    id:number = 123;

    @DBColumn({hash:true})
    hashProperty:string = 'some hash';

    @DBColumn({range:true})
    rangeProperty:string = 'some range';

    @DBColumn()
    regularProperty:string = 'something else';

    @DBColumn({hash:true, name:'customProperty'})
    realProperty:string = 'something else';
};

describe('ValidationDynamoDbManager - DeleteTable()', function () 
{
    let mockedManager:IMock<DynamoDbManager>;
    let called:boolean;
    let error:any;
    let manager:ValidatedDynamoDbManager;
    beforeEach(()=>
    {
        mockedManager = Mock.ofType<DynamoDbManager>();
        mockedManager.setup(m => m.deleteTable(It.isAny())).callback(()=>called=true);

        manager = new ValidatedDynamoDbManager(mockedManager.object);

        called = false;
        error = undefined;
    });

    describe('type decoration',()=>
    {
        it('valid', async ()=>
        {
            await manager.deleteTable(Entity);

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - object', async ()=>
        {
            try
            {
                await manager.deleteTable(<any>{});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - array', async ()=>
        {
            try
            {
                await manager.deleteTable(<any>[]);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - boolean', async ()=>
        {
            try
            {
                await manager.deleteTable(<any>false);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - number', async ()=>
        {
            try
            {
                await manager.deleteTable(<any>42);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - no ID property', async ()=>
        {
            @DBTable()
            class Empty
            {

            }
            try
            {
                await manager.deleteTable(Empty);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - no hash property', async ()=>
        {
            @DBTable()
            class Empty
            {
                @DBColumn({id:true})
                id:number;
            }
            try
            {
                await manager.deleteTable(Empty);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
});