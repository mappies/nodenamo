import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { ReturnValue } from '../../src/interfaces/returnValue';

@DBTable({name:'nodenamo_acceptance_multiValuesRangeTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn({hash:true})
    account:number;

    @DBColumn()
    name:string;

    @DBColumn({range:true, name:'newRanges'})
    ranges:any[];

    constructor(id:number, name:string, account:number, ranges:any[])
    {
        this.id = id;
        this.name = name;
        this.account = account;
        this.ranges = ranges;
    }
}

describe('Multi-values range tests', function () 
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user6:User;

    before(async ()=>{
        nodenamo = new NodeNamo({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' });
        await nodenamo.createTable().for(User).execute();
    });

    beforeEach(()=>{
        user1 = new User(1, 'Some One', 1000, ['2018#1', false, 'Some One#1']);
        user2 = new User(2, 'Some Two', 1000, ['2017#2', true, 'Some Two#2']);
        user3 = new User(3, 'Some Three', 2000, ['2016#3', 'true#3', 'Some Three#3']);
        user6 = new User(6, 'Some Six', 3000, ['2020#6', 'true#6', 'Some Six#6']);
    })
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
        assert.deepEqual(users.items[0], user3);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user1);
        assert.deepEqual(users.items[3], user6);
    });

    it('List items by a hash', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).execute<User>();
        
        assert.equal(users.items.length, 2);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
    });

    it('List items by an undefined', async () =>
    {
        let users = await nodenamo.list().from(User).by(undefined).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user3);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user1);
        assert.deepEqual(users.items[3], user6);
    });

    it('List items by an invalid hash', async () =>
    {
        let users = await nodenamo.list().from(User).by('invalid').execute<User>();
        
        assert.equal(users.items.length, 0);
        assert.equal(users.lastEvaluatedKey, undefined);
    });

    it('List items by a hash (multi-values 1)', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, false).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
    });

    it('List items by a hash (multi-values 2)', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 2017).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
    });
    
    it('List items by a hash (multi-values 3)', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 'Some T').execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
    });
    
    it('List items by a hash (multi-values 3) with a projection', async () =>
    {
        let users = await nodenamo.list("name").from(User).by(1000, 'Some T').execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], {id: undefined, name: "Some Two", account: undefined, ranges: undefined});
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
        user3['extra'] = 'invalid';
        let result = await nodenamo.update(user).from(User).execute();

        assert.isUndefined(result);
        
        user = await nodenamo.get(3).from(User).execute();
        assert.deepEqual(user, { id: 3, name: 'This Three', account: 2000, ranges: ['2016#3', 'true#3', 'Some Three#3'] });
    });

    it('Update an item - delta - undefined property', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, user2);

        await nodenamo.update({id:2, name:'This Two', account: undefined, ranges: undefined}).from(User).execute();
        
        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, { id: 2, name: 'This Two', account: 1000, ranges: ['2017#2', true, 'Some Two#2']});
    });

    it('Update an item - delta - omitted property', async () =>
    {
        let user = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user, user1);

        await nodenamo.update({id:1, name:'This One'}).from(User).execute();
        
        user = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user, { id: 1, name: 'This One', account: 1000, ranges: ['2018#1', false, 'Some One#1'] });
    });

    it('Update an item - delta - empty string', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();
        assert.deepEqual(user, user6);

        await nodenamo.update({id:6, name:''}).from(User).execute();
        
        user = await nodenamo.get(6).from(User).execute();
        assert.deepEqual(user, { id: 6, name: '', account: 3000, ranges: ['2020#6', 'true#6', 'Some Six#6'] });
    });

    it('Update an item - return AllOld', async () =>
    {
        let originalUser = await nodenamo.get(2).from(User).execute<User>();

        let result = await nodenamo.update({id: 2, name: 'Newer Two'}).from(User).returning(ReturnValue.AllOld).execute();

        assert.deepEqual(result, originalUser);
    });

    it('Update an item - return AllNew', async () =>
    {
        let originalUser = await nodenamo.get(2).from(User).execute<User>();

        let result = await nodenamo.update({id: 2, name: 'Newest Two'}).from(User).returning(ReturnValue.AllNew).execute();

        assert.deepEqual(result, {...originalUser, name: 'Newest Two'});
    });

    it('Update an item - return None', async () =>
    {
        let result = await nodenamo.update({id: 2, name: 'Newer Two'}).from(User).returning(ReturnValue.None).execute();

        assert.isUndefined(result);
    });

    it('Update an item - with all combinations', async () =>
    {
        let originalUser = await nodenamo.get(2).from(User).execute<User>();

        let result = await nodenamo.update({id: 2, name: 'Another Two'})
                                   .from(User)
                                   .where('#account=:account', {'#account': 'account'}, {':account': originalUser.account})
                                   .returning(ReturnValue.AllOld)
                                   .withVersionCheck()
                                   .execute();

        assert.deepEqual(result, originalUser);
    });

    it('On item', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();

        await nodenamo.on(6)
                      .from(User)
                      .set(['#name=:name'], {'#name': 'name'}, {':name': 'Mr. Six'})
                      .execute();
        
        user = await nodenamo.get(6).from(User).execute();
        
        assert.deepEqual(user, {id:6, name: 'Mr. Six', account: 3000, ranges: ['2020#6', 'true#6', 'Some Six#6'] });
    });

    it('On item - return None', async () =>
    {
        let result = await nodenamo.on(6)
                                   .from(User)
                                   .set(['#name=:name'], {'#name': 'name'}, {':name': 'That name - None'})
                                   .returning(ReturnValue.None)
                                   .execute();

        assert.isUndefined(result);
    });

    it('On item - return AllOld', async () =>
    {
        let originalUser = await nodenamo.get(6).from(User).execute<User>();

        let result = await nodenamo.on(6)
                                   .from(User)
                                   .set(['#name=:name'], {'#name': 'name'}, {':name': 'That name - AllOld'})
                                   .returning(ReturnValue.AllOld)
                                   .execute();

        assert.deepEqual(result, originalUser);
    });

    it('On item - return AllNew', async () =>
    {
        let originalUser = await nodenamo.get(6).from(User).execute<User>();

        let result = await nodenamo.on(6)
                                   .from(User)
                                   .set(['#name=:name'], {'#name': 'name'}, {':name': 'That name - AllNew'})
                                   .returning(ReturnValue.AllNew)
                                   .execute();

        assert.deepEqual(result, {...originalUser, name: 'That name - AllNew'});
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