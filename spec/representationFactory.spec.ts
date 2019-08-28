import "reflect-metadata";
import {assert as assert} from 'chai';
import { DBColumn, DBTable } from "../src";
import { RepresentationFactory } from '../src/representationFactory';
import { Representation } from "../src/representation";
import Const from "../src/const";

describe('RepresentationFactory', function () 
{
    it('get() - no keys', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn()
            id:number = 123;

            @DBColumn()
            name:string = 'Some One';

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 0);
    });

    it('get() - id key', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            name:string = 'Some One';

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].hash, 'entity#Some One');
        assert.equal(representations[0].range, undefined);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.hash, 'entity#Some One');
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, Const.IdRangeKey);
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.hash, 'entity#123');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, 'entity#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
    });

    it('get() - a custom-named id key', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({name: 'newId', id:true})
            id:number = 123;

            @DBColumn({hash:true})
            name:string = 'Some One';

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].hash, 'entity#Some One');
        assert.equal(representations[0].range, undefined);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.hash, 'entity#Some One');
        assert.equal(representations[0].data.range, undefined);
        assert.equal(representations[0].data.newId, 123);
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, Const.IdRangeKey);
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.hash, 'entity#123');
        assert.equal(representations[1].data.range, Const.IdRangeKey);
        assert.equal(representations[1].data.newId, 123);
        assert.equal(representations[1].data.objid, 'entity#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
    });

    it('get() - hash and id', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:true, id:true})
            id:number = 123;

            @DBColumn()
            name:string = 'Some One';

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 1);
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, undefined);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.id, '123');
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
    });

    it('get() - hash only', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:true})
            id:number = 123;

            @DBColumn()
            name:string = 'Some One';

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 1);
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, undefined);
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
    });

    it('get() - a hash/id and ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:true,id:true})
            id:number = 123;

            @DBColumn({name: 'newName', range:true})
            name:string = 'Some One';

            @DBColumn({range:true})
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.newName, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.hash, 'entity#123');
        assert.equal(representations[0].data.range, 'Some One');
        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[1].data.newName, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
    });

    it('get() - a hash and ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:true})
            id:number = 123;

            @DBColumn({name: 'newName', range:true})
            name:string = 'Some One';

            @DBColumn({range:true})
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.newName, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[0].data.objId, undefined);
        assert.equal(representations[0].data.hash, 'entity#123');
        assert.equal(representations[0].data.range, 'Some One');
        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[0].data.objid, undefined);
        assert.equal(representations[1].data.newName, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
    });

    it('get() - hashes and ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:true})
            id:number = 123;

            @DBColumn({hash:true})
            category:string = 'cat';

            @DBColumn({name: 'newName', range:true})
            name:string = 'Some One';

            @DBColumn({range:true})
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 4);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[2].hash, 'entity#cat');
        assert.equal(representations[2].range, 'Some One');
        assert.equal(representations[3].hash, 'entity#cat');
        assert.equal(representations[3].range, 'now');
    });
    
    it('get() - a hash-range pair', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:'key1'})
            id:number = 123;

            @DBColumn({name: 'newName', range:'key1'})
            name:string = 'Some One';
        };

        let representations:any = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 1);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.hash, 'entity#123');
        assert.equal(representations[0].data.range, 'Some One');
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.newName, 'Some One');
    });

    it('get() - hash-range pairs', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:'key1'})
            id:number = 123;

            @DBColumn({range:'key1'})
            name:string = 'Some One';

            @DBColumn({hash:'key2'})
            category:string = 'cat';

            @DBColumn({range:'key2'})
            time:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, undefined);
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.category, 'cat');
        assert.equal(representations[0].data.time, 'now');
        assert.equal(representations[1].hash, 'entity#cat');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[1].objId, undefined);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, undefined);
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.category, 'cat');
        assert.equal(representations[1].data.time, 'now');
    });

    it('get() - a multiple-hashes/multiple-ranges pair', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:'key1'})
            id:number = 123;

            @DBColumn({range:'key1'})
            name:string = 'Some One';

            @DBColumn({hash:'key1'})
            category:string = 'cat';

            @DBColumn({range:'key1'})
            time:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 1);
        assert.equal(representations[0].hash, 'entity#123#cat');
        assert.equal(representations[0].range, 'Some One#now');
    });

    it('get() - a hash-range pair with regular hashes and ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:'key1'})
            id:number = 123;

            @DBColumn({range:'key1'})
            name:string = 'Some One';

            @DBColumn({hash:true})
            category:string = 'cat';

            @DBColumn({range:true})
            time:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].hash, 'entity#cat');
        assert.equal(representations[0].range, 'now');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'Some One');
    });

    it('get() - data prefix', function () 
    {
        @DBTable({dataPrefix:'pfx'})
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            name:string = 'Some One';

            @DBColumn({range:true})
            createdTimestamp:number = 234;
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].hash, 'pfx#Some One');
        assert.equal(representations[0].range, 234);
        assert.equal(representations[0].objId, 'pfx#123');
        assert.equal(representations[0].data.hash, 'pfx#Some One');
        assert.equal(representations[0].data.range, 234);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, 'pfx#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 234);
        assert.equal(representations[1].hash, 'pfx#123');
        assert.equal(representations[1].range, Const.IdRangeKey);
        assert.equal(representations[1].objId, 'pfx#123');
        assert.equal(representations[1].data.hash, 'pfx#123');
        assert.equal(representations[1].data.range, Const.IdRangeKey);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, 'pfx#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 234);
    });
});