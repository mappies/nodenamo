import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { CreateTable } from '../../src/queries/createTable/createTable';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 123;
};

describe('Query.CreateTable', function () 
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
        mockedManager.setup(m => m.createTable(Entity, {onDemand:true})).callback(()=>called=true);

        let query = new CreateTable(mockedManager.object).for(Entity);
        await query.execute();

        assert.isTrue(called);
    });

    it('withCapacityOf()', async ()=>
    {
        mockedManager.setup(m => m.createTable(Entity, {
            onDemand: false, 
            readCapacityUnits: 2,
            writeCapacityUnits: 3
        })).callback(()=>called=true);

        let query = new CreateTable(mockedManager.object).for(Entity);
        await query.withCapacityOf(2, 3).execute();

        assert.isTrue(called);
    });
});