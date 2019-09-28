import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { Get } from '../../src/queries/get/get';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 42;
};

describe('Query.Get', function () 
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
        mockedManager.setup(m => m.getOne(Entity, 42)).callback(()=>called=true);

        let get = new Get(mockedManager.object, 42).from(Entity);
        await get.execute();

        assert.isTrue(called);
    });
});