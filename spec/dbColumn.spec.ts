import "reflect-metadata";
import {assert as assert} from 'chai';
import { DBTable, DBColumn } from '../src';
import Const from '../src/const';

describe('DbColumn', function () 
{
    it('Default usage', function () 
    {
        class Entity {
            @DBColumn()
            id:string;

            @DBColumn()
            get name():string { return 'myname'}
        };

        let metadata = Reflect.getMetadata(Const.DBColumn, new Entity());
        
        assert.equal(metadata.length, 2);
        assert.equal(metadata[0], 'id');
        assert.equal(metadata[1], 'name');
    });
    
    it('with an ID key', function () 
    {
        class Entity {
            @DBColumn({id:true})
            myId:string;

            @DBColumn()
            get name():string { return 'myname'}
        };

        let metadata = Reflect.getMetadata(Const.IdKey, new Entity());
        
        assert.equal(metadata, 'myId');
    });

    it('With a custom column name.', function () 
    {
        class Entity {
            @DBColumn()
            id:string;

            @DBColumn({name:'custom-name'})
            get name():string {return 'myname';}
        };

        let metadata = Reflect.getMetadata(Const.DBColumn, new Entity());
        
        assert.equal(metadata.length, 2);
        assert.equal(metadata[0], 'id');
        assert.equal(metadata[1], 'custom-name#name');
    });

    it('With a hash key.', function () 
    {
        class Entity {
            @DBColumn({hash:true})
            id:string;

            @DBColumn()
            name:string;
        };

        let metadata = Reflect.getMetadata(Const.HashKey, new Entity());
        
        assert.equal(metadata.length, 1);
        assert.equal(metadata[0], 'id');
    });

    it('With a range key.', function () 
    {
        class Entity {
            @DBColumn()
            id:string;

            @DBColumn({range:true})
            name:string;
        };

        let metadata = Reflect.getMetadata(Const.RangeKey, new Entity());
        
        assert.equal(metadata.length, 1);
        assert.equal(metadata[0], 'name');
    });

    it('With all combinations', function () 
    {
        class Entity {
            @DBColumn({id: true, name:'uniqueId', hash:true})
            id:string;

            @DBColumn({name: 'newName', range:true})
            name:string;

            @DBColumn({range:true})
            createdTimestamp:string;
        };

        let columnMetadata = Reflect.getMetadata(Const.DBColumn, new Entity());
        let hashMetadata = Reflect.getMetadata(Const.HashKey, new Entity());
        let rangeMetadata = Reflect.getMetadata(Const.RangeKey, new Entity());
        let idMetadata = Reflect.getMetadata(Const.IdKey, new Entity());
        let hashRangePairMetadata = Reflect.getMetadata(Const.HashRangeKey, new Entity());
        
        assert.equal(columnMetadata.length, 3);
        assert.equal(columnMetadata[0], 'uniqueId#id');
        assert.equal(columnMetadata[1], 'newName#name');
        assert.equal(columnMetadata[2], 'createdTimestamp');
        assert.equal(hashMetadata.length, 1);
        assert.equal(hashMetadata[0], 'uniqueId#id');
        assert.equal(rangeMetadata.length, 2);
        assert.equal(rangeMetadata[0], 'newName#name');
        assert.equal(rangeMetadata[1], 'createdTimestamp');
        assert.isUndefined(hashRangePairMetadata);
        assert.equal(idMetadata, 'uniqueId#id');
    });

    it('With primary keys.', function () 
    {
        class Entity {
            @DBColumn({hash:'key1'})
            id:string;

            @DBColumn({hash:'key2'})
            description:string;

            @DBColumn({range:'key2'})
            time:string;

            @DBColumn({range:'key1'})
            name:string;
        };

        let hashMetadata = Reflect.getMetadata(Const.HashKey, new Entity());
        let rangeMetadata = Reflect.getMetadata(Const.RangeKey, new Entity());
        let hashRangePairMetadata = Reflect.getMetadata(Const.HashRangeKey, new Entity());

        assert.isUndefined(hashMetadata);
        assert.isUndefined(rangeMetadata);
        assert.isDefined(hashRangePairMetadata);
        assert.isDefined(hashRangePairMetadata.key1);
        assert.equal(hashRangePairMetadata.key1.hashes.length, 1);
        assert.equal(hashRangePairMetadata.key1.hashes[0], 'id');
        assert.equal(hashRangePairMetadata.key1.ranges.length, 1);
        assert.equal(hashRangePairMetadata.key1.ranges[0], 'name');
        assert.isDefined(hashRangePairMetadata.key2);
        assert.equal(hashRangePairMetadata.key2.hashes.length, 1);
        assert.equal(hashRangePairMetadata.key2.hashes[0], 'description');
        assert.equal(hashRangePairMetadata.key2.ranges.length, 1);
        assert.equal(hashRangePairMetadata.key2.ranges[0], 'time');
    });

    it('With a primary key with multiple hashes and ranges.', function () 
    {
        class Entity {
            @DBColumn({hash:'key1'})
            id:string;

            @DBColumn({hash:'key1'})
            description:string;

            @DBColumn({range:'key1'})
            time:string;

            @DBColumn({range:'key1'})
            name:string;
        };

        let hashMetadata = Reflect.getMetadata(Const.HashKey, new Entity());
        let rangeMetadata = Reflect.getMetadata(Const.RangeKey, new Entity());
        let hashRangePairMetadata = Reflect.getMetadata(Const.HashRangeKey, new Entity());

        assert.isUndefined(hashMetadata);
        assert.isUndefined(rangeMetadata);
        assert.isDefined(hashRangePairMetadata);
        assert.isDefined(hashRangePairMetadata.key1);
        assert.equal(hashRangePairMetadata.key1.hashes.length, 2);
        assert.equal(hashRangePairMetadata.key1.hashes[0], 'id');
        assert.equal(hashRangePairMetadata.key1.hashes[1], 'description');
        assert.equal(hashRangePairMetadata.key1.ranges.length, 2);
        assert.equal(hashRangePairMetadata.key1.ranges[0], 'time');
        assert.equal(hashRangePairMetadata.key1.ranges[1], 'name');
    });
});