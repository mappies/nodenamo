import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';

enum Gender
{
    Male = "male",
    Female = "female",
    Others = "others",
    Unknown = "unknown"
}

@DBTable({name:'nodenamo_acceptance_marshallTest'})
class Person
{
    @DBColumn({id:true})
    id:number;

    @DBColumn()
    spouse:Person|undefined;
    
    @DBColumn()
    gender:Gender;

    @DBColumn()
    children:Person[];

    constructor(id:number, spouse?:Person, children:Person[] = [], gender?:Gender)
    {
        this.id = id;
        this.spouse = spouse;
        this.gender = gender || Gender.Unknown;
        this.children = children
    }
}

describe('Marshall tests', function ()
{
    let nodenamo:NodeNamo;
    let father:Person;
    let mother:Person;
    let person1:Person;
    let person2:Person;

    before(async ()=>
    {
        nodenamo = new NodeNamo({ 
            endpoint: Config.DYNAMODB_ENDPOINT, 
            region: 'us-east-1'
        })
        
        await nodenamo.createTable().for(Person).execute();

        person1 = new Person(1) // Need options.removeUndefinedValues because child1.spouse is undefined
        person2 = new Person(2) // Need options.removeUndefinedValues because child2.spouse is undefined
        father = new Person(0, undefined, [person1], Gender.Male); // Need options.convertClassInstanceToMap because of a nested object
        mother = new Person(3, undefined, undefined, Gender.Female);
    });

    it('Add items', async () =>
    {
        await Promise.all([
            nodenamo.insert(father).into(Person).execute(),
            nodenamo.insert(person1).into(Person).execute(),
            nodenamo.insert(person2).into(Person).execute()]);
    });

    it('List all items', async () =>
    {
        let users = await nodenamo.list().from(Person).execute<Person>();

        assert.equal(users.items.length, 3);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.equal(users.items[0].id, father.id);
        assert.equal(users.items[1].id, person1.id);
        assert.equal(users.items[2].id, person2.id);
    });

    it('Get an item', async () =>
    {
        let person = await nodenamo.get(0).from(Person).execute<Person>();

        assert.equal(person.id, father.id);
        assert.equal(father.spouse?.id, undefined);
        assert.equal(father.gender, Gender.Male);
        assert.equal(father.children.length, 1);
        assert.equal(father.children?.[0].id, person1.id);
    });

    it('Update an item', async () =>
    {
        let person = await nodenamo.get(0).from(Person).execute<Person>();
        assert.equal(person.id, father.id);
        assert.equal(person.children.length, 1);
        assert.equal(person.children[0].id, person1.id);

        person.children.push(person2);

        let result = await nodenamo.update(person).from(Person).execute();

        assert.isUndefined(result);

        person = await nodenamo.get(0).from(Person).execute();
        assert.equal(person.children.length, 2);
        assert.equal(person.children[0].id, person1.id);
        assert.equal(person.children[1].id, person2.id);
    });

    it('On item', async () =>
    {
        let person = await nodenamo.get(0).from(Person).execute<Person>();
        assert.equal(person.spouse?.id, undefined);

        await nodenamo.on(0)
                      .from(Person)
                      .set(['#spouse=:spouse'], {'#spouse': 'spouse'}, {':spouse': mother})
                      .execute();

        person = await nodenamo.get(0).from(Person).execute();

        assert.equal(person.spouse?.id, mother.id);
    });

    it('Delete an item', async () =>
    {
        assert.isDefined(await nodenamo.get(1).from(Person).execute());
        assert.equal((await nodenamo.list().from(Person).execute()).items.length, 3);

        await nodenamo.delete(1).from(Person).execute();

        assert.isUndefined(await nodenamo.get(1).from(Person).execute());
        assert.equal((await nodenamo.list().from(Person).execute()).items.length, 2);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(Person).execute();
    });
});
