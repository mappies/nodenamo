import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Reflector } from '../../src/reflector';
import { VersionError } from '../../src/errors/versionError';

@DBTable({name:'nodenamo_acceptance_versionTest'})
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

describe('Version tests', function () 
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
            nodenamo.insert(new User(3, 'Some Three')).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 1, name: 'Some One' });
        assert.deepEqual(users.items[1], { id: 2, name: 'Some Two' });
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();
        
        assert.deepEqual(user, { id: 2, name: 'Some Two' });
    });

    it('Update an item - with a version check', async () =>
    {
        let user1 = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user1, { id: 1, name: 'Some One' });
        assert.equal(Reflector.getVersion(user1), 1);

        let user2 = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user2, { id: 1, name: 'Some One' });
        assert.equal(Reflector.getVersion(user2), 1);

        user2.name = 'I am first';
        await nodenamo.update(user2).from(User).withVersionCheck().execute();
        
        let user3 = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user3, { id: 1, name: 'I am first' });
        assert.equal(Reflector.getVersion(user3), 2);
        
        user1.name = 'Too late';
        let error = undefined;
        try
        {
            await nodenamo.update(user1).from(User).withVersionCheck().execute();
        }
        catch(e)
        {
            error = e;
        }
        assert.isDefined(error);
        assert.instanceOf(error, VersionError);
    });

    it('Update an item - without a version check', async () =>
    {
        let user1 = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user1, { id: 2, name: 'Some Two' });
        assert.equal(Reflector.getVersion(user1), 1);

        let user2 = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user2, { id: 2, name: 'Some Two' });
        assert.equal(Reflector.getVersion(user2), 1);

        user2.name = 'I am first';
        await nodenamo.update(user2).from(User).execute();
        
        let user3 = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user3, { id: 2, name: 'I am first' });
        assert.equal(Reflector.getVersion(user3), 2);
        
        user1.name = 'Too late';
        await nodenamo.update(user1).from(User).execute();

        let user4 = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user4, { id: 2, name: 'Too late' });
        assert.equal(Reflector.getVersion(user4), 3); 
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});