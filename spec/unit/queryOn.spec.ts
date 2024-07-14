import {assert as assert} from 'chai';
import { DynamoDbManager } from '../../src/managers/dynamodbManager';
import { IMock, Mock } from 'typemoq';
import { DBTable } from '../../src/dbTable';
import { DBColumn } from '../../src/dbColumn';
import { On } from '../../src/queries/on/on';
import { ReturnValue } from '../../src/interfaces/returnValue';

@DBTable()
class Entity {
    @DBColumn({hash:true, id:true})
    id:number = 123;
};

describe('Query.On', function () 
{
    let called:boolean;
    let mockedManager:IMock<DynamoDbManager>;
    
    beforeEach(()=>
    {
        called = false;
        mockedManager = Mock.ofType<DynamoDbManager>();
    });

    it('set()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {set: ['set1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).set(['set1'], {n1:'n1'}, {v1:'v1'}).execute();

        assert.isTrue(called);
    });

    it('add()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).add(['add1'], {n1:'n1'}, {v1:'v1'}).execute();

        assert.isTrue(called);
    });

    it('delete()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {delete: ['delete1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).delete(['delete1'], {n1:'n1'}, {v1:'v1'}).execute();

        assert.isTrue(called);
    });

    it('remove()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {remove: ['remove1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).remove(['remove1'], {n1:'n1'}, {v1:'v1'}).execute();

        assert.isTrue(called);
    });

    it('chained expressions', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {
                                                    updateExpression: {
                                                        set: ['set1','set2'],
                                                        add: ['add1','add2'],
                                                        delete: ['delete1','delete2'],
                                                        remove: ['remove1','remove2']}, 
                                                    expressionAttributeNames: {
                                                        an1:'an1',
                                                        sn1:'sn1',
                                                        dn1:'dn1',
                                                        rn1:'rn1',
                                                        an2:'an2',
                                                        sn2:'sn2',
                                                        dn2:'dn2',
                                                        rn2:'rn2'}, 
                                                    expressionAttributeValues: {
                                                        av1:'av1',
                                                        sv1:'sv1',
                                                        rv1:'rv1',
                                                        dv1:'dv1',
                                                        av2:'av2',
                                                        sv2:'sv2',
                                                        rv2:'rv2',
                                                        dv2:'dv2'
                                                    }}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {an1:'an1'}, {av1:'av1'})
                                       .set(['set1'], {sn1:'sn1'}, {sv1:'sv1'})
                                       .delete(['delete1'], {dn1:'dn1'}, {dv1:'dv1'})
                                       .remove(['remove1'], {rn1:'rn1'}, {rv1:'rv1'})
                                       .add(['add2'], {an2:'an2'}, {av2:'av2'})
                                       .set(['set2'], {sn2:'sn2'}, {sv2:'sv2'})
                                       .delete(['delete2'], {dn2:'dn2'}, {dv2:'dv2'})
                                       .remove(['remove2'], {rn2:'rn2'}, {rv2:'rv2'}).execute();

        assert.isTrue(called);
    });

    it('withVersionCheck()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}, versionCheck: true}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).add(['add1'], {n1:'n1'}, {v1:'v1'}).withVersionCheck(true).execute();

        assert.isTrue(called);
    });

    it('withVersionCheck() - with returning', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}, versionCheck: true, returnValue: ReturnValue.AllOld}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {n1:'n1'}, {v1:'v1'})
                                       .withVersionCheck()
                                       .returning(ReturnValue.AllOld)
                                       .execute();
        assert.isTrue(called);
    });

    it('returning()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}, returnValue: ReturnValue.AllNew}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {n1:'n1'}, {v1:'v1'})
                                       .returning(ReturnValue.AllNew)
                                       .execute();
        assert.isTrue(called);
    });

    it('returning() - with a version check', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, expressionAttributeNames: {n1:'n1'}, expressionAttributeValues: {v1:'v1'}, versionCheck: true, returnValue: ReturnValue.AllNew}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {n1:'n1'}, {v1:'v1'})
                                       .returning(ReturnValue.AllNew)
                                       .withVersionCheck()
                                       .execute();
        assert.isTrue(called);
    });

    it('where()', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, conditionExpression: 'condition', expressionAttributeNames: {n1:'n1', n2:'n2'}, expressionAttributeValues: {v1:'v1', v2:'v2'}}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).add(['add1'], {n1:'n1'}, {v1:'v1'}).where('condition', {n2:'n2'}, {v2:'v2'}).execute();

        assert.isTrue(called);
    });

    it('where() - with a version check (true)', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, conditionExpression: 'condition', expressionAttributeNames: {n1:'n1', n2:'n2'}, expressionAttributeValues: {v1:'v1', v2:'v2'}, versionCheck: true}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).add(['add1'], {n1:'n1'}, {v1:'v1'}).where('condition', {n2:'n2'}, {v2:'v2'}).withVersionCheck(true).execute();

        assert.isTrue(called);
    });

    it('where() - with a version check (false)', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, conditionExpression: 'condition', expressionAttributeNames: {n1:'n1', n2:'n2'}, expressionAttributeValues: {v1:'v1', v2:'v2'}, versionCheck: false}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity).add(['add1'], {n1:'n1'}, {v1:'v1'}).where('condition', {n2:'n2'}, {v2:'v2'}).withVersionCheck(false).execute();

        assert.isTrue(called);
    });

    it('where() - with a version check and returning', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, conditionExpression: 'condition', expressionAttributeNames: {n1:'n1', n2:'n2'}, expressionAttributeValues: {v1:'v1', v2:'v2'}, versionCheck: true, returnValue: ReturnValue.AllOld}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {n1:'n1'}, {v1:'v1'})
                                       .where('condition', {n2:'n2'}, {v2:'v2'})
                                       .withVersionCheck()
                                       .returning(ReturnValue.AllOld)
                                       .execute();
        assert.isTrue(called);
    });

    it('where() - with returning', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, conditionExpression: 'condition', expressionAttributeNames: {n1:'n1', n2:'n2'}, expressionAttributeValues: {v1:'v1', v2:'v2'}, returnValue: ReturnValue.AllOld}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {n1:'n1'}, {v1:'v1'})
                                       .where('condition', {n2:'n2'}, {v2:'v2'})
                                       .returning(ReturnValue.AllOld)
                                       .execute();

        assert.isTrue(called);
    });

    it('where() - with returning and versionCheck', async ()=>
    {
        mockedManager.setup(m => m.apply(Entity, 1, {updateExpression: {add: ['add1']}, conditionExpression: 'condition', expressionAttributeNames: {n1:'n1', n2:'n2'}, expressionAttributeValues: {v1:'v1', v2:'v2'}, versionCheck: true, returnValue: ReturnValue.AllOld}, undefined, true)).callback(()=>called=true);

        new On(mockedManager.object, 1).from(Entity)
                                       .add(['add1'], {n1:'n1'}, {v1:'v1'})
                                       .where('condition', {n2:'n2'}, {v2:'v2'})
                                       .returning(ReturnValue.AllOld)
                                       .withVersionCheck()
                                       .execute();
        assert.isTrue(called);
    });
});