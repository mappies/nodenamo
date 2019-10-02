import {assert as assert} from 'chai';
import { DBTable } from '../../src';
import { Reflector } from '../../src/reflector';

describe('DbTable', function () 
{
    it('Default usage', function () 
    {
        @DBTable()
        class Entity {};

        let metadata = Reflector.getTableName(new Entity());
        let prefixMetadata = Reflector.getDataPrefix(new Entity());
        
        assert.equal(metadata, 'Entity');
        assert.equal(prefixMetadata, 'entity');
    });

    it('With a custom table name.', function () 
    {
        @DBTable({name:'custom-name'})
        class Entity {};

        let metadata = Reflector.getTableName(new Entity());
        let prefixMetadata = Reflector.getDataPrefix(new Entity());
        
        assert.equal(metadata, 'custom-name');
        assert.equal(prefixMetadata, 'entity');
    });

    it('With a data prefix', function () 
    {
        @DBTable({dataPrefix:'prefix'})
        class Entity {};

        let metadata = Reflector.getDataPrefix(new Entity());
        
        assert.equal(metadata, 'prefix');
    });

    it('Version', function () 
    {
        @DBTable()
        class Entity {};

        let obj = new Entity();

        assert.equal(Reflector.getVersion(obj), 0);

        Reflector.incrementVersion(obj);
        
        assert.equal(Reflector.getVersion(obj), 1);
    });
});