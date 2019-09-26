import {assert as assert} from 'chai';
import { DynamoDbManager } from '../src/managers/dynamodbManager';
import { IMock, Mock } from 'typemoq';
import { DBTable } from '../src/dbTable';
import { DBColumn } from '../src/dbColumn';
import { Find } from '../src/queries/find/find';
import { List } from '../src/queries/find/list';
import Const from '../src/const';

@DBTable()
class Entity {
    @DBColumn({hash:true})
    id:number = 42;

    @DBColumn()
    name:string = 'Some One'

    constructor(id:number)
    {
        this.id = id;
    }
};

describe('Query.Find', function () 
{
    let called:boolean;
    let mockedManager:IMock<DynamoDbManager>;
    let keyCondition:any;
    let filterCondition:any;
    let findResult:any;

    beforeEach(()=>
    {
        called = false;
        mockedManager = Mock.ofType<DynamoDbManager>();
        keyCondition = {
            keyConditions:'kcondition', 
            expressionAttributeNames: {'#id': 'id'}, 
            expressionAttributeValues: {':id': 42}
        };
        filterCondition = {
            filterExpression:'fcondition', 
            expressionAttributeNames: {'#name': 'name'}, 
            expressionAttributeValues: {':name': 'Some One'}
        };
        findResult = { items: [new Entity(42)]}
    });

    it('find.from.where()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, undefined)).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition);
        let result = await find.execute();

        assert.isTrue(called);
        assert.equal(result.lastEvaluatedKey, undefined);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0]['id'], 42);
    });

    it('find.from.where() - with lastEvaluatedKey', async ()=>
    {
        findResult.lastEvaluatedKey = {key:1};

        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, undefined)).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition);
        let result = await find.execute();

        assert.isTrue(called);
        assert.equal(result.lastEvaluatedKey, 'eyJrZXkiOjF9');
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0]['id'], 42);
    });

    it('find.from.where.order() - reverse', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, {order: -1})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).order(false);
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.order() - forward', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, {order: 1})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).order(true);
        await find.execute();

        assert.isTrue(called);
    });


    it('find.from.where.limit()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, {limit: 3})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).limit(3);
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.resume()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, {exclusiveStartKey: {key:1}})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).resume('eyJrZXkiOjF9');
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.using()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, {indexName:'index-name'})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).using('index-name');
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.limit.using.order.resume()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, undefined, {limit: 1, indexName:'index-name', order: 1, exclusiveStartKey: {key:1}})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).limit(1).using('index-name').order(true).resume('eyJrZXkiOjF9');
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.filter()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, filterCondition, undefined)).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).filter(filterCondition);
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.filter.limit()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, filterCondition, {limit:1})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).filter(filterCondition).limit(1);
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.filter.using()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, filterCondition, {indexName:'index-name'})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).filter(filterCondition).using('index-name');
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.filter.using()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, filterCondition, {order:1})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).filter(filterCondition).order(true);
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.filter.resume()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, filterCondition, {exclusiveStartKey:{key:1}})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).filter(filterCondition).resume('eyJrZXkiOjF9');
        await find.execute();

        assert.isTrue(called);
    });

    it('find.from.where.filter.limit.using.order.resume()', async ()=>
    {
        mockedManager.setup(m => m.find(Entity, keyCondition, filterCondition, {limit: 1, indexName:'index-name', order: 1, exclusiveStartKey: {key:1}})).callback(()=>called=true).returns(async()=>findResult);

        let find = new Find(mockedManager.object).from(Entity).where(keyCondition).filter(filterCondition).limit(1).using('index-name').order(true).resume('eyJrZXkiOjF9');
        await find.execute();

        assert.isTrue(called);
    });

    it('list.from.by() - hash', async ()=>
    {
        let listKeyCondition = {
            keyConditions:'#hash = :hash', 
            expressionAttributeNames: {'#hash': Const.HashColumn}, 
            expressionAttributeValues: {':hash': 'h1'}
        };
        mockedManager.setup(m => m.find(Entity, listKeyCondition, undefined, undefined)).callback(()=>called=true).returns(async()=>findResult);

        let list = new List(mockedManager.object).from(Entity).by('h1');
        let result = await list.execute();

        assert.isTrue(called);
        assert.equal(result.lastEvaluatedKey, undefined);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0]['id'], 42);
    });

    it('list.from.by() - hash and range', async ()=>
    {
        let listKeyCondition = {
            keyConditions:'#hash = :hash and begins_with(#range, :range)', 
            expressionAttributeNames: {'#hash': Const.HashColumn, '#range': Const.RangeColumn}, 
            expressionAttributeValues: {':hash': 'h1', ':range': 'r1'}
        };
        mockedManager.setup(m => m.find(Entity, listKeyCondition, undefined, undefined)).callback(()=>called=true).returns(async()=>findResult);

        let list = new List(mockedManager.object).from(Entity).by('h1', 'r1');
        let result = await list.execute();

        assert.isTrue(called);
        assert.equal(result.lastEvaluatedKey, undefined);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0]['id'], 42);
    });

    it('list.from.by.filter.limit.using.order.resume()', async ()=>
    {
        let listKeyCondition = {
            keyConditions:'#hash = :hash and begins_with(#range, :range)', 
            expressionAttributeNames: {'#hash': Const.HashColumn, '#range': Const.RangeColumn}, 
            expressionAttributeValues: {':hash': 'h1', ':range': 'r1'}
        };

        mockedManager.setup(m => m.find(Entity, listKeyCondition, filterCondition, {limit: 1, indexName:'index-name', order: 1, exclusiveStartKey: {key:1}})).callback(()=>called=true).returns(async()=>findResult);

        let list = new List(mockedManager.object).from(Entity).by('h1', 'r1').filter(filterCondition).limit(1).using('index-name').order(true).resume('eyJrZXkiOjF9');
        await list.execute();

        assert.isTrue(called);
    });
});