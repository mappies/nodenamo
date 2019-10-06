import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@DBTable({name:'nodenamo_acceptance_idTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    name:string;

    constructor(id:number, name:string)
    {
        this.id = id;
        this.name = name;
    }
}

describe('ID tests', function () 
{
    let nodenamo:NodeNamo;

    before(async ()=>{
        nodenamo = new NodeNamo(new DocumentClient({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }))
        await nodenamo.createTable().for(User).execute();
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(new User(1, 'Some One')).into(User).execute(),
            nodenamo.insert(new User(2, 'Some Two')).into(User).execute(),
            nodenamo.insert(new User(3, 'Some Three')).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 1, name: 'Some One' });
        assert.deepEqual(users.items[1], { id: 2, name: 'Some Two' });
        assert.deepEqual(users.items[2], { id: 3, name: 'Some Three' });
    });

    it('List items with paging', async () =>
    {
        let page1 = await nodenamo.list().from(User).limit(1).execute<User>();
        
        assert.equal(page1.items.length, 1);
        assert.deepEqual(page1.items[0], { id: 1, name: 'Some One' });

        let page2 = await nodenamo.list().from(User).limit(1).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 1);
        assert.deepEqual(page2.items[0], { id: 2, name: 'Some Two' });
        
        let page3 = await nodenamo.list().from(User).limit(1).resume(page2.lastEvaluatedKey).execute<User>();
        
        assert.equal(page3.items.length, 1);
        assert.deepEqual(page3.items[0], { id: 3, name: 'Some Three' });
    });

    it('List items with a filter', async () =>
    {
        let users = await nodenamo.list().from(User).filter({
                            filterExpression:"#name=:name", 
                            expressionAttributeNames:{'#name':'name'},
                            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two' });
    });

    it('List items with a filter and projections', async () =>
    {
        let users = await nodenamo.list("id").from(User).filter({
                            filterExpression:"#name=:name", 
                            expressionAttributeNames:{'#name':'name'},
                            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: undefined });
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();
        
        assert.deepEqual(user, { id: 2, name: 'Some Two' });
    });

    it('Update an item', async () =>
    {
        let user = await nodenamo.get(3).from(User).execute<User>();
        assert.deepEqual(user, { id: 3, name: 'Some Three' });

        user.name = 'This Three';
        await nodenamo.update(user).from(User).execute();
        
        user = await nodenamo.get(3).from(User).execute();
        assert.deepEqual(user, { id: 3, name: 'This Three' });
    });

    it('Delete an item', async () =>
    {
        assert.isDefined(await nodenamo.get(1).from(User).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 3);

        await nodenamo.delete(1).from(User).execute();

        assert.isUndefined(await nodenamo.get(1).from(User).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 2);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});