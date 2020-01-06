import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DBTable, DBColumn } from '../../src';
import { ValidatedDynamoDbManager } from '../../src/managers/validatedDynamodbManager';
import { ValidationError } from '../../src/errors/validationError';
import { Const } from '../../src/const';

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

describe('ValidationDynamoDbManager - Update()', function () 
{
    let mockedManager:IMock<DynamoDbManager>;
    let called:boolean;
    let error:any;
    let manager:ValidatedDynamoDbManager;
    beforeEach(()=>
    {
        mockedManager = Mock.ofType<DynamoDbManager>();
        mockedManager.setup(m => m.update(It.isAny(), 42, It.isAny(), It.isAny(), undefined, true)).callback(()=>called=true);

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
                await manager.update(Entity, undefined, {}, {conditionExpression: 'condition'});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null obj id', async () =>
        {
            try
            {
                await manager.update(Entity, null, {}, {conditionExpression: 'condition'});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN obj id', async () =>
        {
            try
            {
                await manager.update(Entity, NaN, {}, {conditionExpression: 'condition'});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - complex obj id', async () =>
        {
            try
            {
                await manager.update(Entity, <any>[1], {}, {conditionExpression: 'condition'});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });

    describe('object', ()=>
    {
        it('invalid - undefined obj', async () =>
        {
            try
            {
                await manager.put(Entity, undefined);
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - reserved column values', async () =>
        {
            @DBTable()
            class NoProperties{}

            try
            {
                await manager.update(NoProperties, 1, {});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - reserved column values', async () =>
        {
            try
            {
                await manager.update(Entity, 1, {id:Const.DefaultHashValue});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - reserved column values', async () =>
        {
            try
            {
                await manager.update(Entity, 1, {id:Const.EmptyString});
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
            await manager.update(Entity, 42, {});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - object', async ()=>
        {
            try
            {
                await manager.update(<any>{}, 42, {});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - array', async ()=>
        {
            try
            {
                await manager.update(<any>[], 42, {});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - boolean', async ()=>
        {
            try
            {
                await manager.update(<any>false, 42, {});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - number', async ()=>
        {
            try
            {
                await manager.update(<any>42, 42, {});
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
                await manager.update(Empty, 42, {});
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
                await manager.update(HashedId, 1, {});
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
            await manager.update(Entity, 42, {}, undefined);

            assert.isTrue(called);
            assert.isUndefined(error)
        });
        it('valid', async () =>
        {
            await manager.update(Entity, 42, {}, {conditionExpression: 'something'});

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression:undefined});
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
            await manager.update(Entity, 42, {}, undefined);

            assert.isTrue(called);
            assert.isUndefined(error)
        });

        it('valid - hash/range property', async () =>
        {
            await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'hashProperty', "#m": 'rangeProperty'}});
            
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('valid - using the real property name instead of a custom name', async () =>
        {
            await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'realProperty'}});

            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - nonexistent property', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'nonexistent'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - non hash/range property', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'regularProperty'}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
        it('invalid - customed name property', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeNames: {'#n': 'customProperty'}});
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
            await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeValues: values});
        
            assert.isTrue(called);
            assert.isUndefined(error);
        });

        it('invalid - undefined', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeValues: {':v': undefined}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - null', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeValues: {':v': null}});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });

        it('invalid - NaN', async () =>
        {
            try
            {
                await manager.update(Entity, 42, {}, {conditionExpression: 'condition', expressionAttributeValues: {':v': NaN}});
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
            
            await manager.update(Entity, 42, {});

            assert.isTrue(called);
        });

        it('valid - table versioning is on', async ()=>
        {
            @DBTable({versioning:true})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.update(Entity, 42, {});

            assert.isTrue(called);
        });

        it('valid - table versioning is off', async ()=>
        {
            @DBTable({versioning:false})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.update(Entity, 42, {});

            assert.isTrue(called);
        });

        it('valid - table version is off and versionCheck is on', async ()=>
        {
            @DBTable({versioning:false})
            class Entity {
                @DBColumn({id:true})
                id:number = 123;
            }
            
            await manager.update(Entity, 42, {}, <any>{versionCheck:true});

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
                await manager.update(Entity, 42, {}, <any>{versionCheck:false});
            }
            catch(e) { error = e; }

            assert.isFalse(called);
            assert.instanceOf(error, ValidationError);
        });
    });
});