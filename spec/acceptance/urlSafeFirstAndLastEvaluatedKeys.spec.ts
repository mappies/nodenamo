import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../../src';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@DBTable({name:'nodenamo_acceptance_hashRangeWithUnicodeTest'})
class User
{
    @DBColumn({id:true})
    id:number;

    @DBColumn({hash:true})
    account:number;

    @DBColumn({range:true})
    name:string;

    constructor(id:number, account:number, name:string)
    {
        this.id = id;
        this.account = account;
        this.name = name;
    }
}

describe('Url safe first/lastEvaluatedKey tests', function ()
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
        user1 = new User(1, 1000, 'Aother Account User 1');
        user2 = new User(2, 2000, 'ナ石ル倉ジ1');
        user3 = new User(3, 2000, `00 	*H
        ��0�Nwk.7*ehc"c<7"De/"T>~C݊KXE;ϸ4y|3+ƓSP_�ulaA^oklR�iȚm 6Д!qW	|ʷ<g}
        %Z	FE_3U9>2\Bk1s
        /4ޤ$5H7EKz9-WbߨJş"'*ޱ72ƦLWsɎu	/cHi/v jFSo_uؤYp\"p09u#'֮
        gBsmi1G::>|PVxaw_HG"|Nrӏy
        Ȋl/$EN G.⑅6ӈ\ Lh-,d	_Wߡ3Y $Df,G;)\!Y4vdU8C	|8ULW.Vܩeeb@u14Wc˳zPk+_31n9&ދ#
        v3BՌşUݿffa@/y        \Z(जǿ\鐆Bgz	wdO. ^l`);
        user4 = new User(4, 2000, 'subjects?_d=1');
        user5 = new User(5, 2000, 'ナ石ル倉ジ2');
        user6 = new User(6, 3000, 'Aother Account User 2');
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
        assert.deepEqual(users.items[0], user3);
        assert.deepEqual(users.items[1], user1);
        assert.deepEqual(users.items[2], user6);
        assert.deepEqual(users.items[3], user4);
        assert.deepEqual(users.items[4], user2);
        assert.deepEqual(users.items[5], user5);
    });

    it('List items with paging', async () =>
    {
        let page1 = await nodenamo.list().from(User).limit(1).execute<User>();
        assert.equal(page1.items.length, 1);
        assert.deepEqual(page1.items[0], user3);
        assert.isFalse(['+', '/'].some(c => page1.firstEvaluatedKey.includes(c)));
        assert.isFalse(['+', '/'].some(c => page1.lastEvaluatedKey.includes(c)));

        let page2 = await nodenamo.list().from(User).limit(1).resume(page1.lastEvaluatedKey).execute<User>();
        assert.equal(page2.items.length, 1);
        assert.deepEqual(page2.items[0], user1);
        assert.isFalse(['+', '/'].some(c => page2.firstEvaluatedKey.includes(c)));
        assert.isFalse(['+', '/'].some(c => page2.lastEvaluatedKey.includes(c)));

        let page3 = await nodenamo.list().from(User).limit(1).resume(page2.lastEvaluatedKey).execute<User>();
        assert.equal(page3.items.length, 1);
        assert.deepEqual(page3.items[0], user6);
        assert.isFalse(['+', '/'].some(c => page3.firstEvaluatedKey.includes(c)));
        assert.isFalse(['+', '/'].some(c => page3.lastEvaluatedKey.includes(c)));

        let page4 = await nodenamo.list().from(User).limit(1).resume(page3.lastEvaluatedKey).execute<User>();
        assert.equal(page4.items.length, 1);
        assert.deepEqual(page4.items[0], user4);
        assert.isFalse(['+', '/'].some(c => page4.firstEvaluatedKey.includes(c)));
        assert.isFalse(['+', '/'].some(c => page4.lastEvaluatedKey.includes(c)));

        let page5 = await nodenamo.list().from(User).limit(1).resume(page4.lastEvaluatedKey).execute<User>();
        assert.equal(page5.items.length, 1);
        assert.deepEqual(page5.items[0], user2);
        assert.isFalse(['+', '/'].some(c => page5.firstEvaluatedKey.includes(c)));
        assert.isFalse(['+', '/'].some(c => page5.lastEvaluatedKey.includes(c)));

        let page6 = await nodenamo.list().from(User).limit(1).resume(page5.lastEvaluatedKey).execute<User>();
        assert.equal(page6.items.length, 1);
        assert.deepEqual(page6.items[0], user5);
        assert.isFalse(['+', '/'].some(c => page6.firstEvaluatedKey.includes(c)));
        assert.isUndefined(page6.lastEvaluatedKey);
    });

    it('List items by a hash', async () =>
    {
        let users = await nodenamo.list().from(User).by(2000).execute<User>();

        assert.equal(users.items.length, 4);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user3);
        assert.deepEqual(users.items[1], user4);
        assert.deepEqual(users.items[2], user2);
        assert.deepEqual(users.items[3], user5);
    });

    it('List items by a hash and a range', async () =>
    {
        let users = await nodenamo.list().from(User).by(2000, 'ナ石ル倉ジ').execute<User>();

        assert.equal(users.items.length, 2);
        assert.equal(users.lastEvaluatedKey, undefined);
        assert.deepEqual(users.items[0], user2);
        assert.deepEqual(users.items[1], user5);
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});
