import {assert as assert} from 'chai';
import { DBColumn } from '../src';
import Const from '../src/const';
import { Reflector } from '../src/reflector';

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

        let columns = Reflector.getColumns(new Entity());
        
        assert.equal(columns.length, 2);
        assert.equal(columns[0], 'id');
        assert.equal(columns[1], 'name');
    });
    
    it('with an ID key', function () 
    {
        class Entity {
            @DBColumn({id:true})
            myId:string;

            @DBColumn()
            get name():string { return 'myname'}
        };

        let idKey = Reflector.getIdKey(new Entity());
        
        assert.equal(idKey, 'myId');
    });

    it('With a custom column name.', function () 
    {
        class Entity {
            @DBColumn()
            id:string;

            @DBColumn({name:'custom-name'})
            get name():string {return 'myname';}
        };

        let columns = Reflector.getColumns(new Entity());
        
        assert.equal(columns.length, 2);
        assert.equal(columns[0], 'id');
        assert.equal(columns[1], 'custom-name#name');
    });

    it('With a hash key.', function () 
    {
        class Entity {
            @DBColumn({hash:true})
            id:string;

            @DBColumn()
            name:string;
        };

        let keys = Reflector.getHashKeys(new Entity());
        
        assert.equal(keys.length, 1);
        assert.equal(keys[0], 'id');
    });

    it('With a range key.', function () 
    {
        class Entity {
            @DBColumn()
            id:string;

            @DBColumn({range:true})
            name:string;
        };

        let keys = Reflector.getRangeKeys(new Entity());
        
        assert.equal(keys.length, 1);
        assert.equal(keys[0], 'name');
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

        let columnMetadata = Reflector.getColumns(new Entity());
        let hashMetadata = Reflector.getHashKeys(new Entity());
        let rangeMetadata = Reflector.getRangeKeys(new Entity());
        let idMetadata = Reflector.getIdKey(new Entity());
        let hashRangePairMetadata = Reflector.getHashRangeKeyPairs(new Entity());
        
        assert.equal(columnMetadata.length, 3);
        assert.equal(columnMetadata[0], 'uniqueId#id');
        assert.equal(columnMetadata[1], 'newName#name');
        assert.equal(columnMetadata[2], 'createdTimestamp');
        assert.equal(hashMetadata.length, 1);
        assert.equal(hashMetadata[0], 'uniqueId#id');
        assert.equal(rangeMetadata.length, 2);
        assert.equal(rangeMetadata[0], 'newName#name');
        assert.equal(rangeMetadata[1], 'createdTimestamp');
        assert.isEmpty(hashRangePairMetadata);
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

        let hashMetadata = Reflector.getHashKeys(new Entity());
        let rangeMetadata = Reflector.getRangeKeys(new Entity());
        let hashRangePairMetadata:any = Reflector.getHashRangeKeyPairs(new Entity());

        assert.isEmpty(hashMetadata);
        assert.isEmpty(rangeMetadata);
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

        let hashMetadata = Reflector.getHashKeys(new Entity());
        let rangeMetadata = Reflector.getRangeKeys(new Entity());
        let hashRangePairMetadata:any = Reflector.getHashRangeKeyPairs(new Entity());

        assert.isEmpty(hashMetadata);
        assert.isEmpty(rangeMetadata);
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