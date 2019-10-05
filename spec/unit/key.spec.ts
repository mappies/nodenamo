import {assert as assert} from 'chai';
import { Key } from '../../src/Key';

describe('Key', function () 
{
    it("parse() - undefined", ()=>
    {
        let key = Key.parse(undefined);

        assert.equal(key.targetName, undefined);
        assert.equal(key.propertyName, undefined);
    });

    it("parse() - empty string", ()=>
    {
        let key = Key.parse('');

        assert.equal(key.targetName, '');
        assert.equal(key.propertyName, '');
    });

    it("parse() - no #", ()=>
    {
        let key = Key.parse('property');

        assert.equal(key.targetName, 'property');
        assert.equal(key.propertyName, 'property');
    });

    it("parse()", ()=>
    {
        let key = Key.parse('custom#property');

        assert.equal(key.targetName, 'custom');
        assert.equal(key.propertyName, 'property');
    });

    it("parse() - embedded #", ()=>
    {
        let key = Key.parse('custom#property#with#sharp');

        assert.equal(key.targetName, 'custom');
        assert.equal(key.propertyName, 'property#with#sharp');
    });
});