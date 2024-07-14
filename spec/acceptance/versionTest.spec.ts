import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { Reflector } from '../../src/reflector';
import { VersionError } from '../../src/errors/versionError';

@DBTable({name:'nodenamo_acceptance_versionTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    name:string;
    
    @DBColumn()
    age:number;

    constructor(id:number, name:string, age:number)
    {
        this.id = id;
        this.name = name;
        this.age = age;
    }
}

describe('Version tests', function () 
{
    let nodenamo:NodeNamo;

    before(async ()=>{
        nodenamo = new NodeNamo({ endpoint: Config.DYNAMODB_ENDPOINT, region: 'us-east-1' });
        await nodenamo.createTable().for(User).execute();
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(new User(1, 'Some One', 16)).into(User).execute(),
            nodenamo.insert(new User(2, 'Some Two', 25)).into(User).execute(),
            nodenamo.insert(new User(3, 'Some Three', 39)).into(User).execute(),
            nodenamo.insert(new User(4, 'Some Four', 42)).into(User).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(User).execute<User>();
        
        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], { id: 1, name: 'Some One', age: 16 });
        assert.deepEqual(users.items[1], { id: 2, name: 'Some Two', age: 25 });
        assert.deepEqual(users.items[2], { id: 3, name: 'Some Three', age: 39 });
        assert.deepEqual(users.items[3], { id: 4, name: 'Some Four', age: 42 });
    });

    it('Get an item', async () =>
    {
        let user = await nodenamo.get(2).from(User).execute();
        
        assert.deepEqual(user, { id: 2, name: 'Some Two', age: 25 });
    });

    it('Update an item (user1) - delta and with a version check', async () =>
    {
        let user1 = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user1, { id: 1, name: 'Some One', age: 16 });
        assert.equal(Reflector.getObjectVersion(user1), 1);

        let user2 = await nodenamo.get(1).from(User).execute<User>();
        assert.deepEqual(user2, { id: 1, name: 'Some One', age: 16 });
        assert.equal(Reflector.getObjectVersion(user2), 1);

        let result = await nodenamo.update({id: 1, name: 'I am first', age: undefined}).from(User).withVersionCheck().execute();

        assert.isUndefined(result);
        
        let user3 = await nodenamo.get(1).from(User).execute();
        assert.deepEqual(user3, { id: 1, name: 'I am first', age: 16 });
        assert.equal(Reflector.getObjectVersion(user3), 2);
        
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

    it('Update an item (user2) - without a version check', async () =>
    {
        let user1 = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user1, { id: 2, name: 'Some Two', age: 25 });
        assert.equal(Reflector.getObjectVersion(user1), 1);

        let user2 = await nodenamo.get(2).from(User).execute<User>();
        assert.deepEqual(user2, { id: 2, name: 'Some Two', age: 25 });
        assert.equal(Reflector.getObjectVersion(user2), 1);

        user2.name = 'I am first';
        await nodenamo.update(user2).from(User).execute();
        
        let user3 = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user3, { id: 2, name: 'I am first', age: 25 });
        assert.equal(Reflector.getObjectVersion(user3), 2);
        
        user1.name = 'Too late';
        await nodenamo.update(user1).from(User).execute();

        let user4 = await nodenamo.get(2).from(User).execute();
        assert.deepEqual(user4, { id: 2, name: 'Too late', age: 25 });
        assert.equal(Reflector.getObjectVersion(user4), 3); 
    });

    it('Update an item (user3) - with a version check and a projection', async () =>
    {
        let user1 = (await nodenamo.list("id", "name").from(User).execute<User>()).items[2];
        assert.deepEqual(user1, { id: 3, name: 'Some Three', age: undefined });
        assert.equal(Reflector.getObjectVersion(user1), 1);

        let user2 = (await nodenamo.list("id", "name").from(User).execute<User>()).items[2];
        assert.deepEqual(user2, { id: 3, name: 'Some Three', age: undefined });
        assert.equal(Reflector.getObjectVersion(user2), 1);

        user2.name = 'I am thrid';
        await nodenamo.update(user2).from(User).withVersionCheck().execute();
        
        let user3 = (await nodenamo.list("id", "name").from(User).execute<User>()).items[2];
        assert.deepEqual(user3, { id: 3, name: 'I am thrid', age: undefined });
        assert.equal(Reflector.getObjectVersion(user3), 2);
        
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

    it('On item', async () =>
    {
        let user1 = await nodenamo.get(4).from(User).execute<User>();
        assert.deepEqual(user1, { id: 4, name: 'Some Four', age: 42 });
        assert.equal(Reflector.getObjectVersion(user1), 1);

        await nodenamo.on(4).from(User).add(['#age :ten'], {'#age': 'age'}, {':ten': 10}).execute();

        let user2 = await nodenamo.get(4).from(User).execute<User>();
        assert.deepEqual(user2, { id: 4, name: 'Some Four', age: 52 });
        assert.equal(Reflector.getObjectVersion(user2), 1);

        await nodenamo.on(4).from(User).remove(['#n'], {'#n': 'name'}).withVersionCheck().execute();

        let user3 = await nodenamo.get(4).from(User).execute<User>();
        assert.deepEqual(user3, { id: 4, name: undefined, age: 52 });
        assert.equal(Reflector.getObjectVersion(user3), 2);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});