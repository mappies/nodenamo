import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { Update } from '../../src/queries/update/update';
import { ReturnValue } from '../../src/interfaces/returnValue';

@DBTable()
class Entity {
    @DBColumn({hash:true, id:true})
    id:number = 123;
};

describe('Query.Update', function () 
{
    let called:boolean;
    let mockedManager:IMock<DynamoDbManager>;
    
    beforeEach(()=>
    {
        called = false;
        mockedManager = Mock.ofType<DynamoDbManager>();
    });

    it('execute()', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, undefined, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1}).from(Entity);
        await update.execute();

        assert.isTrue(called);
    });

    it('withVersionCheck(true)', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {versionCheck:true}, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .withVersionCheck(true);
        await update.execute();

        assert.isTrue(called);
    });

    it('withVersionCheck(false)', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {versionCheck:false}, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .withVersionCheck(false);
        await update.execute();

        assert.isTrue(called);
    });

    it('withVersionCheck() - with where', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: true
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .withVersionCheck(true)
            .where('condition', {'name':'n'}, {'value':'v'});
        await update.execute();

        assert.isTrue(called);
    });

    it('withVersionCheck() - with where and returning', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: true,
            returnValue: ReturnValue.None
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .withVersionCheck(true)
            .where('condition', {'name':'n'}, {'value':'v'})
            .returning(ReturnValue.None);
        await update.execute();

        assert.isTrue(called);
    });

    it('withVersionCheck() - with returning', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            versionCheck: true,
            returnValue: ReturnValue.None
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .withVersionCheck(true)
            .returning(ReturnValue.None);
        await update.execute();

        assert.isTrue(called);
    });

    it('withVersionCheck() - with returning and where', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: true,
            returnValue: ReturnValue.None
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .withVersionCheck(true)
            .returning(ReturnValue.None)
            .where('condition', {'name':'n'}, {'value':'v'});
        await update.execute();

        assert.isTrue(called);
    });

    it('where()', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'}
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .where('condition', {'name':'n'}, {'value':'v'});
        await update.execute();

        assert.isTrue(called);
    });

    it('where() - with a version check (true)', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: true
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .where('condition', {'name':'n'}, {'value':'v'})
            .withVersionCheck(true);
        await update.execute();

        assert.isTrue(called);
    });

    it('where() - with a version check (false)', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: false
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .where('condition', {'name':'n'}, {'value':'v'})
            .withVersionCheck(false);
        await update.execute();

        assert.isTrue(called);
    });

    it('where() - with a version check and returning', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: true,
            returnValue: ReturnValue.AllNew
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .where('condition', {'name':'n'}, {'value':'v'})
            .withVersionCheck(true)
            .returning(ReturnValue.AllNew);
        await update.execute();

        assert.isTrue(called);
    });

    it('where() - with returning', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            returnValue: ReturnValue.AllNew
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .where('condition', {'name':'n'}, {'value':'v'})
            .returning(ReturnValue.AllNew);
        await update.execute();

        assert.isTrue(called);
    });
    it('where() - with returning and a version check', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
            versionCheck: true,
            returnValue: ReturnValue.AllNew
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .where('condition', {'name':'n'}, {'value':'v'})
            .returning(ReturnValue.AllNew)
            .withVersionCheck(true);
        await update.execute();

        assert.isTrue(called);
    });

    it('returning()', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {returnValue:ReturnValue.AllOld}, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .returning(ReturnValue.AllOld);
        await update.execute();

        assert.isTrue(called);
    });

    it('returning() - with version check', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {returnValue:ReturnValue.AllOld, versionCheck: true}, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .returning(ReturnValue.AllOld)
            .withVersionCheck();
        await update.execute();

        assert.isTrue(called);
    });

    it('returning() - with version check and where', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            returnValue:ReturnValue.AllOld, 
            versionCheck: true, 
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .returning(ReturnValue.AllOld)
            .withVersionCheck()
            .where('condition', {'name':'n'}, {'value':'v'});
        await update.execute();

        assert.isTrue(called);
    });

    it('returning() - with where', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            returnValue:ReturnValue.AllOld, 
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .returning(ReturnValue.AllOld)
            .where('condition', {'name':'n'}, {'value':'v'});
        await update.execute();

        assert.isTrue(called);
    });

    it('returning() - with where and version check', async ()=>
    {
        mockedManager.setup(m => m.update(Entity, 1, {id:1}, {
            returnValue:ReturnValue.AllOld, 
            versionCheck: true,
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'},
        }, undefined, true)).callback(()=>called=true);

        let update = new Update(mockedManager.object, {id:1})
            .from(Entity)
            .returning(ReturnValue.AllOld)
            .where('condition', {'name':'n'}, {'value':'v'})
            .withVersionCheck();
        await update.execute();

        assert.isTrue(called);
    });
});