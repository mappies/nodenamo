import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { ReturnValue } from '../../src/interfaces/returnValue';

@DBTable({name:'nodenamo_acceptance_idTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    name:string;

    @DBColumn()
    description:string;

    @DBColumn()
    obj:object|undefined;

    secret:string|undefined;

    constructor(id:number, name:string, description:string, secret?:string, obj?:object)
    {
        this.id = id;
        this.name = name;
        this.description = description;
        this.secret = secret;
        this.obj = obj;
    }
}

describe('ID tests', function ()
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user4:User;

    before(async ()=>
    {
        nodenamo = new NodeNamo({ 
            endpoint: Config.DYNAMODB_ENDPOINT, 
            region: 'us-east-1'
        })
        
        await nodenamo.createTable().for(User).execute();

        user1 = new User(1, 'Some One', 'Description 1');
        user2 = new User(2, 'Some Two', 'Description 2');
        user3 = new User(3, 'Some Three', 'Description 3');
        user4 = new User(4, 'Some Four', 'Description 4');
    });

    it('Add items', async () =>
    {
        user2.secret = 'super secured';
        user3.obj = {num:1, bool:true, str:'string', empty:'', array:[], obj:{n:1, e:''}};

        await Promise.all([
            nodenamo.insert(user1).into(User).execute(),
            nodenamo.insert(user2).into(User).execute(),
            nodenamo.insert(user3).into(User).execute(),
            nodenamo.insert(user4).into(User).where('#hash <> :hash',{'#hash':'hash'},{':hash': 'something'}).execute()]);

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

    it('List all items strongly consistent', async () =>
    {
        let users = await nodenamo.list().from(User).stronglyConsistent(true).execute<User>();

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
        assert.isDefined(page1.firstEvaluatedKey);

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
        assert.isUndefined(page4.lastEvaluatedKey);
        
        let page3again = await nodenamo.list().from(User).limit(1).resume(page4.firstEvaluatedKey).order(false).execute<User>();
        
        assert.equal(page3again.items.length, 1);
        assert.deepEqual(page3again.items[0], user3);
        assert.equal(page3again.firstEvaluatedKey, page3.firstEvaluatedKey);
        assert.equal(page3again.lastEvaluatedKey, page3.lastEvaluatedKey);
        
        let page2again = await nodenamo.list().from(User).limit(1).resume(page3again.firstEvaluatedKey).order(false).execute<User>();

        assert.equal(page2again.items.length, 1);
        assert.deepEqual(page2again.items[0], user2);
        assert.equal(page2again.firstEvaluatedKey, page2.firstEvaluatedKey);
        assert.equal(page2again.lastEvaluatedKey, page2.lastEvaluatedKey);
        
        let page1again = await nodenamo.list().from(User).limit(1).resume(page2again.firstEvaluatedKey).order(false).execute<User>();

        assert.equal(page1again.items.length, 1);
        assert.deepEqual(page1again.items[0], user1);
        assert.equal(page1again.firstEvaluatedKey, page1.firstEvaluatedKey);
        assert.isUndefined(page1again.lastEvaluatedKey);
        
        let page0 = await nodenamo.list().from(User).limit(1).resume(page1.firstEvaluatedKey).order(false).execute<User>();
        let page0again = await nodenamo.list().from(User).limit(1).resume(page1again.firstEvaluatedKey).order(false).execute<User>();
        
        assert.equal(page0.items.length, 0);
        assert.equal(page0.firstEvaluatedKey, page0again.firstEvaluatedKey);
        assert.equal(page0.lastEvaluatedKey, page0again.lastEvaluatedKey);
        assert.deepEqual(page0, page0again);
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
        assert.deepEqual(users.items[0], {id:2, name:undefined, description:undefined, secret:undefined, obj:undefined});
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();

        assert.deepEqual(user, user2);
        assert.deepEqual(user.secret, undefined);
    });

    it('Get an item strongly consistent', async () =>
    {
        let user = await nodenamo.get(2).from(User).stronglyConsistent(true).execute<User>();

        assert.deepEqual(user, user2);
        assert.deepEqual(user.secret, undefined);
    });

    it('Update an item', async () =>
    {
        let user = await nodenamo.get(3).from(User).execute<User>();
        assert.deepEqual(user, user3);

        user3.name = 'This Three';
        user3['extra'] = 'invalid';
        let result = await nodenamo.update(user3).from(User).execute();

        assert.isUndefined(result);

        user = await nodenamo.get(3).from(User).execute();
        assert.deepEqual(user, {id:3, name: 'This Three', description: 'Description 3', secret: undefined, obj:{array:[], bool:true, empty:'', num:1, obj:{n:1,e:''}, str:'string'}});
    });

    it('Update an item - delta - undefined property', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, user2);

        await nodenamo.update({id: 2, name: 'This Two', description: undefined}).from(User).execute();

        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, {id:2, name: 'This Two', description: 'Description 2', secret: undefined, obj:undefined});
    });

    it('Update an item - delta - omitted property', async () =>
    {
        let user = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user, user1);

        await nodenamo.update({id: 1, name: 'This One'}).from(User).execute();

        user = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user, {id:1, name: 'This One', description: 'Description 1', secret: undefined, obj:undefined});
    });

    it('Update an item - delta - empty string property', async () =>
    {
        let user = await nodenamo.get(4).from(User).execute<User>();
        assert.deepEqual(user, user4);

        await nodenamo.update({id: 4, description: ''}).from(User).execute();

        user = await nodenamo.get(4).from(User).execute();

        assert.deepEqual(user, {id:4, name: 'Some Four', description: '', secret: undefined, obj:undefined});
    });

    it('Update an item - return AllOld', async () =>
    {
        let originalUser = await nodenamo.get(2).from(User).execute<User>();

        let result = await nodenamo.update({id: 2, name: 'New Two'}).from(User).returning(ReturnValue.AllOld).execute();

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

    it('On item', async () =>
    {
        let user = await nodenamo.get(4).from(User).execute<User>();

        let result = await nodenamo.on(4)
                                   .from(User)
                                   .set(['#desc=:desc'], {'#desc': 'description'}, {':desc': 'That description'})
                                   .add(['#obj :obj'], {'#obj': 'obj'}, {':obj': 42})
                                   .remove(['#name'], {'#name': 'name'})
                                   .execute();

        user = await nodenamo.get(4).from(User).execute();

        assert.isUndefined(result);

        assert.deepEqual(user, {id:4, name: undefined, description: 'That description', secret: undefined, obj:<any>42});
    });

    it('On item - return None', async () =>
    {
        let result = await nodenamo.on(4)
                                   .from(User)
                                   .set(['#name=:name'], {'#name': 'name'}, {':name': 'That name - None'})
                                   .returning(ReturnValue.None)
                                   .execute();

        assert.isUndefined(result);
    });

    it('On item - return AllOld', async () =>
    {
        let originalUser = await nodenamo.get(4).from(User).execute<User>();

        let result = await nodenamo.on(4)
                                   .from(User)
                                   .set(['#name=:name'], {'#name': 'name'}, {':name': 'That name - AllOld'})
                                   .returning(ReturnValue.AllOld)
                                   .execute();

        assert.deepEqual(result, originalUser);
    });

    it('On item - return AllNew', async () =>
    {
        let originalUser = await nodenamo.get(4).from(User).execute<User>();

        let result = await nodenamo.on(4)
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
