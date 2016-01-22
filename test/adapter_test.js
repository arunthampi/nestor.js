var Adapter, chai, expect, sinon;

var chai = require('chai');
var sinon = require('sinon');
var Adapter = require('../src/adapter');

chai.use(require('sinon-chai'));
expect = chai.expect;

describe('Adapter', function() {
  beforeEach(function() {
    this.robot = {
      receive: sinon.spy()
    };
  });

  describe('Public API', function() {
    beforeEach(function() {
      this.adapter = new Adapter(this.robot);
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

  it('dispatches received messages to the robot', function() {
    this.robot.receive = sinon.spy();
    this.adapter = new Adapter(this.robot);
    this.message = sinon.spy();
    this.adapter.receive(this.message);
    expect(this.robot.receive).to.have.been.calledWith(this.message);
  });
});

