import "reflect-metadata";
import {assert} from 'chai';
import { DBColumn, DBTable } from "../../src";
import { RepresentationFactory } from '../../src/representationFactory';
import { Representation } from '../../src/representation';
import {Const} from "../../src/const";
import { Reflector } from "../../src/reflector";

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
        
        assert.equal(representations.length, 2);

        assert.equal(representations[0].hash, undefined);
        assert.equal(representations[0].range, `${Const.DefaultRangeValue}`);
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.hash, undefined);
        assert.equal(representations[0].data.range, Const.DefaultRangeValue);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, undefined);
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[0].data[Const.VersionColumn], 1);

        assert.equal(representations[1].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].range, `${Const.DefaultRangeValue}#undefined`);
        assert.equal(representations[1].objId, undefined);
        assert.equal(representations[1].data.hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].data.range, `${Const.DefaultRangeValue}#undefined`);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, undefined);
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
        assert.equal(representations[1].data[Const.VersionColumn], 1);
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
        
        assert.equal(representations.length, 3);

        assert.equal(representations[0].hash, `entity#123`);
        assert.equal(representations[0].range, `${Const.DefaultRangeValue}`);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.hash, `entity#123`);
        assert.equal(representations[0].data.range, Const.DefaultRangeValue);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.equal(representations[1].hash, 'entity#Some One');
        assert.equal(representations[1].range, 'nodenamo');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.hash, 'entity#Some One');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, 'entity#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `${Const.DefaultRangeValue}#123`);
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].data.range, `${Const.DefaultRangeValue}#123`);
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.objid, 'entity#123');
        assert.equal(representations[2].data.name, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 'now');
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
        
        assert.equal(representations.length, 3);

        assert.equal(representations[0].hash, `entity#123`);
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.hash, 'entity#123');
        assert.equal(representations[0].data.range, Const.DefaultRangeValue);
        assert.equal(representations[0].data.newId, 123);
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.equal(representations[1].hash, 'entity#Some One');
        assert.equal(representations[1].range, 'nodenamo');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.hash, 'entity#Some One');
        assert.equal(representations[1].data.range, 'nodenamo');
        assert.equal(representations[1].data.newId, 123);
        assert.equal(representations[1].data.objid, 'entity#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `${Const.DefaultRangeValue}#123`);
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].data.range, `${Const.DefaultRangeValue}#123`);
        assert.equal(representations[2].data.newId, 123);
        assert.equal(representations[2].data.objid, 'entity#123');
        assert.equal(representations[2].data.name, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 'now');
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
        
        assert.equal(representations.length, 3);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.id, '123');
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'nodenamo');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.id, '123');
        assert.equal(representations[1].data.objid, 'entity#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `${Const.DefaultRangeValue}#123`);
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.id, '123');
        assert.equal(representations[2].data.objid, 'entity#123');
        assert.equal(representations[2].data.name, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 'now');
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
        
        assert.equal(representations.length, 3);
        
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, undefined);//no id
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'nodenamo'); //no id
        assert.equal(representations[1].objId, undefined);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `${Const.DefaultRangeValue}#undefined`); //no id
        assert.equal(representations[2].objId, undefined);
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.name, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 'now');
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
        
        assert.equal(representations.length, 5);
        
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, 'entity#123');
        assert.equal(representations[0].data.newName, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'Some One');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.newName, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
        assert.equal(representations[1].data.objid, 'entity#123');
        assert.equal(representations[1].data.hash, 'entity#123');
        assert.equal(representations[1].data.range, 'Some One');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#123');
        assert.equal(representations[2].range, 'now');
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.objid, 'entity#123');
        assert.equal(representations[2].data.newName, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 'now');

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `Some One#123`);
        assert.equal(representations[3].objId, 'entity#123');
        assert.equal(representations[3].data.id, 123);
        assert.equal(representations[3].data.objid, 'entity#123');
        assert.equal(representations[3].data.newName, 'Some One');
        assert.equal(representations[3].data.createdTimestamp, 'now');

        assert.isTrue(representations[4] instanceof Representation);
        assert.equal(representations[4].tableName, 'Entity');
        assert.equal(representations[4].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[4].range, `now#123`);
        assert.equal(representations[4].objId, 'entity#123');
        assert.equal(representations[4].data.id, 123);
        assert.equal(representations[4].data.objid, 'entity#123');
        assert.equal(representations[4].data.newName, 'Some One');
        assert.equal(representations[4].data.createdTimestamp, 'now');
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
        
        assert.equal(representations.length, 5);
        
        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, undefined);
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, undefined);
        assert.equal(representations[0].data.newName, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'Some One');
        assert.equal(representations[1].objId, undefined);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.newName, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
        assert.equal(representations[1].data.objId, undefined);
        assert.equal(representations[1].data.hash, 'entity#123');
        assert.equal(representations[1].data.range, 'Some One');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#123');
        assert.equal(representations[2].range, 'now');
        assert.equal(representations[2].objId, undefined);
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.objid, undefined);
        assert.equal(representations[2].data.newName, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 'now');

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `Some One#undefined`);
        assert.equal(representations[3].objId, undefined);
        assert.equal(representations[3].data.id, 123);
        assert.equal(representations[3].data.objid, undefined);
        assert.equal(representations[3].data.newName, 'Some One');
        assert.equal(representations[3].data.createdTimestamp, 'now');

        assert.isTrue(representations[4] instanceof Representation);
        assert.equal(representations[4].tableName, 'Entity');
        assert.equal(representations[4].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[4].range, `now#undefined`);
        assert.equal(representations[4].objId, undefined);
        assert.equal(representations[4].data.id, 123);
        assert.equal(representations[4].data.objid, undefined);
        assert.equal(representations[4].data.newName, 'Some One');
        assert.equal(representations[4].data.createdTimestamp, 'now');
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
        
        assert.equal(representations.length, 7);
        assert.equal(representations[0].hash, undefined);
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'Some One');
        assert.equal(representations[2].hash, 'entity#123');
        assert.equal(representations[2].range, 'now');
        assert.equal(representations[3].hash, 'entity#cat');
        assert.equal(representations[3].range, 'Some One');
        assert.equal(representations[4].hash, 'entity#cat');
        assert.equal(representations[4].range, 'now');
        assert.equal(representations[5].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[5].range, `Some One#undefined`);
        assert.equal(representations[6].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[6].range, `now#undefined`);
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
        
        assert.equal(representations.length, 3);

        assert.equal(representations[0].hash, undefined);
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.hash, undefined);
        assert.equal(representations[0].data.range, Const.DefaultRangeValue);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.newName, 'Some One');

        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'Some One');
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].objId, undefined);
        assert.equal(representations[1].data.hash, 'entity#123');
        assert.equal(representations[1].data.range, 'Some One');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.newName, 'Some One');

        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `${Const.DefaultRangeValue}#undefined`);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].objId, undefined);
        assert.equal(representations[2].data.hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].data.range, `${Const.DefaultRangeValue}#undefined`);
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.newName, 'Some One');
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
        
        assert.equal(representations.length, 4);

        assert.equal(representations[0].hash, undefined);
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].objId, undefined);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, undefined);
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.category, 'cat');
        assert.equal(representations[0].data.time, 'now');

        assert.equal(representations[1].hash, 'entity#123');
        assert.equal(representations[1].range, 'Some One');
        assert.equal(representations[1].objId, undefined);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, undefined);
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.category, 'cat');
        assert.equal(representations[1].data.time, 'now');

        assert.equal(representations[2].hash, 'entity#cat');
        assert.equal(representations[2].range, 'now');
        assert.equal(representations[2].objId, undefined);
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.objid, undefined);
        assert.equal(representations[2].data.name, 'Some One');
        assert.equal(representations[2].data.category, 'cat');
        assert.equal(representations[2].data.time, 'now');

        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `${Const.DefaultRangeValue}#undefined`);
        assert.equal(representations[3].objId, undefined);
        assert.equal(representations[3].data.id, 123);
        assert.equal(representations[3].data.objid, undefined);
        assert.equal(representations[3].data.name, 'Some One');
        assert.equal(representations[3].data.category, 'cat');
        assert.equal(representations[3].data.time, 'now');
    });

    it('get() - a multiple-hashes/multiple-ranges pair', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:'key1', id:true})
            id:number = 123;

            @DBColumn({range:'key1'})
            name:string = 'Some One';

            @DBColumn({hash:'key1'})
            category:string = 'cat';

            @DBColumn({range:'key1'})
            time:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 3);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[1].hash, 'entity#123#cat');
        assert.equal(representations[1].range, 'Some One#now');
        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `${Const.DefaultRangeValue}#123`);
    });

    it('get() - a hash-range pair with regular hashes and ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({hash:'key1', id:true})
            id:number = 123;

            @DBColumn({range:'key1'})
            name:string = 'Some One';

            @DBColumn({hash:true})
            category:string = 'cat';

            @DBColumn({range:true})
            time:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 4);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[1].hash, 'entity#cat');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[2].hash, 'entity#123');
        assert.equal(representations[2].range, 'Some One');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `now#123`);
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
        
        assert.equal(representations.length, 3);

        assert.equal(representations[0].hash, 'pfx#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[0].objId, 'pfx#123');
        assert.equal(representations[0].data.hash, 'pfx#123');
        assert.equal(representations[0].data.range, Const.DefaultRangeValue);
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.objid, 'pfx#123');
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 234);

        assert.equal(representations[1].hash, 'pfx#Some One');
        assert.equal(representations[1].range, 234);
        assert.equal(representations[1].objId, 'pfx#123');
        assert.equal(representations[1].data.hash, 'pfx#Some One');
        assert.equal(representations[1].data.range, 234);
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.objid, 'pfx#123');
        assert.equal(representations[1].data.name, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 234);

        assert.equal(representations[2].hash, `pfx#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, `234#123`);
        assert.equal(representations[2].objId, 'pfx#123');
        assert.equal(representations[2].data.hash, `pfx#${Const.DefaultHashValue}`);
        assert.equal(representations[2].data.range, `234#123`);
        assert.equal(representations[2].data.id, 123);
        assert.equal(representations[2].data.objid, 'pfx#123');
        assert.equal(representations[2].data.name, 'Some One');
        assert.equal(representations[2].data.createdTimestamp, 234);
    });



    it('get() - version - new obj', function () 
    {
        @DBTable()
        class Entity {};

        let entity = new Entity();
        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].data[Const.VersionColumn], 1);
        assert.equal(representations[1].data[Const.VersionColumn], 1);
    });

    it('get() - version - existing obj', function () 
    {
        @DBTable()
        class Entity {};

        let entity = new Entity();
        Reflector.incrementVersion(entity);

        let representations = RepresentationFactory.get(entity);
        
        assert.equal(representations.length, 2);
        assert.equal(representations[0].data[Const.VersionColumn], 2);
        assert.equal(representations[1].data[Const.VersionColumn], 2);
    });

    it('get() - a multi-values range', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({range:true})
            values:string[] = ["now", "Some One", "anotherId"];
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 4);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.equal(representations[1].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].range, 'now#123');
        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, 'Some One#123');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, 'anotherId#123');
    });

    it('get() - a multi-values, custom-named range', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({range:true, name: 'newValues'})
            values:string[] = ["now", "Some One", "anotherId"];
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 4);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);
        assert.deepEqual(representations[0].data.newValues, ["now", "Some One", "anotherId"]);
        assert.equal(representations[1].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].range, 'now#123');
        assert.deepEqual(representations[1].data.newValues, ["now", "Some One", "anotherId"]);
        assert.equal(representations[2].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[2].range, 'Some One#123');
        assert.deepEqual(representations[2].data.newValues, ["now", "Some One", "anotherId"]);
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, 'anotherId#123');
        assert.deepEqual(representations[3].data.newValues, ["now", "Some One", "anotherId"]);
    });

    it('get() - a multi-values range with a hash', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            account:number = 42;

            @DBColumn({range:true})
            values:string[] = ["now", "Some One", "anotherId"];
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 7);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);

        assert.equal(representations[1].hash, 'entity#42');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[2].hash, 'entity#42');
        assert.equal(representations[2].range, 'Some One');
        assert.equal(representations[3].hash, 'entity#42');
        assert.equal(representations[3].range, 'anotherId');

        assert.equal(representations[4].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[4].range, 'now#123');
        assert.equal(representations[5].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[5].range, 'Some One#123');
        assert.equal(representations[6].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[6].range, 'anotherId#123');
    });

    it('get() - a multi-values range with hashes', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            account:number = 42;

            @DBColumn({hash:true})
            organization:string = 'orgsome';

            @DBColumn({range:true})
            values:string[] = ["now", "Some One", "anotherId"];
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 10);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);

        assert.equal(representations[1].hash, 'entity#42');
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[2].hash, 'entity#42');
        assert.equal(representations[2].range, 'Some One');
        assert.equal(representations[3].hash, 'entity#42');
        assert.equal(representations[3].range, 'anotherId');

        assert.equal(representations[4].hash, 'entity#orgsome');
        assert.equal(representations[4].range, 'now');
        assert.equal(representations[5].hash, 'entity#orgsome');
        assert.equal(representations[5].range, 'Some One');
        assert.equal(representations[6].hash, 'entity#orgsome');
        assert.equal(representations[6].range, 'anotherId');

        assert.equal(representations[7].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[7].range, 'now#123');
        assert.equal(representations[8].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[8].range, 'Some One#123');
        assert.equal(representations[9].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[9].range, 'anotherId#123');
    });

    it('get() - a multi-values hash-range pair', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:'key1'})
            account:number = 42;

            @DBColumn({hash:true})
            organization:string = 'orgsome';

            @DBColumn({range:'key1'})
            values:string[] = ["now", "Some One", "anotherId"];
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 6);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);

        assert.equal(representations[1].hash, 'entity#orgsome');
        assert.equal(representations[1].range, 'nodenamo');

        assert.equal(representations[2].hash, 'entity#42');
        assert.equal(representations[2].range, 'now');
        assert.equal(representations[3].hash, 'entity#42');
        assert.equal(representations[3].range, 'Some One');
        assert.equal(representations[4].hash, 'entity#42');
        assert.equal(representations[4].range, 'anotherId');

        assert.equal(representations[5].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[5].range, 'nodenamo#123');
    });

    it('get() - a multi-values hash-range pair and a range', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:'key1'})
            account:number = 42;

            @DBColumn({hash:true})
            organization:string = 'orgsome';

            @DBColumn({range:'key1'})
            values:string[] = ["now", "Some One", "anotherId"];

            @DBColumn({range:true})
            created:string = "tomorrow";
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 6);
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue);

        assert.equal(representations[1].hash, 'entity#orgsome');
        assert.equal(representations[1].range, 'tomorrow');

        assert.equal(representations[2].hash, 'entity#42');
        assert.equal(representations[2].range, 'now');
        assert.equal(representations[3].hash, 'entity#42');
        assert.equal(representations[3].range, 'Some One');
        assert.equal(representations[4].hash, 'entity#42');
        assert.equal(representations[4].range, 'anotherId');

        assert.equal(representations[5].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[5].range, 'tomorrow#123');
    });

    it('get() - empty string', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 42;
            
            @DBColumn()
            name:string = '';

            @DBColumn()
            obj:object = {
                level: 1,
                o1: {
                    level: 2,
                    o11: {
                        level: 3,
                        O111: {
                            level: 4,
                            value: '',
                            name: 'four',
                            bool: true,
                            array: [1,2,3]
                        },
                        value: '',
                        name: 'three'
                    },
                    value: '',
                    name: 'two'
                },
                value: '',
                name: 'one'
            }
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);

        assert.equal(representations[0].hash, 'entity#42');
        assert.equal(representations[0].range, `${Const.DefaultRangeValue}`);
        assert.equal(representations[0].objId, 'entity#42');
        assert.equal(representations[0].data.hash, 'entity#42');
        assert.equal(representations[0].data.range, Const.DefaultRangeValue);
        assert.equal(representations[0].data.id, 42);
        assert.equal(representations[0].data.objid, 'entity#42');
        assert.equal(representations[0].data.name, Const.EmptyString);
        assert.deepEqual(representations[0].data.obj, {
            level: 1,
            o1: {
                level: 2,
                o11: {
                    level: 3,
                    O111: {
                        level: 4,
                        value: Const.EmptyString,
                        name: 'four',
                        bool: true,
                        array: [1,2,3]
                    },
                    value: Const.EmptyString,
                    name: 'three'
                },
                value: Const.EmptyString,
                name: 'two'
            },
            value: Const.EmptyString,
            name: 'one'
        });
        assert.equal(representations[0].data[Const.VersionColumn], 1);

        assert.equal(representations[1].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].range, `${Const.DefaultRangeValue}#42`);
        assert.equal(representations[1].objId, 'entity#42');
        assert.equal(representations[1].data.hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].data.range, `${Const.DefaultRangeValue}#42`);
        assert.equal(representations[1].data.id, 42);
        assert.equal(representations[1].data.objid, 'entity#42');
        assert.equal(representations[1].data.name, Const.EmptyString);
        assert.deepEqual(representations[0].data.obj, {
            level: 1,
            o1: {
                level: 2,
                o11: {
                    level: 3,
                    O111: {
                        level: 4,
                        value: Const.EmptyString,
                        name: 'four',
                        bool: true,
                        array: [1,2,3]
                    },
                    value: Const.EmptyString,
                    name: 'three'
                },
                value: Const.EmptyString,
                name: 'two'
            },
            value: Const.EmptyString,
            name: 'one'
        });
        assert.equal(representations[1].data[Const.VersionColumn], 1);
    });

    it('get() - multi-value hashes - empty array', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            roles:string[] = [];

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 2);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123'); 
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, 'entity#123'); 
        assert.equal(representations[0].data.id, 123);
        assert.deepEqual(representations[0].data.roles, []);
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[1].range, `${Const.DefaultRangeValue}#123`);
        assert.equal(representations[1].objId, 'entity#123'); 
        assert.equal(representations[1].data.id, 123);
        assert.deepEqual(representations[1].data.roles, []);
        assert.equal(representations[1].data.createdTimestamp, 'now');
    });

    it('get() - multi-value hashes', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn()
            id:number = 123;

            @DBColumn({hash:true})
            roles:string[] = ['user', 'admin'];

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 4);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, undefined); //no id
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, undefined); //no id
        assert.equal(representations[0].data.id, 123);
        assert.deepEqual(representations[0].data.roles, ['user', 'admin']);
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#user');
        assert.equal(representations[1].range, 'nodenamo');
        assert.equal(representations[1].objId, undefined); //no id
        assert.equal(representations[1].data.id, 123);
        assert.deepEqual(representations[1].data.roles, ['user', 'admin']);
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#admin');
        assert.equal(representations[2].range, 'nodenamo');
        assert.equal(representations[2].objId, undefined); //no id
        assert.equal(representations[2].data.id, 123);
        assert.deepEqual(representations[2].data.roles, ['user', 'admin']);
        assert.equal(representations[2].data.createdTimestamp, 'now');

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `${Const.DefaultRangeValue}#undefined`);  //no id
        assert.equal(representations[3].objId, undefined); //no id
        assert.equal(representations[3].data.id, 123);
        assert.deepEqual(representations[3].data.roles, ['user', 'admin']);
        assert.equal(representations[3].data.createdTimestamp, 'now');
    });

    it('get() - multi-value hashes - custom named hash', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn()
            id:number = 123;

            @DBColumn({name: 'userRoles', hash:true})
            roles:string[] = ['user', 'admin'];

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 4);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, undefined); //no id
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, undefined); //no id
        assert.equal(representations[0].data.id, 123);
        assert.deepEqual(representations[0].data.userRoles, ['user', 'admin']);
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#user');
        assert.equal(representations[1].range, 'nodenamo');
        assert.equal(representations[1].objId, undefined); //no id
        assert.equal(representations[1].data.id, 123);
        assert.deepEqual(representations[1].data.userRoles, ['user', 'admin']);
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#admin');
        assert.equal(representations[2].range, 'nodenamo');
        assert.equal(representations[2].objId, undefined); //no id
        assert.equal(representations[2].data.id, 123);
        assert.deepEqual(representations[2].data.userRoles, ['user', 'admin']);
        assert.equal(representations[2].data.createdTimestamp, 'now');

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `${Const.DefaultRangeValue}#undefined`);  //no id
        assert.equal(representations[3].objId, undefined); //no id
        assert.equal(representations[3].data.id, 123);
        assert.deepEqual(representations[3].data.userRoles, ['user', 'admin']);
        assert.equal(representations[3].data.createdTimestamp, 'now');
    });

    it('get() - multi-value hashes with id', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            roles:string[] = ['user', 'admin'];

            @DBColumn()
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 4);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.id, 123);
        assert.deepEqual(representations[0].data.roles, ['user', 'admin']);
        assert.equal(representations[0].data.createdTimestamp, 'now');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#user');
        assert.equal(representations[1].range, 'nodenamo');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.id, 123);
        assert.deepEqual(representations[1].data.roles, ['user', 'admin']);
        assert.equal(representations[1].data.createdTimestamp, 'now');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#admin');
        assert.equal(representations[2].range, 'nodenamo');
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.id, 123);
        assert.deepEqual(representations[2].data.roles, ['user', 'admin']);
        assert.equal(representations[2].data.createdTimestamp, 'now');

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, `${Const.DefaultRangeValue}#123`); 
        assert.equal(representations[3].objId, 'entity#123');
        assert.equal(representations[3].data.id, 123);
        assert.deepEqual(representations[3].data.roles, ['user', 'admin']);
        assert.equal(representations[3].data.createdTimestamp, 'now');
    });

    it('get() - multi-value hashes and a range', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            roles:string[] = ['user', 'admin'];

            @DBColumn({range:true})
            department:string = "IT";
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 4);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.id, 123);
        assert.deepEqual(representations[0].data.roles, ['user', 'admin']);
        assert.equal(representations[0].data.department, 'IT');

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#user');
        assert.equal(representations[1].range, 'IT');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.id, 123);
        assert.deepEqual(representations[1].data.roles, ['user', 'admin']);
        assert.equal(representations[1].data.department, 'IT');

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#admin');
        assert.equal(representations[2].range, 'IT');
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.id, 123);
        assert.deepEqual(representations[2].data.roles, ['user', 'admin']);
        assert.equal(representations[2].data.department, 'IT');

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[3].range, 'IT#123');
        assert.equal(representations[3].objId, 'entity#123');
        assert.equal(representations[3].data.id, 123);
        assert.deepEqual(representations[3].data.roles, ['user', 'admin']);
        assert.equal(representations[3].data.department, 'IT');
    });

    it('get() - multi-value hashes and multi-value ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            roles:string[] = ['user', 'admin'];

            @DBColumn({range:true})
            departments:string[] = ['IT', 'HR'];
        };

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 7);

        assert.isTrue(representations[0] instanceof Representation);
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue); 
        assert.equal(representations[0].objId, 'entity#123');
        assert.equal(representations[0].data.id, 123);
        assert.deepEqual(representations[0].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[0].data.departments, ['IT', 'HR']);

        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].hash, 'entity#user');
        assert.equal(representations[1].range, 'IT');
        assert.equal(representations[1].objId, 'entity#123');
        assert.equal(representations[1].data.id, 123);
        assert.deepEqual(representations[1].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[1].data.departments, ['IT', 'HR']);

        assert.isTrue(representations[2] instanceof Representation);
        assert.equal(representations[2].tableName, 'Entity');
        assert.equal(representations[2].hash, 'entity#user');
        assert.equal(representations[2].range, 'HR');
        assert.equal(representations[2].objId, 'entity#123');
        assert.equal(representations[2].data.id, 123);
        assert.deepEqual(representations[2].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[2].data.departments, ['IT', 'HR']);

        assert.isTrue(representations[3] instanceof Representation);
        assert.equal(representations[3].tableName, 'Entity');
        assert.equal(representations[3].hash, 'entity#admin');
        assert.equal(representations[3].range, 'IT');
        assert.equal(representations[3].objId, 'entity#123');
        assert.equal(representations[3].data.id, 123);
        assert.deepEqual(representations[3].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[3].data.departments, ['IT', 'HR']);

        assert.isTrue(representations[4] instanceof Representation);
        assert.equal(representations[4].tableName, 'Entity');
        assert.equal(representations[4].hash, 'entity#admin');
        assert.equal(representations[4].range, 'HR');
        assert.equal(representations[4].objId, 'entity#123');
        assert.equal(representations[4].data.id, 123);
        assert.deepEqual(representations[4].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[4].data.departments, ['IT', 'HR']);

        assert.isTrue(representations[5] instanceof Representation);
        assert.equal(representations[5].tableName, 'Entity');
        assert.equal(representations[5].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[5].range, 'IT#123');
        assert.equal(representations[5].objId, 'entity#123');
        assert.equal(representations[5].data.id, 123);
        assert.deepEqual(representations[5].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[5].data.departments, ['IT', 'HR']);

        assert.isTrue(representations[6] instanceof Representation);
        assert.equal(representations[6].tableName, 'Entity');
        assert.equal(representations[6].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[6].range, 'HR#123');
        assert.equal(representations[6].objId, 'entity#123');
        assert.equal(representations[6].data.id, 123);
        assert.deepEqual(representations[6].data.roles, ['user', 'admin']);
        assert.deepEqual(representations[6].data.departments, ['IT', 'HR']);
    });

    it('get() - multi-value hash/range pairs', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:'pair1'})
            name:string[] = ['Some', 'One'];

            @DBColumn({hash:'pair2'})
            roles:string[] = ['user', 'admin'];

            @DBColumn({range:'pair2'})
            departments:string[] = ['IT', 'HR'];

            @DBColumn({range:'pair1'})
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 8);

        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue); 

        assert.equal(representations[1].hash, 'entity#Some');
        assert.equal(representations[1].range, 'now');
        
        assert.equal(representations[2].hash, 'entity#One');
        assert.equal(representations[2].range, 'now');

        assert.equal(representations[3].hash, 'entity#user');
        assert.equal(representations[3].range, 'IT');

        assert.equal(representations[4].hash, 'entity#user');
        assert.equal(representations[4].range, 'HR');

        assert.equal(representations[5].hash, 'entity#admin');
        assert.equal(representations[5].range, 'IT');

        assert.equal(representations[6].hash, 'entity#admin');
        assert.equal(representations[6].range, 'HR');

        assert.equal(representations[7].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[7].range, `${Const.DefaultRangeValue}#123`);
    });

    it('get() - a hash, a multi-value hashes, a range, and a multi-value ranges', function () 
    {
        @DBTable()
        class Entity {
            @DBColumn({id:true})
            id:number = 123;

            @DBColumn({hash:true})
            name:string[] = ['Some', 'One'];

            @DBColumn({hash:true})
            roles:string[] = ['user', 'admin'];

            @DBColumn({range:true})
            departments:string[] = ['IT', 'HR'];

            @DBColumn({range:true})
            createdTimestamp:string = 'now';
        };

        let representations = RepresentationFactory.get(new Entity());

        assert.equal(representations.length, 16);

        assert.equal(representations[0].hash, 'entity#123');
        assert.equal(representations[0].range, Const.DefaultRangeValue); 

        assert.equal(representations[1].hash, 'entity#Some');
        assert.equal(representations[1].range, 'IT');

        assert.equal(representations[2].hash, 'entity#Some');
        assert.equal(representations[2].range, 'HR');

        assert.equal(representations[3].hash, 'entity#One');
        assert.equal(representations[3].range, 'IT');

        assert.equal(representations[4].hash, 'entity#One');
        assert.equal(representations[4].range, 'HR');

        assert.equal(representations[5].hash, 'entity#Some');
        assert.equal(representations[5].range, 'now');

        assert.equal(representations[6].hash, 'entity#One');
        assert.equal(representations[6].range, 'now');

        assert.equal(representations[7].hash, 'entity#user');
        assert.equal(representations[7].range, 'IT');

        assert.equal(representations[8].hash, 'entity#user');
        assert.equal(representations[8].range, 'HR');

        assert.equal(representations[9].hash, 'entity#admin');
        assert.equal(representations[9].range, 'IT');

        assert.equal(representations[10].hash, 'entity#admin');
        assert.equal(representations[10].range, 'HR');

        assert.equal(representations[11].hash, 'entity#user');
        assert.equal(representations[11].range, 'now');

        assert.equal(representations[12].hash, 'entity#admin');
        assert.equal(representations[12].range, 'now');

        assert.equal(representations[13].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[13].range, 'IT#123');

        assert.equal(representations[14].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[14].range, 'HR#123');

        assert.equal(representations[15].hash, `entity#${Const.DefaultHashValue}`);
        assert.equal(representations[15].range, 'now#123');
    });
});