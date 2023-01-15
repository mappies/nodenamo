import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

@DBTable({name:'nodenamo_acceptance_multiValuesHashRangeTest'})
class User
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

    constructor(data?:{id:number, name:string, roles:string[], departments:string[], createdTimestamp:number})
    {
        this.id = data?.id;
        this.name = data?.name;
        this.roles = data?.roles;
        this.departments = data?.departments;
        this.createdTimestamp = data?.createdTimestamp;
    }
}

describe('Multi-values Hash/Range tests', function ()
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user4:User;
    let user5:User;
    let user6:User;

    before(async ()=>{
        nodenamo = new NodeNamo(new DynamoDB({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }))
        await nodenamo.createTable().for(User).execute();
    });

    beforeEach(()=>{
        user1 = new User({id: 1, name: 'Some One', roles: ['user'], departments: ['HR'], createdTimestamp: 2016});
        user2 = new User({id: 2, name: 'Some Two', roles: ['user'], departments: ['IT'], createdTimestamp: 2015});
        user3 = new User({id: 3, name: 'Some Three', roles: ['user', 'admin'], departments: ['IT', 'HR'], createdTimestamp: 2014});
        user4 = new User({id: 4, name: 'Some Four', roles: ['admin'], departments: ['IT'], createdTimestamp: 2013});
        user5 = new User({id: 5, name: 'Some Five', roles: ['user'], departments: ['HR'], createdTimestamp: 2012});
        user6 = new User({id: 6, name: 'Some Six', roles: ['user', 'admin'], departments: ['IT', 'Finance'], createdTimestamp: 2011});
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(user1).into(User).execute(),
            nodenamo.insert(user2).into(User).execute(),
            nodenamo.insert(user3).into(User).execute(),
            nodenamo.insert(user4).into(User).execute(),
            nodenamo.insert(user5).into(User).execute(),
            nodenamo.insert(user6).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user6);
        assert.deepEqual(users.items[1], user5);
        assert.deepEqual(users.items[2], user4);
        assert.deepEqual(users.items[3], user3);
        assert.deepEqual(users.items[4], user2);
        assert.deepEqual(users.items[5], user1);
    });

    it('List all items - reverse', async () =>
    {
        let users = await nodenamo.list().from(User).order(false).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user5);
        assert.deepEqual(users.items[5], user6);
    });

    it('List all items with a projection', async () =>
    {
        let users = await nodenamo.list("id", "name").from(User).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], new User({ id: 6, name: 'Some Six', roles: undefined, departments: undefined, createdTimestamp: undefined }));
        assert.deepEqual(users.items[1], new User({ id: 5, name: 'Some Five', roles: undefined, departments: undefined, createdTimestamp: undefined }));
        assert.deepEqual(users.items[2], new User({ id: 4, name: 'Some Four', roles: undefined, departments: undefined, createdTimestamp: undefined }));
        assert.deepEqual(users.items[3], new User({ id: 3, name: 'Some Three', roles: undefined, departments: undefined, createdTimestamp: undefined }));
        assert.deepEqual(users.items[4], new User({ id: 2, name: 'Some Two', roles: undefined, departments: undefined, createdTimestamp: undefined }));
        assert.deepEqual(users.items[5], new User({ id: 1, name: 'Some One', roles: undefined, departments: undefined, createdTimestamp: undefined }));
    });

    it('List items with paging', async () =>
    {
        let page1 = await nodenamo.list().from(User).limit(1).execute<User>();

        assert.equal(page1.items.length, 1);
        assert.deepEqual(page1.items[0], user6);

        let page2 = await nodenamo.list().from(User).limit(1).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 1);
        assert.deepEqual(page2.items[0], user5);

        let page3 = await nodenamo.list().from(User).limit(1).resume(page2.lastEvaluatedKey).execute<User>();

        assert.equal(page3.items.length, 1);
        assert.deepEqual(page3.items[0], user4);

        let page4 = await nodenamo.list().from(User).limit(1).resume(page3.lastEvaluatedKey).execute<User>();

        assert.equal(page4.items.length, 1);
        assert.deepEqual(page4.items[0], user3);

        let page5 = await nodenamo.list().from(User).limit(1).resume(page4.lastEvaluatedKey).execute<User>();

        assert.equal(page5.items.length, 1);
        assert.deepEqual(page5.items[0], user2);

        let page6 = await nodenamo.list().from(User).limit(1).resume(page5.lastEvaluatedKey).execute<User>();

        assert.equal(page6.items.length, 1);
        assert.deepEqual(page6.items[0], user1);
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
        let users = await nodenamo.list().from(User).by('user').execute<User>();

        assert.equal(users.items.length, 5);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user6);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user5);
        assert.deepEqual(users.items[4], user2);
    });

    it('List items by another hash', async () =>
    {
        let users = await nodenamo.list().from(User).by('admin').execute<User>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user6);
        assert.deepEqual(users.items[1], user3);
        assert.deepEqual(users.items[2], user4);
    });

    it('List items by an undefined', async () =>
    {
        let users = await nodenamo.list().from(User).by(undefined).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user6);
        assert.deepEqual(users.items[1], user5);
        assert.deepEqual(users.items[2], user4);
        assert.deepEqual(users.items[3], user3);
        assert.deepEqual(users.items[4], user2);
        assert.deepEqual(users.items[5], user1);
    });

    it('List items by an invalid value', async () =>
    {
        let users = await nodenamo.list().from(User).by('invalid').execute<User>();

        assert.equal(users.items.length, 0);
        assert.equal(users.lastEvaluatedKey, undefined);
    });

    it('List items by a hash and a filter', async () =>
    {
        let users = await nodenamo.list().from(User).by('user').filter({
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
                            keyConditions:"#roles=:roles",
                            expressionAttributeNames:{'#roles':'roles'},
                            expressionAttributeValues:{':roles': 'admin'}}).execute<User>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user6);
        assert.deepEqual(users.items[1], user3);
        assert.deepEqual(users.items[2], user4);
    });

    it('Find items with a filter', async () =>
    {
        let users = await nodenamo.find().from(User).where({
                                keyConditions:"#roles=:roles",
                            expressionAttributeNames:{'#roles':'roles'},
                            expressionAttributeValues:{':roles': 'admin'}
                            }).filter({
                                filterExpression:"begins_with(#name,:name)",
                                expressionAttributeNames:{'#name':'name'},
                                expressionAttributeValues:{':name': 'Some T'}
                            }).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user3);
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();

        assert.deepEqual(user, user2);
    });

    it('Get an item strongly', async () =>
    {
        let user = await nodenamo.get(2).from(User).stronglyConsistent(true).execute();

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
        assert.deepEqual(user, new User({ id: 3, name: 'This Three', roles: ['user', 'admin'], departments: ['IT', 'HR'], createdTimestamp: 2014 }));
    });

    it('Update an item - delta - undefined property', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, user2);

        await nodenamo.update({id:2, name:'This Two', account: undefined}).from(User).execute();

        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, new User({ id: 2, name: 'This Two', roles: ['user'], departments: ['IT'], createdTimestamp: 2015 }));
    });

    it('Update an item - delta - omitted property', async () =>
    {
        let user = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user, user1);

        await nodenamo.update({id:1, name:'This One'}).from(User).execute();

        user = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user, new User({ id: 1, name: 'This One', roles: ['user'], departments: ['HR'], createdTimestamp: 2016 }));
    });

    it('Update an item - hash change - no duplicate', async () =>
    {
        let user = await nodenamo.get(4).from(User).execute<User>();
        assert.deepEqual(user, user4);

        let users = await nodenamo.list().from(User).by('user', 'Finance').execute();
        assert.equal(users.items.length, 1);
        assert.deepEqual(users.items[0], user6);

        user.roles = ['user'];
        user.departments = ['Finance'];
        await nodenamo.update(user).from(User).execute();

        user = await nodenamo.get(4).from(User).execute();
        assert.deepEqual(user, new User({ id: 4, name: 'Some Four', roles: ['user'], departments: ['Finance'], createdTimestamp: 2013 }));

        users = await nodenamo.list().from(User).by('user', 'Finance').execute();

        assert.equal(users.items.length, 2);
        assert.deepEqual(users.items[0], new User({ id: 4, name: 'Some Four', roles: ['user'], departments: ['Finance'], createdTimestamp: 2013 }));
        assert.deepEqual(users.items[1], user6);
        
        assert.deepEqual((await nodenamo.list().from(User).execute()).items.length, 6);
    });

    it('Update an item - empty string', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();
        assert.deepEqual(user, user6);

        user.name = '';
        await nodenamo.update(user).from(User).execute();

        user = await nodenamo.get(6).from(User).execute();
        assert.deepEqual(user, new User({ id: 6, name: '', roles: ['user', 'admin'], departments: ['IT', 'Finance'], createdTimestamp: 2011 }));
        assert.deepEqual((await nodenamo.list().from(User).execute()).items.length, 6);
    });

    it('On item', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();

        await nodenamo.on(6)
                      .from(User)
                      .set(['#name=:name'], {'#name': 'name'}, {':name': 'Mr. Six'})
                      .execute();

        user = await nodenamo.get(6).from(User).execute();

        assert.deepEqual(user, new User({id:6, name: 'Mr. Six', roles: ['user', 'admin'], departments: ['IT', 'Finance'], createdTimestamp: 2011}));
    });

    it('Delete an item', async () =>
    {
        assert.isDefined(await nodenamo.get(1).from(User).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 6);

        await nodenamo.delete(1).from(User).execute();

        assert.isUndefined(await nodenamo.get(1).from(User).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 5);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});
