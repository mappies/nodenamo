import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@DBTable({name:'nodenamo_acceptance_globalTableTest'})
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

@DBTable({name:'nodenamo_acceptance_globalTableTest'})
class Book
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    title:string;

    constructor(id:number, title:string)
    {
        this.id = id;
        this.title = title;
    }
}


describe('Global table tests', function () 
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
            nodenamo.insert(new User(3, 'Some Three')).into(User).execute(),
            nodenamo.insert(new Book(1, 'Some Book')).into(Book).execute(),
            nodenamo.insert(new Book(2, 'Another Book')).into(Book).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 1, name: 'Some One' });
        assert.deepEqual(users.items[1], { id: 2, name: 'Some Two' });
        assert.deepEqual(users.items[2], { id: 3, name: 'Some Three' });

        let books = await nodenamo.list().from(Book).execute<Book>();
        
        assert.equal(books.items.length, 2);
        assert.equal(books.lastEvaluatedKey, undefined);
        assert.deepEqual(books.items[0], { id: 1, title: 'Some Book' });
        assert.deepEqual(books.items[1], { id: 2, title: 'Another Book' });
    });

    it('List users with paging', async () =>
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

        let page4 = await nodenamo.list().from(User).limit(1).resume(page3.lastEvaluatedKey).execute<User>();

        assert.equal(page4.items.length, 0);
        assert.isUndefined(page4.lastEvaluatedKey);
    });

    it('List books with paging', async () =>
    {
        let page1 = await nodenamo.list().from(Book).limit(1).execute<Book>();
        
        assert.equal(page1.items.length, 1);
        assert.deepEqual(page1.items[0], { id: 1, title: 'Some Book' });

        let page2 = await nodenamo.list().from(Book).limit(1).resume(page1.lastEvaluatedKey).execute<Book>();

        assert.equal(page2.items.length, 1);
        assert.deepEqual(page2.items[0], { id: 2, title: 'Another Book' });

        let page3 = await nodenamo.list().from(Book).limit(1).resume(page2.lastEvaluatedKey).execute<Book>();
        
        assert.equal(page3.items.length, 0);
        assert.isUndefined(page3.lastEvaluatedKey);
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

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();
        
        assert.deepEqual(user, { id: 2, name: 'Some Two' });

        let book = await nodenamo.get(2).from(Book).execute();
        
        assert.deepEqual(book, { id: 2, title: 'Another Book' });
    });

    it('Update an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user, { id: 2, name: 'Some Two' });

        let book = await nodenamo.get(2).from(Book).execute();
        assert.deepEqual(book, { id: 2, title: 'Another Book' });

        user.name = 'This Two';
        await nodenamo.update(user).from(User).execute();
        
        user = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user, { id: 2, name: 'This Two' });

        book = await nodenamo.get(2).from(Book).execute();
        assert.deepEqual(book, { id: 2, title: 'Another Book' });
    });

    it('Delete an item', async () =>
    {
        assert.isDefined(await nodenamo.get(1).from(User).execute());
        assert.isDefined(await nodenamo.get(1).from(Book).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 3);
        assert.equal((await nodenamo.list().from(Book).execute()).items.length, 2);

        await nodenamo.delete(1).from(User).execute();

        assert.isUndefined(await nodenamo.get(1).from(User).execute());
        assert.isDefined(await nodenamo.get(1).from(Book).execute());
        assert.equal((await nodenamo.list().from(User).execute()).items.length, 2);
        assert.equal((await nodenamo.list().from(Book).execute()).items.length, 2);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});