import {assert as assert} from 'chai';
import { Insert } from '../../src/queries/insert/insert';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 123;
};

describe('Query.Insert', function () 
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
        mockedManager.setup(m => m.put(Entity, {id:1}, undefined, undefined, true)).callback(()=>called=true);

        let put = new Insert(mockedManager.object, {id:1}).into(Entity);
        await put.execute();

        assert.isTrue(called);
    });

    it('where()', async ()=>
    {
        mockedManager.setup(m => m.put(Entity, {id:1}, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'}
        }, undefined, true)).callback(()=>called=true);

        let put = new Insert(mockedManager.object, {id:1}).into(Entity);
        await put.where('condition', {'name':'n'}, {'value':'v'}).execute();

        assert.isTrue(called);
    });
});