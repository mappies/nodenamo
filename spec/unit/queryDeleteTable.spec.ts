import {assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { DeleteTable } from '../../src/queries/deleteTable/deleteTable';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 123;
};

describe('Query.DeleteTable', function () 
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
        mockedManager.setup(m => m.deleteTable(Entity)).callback(()=>called=true);

        let query = new DeleteTable(mockedManager.object).for(Entity);
        await query.execute();

        assert.isTrue(called);
    });
});