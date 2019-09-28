import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { Delete } from '../../src/queries/delete/delete';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 123;
};

describe('Query.Delete', function () 
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
        mockedManager.setup(m => m.delete(Entity, 42, undefined)).callback(()=>called=true);

        let del = new Delete(mockedManager.object, 42).from(Entity)
        await del.execute();

        assert.isTrue(called);
    });

    it('where()', async ()=>
    {
        mockedManager.setup(m => m.delete(Entity, 42, {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'}
        })).callback(()=>called=true);

        let del = new Delete(mockedManager.object, 42).from(Entity);
        await del.where({conditionExpression: 'condition', expressionAttributeNames: {'name':'n'}, expressionAttributeValues: {'value':'v'}}).execute();

        assert.isTrue(called);
    });
});