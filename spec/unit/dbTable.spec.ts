import {assert} from 'chai';
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

    it('Object Version', function () 
    {
        @DBTable()
        class Entity {};

        let obj = new Entity();

        assert.equal(Reflector.getObjectVersion(obj), 0);

        Reflector.incrementVersion(obj);
        
        assert.equal(Reflector.getObjectVersion(obj), 1);
    });

    it('Table Version - true', function () 
    {
        @DBTable({versioning:true})
        class Entity {};

        assert.isTrue(Reflector.getTableVersioning(new Entity()));
    });

    it('Table Version - false', function () 
    {
        @DBTable({versioning:false})
        class Entity {};

        assert.isFalse(Reflector.getTableVersioning(new Entity()));
    });

    it('Table Version - undefined', function () 
    {
        @DBTable()
        class Entity {};

        assert.isFalse(Reflector.getTableVersioning(new Entity()));
    });

    it('Table StronglyConsistent - true', function () 
    {
        @DBTable({stronglyConsistent:true})
        class Entity {};

        assert.isTrue(Reflector.getTableStronglyConsistent(new Entity()));
    });

    it('Table StronglyConsistent - false', function () 
    {
        @DBTable({stronglyConsistent:false})
        class Entity {};

        assert.isFalse(Reflector.getTableStronglyConsistent(new Entity()));
    });

    it('Table StronglyConsistent - undefined', function () 
    {
        @DBTable()
        class Entity {};

        assert.isFalse(Reflector.getTableStronglyConsistent(new Entity()));
    });
});