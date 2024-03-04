import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

@DBTable({name:'nodenamo_acceptance_lastEvaluatedKeyWithFilterAndPagingTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn({hash:true})
    name:string;

    @DBColumn()
    organizationId:string;

    constructor(id:number, name:string, organizationId:string)
    {
        this.id = id;
        this.name = name;
        this.organizationId = organizationId;
    }
}

describe('lastEvaluatedKeyWithFilterAndPagingTest', function () 
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user4:User;
    let user5:User;
    let user6:User;
    let user7:User;
    let user8:User;

    before(async ()=>{
        nodenamo = new NodeNamo({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' });
        await nodenamo.createTable().for(User).execute();

        user1 = new User(1, 'Some One', 'o1');
        user2 = new User(2, 'Some Two', 'o2'); 
        user3 = new User(3, 'Some Three', 'o1');
        user4 = new User(4, 'Some Four', 'o1');
        user5 = new User(5, 'Some Five', 'o1');
        user6 = new User(6, 'Some Six', 'o2');
        user7 = new User(7, 'Some Seven', 'o2');
        user8 = new User(8, 'Some Eight', 'o2');
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(user1).into(User).execute(),
            nodenamo.insert(user2).into(User).execute(),
            nodenamo.insert(user3).into(User).execute(),
            nodenamo.insert(user4).into(User).execute(),
            nodenamo.insert(user5).into(User).execute(),
            nodenamo.insert(user6).into(User).execute(),
            nodenamo.insert(user7).into(User).execute(),
            nodenamo.insert(user8).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 8);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user5);
        assert.deepEqual(users.items[5], user6);
        assert.deepEqual(users.items[6], user7);
        assert.deepEqual(users.items[7], user8);
    });

    /*
        In this test, limit is set to 2. 
        The first listing will involve with 2 internal fetches. 
            1st fetch: get user1 and user2 (user2 does not satisfy with the filter expression, so it performs the 2nd fetch)
            2nd fetch: get user3 and user4 (at this point, user1 and user3 met the condition so the query is returned)
            return: user1 and user3 AND the returned token MUST point to user3 not user4. Otherwise, user4 will be skipped.
        The second listing should continue from user3 so that user4 and user5 are returned.
    */
    it('List items with paging', async () =>
    {
        let filter = {
            filterExpression: '#organization = :organization',
            expressionAttributeNames: {'#organization': 'organizationId'},
            expressionAttributeValues: {':organization': 'o1'}
        };

        let page1 = await nodenamo.list().from(User).filter(filter).limit(2,2).execute<User>();
        
        assert.equal(page1.items.length, 2);
        assert.deepEqual(page1.items[0], user1);
        assert.deepEqual(page1.items[1], user3);
        assert.isDefined(page1.firstEvaluatedKey)
        assert.isDefined(page1.lastEvaluatedKey)

        let page0 = await nodenamo.list().from(User).filter(filter).limit(2,2).order(false).resume(page1.firstEvaluatedKey).execute<User>();
        assert.equal(page0.items.length, 0)
        assert.isUndefined(page0.firstEvaluatedKey)
        assert.isUndefined(page0.lastEvaluatedKey)

        let page2 = await nodenamo.list().from(User).filter(filter).limit(2,2).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 2);
        assert.deepEqual(page2.items[0], user4);
        assert.deepEqual(page2.items[1], user5);
        assert.isDefined(page2.firstEvaluatedKey);
        assert.isDefined(page2.lastEvaluatedKey);

        let page3 = await nodenamo.list().from(User).filter(filter).limit(2,2).resume(page2.lastEvaluatedKey).execute<User>();

        assert.equal(page3.items.length, 0);
        assert.isUndefined(page3.firstEvaluatedKey);
        assert.isUndefined(page3.lastEvaluatedKey);

        let page1Again = await nodenamo.list().from(User).filter(filter).limit(2,2).order(false).resume(page2.firstEvaluatedKey).execute<User>();
        assert.deepEqual(page1Again.items[0], user3);
        assert.deepEqual(page1Again.items[1], user1);
        assert.equal(page1Again.items.length, 2);
        assert.isDefined(page1Again.firstEvaluatedKey)
        assert.isUndefined(page1Again.lastEvaluatedKey)

        let page2Again = await nodenamo.list().from(User).filter(filter).limit(2,2).resume(page1Again.firstEvaluatedKey).execute<User>();

        assert.equal(page2Again.items.length, 2);
        assert.deepEqual(page2Again.items[0], user4);
        assert.deepEqual(page2Again.items[1], user5);
        assert.isDefined(page2Again.firstEvaluatedKey);
        assert.deepEqual(page2.firstEvaluatedKey, page2Again.firstEvaluatedKey);
        assert.isDefined(page2Again.lastEvaluatedKey);
        assert.deepEqual(page2.lastEvaluatedKey, page2Again.lastEvaluatedKey);
    });

    //The same test as above but with default fetchSize
    it('List items with paging', async () =>
    {
        let filter = {
            filterExpression: '#organization = :organization',
            expressionAttributeNames: {'#organization': 'organizationId'},
            expressionAttributeValues: {':organization': 'o1'}
        };

        let page1 = await nodenamo.list().from(User).filter(filter).limit(2).execute<User>();
        
        assert.equal(page1.items.length, 2);
        assert.deepEqual(page1.items[0], user1);
        assert.deepEqual(page1.items[1], user3);
        assert.isDefined(page1.firstEvaluatedKey)
        assert.isDefined(page1.lastEvaluatedKey)

        let page2 = await nodenamo.list().from(User).filter(filter).limit(2).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 2);
        assert.deepEqual(page2.items[0], user4);
        assert.deepEqual(page2.items[1], user5);
        assert.isDefined(page2.firstEvaluatedKey);
        assert.isUndefined(page2.lastEvaluatedKey);

        let page1Again = await nodenamo.list().from(User).filter(filter).limit(2).order(false).resume(page2.firstEvaluatedKey).execute<User>();

        assert.deepEqual(page1Again.items[0], user3)
        assert.deepEqual(page1Again.items[1], user1)
        assert.equal(page1Again.items.length, 2);
        assert.isDefined(page1Again.firstEvaluatedKey)
        assert.isUndefined(page1Again.lastEvaluatedKey)

        let page2Again = await nodenamo.list().from(User).filter(filter).limit(2).resume(page1Again.firstEvaluatedKey).execute<User>();

        assert.equal(page2Again.items.length, 2);
        assert.deepEqual(page2Again.items[0], user4);
        assert.deepEqual(page2Again.items[1], user5);
        assert.isDefined(page2Again.firstEvaluatedKey);
        assert.equal(page2Again.firstEvaluatedKey, page2.firstEvaluatedKey);
        assert.isUndefined(page2Again.lastEvaluatedKey);
        assert.equal(page2Again.lastEvaluatedKey, page2.lastEvaluatedKey);
    });

    //The same test as above but with inverse order
    it('List items with paging - inverse order', async () =>
    {
        let filter = {
            filterExpression: '#organization = :organization',
            expressionAttributeNames: {'#organization': 'organizationId'},
            expressionAttributeValues: {':organization': 'o1'}
        };

        let page1 = await nodenamo.list().from(User).filter(filter).order(false).limit(2).execute<User>();
        
        assert.deepEqual(page1.items[0], user5);
        assert.deepEqual(page1.items[1], user4);
        assert.equal(page1.items.length, 2);
        assert.isDefined(page1.firstEvaluatedKey)
        assert.isDefined(page1.lastEvaluatedKey)

        let page2 = await nodenamo.list().from(User).filter(filter).limit(2).order(false).resume(page1.lastEvaluatedKey).execute<User>();

        assert.deepEqual(page2.items[0], user3)
        assert.deepEqual(page2.items[1], user1)
        assert.equal(page2.items.length, 2);
        assert.isDefined(page2.firstEvaluatedKey);
        assert.isUndefined(page2.lastEvaluatedKey);

        let page1Again = await nodenamo.list().from(User).filter(filter).limit(2).order(true).resume(page2.firstEvaluatedKey).execute<User>();

        assert.deepEqual(page1Again.items[0], user4)
        assert.deepEqual(page1Again.items[1], user5)
        assert.equal(page1Again.items.length, 2);
        assert.isDefined(page1Again.firstEvaluatedKey)
        assert.isUndefined(page1Again.lastEvaluatedKey)

        let page2Again = await nodenamo.list().from(User).filter(filter).limit(2).order(false).resume(page1Again.firstEvaluatedKey).execute<User>();

        assert.deepEqual(page2Again.items[0], user3);
        assert.deepEqual(page2Again.items[1], user1);
        assert.equal(page2Again.items.length, 2);
        assert.isDefined(page2Again.firstEvaluatedKey);
        assert.isUndefined(page2Again.lastEvaluatedKey);
        assert.equal(page2.lastEvaluatedKey, page2Again.lastEvaluatedKey);
    });

    /*
        In this test, limit is set to 3. 
        The first listing will involve with 3 internal fetches. 
            1st fetch: get user1, user2, and user3 (Only user2 has satisfied with the filter expression, so it performs the 2nd fetch)
            2nd fetch: get user4, user5, and user6 (at this point, user2 and user6 have met the condition, so it performs the 3nd fetch)
            3nd fetch: get user7 and user8 (at this point, user2, user6, and user7 met the condition so the query is returned)
            return: user2, user6, and user7 AND the returned token MUST point to user7. Otherwise, user8 will be skipped.
        The second listing should continue from user3 so that user4 and user5 are returned.
    */
   it('List items with paging - last page still have items', async () =>
   {
       let filter = {
           filterExpression: '#organization = :organization',
           expressionAttributeNames: {'#organization': 'organizationId'},
           expressionAttributeValues: {':organization': 'o2'}
       };

       let page1 = await nodenamo.list().from(User).filter(filter).limit(3,3).execute<User>();
       
       assert.equal(page1.items.length, 3);
       assert.deepEqual(page1.items[0], user2);
       assert.deepEqual(page1.items[1], user6);
       assert.deepEqual(page1.items[2], user7);
       assert.isDefined(page1.firstEvaluatedKey);
       assert.isDefined(page1.lastEvaluatedKey);

       let page2 = await nodenamo.list().from(User).filter(filter).limit(3,3).resume(page1.lastEvaluatedKey).execute<User>();

       assert.equal(page2.items.length, 1);
       assert.deepEqual(page2.items[0], user8);
       assert.isDefined(page2.firstEvaluatedKey);
       assert.isUndefined(page2.lastEvaluatedKey);

       let page1Again = await nodenamo.list().from(User).filter(filter).limit(3,3).order(false).resume(page2.firstEvaluatedKey).execute<User>();
       assert.deepEqual(page1Again.items[0], user7);
       assert.deepEqual(page1Again.items[1], user6);
       assert.deepEqual(page1Again.items[2], user2);
       assert.equal(page1Again.items.length, 3);
       assert.isDefined(page1Again.firstEvaluatedKey);
       assert.isDefined(page1Again.lastEvaluatedKey);

       let page2Again = await nodenamo.list().from(User).filter(filter).limit(3,3).resume(page1Again.firstEvaluatedKey).execute<User>();
       assert.deepEqual(page2.items[0], user8);
       assert.equal(page2.items.length, 1);
       assert.isDefined(page2Again.firstEvaluatedKey);
       assert.equal(page2.firstEvaluatedKey, page2Again.firstEvaluatedKey);
       assert.isUndefined(page2Again.lastEvaluatedKey);
       assert.equal(page2.lastEvaluatedKey, page2Again.lastEvaluatedKey);
   });

   //The same test as above but with default fetchSize
   it('List items with paging - last page still have items', async () =>
   {
       let filter = {
           filterExpression: '#organization = :organization',
           expressionAttributeNames: {'#organization': 'organizationId'},
           expressionAttributeValues: {':organization': 'o2'}
       };

       let page1 = await nodenamo.list().from(User).filter(filter).limit(3).execute<User>();
       
       assert.equal(page1.items.length, 3);
       assert.deepEqual(page1.items[0], user2);
       assert.deepEqual(page1.items[1], user6);
       assert.deepEqual(page1.items[2], user7);
       assert.isDefined(page1.lastEvaluatedKey)

       let page2 = await nodenamo.list().from(User).filter(filter).limit(3).resume(page1.lastEvaluatedKey).execute<User>();

       assert.equal(page2.items.length, 1);
       assert.deepEqual(page2.items[0], user8);
       assert.isUndefined(page2.lastEvaluatedKey);

       let page1Again = await nodenamo.list().from(User).filter(filter).limit(3).order(false).resume(page2.firstEvaluatedKey).execute<User>();
       assert.deepEqual(page1Again.items[0], user7)
       assert.deepEqual(page1Again.items[1], user6)
       assert.deepEqual(page1Again.items[2], user2)
       assert.equal(page1Again.items.length, 3);
       assert.isDefined(page1Again.firstEvaluatedKey);
       assert.isUndefined(page1Again.lastEvaluatedKey);

       let page2Again = await nodenamo.list().from(User).filter(filter).limit(3).resume(page1Again.firstEvaluatedKey).execute<User>();
       assert.deepEqual(page2Again.items[0], user8);
       assert.equal(page2Again.items.length, 1);
       assert.isDefined(page2Again.firstEvaluatedKey);
       assert.equal(page2.firstEvaluatedKey, page2Again.firstEvaluatedKey);
       assert.isUndefined(page2Again.lastEvaluatedKey);
   });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});