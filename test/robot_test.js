var chai = require('chai');
var sinon = require('sinon');
var mockery = require('mockery');
var nock = require('nock');
var ScopedHttpClient = require('scoped-http-client');
var User = require('../src/user');
var Robot = require('../src/robot');
var _ref = require('../src/message'), CatchAllMessage = _ref.CatchAllMessage, TextMessage = _ref.TextMessage;

chai.use(require('sinon-chai'));
expect = chai.expect;
var User = require('../src/user');

describe('Robot', function() {
  beforeEach(function() {
    this.robot = new Robot('TDEADBEEF', 'Nestorbot', 'nestorbot');
    this.user = new User('1', {
      name: 'nestorbottester',
      room: 'CDEADBEEF1'
    });
    nock.disableNetConnect();
  });

  describe('Unit Tests', function() {
    describe('#http', function() {
      beforeEach(function() {
        var url;
        url = 'http://localhost';
        this.httpClient = this.robot.http(url);
      });

      it('creates a new ScopedHttpClient', function() {
        expect(this.httpClient).to.have.property('get');
        expect(this.httpClient).to.have.property('post');
      });

      it('passes options through to the ScopedHttpClient', function() {
        var agent, httpClient;
        agent = {};
        httpClient = this.robot.http('http://localhost', {
          agent: agent
        });
        expect(httpClient.options.agent).to.equal(agent);
      });

      it('sets a sane user agent', function() {
        expect(this.httpClient.options.headers['User-Agent']).to.contain('Nestorbot');
      });

      it('merges in any global http options', function() {
        var agent, httpClient;
        agent = {};
        this.robot.globalHttpOptions = {
          agent: agent
        };
        httpClient = this.robot.http('http://localhost');
        expect(httpClient.options.agent).to.equal(agent);
      });

      it('local options override global http options', function() {
        var agentA, agentB, httpClient;
        agentA = {};
        agentB = {};
        this.robot.globalHttpOptions = {
          agent: agentA
        };
        httpClient = this.robot.http('http://localhost', {
          agent: agentB
        });
        expect(httpClient.options.agent).to.equal(agentB);
      });
    });

    describe('#respondPattern', function() {
      it('matches messages starting with robot\'s name', function() {
        var testMessage = this.robot.name + 'message123';
        var testRegex = /(.*)/;
        var pattern = this.robot.respondPattern(testRegex);
        expect(testMessage).to.match(pattern);

        var match = testMessage.match(pattern)[1];
        expect(match).to.equal('message123');
      });

      it('matches messages starting with robot\'s alias', function() {
        var match, pattern, testMessage, testRegex;
        testMessage = this.robot.alias + 'message123';
        testRegex = /(.*)/;
        pattern = this.robot.respondPattern(testRegex);
        expect(testMessage).to.match(pattern);
        match = testMessage.match(pattern)[1];
        expect(match).to.equal('message123');
      });

      it('does not match unaddressed messages', function() {
        var pattern, testMessage, testRegex;
        testMessage = 'message123';
        testRegex = /(.*)/;
        pattern = this.robot.respondPattern(testRegex);
        expect(testMessage).to.not.match(pattern);
      });

      it('matches properly when name is substring of alias', function() {
        this.robot.name = 'Meg';
        this.robot.alias = 'Megan';

        var testMessage1 = this.robot.name + ' message123';
        var testMessage2 = this.robot.alias + ' message123';
        var testRegex = /(.*)/;
        var pattern = this.robot.respondPattern(testRegex);

        expect(testMessage1).to.match(pattern);

        var match1 = testMessage1.match(pattern)[1];
        expect(match1).to.equal('message123');
        expect(testMessage2).to.match(pattern);

        var match2 = testMessage2.match(pattern)[1];
        expect(match2).to.equal('message123');
      });

      it('matches properly when alias is substring of name', function() {
        this.robot.name = 'Megan';
        this.robot.alias = 'Meg';
        var testMessage1 = this.robot.name + ' message123';
        var testMessage2 = this.robot.alias + ' message123';
        var testRegex = /(.*)/;
        var pattern = this.robot.respondPattern(testRegex);
        expect(testMessage1).to.match(pattern);

        var match1 = testMessage1.match(pattern)[1];
        expect(match1).to.equal('message123');
        expect(testMessage2).to.match(pattern);

        var match2 = testMessage2.match(pattern)[1];
        expect(match2).to.equal('message123');
      });
    });

    describe('#hear', function() {
      it('registers a new listener directly', function() {
        expect(this.robot.listeners).to.have.length(0);
        this.robot.hear(/.*/, function() {});
        expect(this.robot.listeners).to.have.length(1);
      });
    });

    describe('#catchAll', function() {
      return it('registers a new listener using listen', function() {
        sinon.spy(this.robot, 'listen');
        this.robot.catchAll(function() {});
        expect(this.robot.listen).to.have.been.called;
      });
    });

    describe('#receive', function() {
      it('calls all registered listeners', function(done) {
        var testMessage = new TextMessage(this.user, 'message123');
        var listener = {
          call: function(response, middleware, cb) {
            return cb();
          }
        };
        sinon.spy(listener, 'call');
        this.robot.listeners = [listener, listener, listener, listener];
        this.robot.receive(testMessage, function() {
          expect(listener.call).to.have.callCount(8);
          done();
        });
      });

      it('sends a CatchAllMessage if no listener matches', function(done) {
        var _this = this;
        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.listeners = [];
        var oldReceive = this.robot.receive;
        this.robot.receive = function(message, cb) {
          expect(message).to.be["instanceof"](CatchAllMessage);
          expect(message.message).to.be.equal(testMessage);
          cb();
        };
        sinon.spy(this.robot, 'receive');
        oldReceive.call(this.robot, testMessage, function() {
          expect(_this.robot.receive).to.have.been.called;
          done();
        });
      });

      it('does not trigger a CatchAllMessage if a listener matches', function(done) {
        var testMessage = new TextMessage(this.user, 'message123');
        var matchingListener = {
          call: function(message, middleware, cb) {
            return cb(true);
          }
        };
        var oldReceive = this.robot.receive;
        this.robot.receive = sinon.spy();
        this.robot.listeners = [matchingListener];
        oldReceive.call(this.robot, testMessage, done);
        expect(this.robot.receive).to.not.have.been.called;
      });

      it('stops processing if a listener marks the message as done', function(done) {
        var testMessage = new TextMessage(this.user, 'message123');
        var matchingListener = {
          call: function(message, middleware, cb) {
            message.done = true;
            return cb(true);
          }
        };
        var listenerSpy = {
          call: sinon.spy()
        };
        this.robot.listeners = [matchingListener, listenerSpy];
        this.robot.receive(testMessage, function() {
          expect(listenerSpy.call).to.not.have.been.called;
          done();
        });
      });

      it('gracefully handles listener uncaughtExceptions (move on to next listener)', function(done) {
        var _this = this;
        var testMessage = {};
        var theError = new Error();
        var badListener = {
          call: function() {
            throw theError;
          }
        };
        var goodListenerCalled = false;
        var goodListener = {
          call: function(_, middleware, cb) {
            goodListenerCalled = true;
            cb(true);
          }
        };

        this.robot.listeners = [badListener, goodListener];
        this.robot.emit = function(name, err, response) {
          expect(name).to.equal('error');
          expect(err).to.equal(theError);
          expect(response.message).to.equal(testMessage);
        };

        sinon.spy(this.robot, 'emit');
        this.robot.receive(testMessage, function() {
          expect(_this.robot.emit).to.have.been.called;
          expect(goodListenerCalled).to.be.ok;
          done();
        });
      });

      it('executes the callback after the function returns when there are no listeners', function(done) {
        var testMessage = new TextMessage(this.user, 'message123');
        var finished = false;
        this.robot.receive(testMessage, function() {
          expect(finished).to.be.ok;
          done();
        });
        finished = true;
      });
    });

    describe('#loadFile', function() {
      beforeEach(function() {
        this.sandbox = sinon.sandbox.create();
      });

      afterEach(function() {
        this.sandbox.restore();
      });

      it('should require the specified file', function() {
        var module = require('module');
        var script = sinon.spy(function(robot) {});
        this.sandbox.stub(module, '_load').returns(script);
        this.robot.loadFile('./scripts', 'test-script.coffee');
        expect(module._load).to.have.been.calledWith('scripts/test-script');
      });

      describe('proper script', function() {
        beforeEach(function() {
          var module = require('module');
          this.script = sinon.spy(function(robot) {});
          this.sandbox.stub(module, '_load').returns(this.script);
        });

        it('should call the script with the Robot', function() {
          this.robot.loadFile('./scripts', 'test-script.coffee');
          expect(this.script).to.have.been.calledWith(this.robot);
        });
      });

      describe('non-Function script', function() {
        beforeEach(function() {
          var module = require('module');
          this.script = {};
          this.sandbox.stub(module, '_load').returns(this.script);
        });

        it('logs a warning', function() {
          sinon.stub(this.robot.logger, 'warning');
          this.robot.loadFile('./scripts', 'test-script.coffee');
          expect(this.robot.logger.warning).to.have.been.called;
        });
      });
    });
  });
});
