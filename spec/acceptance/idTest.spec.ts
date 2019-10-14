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

    @DBColumn()
    description:string

    secret:string;

    constructor(id:number, name:string, description:string, secret?:string)
    {
        this.id = id;
        this.name = name;
        this.description = description;
        this.secret = secret;
    }
}

describe('ID tests', function () 
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user4:User;

    before(async ()=>{
        nodenamo = new NodeNamo(new DocumentClient({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }))
        await nodenamo.createTable().for(User).execute();

        user1 = new User(1, 'Some One', 'Description 1');
        user2 = new User(2, 'Some Two', 'Description 2');
        user3 = new User(3, 'Some Three', 'Description 3');
        user4 = new User(4, 'Some Four', 'Description 4');
    });

    it('Add items', async () =>
    {
        user2.secret = 'super secured';

        await Promise.all([
            nodenamo.insert(user1).into(User).execute(),
            nodenamo.insert(user2).into(User).execute(),
            nodenamo.insert(user3).into(User).execute(),
            nodenamo.insert(user4).into(User).execute()]);

        user2.secret = undefined;
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);

        assert.deepEqual(users.items[1].secret, undefined);
    });

    it('List all items - reverse', async () =>
    {
        let users = await nodenamo.list().from(User).order(false).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user4);
        assert.deepEqual(users.items[1], user3);
        assert.deepEqual(users.items[2], user2);
        assert.deepEqual(users.items[3], user1);

        assert.deepEqual(users.items[1].secret, undefined);
    });


    it('List items with paging', async () =>
    {
        let page1 = await nodenamo.list().from(User).limit(1).execute<User>();
        
        assert.equal(page1.items.length, 1);
        assert.deepEqual(page1.items[0], user1);

        let page2 = await nodenamo.list().from(User).limit(1).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 1);
        assert.deepEqual(page2.items[0], user2);
        assert.deepEqual(page2.items[0].secret, undefined);
        
        let page3 = await nodenamo.list().from(User).limit(1).resume(page2.lastEvaluatedKey).execute<User>();
        
        assert.equal(page3.items.length, 1);
        assert.deepEqual(page3.items[0], user3);
        
        let page4 = await nodenamo.list().from(User).limit(1).resume(page3.lastEvaluatedKey).execute<User>();
        
        assert.equal(page4.items.length, 1);
        assert.deepEqual(page4.items[0], user4);
    });

    it('List items with a filter', async () =>
    {
        let users = await nodenamo.list().from(User).filter({
                            filterExpression:"#name=:name", 
                            expressionAttributeNames:{'#name':'name'},
                            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[0].secret, undefined);
    });

    it('List items by an undefined', async () =>
    {
        let users = await nodenamo.list().from(User).by(undefined).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
    });

    it('List items by an invalid value', async () =>
    {
        let users = await nodenamo.list().from(User).by('invalid').execute<User>();
        
        assert.equal(users.items.length, 0);
        assert.equal(users.lastEvaluatedKey, undefined);
    });

    it('List items with a filter and projections', async () =>
    {
        let users = await nodenamo.list("id").from(User).filter({
                            filterExpression:"#name=:name", 
                            expressionAttributeNames:{'#name':'name'},
                            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], {id:2, name:undefined, description:undefined, secret:undefined});
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        
        assert.deepEqual(user, user2);
        assert.deepEqual(user.secret, undefined);
    });

    it('Update an item', async () =>
    {
        let user = await nodenamo.get(3).from(User).execute<User>();
        assert.deepEqual(user, user3);

        user3.name = 'This Three';
        user3['extra'] = 'invalid';
        await nodenamo.update(user3).from(User).execute();
        
        user = await nodenamo.get(3).from(User).execute();
        assert.deepEqual(user, {id:3, name: 'This Three', description: 'Description 3', secret: undefined});
    });

    it('Update an item - delta - undefined property', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, user2);

        await nodenamo.update({id: 2, name: 'This Two', description: undefined}).from(User).execute();
        
        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, {id:2, name: 'This Two', description: 'Description 2', secret: undefined});
    });

    it('Update an item - delta - omitted property', async () =>
    {
        let user = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user, user1);

        await nodenamo.update({id: 1, name: 'This One'}).from(User).execute();
        
        user = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user, {id:1, name: 'This One', description: 'Description 1', secret: undefined});
    });

    it('Delete an item', async () =>
    {
        assert.isDefined(await nodenamo.get(1).from(User).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 4);

        await nodenamo.delete(1).from(User).execute();

        assert.isUndefined(await nodenamo.get(1).from(User).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 3);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});