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

    @DBColumn({hash:true, name:'customProperty'})
    realProperty:string = 'something else';
};

describe('ValidationDynamoDbManager - Delete()', function () 
{
    let mockedManager:IMock<DynamoDbManager>;
    let called:boolean;
    let error:any;
    let manager:ValidatedDynamoDbManager;
    beforeEach(()=>
    {
        mockedManager = Mock.ofType<DynamoDbManager>();
        mockedManager.setup(m => m.delete(It.isAny(), 42, It.isAny(), undefined, true)).callback(()=>called=true);

        manager = new ValidatedDynamoDbManager(mockedManager.object);

        called = false;
        error = undefined;
    });

    describe('id', ()=>
    {
        it('invalid - undefined obj id', async () =>
        {
            try
            {
                await manager.delete(Entity, undefined);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null obj id', async () =>
        {
            try
            {
                await manager.delete(Entity, null);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN obj id', async () =>
        {
            try
            {
                await manager.delete(Entity, NaN);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - complex obj id', async () =>
        {
            try
            {
                await manager.delete(Entity, <any>[1]);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('type decoration',()=>
    {
        it('valid', async ()=>
        {
            await manager.delete(Entity, 42);

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - object', async ()=>
        {
            try
            {
                await manager.delete(<any>{}, 42);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - array', async ()=>
        {
            try
            {
                await manager.delete(<any>[], 42);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - boolean', async ()=>
        {
            try
            {
                await manager.delete(<any>false, 42);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - number', async ()=>
        {
            try
            {
                await manager.delete(<any>42, 42);
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
                await manager.delete(Empty, 42);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
    describe('conditionExpression', () =>
    {
        it('valid params - undefined', async () =>
        {
            await manager.delete(Entity, 42, undefined);

            assert.isTrue(called);
            assert.isUndefined(error)
        });
        it('valid', async () =>
        {
            await manager.delete(Entity, 42, {conditionExpression: 'something'});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression:undefined});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('expressionAttributeName', () =>
    {
        it('valid - undefined param', async () =>
        {
            await manager.delete(Entity, 42, undefined);

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - hash/range property are not allowed', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            }catch(e) { error = e; }
            
            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - hash/range property are not allowed - referenced by custom name.', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'realProperty'}});
            }catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - nonexistent property', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'nonexistent'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('valid - non hash/range property', async () =>
        {

            await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'regularProperty'}});

            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - custom name property', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'customProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('expressionAttributeValues', () =>
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
            await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeValues: values});
        
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeValues: {':v': undefined}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeValues: {':v': null}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN', async () =>
        {
            try
            {
                await manager.delete(Entity, 42, {conditionExpression: 'condition', expressionAttributeValues: {':v': NaN}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
});