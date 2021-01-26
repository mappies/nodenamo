import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { Describe } from '../../src/queries/describe/describe';

@DBTable()
class Entity
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    name:string;

    @DBColumn({hash:'pair1'})
    roles:string[];

    @DBColumn()
    departments:string[];

    @DBColumn({range:'pair1'})
    get range(): string[]
    {
        return this.departments.map(department => `${department}#${this.id}`);
    }

    @DBColumn({range:true})
    createdTimestamp:number
}

describe('Query.Describe', function () 
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
        let result = await new Describe(mockedManager.object, Entity).execute();

        assert.deepEqual(result, {"table":"Entity","dataPrefix":"entity","properties":[{"name":"id","id":true},{"name":"name"},{"name":"roles","range":"pair1"},{"name":"departments"},{"name":"range","range":"pair1"},{"name":"createdTimestamp","range":true}]});
    });
});