var Adapter, chai, expect, sinon;

var chai = require('chai');
var sinon = require('sinon');
var NestorAdapter = require('../src/adapter');
var nock = require('nock');
var User = require('../src/user');
var Robot = require('../src/robot');

chai.use(require('sinon-chai'));
expect = chai.expect;

describe('NestorAdapter', function() {
  beforeEach(function() {
    this.robot = new Robot('TDEADBEEF1', 'Nestorbot', 'nestorbot');
    nock.disableNetConnect();
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

      context('with valid params', function() {
        var envelope, scope;

        beforeEach(function() {
          process.env.__NESTOR_AUTH_TOKEN = 'authToken';
          envelope = {
            room: 'CDEADBEEF1',
            user: new User('UDEADBEEF1')
          };

          scope = nock('https://v2.asknestor.me', {
                        reqheaders: {
                          'Authorization': 'authToken'
                        }
                      }).
                      post('/teams/TDEADBEEF1/messages', {
                          message: {
                            user_uid: 'UDEADBEEF1',
                            channel_uid: 'CDEADBEEF1',
                            strings: '["hello"]',
                            reply: false
                          }
                      }).
                      reply(202);
        });

        it('should make a request to the Nestor API to send a message back to the user', function(done) {
          this.adapter.send(envelope, 'hello');
          setTimeout(function() {
            expect(scope.isDone()).to.be.true;
            done();
          }, 1000);
        });
      });
    });

    describe('reply', function() {
      it('is a function', function() {
        expect(this.adapter.reply).to.be.a('function');
      });

      context('with valid params', function() {
        var envelope, scope;

        beforeEach(function() {
          process.env.__NESTOR_AUTH_TOKEN = 'authToken';
          envelope = {
            room: 'CDEADBEEF1',
            user: new User('UDEADBEEF1')
          };

          scope = nock('https://v2.asknestor.me', {
                        reqheaders: {
                          'Authorization': 'authToken'
                        }
                      }).
                      post('/teams/TDEADBEEF1/messages', {
                          message: {
                            user_uid: 'UDEADBEEF1',
                            channel_uid: 'CDEADBEEF1',
                            strings: '["hello"]',
                            reply: true
                          }
                      }).
                      reply(202);
        });

        it('should make a request to the Nestor API to send a message back to the user', function(done) {
          this.adapter.reply(envelope, 'hello');
          setTimeout(function() {
            expect(scope.isDone()).to.be.true;
            done();
          }, 1000);
        });
      });
    });
  });
});

