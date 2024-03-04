import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { Update } from '../../src/queries/update/update';

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
});