var Adapter, chai, expect, sinon;

var chai = require('chai');
var sinon = require('sinon');
var NestorAdapter = require('../src/adapter').NestorAdapter;
var nock = require('nock');
var User = require('../src/user');
var Robot = require('../src/robot');
var qs = require('qs');

chai.use(require('sinon-chai'));
expect = chai.expect;

describe('NestorAdapter', function() {
  var robot, adapter;

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

      context('when in debug mode', function() {
        var envelope;

        beforeEach(function() {
          this.robot.debugMode = true;
          envelope = {
            room: 'CDEADBEEF1',
            user: new User('UDEADBEEF1')
          };
        });

        it('should buffer responses in robot.toSend', function() {
          this.adapter.send(envelope, 'hello');
          expect(this.robot.toSend).to.eql(['hello']);
        });
      });

      context('when not in debug mode', function() {
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
                      post('/teams/TDEADBEEF1/messages', qs.stringify({
                          message: {
                            user_uid: 'UDEADBEEF1',
                            channel_uid: 'CDEADBEEF1',
                            strings: '["hello"]',
                            reply: false
                          }
                      })).
                      reply(202);
        });

        it('should make a request to the Nestor API to send a message back to the user', function(done) {
          this.adapter.send(envelope, 'hello');
          process.nextTick(function() {
            expect(scope.isDone()).to.be.true;
            done();
          });
        });
      });
    });

    describe('reply', function() {
      it('is a function', function() {
        expect(this.adapter.reply).to.be.a('function');
      });

      context('when in debug mode', function() {
        var envelope;

        beforeEach(function() {
          this.robot.debugMode = true;
          envelope = {
            room: 'CDEADBEEF1',
            user: new User('UDEADBEEF1')
          };
        });

        it('should buffer responses in robot.toSend', function() {
          this.adapter.reply(envelope, 'hello');
          expect(this.robot.toReply).to.eql(['hello']);
        });
      });

      context('when not in debug mode', function() {
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
                      post('/teams/TDEADBEEF1/messages', qs.stringify({
                          message: {
                            user_uid: 'UDEADBEEF1',
                            channel_uid: 'CDEADBEEF1',
                            strings: '["hello"]',
                            reply: true
                          }
                      })).
                      reply(202);
        });

        it('should make a request to the Nestor API to send a message back to the user', function(done) {
          this.adapter.reply(envelope, 'hello');
          process.nextTick(function() {
            expect(scope.isDone()).to.be.true;
            done();
          });
        });
      });
    });
  });
});

