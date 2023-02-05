import {assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { Mock, IMock, It } from 'typemoq';
import { DynamoDB, GetItemCommandOutput, GetItemOutput, QueryCommandOutput, QueryOutput, ServiceOutputTypes } from '@aws-sdk/client-dynamodb';
import { DBTable, DBColumn } from '../../src';
import {Const} from '../../src/const';
import { Reflector } from '../../src/reflector';
import { marshall } from '@aws-sdk/util-dynamodb';

describe('DynamoDbManager.send()', function ()
{
    let mockedClient:IMock<DynamoDB>;
    let called:boolean;

    beforeEach(()=>
    {
        mockedClient = Mock.ofType<DynamoDB>();
        called = false;
    });

    it('get()', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let obj = {id:42};
        obj[Const.VersionColumn] = 1;

        let response = ({Item:marshall(obj)});

        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.Key[Const.HashColumn]['S'] === 'entity#42' && p.input.Key[Const.RangeColumn]['S'] === 'nodenamo'))).callback(()=>called=true).returns(async ()=>response as GetItemCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entity = await manager.getOne(Entity, 42);

        assert.isTrue(called);
        assert.deepEqual(entity, {id:42});
        assert.equal(Reflector.getObjectVersion(entity), 1);
    });

    [ 
        {tableStrongConsistent: true, callWithStrongConsistent: false, expectedQueryConsistentRead: true},
        {tableStrongConsistent: true, callWithStrongConsistent: true, expectedQueryConsistentRead: true},
        {tableStrongConsistent: undefined, callWithStrongConsistent: true, expectedQueryConsistentRead: true},
        {tableStrongConsistent: undefined, callWithStrongConsistent: false, expectedQueryConsistentRead: false},
        {tableStrongConsistent: false, callWithStrongConsistent: false, expectedQueryConsistentRead: false},
        {tableStrongConsistent: false, callWithStrongConsistent: true, expectedQueryConsistentRead: true},
        {tableStrongConsistent: true, callWithStrongConsistent: undefined, expectedQueryConsistentRead: true},
        {tableStrongConsistent: false, callWithStrongConsistent: undefined, expectedQueryConsistentRead: false},
        {tableStrongConsistent: undefined, callWithStrongConsistent: undefined, expectedQueryConsistentRead: false}
    ]
    .forEach(test => 
    {
        it(`get() - Table.stronglyConsistent is ${test.tableStrongConsistent}, called with ${test.callWithStrongConsistent} should set Query.ConsistentRead to ${test.expectedQueryConsistentRead}`, async () =>
        {
            @DBTable({stronglyConsistent:test.tableStrongConsistent})
            class Entity
            {
                @DBColumn()
                id:number;
            };
    
            let obj = {id:42};
            obj[Const.VersionColumn] = 1;
    
            let response = ({Item:marshall(obj)});
            mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && 
                                                       p.input.Key[Const.HashColumn]['S'] === 'entity#42' && 
                                                       p.input.Key[Const.RangeColumn]['S'] === 'nodenamo' &&
                                                       p.input.ConsistentRead === test.expectedQueryConsistentRead)))
                                     .callback(()=>called=true).returns(async () => response as GetItemCommandOutput);
    
            let manager = new DynamoDbManager(mockedClient.object);
            let entity = await manager.getOne(Entity, 42, {stronglyConsistent: test.callWithStrongConsistent});
    
            assert.isTrue(called);
            assert.deepEqual(entity, {id:42});
            assert.equal(Reflector.getObjectVersion(entity), 1);
        });
    })

    it('get() - not found', async () =>
    {
        @DBTable()
        class Entity
        {
            @DBColumn()
            id:number;
        };

        let response = ({Item:undefined});

        mockedClient.setup(q => q.send(It.is((p:any) => !!p.input.TableName && p.input.Key[Const.HashColumn]['S'] === 'entity#42' && p.input.Key[Const.RangeColumn]['S'] === 'nodenamo'))).callback(()=>called=true).returns(async () => response as GetItemCommandOutput);

        let manager = new DynamoDbManager(mockedClient.object);
        let entity = await manager.getOne(Entity, 42);

        assert.isTrue(called);
        assert.isUndefined(entity);
    });
});