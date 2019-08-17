import "reflect-metadata";
import {assert as assert} from 'chai';
import { DBColumn, DBTable } from "../src";
import { RepresentationFactory } from '../src/representationFactory';
import { Representation } from "../src/representation";

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
        
        assert.equal(representations.length, 1);
        assert.equal(representations[0].hash, 'Some One');
        assert.equal(representations[0].id, 123);
        assert.isNumber(representations[0].id);
    });

    it('get() - a custo-named id key', function () 
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
        
        assert.equal(representations.length, 1);
        assert.equal(representations[0].hash, 'Some One');
        assert.equal(representations[0].id, 123);
        assert.isNumber(representations[0].id);
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
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.name, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[0].hash, 123);
        assert.equal(representations[0].range, undefined);
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
        assert.equal(representations[0].tableName, 'Entity');
        assert.equal(representations[0].data.id, 123);
        assert.equal(representations[0].data.newName, 'Some One');
        assert.equal(representations[0].data.createdTimestamp, 'now');
        assert.equal(representations[0].hash, 123);
        assert.equal(representations[0].range, 'Some One');
        assert.isTrue(representations[1] instanceof Representation);
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].tableName, 'Entity');
        assert.equal(representations[1].data.id, 123);
        assert.equal(representations[1].data.newName, 'Some One');
        assert.equal(representations[1].data.createdTimestamp, 'now');
        assert.equal(representations[1].hash, 123);
        assert.equal(representations[1].range, 'now');
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
        assert.equal(representations[0].hash, 123);
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[1].hash, 123);
        assert.equal(representations[1].range, 'now');
        assert.equal(representations[2].hash, 'cat');
        assert.equal(representations[2].range, 'Some One');
        assert.equal(representations[3].hash, 'cat');
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

        let representations = RepresentationFactory.get(new Entity());
        
        assert.equal(representations.length, 1);
        assert.equal(representations[0].hash, 123);
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[0].tableName, 'Entity');
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
        assert.equal(representations[0].hash, 123);
        assert.equal(representations[0].range, 'Some One');
        assert.equal(representations[1].hash, 'cat');
        assert.equal(representations[1].range, 'now');
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
        assert.equal(representations[0].hash, '123#cat');
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
        assert.equal(representations[0].hash, 'cat');
        assert.equal(representations[0].range, 'now');
        assert.equal(representations[1].hash, 123);
        assert.equal(representations[1].range, 'Some One');
    });
});