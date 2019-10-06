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

    constructor(id:number, name:string, account:number, created:number)
    {
        this.id = id;
        this.name = name;
        this.account = account;
        this.created = created;
    }
}

describe('Custom-name tests', function () 
{
    let nodenamo:NodeNamo;

    before(async ()=>{
        nodenamo = new NodeNamo(new DocumentClient({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }));
        await nodenamo.createTable().for(User).execute();
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(new User(1, 'Some One', 1000, 2017)).into(User).execute(),
            nodenamo.insert(new User(2, 'Some Two', 1000, 2016)).into(User).execute(),
            nodenamo.insert(new User(3, 'Some Three', 2000, 2018)).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two', account: 1000, created: 2016 });
        assert.deepEqual(users.items[1], { id: 1, name: 'Some One', account: 1000, created: 2017 });
        assert.deepEqual(users.items[2], { id: 3, name: 'Some Three', account: 2000, created: 2018 });
    });

    it('List all items with a projection', async () =>
    {
        let users = await nodenamo.list('name', 'created').from(User).execute<User>();
        
        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: undefined, name: 'Some Two', account: undefined, created: 2016 });
        assert.deepEqual(users.items[1], { id: undefined, name: 'Some One', account: undefined, created: 2017 });
        assert.deepEqual(users.items[2], { id: undefined, name: 'Some Three', account: undefined, created: 2018 });
    });

    it('List items with a filter', async () =>
    {
        let users = await nodenamo.list().from(User).filter({
                            filterExpression:"#name=:name", 
                            expressionAttributeNames:{'#name':'name'},
                            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two', account: 1000, created: 2016 });
    });

    it('List items by a hash', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).execute<User>();
        
        assert.equal(users.items.length, 2);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two', account: 1000, created: 2016 });
        assert.deepEqual(users.items[1], { id: 1, name: 'Some One', account: 1000, created: 2017 });
    });

    it('List items by a hash and a filter', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000).filter({
            filterExpression:"#name=:name", 
            expressionAttributeNames:{'#name':'name'},
            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two', account: 1000, created: 2016 });
    });

    it('List items by a hash, a filter, and a projection', async () =>
    {
        let users = await nodenamo.list("name", "account").from(User).by(1000).filter({
            filterExpression:"#name=:name", 
            expressionAttributeNames:{'#name':'name'},
            expressionAttributeValues:{':name': 'Some Two'}}).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: undefined, name: 'Some Two', account: 1000, created: undefined });
    });

    it('List items by a hash and a range', async () =>
    {
        let users = await nodenamo.list().from(User).by(1000, 2017).execute<User>();
        
        assert.equal(users.items.length, 1);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 1, name: 'Some One', account: 1000, created: 2017 });
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
        assert.deepEqual(users.items[0], { id: 1, name: 'Some One', account: 1000, created: 2017 });
    });

    it('Find items', async () =>
    {
        let users = await nodenamo.find().from(User).where({
                            keyConditions:"#account=:account", 
                            expressionAttributeNames:{'#account':'account'},
                            expressionAttributeValues:{':account': 1000}}).execute<User>();
        
        assert.equal(users.items.length, 2);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two', account: 1000, created: 2016 });
        assert.deepEqual(users.items[1], { id: 1, name: 'Some One', account: 1000, created: 2017 });
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
        assert.deepEqual(users.items[0], { id: 2, name: 'Some Two', account: 1000, created: 2016 });
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
        assert.deepEqual(users.items[0], { id: 2, name: undefined, account: undefined, created: 2016 });
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();
        
        assert.deepEqual(user, { id: 2, name: 'Some Two', account: 1000, created: 2016 });
    });

    it('Update an item', async () =>
    {
        let user = await nodenamo.get(3).from(User).execute<User>();
        assert.deepEqual(user, { id: 3, name: 'Some Three', account: 2000, created: 2018 });

        user.name = 'This Three';
        await nodenamo.update(user).from(User).execute();
        
        user = await nodenamo.get(3).from(User).execute();
        assert.deepEqual(user, { id: 3, name: 'This Three', account: 2000, created: 2018 });
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