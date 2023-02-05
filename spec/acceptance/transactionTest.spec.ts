import { assert } from 'chai';

import { DBColumn, DBTable } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';

@DBTable({name:'nodenamo_acceptance_transactionTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    name:string;

    @DBColumn()
    description:string

    constructor(id:number, name:string, description:string)
    {
        this.id = id;
        this.name = name;
        this.description = description;
    }
}

describe('Transaction tests', function () 
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;
    let user4:User;

    before(async ()=>{
        nodenamo = new NodeNamo({ endpoint: Config.DYNAMODB_ENDPOINT })
        await nodenamo.createTable().for(User).execute();

        user1 = new User(1, 'Some One', 'Description 1');
        user2 = new User(2, 'Some Two', 'Description 2');
        user3 = new User(3, 'Some Three', 'Description 3');
        user4 = new User(4, 'Some Four', 'Description 4');
    });

    it('Add items - if one failed, nothing get committed', async () =>
    {
        let error;

        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 0);

        try
        {
            await nodenamo.transaction([
                nodenamo.insert(user1).into(User),
                nodenamo.insert(user2).into(User),
                nodenamo.insert(user2).into(User), //Duplicate
                nodenamo.insert(user3).into(User)
            ]).execute();
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 0);
    });

    it('Add items - success', async () =>
    {
        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 0);

        await nodenamo.transaction([
            nodenamo.insert(user1).into(User),
            nodenamo.insert(user2).into(User),
            nodenamo.insert(user3).into(User)
        ]).execute();

        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 3);
    });

    it('Update items - if one failed, nothing get committed', async () =>
    {
        let error;

        try
        {
            let newUser2 = await nodenamo.get(2).from(User).execute<User>();
            let newerUser2 = await nodenamo.get(2).from(User).execute<User>();
            
            user1.name = "New User One";
            newUser2.name = "New User Two";
            user3.name = "New User Three";

            //Simulate a version changed
            newerUser2.name = "Newer User Two";
            await nodenamo.update(newerUser2).from(User).withVersionCheck().execute();

            await nodenamo.transaction([
                nodenamo.update(user1).from(User),
                nodenamo.update(newUser2).from(User).withVersionCheck(), //Simulate error
                nodenamo.update(user3).from(User)
            ]).execute();
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);

        let users = await (await nodenamo.list().from(User).execute<User>()).items;

        assert.equal(users[0].name, "Some One");
        assert.equal(users[1].name, "Newer User Two");
        assert.equal(users[2].name, "Some Three");
    });

    it('Update items - success', async () =>
    {
        user1.name = "New User One";
        user2.name = "New User Two";
        user3.name = "New User Three";

        await nodenamo.transaction([
            nodenamo.update(user1).from(User),
            nodenamo.update(user2).from(User), 
            nodenamo.update(user3).from(User)
        ]).execute();

        let users = await (await nodenamo.list().from(User).execute<User>()).items;

        assert.equal(users[0].name, "New User One");
        assert.equal(users[1].name, "New User Two");
        assert.equal(users[2].name, "New User Three");
    });

    it('On items - if one failed, nothing get committed', async () =>
    {
        let error;

        try
        {
            await nodenamo.transaction([
                nodenamo.on('1').from(User)
                                .set(['#description = :description'], {'#description': 'description'}, {':description': 'New Description 1'}),
                nodenamo.on('2').from(User)
                                .set(['#description = :description'], {'#description': 'description'}, {':description': 'New Description 2'})
                                .where('attribute_not_exists(#description)'), //Simulate error
                nodenamo.on('3').from(User)
                                .set(['#description = :description'], {'#description': 'description'}, {':description': 'New Description 3'}),
            ]).execute();
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);

        let users = await (await nodenamo.list().from(User).execute<User>()).items;

        assert.equal(users[0].description, "Description 1");
        assert.equal(users[1].description, "Description 2");
        assert.equal(users[2].description, "Description 3");
    });

    it('On items - success', async () =>
    {
        await nodenamo.transaction([
            nodenamo.on('1').from(User)
                            .set(['#description = :description'], {'#description': 'description'}, {':description': 'New Description 1'}),
            nodenamo.on('2').from(User)
                            .set(['#description = :description'], {'#description': 'description'}, {':description': 'New Description 2'}),
            nodenamo.on('3').from(User)
                            .set(['#description = :description'], {'#description': 'description'}, {':description': 'New Description 3'}),
        ]).execute();

        let users = await (await nodenamo.list().from(User).execute<User>()).items;

        assert.equal(users[0].description, "New Description 1");
        assert.equal(users[1].description, "New Description 2");
        assert.equal(users[2].description, "New Description 3");
    });

    it('Mixed operations - if one failed, nothing get committed', async () =>
    {
        let error;
        
        try
        {
            await nodenamo.transaction([
                nodenamo.insert(user4).into(User),
                nodenamo.update({id:2,name:"Mixed name 2"}).from(User),
                nodenamo.on('3').from(User).set(['#name=:name'],{'#name':'name'},{':name':'Mixed name 3'}),
                nodenamo.delete('1').from(User),
                nodenamo.on('1').from(User).set(['#name=:name'],{'#name':'name'},{':name':'Mixed name 1'}), //Simulate error
            ]).execute();
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.isUndefined(await nodenamo.get(4).from(User).execute());
        assert.equal((await nodenamo.get(2).from(User).execute<User>()).name, 'New User Two');
        assert.equal((await nodenamo.get(3).from(User).execute<User>()).name, 'New User Three');
        assert.equal((await nodenamo.get(1).from(User).execute<User>()).name, 'New User One');
    });

    it('Mixed operations - success', async () =>
    {
        await nodenamo.transaction([
            nodenamo.insert(user4).into(User),
            nodenamo.update({id:2,name:"Mixed name 2"}).from(User),
            nodenamo.on('3').from(User).set(['#name=:name'],{'#name':'name'},{':name':'Mixed name 3'}),
            nodenamo.delete('1').from(User)
        ]).execute();

        assert.isDefined(await nodenamo.get(4).from(User).execute());
        assert.equal((await nodenamo.get(2).from(User).execute<User>()).name, 'Mixed name 2');
        assert.equal((await nodenamo.get(3).from(User).execute<User>()).name, 'Mixed name 3');
        assert.isUndefined(await nodenamo.get(1).from(User).execute());
    });

    it('Delete items - if one failed, nothing get committed', async () =>
    {
        let error;

        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 3);

        try
        {
            await nodenamo.transaction([
                nodenamo.delete('2').from(User),
                nodenamo.delete('3').from(User),
                nodenamo.delete('3').from(User), //Duplicate
                nodenamo.delete('4').from(User)
            ]).execute();
        }
        catch(e)
        {
            error = e;
        }

        assert.isDefined(error);
        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 3);
    });

    it('Delete items - success', async () =>
    {
        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 3);

        await nodenamo.transaction([
            nodenamo.delete('2').from(User),
            nodenamo.delete('3').from(User),
            nodenamo.delete('4').from(User)
        ]).execute();

        assert.equal(await (await nodenamo.list().from(User).execute()).items.length, 0);
    });


    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});