var Adapter, chai, expect, sinon;

var chai = require('chai');
var sinon = require('sinon');
var NestorAdapter = require('../src/adapter');

chai.use(require('sinon-chai'));
expect = chai.expect;

describe('NestorAdapter', function() {
  beforeEach(function() {
    this.robot = {
      receive: sinon.spy()
    };
  });

  describe('Public API', function() {
    beforeEach(function() {
      this.adapter = new NestorAdapter(this.robot);
    });

    it('assigns robot', function() {
      expect(this.adapter.robot).to.equal(this.robot);
    });

    describe('send', function() {
      it('is a function', function() {
        expect(this.adapter.send).to.be.a('function');
      });

      it('does nothing', function() {
        this.adapter.send({}, 'nothing');
      });
    });

    describe('reply', function() {
      it('is a function', function() {
        expect(this.adapter.reply).to.be.a('function');
      });

      it('does nothing', function() {
        this.adapter.reply({}, 'nothing');
      });
    });
  });
});

