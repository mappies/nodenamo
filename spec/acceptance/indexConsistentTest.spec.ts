import { assert } from 'chai';

import { DBColumn, DBTable } from '../../src';
import { Const } from '../../src/const';
import { NodeNamo } from '../../src/nodeNamo';
import Config from './config';

@DBTable({name:'nodenamo_acceptance_indexConsistentTest'})
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

describe('IndexConsistentTest', function ()
{
    let nodenamo:NodeNamo;
    let user1:User;
    let user2:User;
    let user3:User;

    before(async ()=>{
        nodenamo = new NodeNamo({ endpoint: Config.DYNAMODB_ENDPOINT, region: Config.AWS_REGION })
        await nodenamo.createTable().for(User).execute();

        user1 = new User(1, 'Some One', 'o1');
        user2 = new User(2, 'Some Two', 'o2');
        user3 = new User(3, 'Some Three', 'o1');
    });

    /*  DynamoDB does not allow using(GSI) with ConsistentRead true. This test
        proves the real-world error occurs agains the DDB container they distribute. */
    it('using() with stronglyConsistent() causes failure', async () => {
        let error: Error;
        try {
            await nodenamo.find().from(User).where({
                keyConditions: "#hash=:hash",
                expressionAttributeNames: {
                    '#hash': 'hash'
                },
                expressionAttributeValues: {
                    ':hash': "1"
                }
            }).using(Const.IdIndexName).stronglyConsistent(true).execute()
        } catch (e) {
            error = e;
        }
        assert.isDefined(error);
        assert.equal(error.name, "ValidationException");
        assert.equal(error.message, "Consistent read cannot be true when querying a GSI")
    });

    after(async ()=>{
        await nodenamo.deleteTable().for(User).execute();
    });
});
