import {assert} from 'chai';
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

    @DBColumn({name:'customProperty'})
    realProperty:string = 'something else';
};

describe('ValidationDynamoDbManager - Apply()', function () 
{
    let mockedManager:IMock<DynamoDbManager>;
    let called:boolean;
    let error:any;
    let manager:ValidatedDynamoDbManager;
    beforeEach(()=>
    {
        mockedManager = Mock.ofType<DynamoDbManager>();
        mockedManager.setup(m => m.apply(It.isAny(), 42, It.isAny(), undefined, true)).callback(()=>called=true);

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
                await manager.apply(Entity, undefined, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null obj id', async () =>
        {
            try
            {
                await manager.apply(Entity, null, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN obj id', async () =>
        {
            try
            {
                await manager.apply(Entity, NaN, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - complex obj id', async () =>
        {
            try
            {
                await manager.apply(Entity, <any>[1], {updateExpression: {add:['add1']}});
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
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - object', async ()=>
        {
            try
            {
                await manager.apply(<any>{}, 42, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - array', async ()=>
        {
            try
            {
                await manager.apply(<any>[], 42, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - boolean', async ()=>
        {
            try
            {
                await manager.apply(<any>false, 42, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - number', async ()=>
        {
            try
            {
                await manager.apply(<any>42, 42, {updateExpression: {add:['add1']}});
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
                await manager.apply(Empty, 42, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - no ID property', async ()=>
        {
            @DBTable()
            class HashedId
            {
                @DBColumn({id:true, hash:true})
                id:number;
            }
            try
            {
                await manager.apply(HashedId, 1, {updateExpression: {add:['add1']}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('updateExpression', () =>
    {
        it('invalid params - undefined', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, undefined);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('valid', async () =>
        {
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - empty', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression:undefined});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('conditionExpression', () =>
    {
        it('valid', async () =>
        {
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, conditionExpression:'condition'});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('valid - empty', async () =>
        {
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, conditionExpression: ''});

            assert.isTrue(called);
            assert.isUndefined(error)
        });
    });

    describe('expressionAttributeName', () =>
    {
        it('invalid - undefined param', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, undefined);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - hash property used in updateExpression', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['#n 1']}, expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - range property used in updateExpression', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['#m 1']}, expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('valid - hash/range property is not used in updateExpression', async () =>
        {
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, conditionExpression: '#n = #m', expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - using the real property name instead of a custom name', async () =>
        {
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeNames: {'#n': 'realProperty'}});

            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - nonexistent property', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeNames: {'#n': 'nonexistent'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('valid - non hash/range property', async () =>
        {
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeNames: {'#n': 'regularProperty'}});

            assert.isTrue(called);
            assert.isUndefined(error);
        });
        it('invalid - customed name property', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeNames: {'#n': 'customProperty'}});
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
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeValues: values});
        
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeValues: {':v': undefined}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeValues: {':v': null}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN', async () =>
        {
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, expressionAttributeValues: {':v': NaN}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('versioning',()=>
    {
        it('valid - not specified a table versioning', async ()=>
        {
            @DBTable({versioning:false})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}});

            assert.isTrue(called);
        });

        it('valid - table versioning is on', async ()=>
        {
            @DBTable({versioning:true})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}});

            assert.isTrue(called);
        });

        it('valid - table versioning is off', async ()=>
        {
            @DBTable({versioning:false})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}});

            assert.isTrue(called);
        });

        it('valid - table version is off and versionCheck is on', async ()=>
        {
            @DBTable({versioning:false})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, versionCheck:true});

            assert.isTrue(called);
        });

        it('valid - table version is on and versionCheck is off', async ()=>
        {
            @DBTable({versioning:true})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            try
            {
                await manager.apply(Entity, 42, {updateExpression: {add:['add1']}, versionCheck:false});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
});