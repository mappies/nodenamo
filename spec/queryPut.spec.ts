import {assert as assert} from 'chai';
import { Add } from '../src/queries/add/add';
import { DynamoDbManager } from '../src/managers/dynamodbManager';
import { IMock, Mock, It } from 'typemoq';
import { DBTable } from '../src/dbTable';
import { DBColumn } from '../src/dbColumn';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 123;
};

describe('Queury.Put', function () 
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
        mockedManager.setup(m => m.put(It.isAny(), undefined)).callback(()=>called=true);

        let put = new Add(mockedManager.object, new Entity());
        await put.execute();

        assert.isTrue(called);
    });

    it('where()', async ()=>
    {
        mockedManager.setup(m => m.put(It.isAny(), {
            conditionExpression:'condition', 
            expressionAttributeNames: {name: 'n'},
            expressionAttributeValues: {value: 'v'}
        })).callback(()=>called=true);

        let put = new Add(mockedManager.object, new Entity());
        await put.where('condition', {'name':'n'}, {'value':'v'}).execute();

        assert.isTrue(called);
    });
});