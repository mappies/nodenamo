import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@DBTable({name:'nodenamo_acceptance_targetNameTest'})
class User
{
    @DBColumn({id:true,name:'customId'})
    id:number;

    @DBColumn({hash:true,name:'customAccount'})
    account:number;

    @DBColumn({name:'targetName'})
    name:string;

    @DBColumn({range:true,name:'customCreated'})
    created:number;

    @DBColumn({hash:'pair',name:'pairkey'})
    department:string;

    @DBColumn({range:'pair',name:'pairrange' })
    enabled:boolean;

    constructor(id:number, name:string, account:number, created:number, department:string, enabled:boolean)
    {
        this.id = id;
        this.name = name;
        this.account = account;
        this.created = created;
        this.department = department;
        this.enabled = enabled;
    }
}

describe('Custom-name tests', function () 
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user6:User;

    before(async ()=>{
        nodenamo = new NodeNamo(new DocumentClient({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }));
        await nodenamo.createTable().for(User).execute();
    });

    beforeEach(()=>
    {
        user1 = new User(1, 'Some One', 1000, 2017, 'development', true);
        user2 = new User(2, 'Some Two', 1000, 2016, 'business', true);
        user3 = new User(3, 'Some Three', 2000, 2018, 'development', false);
        user6 = new User(6, 'Some Six', 3000, 2020, 'hr', true);
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(user1).into(User).execute(),
            nodenamo.insert(user2).into(User).execute(),
            nodenamo.insert(user3).into(User).execute(),
            nodenamo.insert(user6).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user6);
    });

    it('List items by undefined', async () =>
    {
        let users = await nodenamo.list().from(User).by(undefined).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user6);
    });

    it('List items by an invalid value', async () =>
    {
        let users = await nodenamo.list().from(User).by('invalid').execute<User>();
        
        assert.equal(users.items.length, 0);
        assert.equal(users.lastEvaluatedKey, undefined);
    });

    it('List all items with a projection', async () =>
    {
        let users = await nodenamo.list('name', 'created').from(User).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: undefined, name: 'Some Two', account: undefined, created: 2016, department: undefined, enabled: undefined  });
        assert.deepEqual(users.items[1], { id: undefined, name: 'Some One', account: undefined, created: 2017, department: undefined, enabled: undefined });
        assert.deepEqual(users.items[2], { id: undefined, name: 'Some Three', account: undefined, created: 2018, department: undefined, enabled: undefined });
        assert.deepEqual(users.items[3], { id: undefined, name: 'Some Six', account: undefined, created: 2020, department: undefined, enabled: undefined });
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
    });

    it('List items by a hash', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).execute<User>();
        
        assert.equal(users.items.length, 2);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
    });

    it('List items by a hash and a filter', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).filter({
            filterExpression:"#name=:name", 
            expressionAttributeNames:{'#name':'name'},
            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
    });

    it('List items by a hash, a filter, and a projection', async () =>
    {
        let users = await nodenamo.list("name", "account").from(User).by(1000).filter({
            filterExpression:"#name=:name", 
            expressionAttributeNames:{'#name':'name'},
            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: undefined, name: 'Some Two', account: 1000, created: undefined, department: undefined, enabled: undefined });
    });

    it('List items by a hash/range pair', async () =>
    {
        let users = await nodenamo.list().from(User).by('development', false).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user3);
    });

    it('List items by a hash/range pair and a filter', async () =>
    {
        let users = await nodenamo.list().from(User).by('development').filter({
            filterExpression: '#a = :b',
            expressionAttributeNames: {'#a': 'name'},
            expressionAttributeValues: {':b': 'Some Three'}
        }).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user3);
    });

    it('List items by a hash and a range', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 2017).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
    });

    it('List items by a hash, a range, and a filter', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 2017).filter({
            filterExpression:"#name=:name", 
            expressionAttributeNames:{'#name':'name'},
            expressionAttributeValues:{':name': 'Some One'}
        }).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
    });

    it('Find items', async () =>
    {
        let users = await nodenamo.find().from(User).where({
                            keyConditions:"#account=:account", 
                            expressionAttributeNames:{'#account':'account'},
                            expressionAttributeValues:{':account': 1000}}).execute<User>();
        
        assert.equal(users.items.length, 2);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
    });

    it('Find items with a filter', async () =>
    {
        let users = await nodenamo.find().from(User).where({
                                keyConditions:"#account=:account", 
                                expressionAttributeNames:{'#account':'account'},
                                expressionAttributeValues:{':account': 1000}
                            }).filter({
                                filterExpression:"begins_with(#name,:name)", 
                                expressionAttributeNames:{'#name':'name'},
                                expressionAttributeValues:{':name': 'Some T'}
                            }).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
    });

    it('Find items with a filter and a projection', async () =>
    {
        let users = await nodenamo.find("id", "created").from(User).where({
                                keyConditions:"#account=:account", 
                                expressionAttributeNames:{'#account':'account'},
                                expressionAttributeValues:{':account': 1000}
                            }).filter({
                                filterExpression:"begins_with(#name,:name)", 
                                expressionAttributeNames:{'#name':'name'},
                                expressionAttributeValues:{':name': 'Some T'}
                            }).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: undefined, account: undefined, created: 2016, department: undefined, enabled: undefined });
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();
        
        assert.deepEqual(user, user2);
    });

    it('Update an item', async () =>
    {
        let user = await nodenamo.get(3).from(User).execute<User>();
        assert.deepEqual(user, user3);

        user.name = 'This Three';
        user['extra'] = 'invalid';
        await nodenamo.update(user).from(User).execute();
        
        user = await nodenamo.get(3).from(User).execute();
        assert.deepEqual(user, { id: 3, name: 'This Three', account: 2000, created: 2018, department: 'development', enabled: false });
    });

    it('Update an item - delta - undefined property', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, user2);

        await nodenamo.update({id:2, name:'This Two', account: undefined, created: undefined}).from(User).execute();
        
        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, { id: 2, name: 'This Two', account: 1000, created: 2016, department: 'business', enabled: true });
    });

    it('Update an item - delta - omitted property', async () =>
    {
        let user = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user, user1);

        await nodenamo.update({id:1, name:'This One'}).from(User).execute();
        
        user = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user, { id: 1, name: 'This One', account: 1000, created: 2017, department: 'development', enabled: true });
    });

    it('Update an item - delta - empty string', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();
        assert.deepEqual(user, user6);

        await nodenamo.update({id:6, name:''}).from(User).execute();
        
        user = await nodenamo.get(6).from(User).execute();
        assert.deepEqual(user, { id: 6, name: '', account: 3000, created: 2020, department: 'hr', enabled: true });
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