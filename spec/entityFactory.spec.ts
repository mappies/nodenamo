import {assert as assert} from 'chai';
import { DBColumn, DBTable } from '../src';
import { EntityFactory } from '../src/entityFactory';

describe('EntityFactory', function () 
{
    it('create()', function () 
    {
        class Entity {
            private _propertyWithSetter:any;

            @DBColumn()
            str:string;

            @DBColumn()
            num:number;

            @DBColumn()
            bool:boolean;

            @DBColumn()
            obj:object;

            @DBColumn()
            array:any[];
            
            @DBColumn()
            get readOnlyProperty():string { return 'myname'}

            @DBColumn()
            get propertyWithSetter():any { return this._propertyWithSetter; }
            set propertyWithSetter(value:any) { this._propertyWithSetter = value; }
        };

        let entity = EntityFactory.create(Entity, {
            hash: 'hash',
            range: 'range',
            objid: 'objid',
            str:'hi', num:42, bool:true, 
            obj: {firstName: 'Some', lastName: 'One'},
            array: ['some', 1],
            readOnlyProperty: 'invalid', propertyWithSetter: 'valid'
        });
        
        assert.instanceOf(entity, Entity);
        assert.equal(entity.str, 'hi');
        assert.equal(entity.num, 42);
        assert.equal(entity.bool, true);
        assert.deepEqual(entity.obj, {firstName: 'Some', lastName: 'One'});
        assert.deepEqual(entity.array, ['some', 1]);
        assert.equal(entity.readOnlyProperty, 'myname');
        assert.equal(entity.propertyWithSetter, undefined);
        assert.equal(entity.hash, undefined);
        assert.equal(entity.range, undefined);
        assert.equal(entity.objid, undefined);
    });

    it('create() - with a custom name', function () 
    {
        class Entity {
            @DBColumn({name:'customName'})
            name:string;
            @DBColumn({name:'customId', id:true})
            id:number;
            @DBColumn({name:'customHash', hash:true})
            hash:number;
            @DBColumn({name:'customRange', range:true})
            range:number;
            @DBColumn()
            noChanged:boolean;
        };

        let entity = EntityFactory.create(Entity, {
            customName:'hi',
            customId:42,
            noChanged:true,
            customHash:'thisisahash',
            customRange:'thisisarange'
        });
        
        assert.instanceOf(entity, Entity);
        assert.equal(entity.name, 'hi');
        assert.equal(entity.customName, undefined);
        assert.equal(entity.id, 42);
        assert.equal(entity.customId, undefined);
        assert.equal(entity.hash, 'thisisahash');
        assert.equal(entity.customHash, undefined);
        assert.equal(entity.range, 'thisisarange');
        assert.equal(entity.customRange, undefined);
        assert.equal(entity.noChanged, true);
    });

    it('create() - with a data prefix', function () 
    {
        @DBTable({dataPrefix:'tbl'})
        class Entity {
            @DBColumn()
            data:number;
        };

        let entity = EntityFactory.create(Entity, {
            data:'tbl#valuabledata'
        });
        
        //assert.instanceOf(entity, Entity);
        assert.equal(entity.data, 'valuabledata');
    });
});