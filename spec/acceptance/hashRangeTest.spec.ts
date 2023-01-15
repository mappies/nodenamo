import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@DBTable({name:'nodenamo_acceptance_hashRangeTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn({hash:true})
    account:number;

    @DBColumn()
    name:string;

    @DBColumn({range:true})
    created:number;

    constructor(id:number, name:string, account:number, created:number)
    {
        this.id = id;
        this.name = name;
        this.account = account;
        this.created = created;
    }
}

describe('Hash-range tests', function ()
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user4:User;
    let user5:User;
    let user6:User;

    before(async ()=>{
        nodenamo = new NodeNamo(new DocumentClient({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }))
        await nodenamo.createTable().for(User).execute();
    });

    beforeEach(()=>{
        user1 = new User(1, 'Some One', 1000, 2017);
        user2 = new User(2, 'Some Two', 1000, 2016);
        user3 = new User(3, 'Some Three', 2000, 2018);
        user4 = new User(4, 'Some Four', 2000, 2019);
        user5 = new User(5, 'Some Five', 1000, 2019);
        user6 = new User(6, 'Some Six', 3000, 2020);
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
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user5);
        assert.deepEqual(users.items[5], user6);
    });

    it('List all items strongly', async () =>
    {
        let users = await nodenamo.list().from(User).stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user5);
        assert.deepEqual(users.items[5], user6);
    });

    it('List all items - reverse', async () =>
    {
        let users = await nodenamo.list().from(User).order(false).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user6);
        assert.deepEqual(users.items[1], user5);
        assert.deepEqual(users.items[2], user4);
        assert.deepEqual(users.items[3], user3);
        assert.deepEqual(users.items[4], user1);
        assert.deepEqual(users.items[5], user2);
    });

    it('List items with paging', async () =>
    {
        let page1 = await nodenamo.list().from(User).limit(1).execute<User>();

        assert.equal(page1.items.length, 1);
        assert.deepEqual(page1.items[0], user2);

        let page2 = await nodenamo.list().from(User).limit(1).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 1);
        assert.deepEqual(page2.items[0], user1);

        let page3 = await nodenamo.list().from(User).limit(1).resume(page2.lastEvaluatedKey).execute<User>();

        assert.equal(page3.items.length, 1);
        assert.deepEqual(page3.items[0], user3);

        let page4 = await nodenamo.list().from(User).limit(1).resume(page3.lastEvaluatedKey).execute<User>();

        assert.equal(page4.items.length, 1);
        assert.deepEqual(page4.items[0], user4);

        let page5 = await nodenamo.list().from(User).limit(1).resume(page4.lastEvaluatedKey).execute<User>();

        assert.equal(page5.items.length, 1);
        assert.deepEqual(page5.items[0], user5);

        let page6 = await nodenamo.list().from(User).limit(1).resume(page5.lastEvaluatedKey).execute<User>();

        assert.equal(page6.items.length, 1);
        assert.deepEqual(page6.items[0], user6);
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

    it('List items with a filter strongly', async () =>
    {
        let users = await nodenamo.list().from(User).filter({
                            filterExpression:"#name=:name",
                            expressionAttributeNames:{'#name':'name'},
                            expressionAttributeValues:{':name': 'Some Two'}})
                            .stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
    });

    it('List items by undefined', async () =>
    {
        let users = await nodenamo.list().from(User).by(undefined).execute<User>();

        assert.equal(users.items.length, 6);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user5);
        assert.deepEqual(users.items[5], user6);
    });

    it('List items by an invalid value', async () =>
    {
        let users = await nodenamo.list().from(User).by('invalid').execute<User>();

        assert.equal(users.items.length, 0);
        assert.equal(users.lastEvaluatedKey, undefined);
    });

    it('List items by a hash', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).execute<User>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user5);
    });

    it('List items by a hash strongly', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user5);
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

    it('List items by a hash and a filter strongly', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).filter({
            filterExpression:"#name=:name",
            expressionAttributeNames:{'#name':'name'},
            expressionAttributeValues:{':name': 'Some Two'}})
            .stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
    });

    it('List items by a hash and a range', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 2017).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
    });

    it('List items by a hash and a range strongly', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 2017).stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
    });

    it('List items by a hash, a range, and a projection', async () =>
    {
        let users = await nodenamo.list("id", "created").from(User).by(1000, 2017).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 1, name: undefined, account: undefined, created: 2017 });
    });

    it('Find items', async () =>
    {
        let users = await nodenamo.find().from(User).where({
                            keyConditions:"#account=:account",
                            expressionAttributeNames:{'#account':'account'},
                            expressionAttributeValues:{':account': 1000}}).execute<User>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user5);
    });

    it('Find items strongly', async () =>
    {
        let users = await nodenamo.find().from(User).where({
                            keyConditions:"#account=:account",
                            expressionAttributeNames:{'#account':'account'},
                            expressionAttributeValues:{':account': 1000}})
                            .stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user5);
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
        let users = await nodenamo.find("id").from(User).where({
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
        assert.deepEqual(users.items[0], { id: 2, name: undefined, account: undefined, created: undefined });
    });

    it('Find items with a filter and a projection strongly', async () =>
    {
        let users = await nodenamo.find("id").from(User).where({
                                keyConditions:"#account=:account",
                                expressionAttributeNames:{'#account':'account'},
                                expressionAttributeValues:{':account': 1000}
                            }).filter({
                                filterExpression:"begins_with(#name,:name)",
                                expressionAttributeNames:{'#name':'name'},
                                expressionAttributeValues:{':name': 'Some T'}
                            })
                            .stronglyConsistent(true).execute<User>();

        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: undefined, account: undefined, created: undefined });
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
        assert.deepEqual(user, { id: 3, name: 'This Three', account: 2000, created: 2018 });
    });

    it('Update an item - delta - undefined property', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, user2);

        await nodenamo.update({id:2, name:'This Two', account: undefined, created: undefined}).from(User).execute();

        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, { id: 2, name: 'This Two', account: 1000, created: 2016 });
    });

    it('Update an item - delta - omitted property', async () =>
    {
        let user = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user, user1);

        await nodenamo.update({id:1, name:'This One'}).from(User).execute();

        user = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user, { id: 1, name: 'This One', account: 1000, created: 2017 });
    });

    it('Update an item - hash/range change - no duplicate', async () =>
    {
        let user = await nodenamo.get(4).from(User).execute<User>();
        assert.deepEqual(user, user4);

        user.account = 4000;
        await nodenamo.update(user).from(User).execute();

        user = await nodenamo.get(4).from(User).execute();
        assert.deepEqual(user, { id: 4, name: 'Some Four', account: 4000, created: 2019 });
        assert.deepEqual((await nodenamo.list().from(User).execute()).items.length, 6);
    });

    it('Update an item - hash/range change - duplicate', async () =>
    {
        let usersBefore = await nodenamo.list().from(User).by(2000, 2018).execute<User>();
        assert.equal(usersBefore.items.length, 1);
        assert.deepEqual(usersBefore.items[0].id, 3);

        let user = await nodenamo.get(5).from(User).execute<User>();
        assert.deepEqual(user, user5);

        let error = undefined;
        try
        {
            user.account = 2000;
            user.created = 2018;

            await nodenamo.update(user).from(User).execute(); //Duplicate key with user3
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.isTrue(error.message.includes('An object with the same ID or hash-range key already exists in \'nodenamo_acceptance_hashRangeTest\' table'));
    });

    it('Update an item - empty string', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();
        assert.deepEqual(user, user6);

        user.name = '';
        await nodenamo.update(user).from(User).execute();

        user = await nodenamo.get(6).from(User).execute();
        assert.deepEqual(user, { id: 6, name: '', account: 3000, created: 2020 });
    });

    it('On item', async () =>
    {
        let user = await nodenamo.get(6).from(User).execute<User>();

        await nodenamo.on(6)
                      .from(User)
                      .set(['#name=:name'], {'#name': 'name'}, {':name': 'Mr. Six'})
                      .execute();

        user = await nodenamo.get(6).from(User).execute();

        assert.deepEqual(user, {id:6, name: 'Mr. Six', account: 3000, created: 2020});
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
