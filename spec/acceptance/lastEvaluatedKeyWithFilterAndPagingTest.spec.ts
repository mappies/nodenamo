import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

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

    before(async ()=>{
        nodenamo = new NodeNamo(new DocumentClient({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' }))
        await nodenamo.createTable().for(User).execute();

        user1 = new User(1, 'Some One', 'o1');
        user2 = new User(2, 'Some Two', 'o2'); 
        user3 = new User(3, 'Some Three', 'o1');
        user4 = new User(4, 'Some Four', 'o1');
        user5 = new User(5, 'Some Five', 'o1');
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(user1).into(User).execute(),
            nodenamo.insert(user2).into(User).execute(),
            nodenamo.insert(user3).into(User).execute(),
            nodenamo.insert(user4).into(User).execute(),
            nodenamo.insert(user5).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 5);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user1);
        assert.deepEqual(users.items[1], user2);
        assert.deepEqual(users.items[2], user3);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user5);
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

        let page1 = await nodenamo.list().from(User).filter(filter).limit(2).execute<User>();
        
        assert.equal(page1.items.length, 2);
        assert.deepEqual(page1.items[0], user1);
        assert.deepEqual(page1.items[1], user3);
        assert.isDefined(page1.lastEvaluatedKey)

        let page2 = await nodenamo.list().from(User).filter(filter).limit(2).resume(page1.lastEvaluatedKey).execute<User>();

        assert.equal(page2.items.length, 2);
        assert.deepEqual(page2.items[0], user4);
        assert.deepEqual(page2.items[1], user5);
        assert.isDefined(page2.lastEvaluatedKey);

        let page3 = await nodenamo.list().from(User).filter(filter).limit(2).resume(page2.lastEvaluatedKey).execute<User>();

        assert.equal(page3.items.length, 0);
        assert.isUndefined(page3.lastEvaluatedKey);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});