import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DBTable, DBColumn } from '../../src';
import { ValidatedDynamoDbManager } from '../../src/managers/validatedDynamodbManager';
import { ValidationError } from '../../src/errors/validationError';

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

    @DBColumn({name:'regularCustomProperty'})
    regularRealProperty:string = 'something else';

    @DBColumn({hash:true, name:'customProperty'})
    realProperty:string = 'something else';
};

describe('ValidationDynamoDbManager - Find()', function () 
{
    let mockedManager:IMock<DynamoDbManager>;
    let called:boolean;
    let error:any;
    let manager:ValidatedDynamoDbManager;
    beforeEach(()=>
    {
        mockedManager = Mock.ofType<DynamoDbManager>();
        mockedManager.setup(m => m.find(Entity, It.isAny(), It.isAny(), It.isAny())).callback(()=>called=true);

        manager = new ValidatedDynamoDbManager(mockedManager.object);

        called = false;
        error = undefined;
    });

    describe('type decoration',()=>
    {
        it('valid', async ()=>
        {
            await manager.find(Entity);

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - object', async ()=>
        {
            try
            {
                await manager.find(<any>{});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - array', async ()=>
        {
            try
            {
                await manager.find(<any>[]);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - boolean', async ()=>
        {
            try
            {
                await manager.find(<any>false);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - number', async ()=>
        {
            try
            {
                await manager.find(<any>42);
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
                await manager.find(Empty);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
    describe('keyConditions', () =>
    {
        it('valid params - undefined', async () =>
        {
            await manager.find(Entity);

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('valid', async () =>
        {
            await manager.find(Entity, {keyConditions: 'something'});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions:undefined});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - empty string', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions:''});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('keyParams.expressionAttributeName', () =>
    {
        it('valid - undefined param', async () =>
        {
            await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames:undefined});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('valid - hash/range property', async () =>
        {
            await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - using the real property name instead of a custom name', async () =>
        {
            await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames: {'#n': 'realProperty'}});

            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - nonexistent property', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames: {'#n': 'nonexistent'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - non hash/range property', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames: {'#n': 'regularProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - customed name property', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames: {'#n': 'customProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - only range property', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeNames: {"#m": 'rangeProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('keyParams.expressionAttributeValues', () =>
    {
        it('valid', async () =>
        {
            let values = {
                ':s': '',
                ':n': 42,
                ':z': 0,
                ':t': true,
                ':f': false,
                ':a': []
            }
            await manager.find(Entity, {keyConditions: 'condition', expressionAttributeValues: values});
        
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeValues: {':v': undefined}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeValues: {':v': null}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN', async () =>
        {
            try
            {
                await manager.find(Entity, {keyConditions: 'condition', expressionAttributeValues: {':v': NaN}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('filterExpressions', () =>
    {
        it('valid', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'something'});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression:undefined});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - empty string', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression:''});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('filterParams.expressionAttributeName', () =>
    {
        it('valid - undefined param', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames:undefined});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('valid - hash property', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames:  {'#n': 'hash'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - range property', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames:  {'#n': 'range'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - id property', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames:  {'#n': 'objid'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - non hash/range property', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames:  {'#n': 'regularProperty'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - using the real property name instead of a custom name', async () =>
        {
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames: {'#n': 'regularRealProperty'}});

            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - nonexistent property', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames: {'#n': 'nonexistent'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - hash/range property', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - customed name property', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeNames: {'#n': 'customRealProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('filterParams.expressionAttributeValues', () =>
    {
        it('valid', async () =>
        {
            let values = {
                ':s': '',
                ':n': 42,
                ':z': 0,
                ':t': true,
                ':f': false,
                ':a': []
            }
            await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeValues: values});
        
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeValues: {':v': undefined}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeValues: {':v': null}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN', async () =>
        {
            try
            {
                await manager.find(Entity, undefined, {filterExpression: 'condition', expressionAttributeValues: {':v': NaN}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
});