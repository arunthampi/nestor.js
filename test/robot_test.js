var chai = require('chai');
var sinon = require('sinon');
var mockery = require('mockery');
var nock = require('nock');
var ScopedHttpClient = require('scoped-http-client');
var User = require('../src/user');
var Robot = require('../src/robot');
var Adapter = require('../src/adapter').Adapter;
var User = require('../src/user');

var _ref = require('../src/message'), CatchAllMessage = _ref.CatchAllMessage, TextMessage = _ref.TextMessage;
var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

chai.use(require('sinon-chai'));
expect = chai.expect;

function MockAdapter() {
  var self = this;

  function genericEmitter(event) {
    return function(envelope) {
      var args = _.collect(arguments);
      var strings = _.rest(args);

      self.emit(event, envelope, strings);
    };
  }

  self.send  = genericEmitter("send");
  self.reply = genericEmitter("reply");
  self.topic = genericEmitter("topic");
  self.play  = genericEmitter("play");

  self.run = function() {
    self.emit("connected");
  };

  self.close = function() {
    self.emit("closed");
  };

  return MockAdapter.__super__.constructor.apply(this, arguments);
}

__extends(MockAdapter, Adapter);

describe('Robot', function() {
  beforeEach(function() {
    this.robot = new Robot('TDEADBEEF', 'Nestorbot', 'nestorbot');
    this.robot.adapter = new MockAdapter(this.robot);
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

  describe('Listener Registration', function() {
    describe('#listen', function() {
      it('forwards the matcher, options, and callback to Listener', function() {
        var callback = sinon.spy();
        var matcher = sinon.spy();
        var options = {};

        this.robot.listen(matcher, options, callback);
        var testListener = this.robot.listeners[0];
        expect(testListener.matcher).to.equal(matcher);
        expect(testListener.callback).to.equal(callback);
        expect(testListener.options).to.equal(options);
      });
    });

    describe('#hear', function() {
      it('matches TextMessages', function() {
        var callback = sinon.spy();
        var testMessage = new TextMessage(this.user, 'message123');
        var testRegex = /^message123$/;

        this.robot.hear(testRegex, callback);
        var testListener = this.robot.listeners[0];

        result = testListener.matcher(testMessage);
        expect(result).to.be.ok;
      });
    });

    describe('#respond', function() {
      it('matches TextMessages addressed to the robot', function() {
        var callback = sinon.spy();
        var testMessage = new TextMessage(this.user, 'Nestorbot message123');
        var testRegex = /message123$/;
        this.robot.respond(testRegex, callback);
        var testListener = this.robot.listeners[0];

        result = testListener.matcher(testMessage);
        expect(result).to.be.ok;
      });
    });

    describe('#catchAll', function() {
      it('matches CatchAllMessages', function() {
        var callback = sinon.spy();
        var testMessage = new CatchAllMessage(new TextMessage(this.user, 'message123'));
        this.robot.catchAll(callback);

        var testListener = this.robot.listeners[0];
        var result = testListener.matcher(testMessage);
        expect(result).to.be.ok;
      });

      it('does not match TextMessages', function() {
        var callback = sinon.spy();
        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.catchAll(callback);

        var testListener = this.robot.listeners[0];
        var result = testListener.matcher(testMessage);
        return expect(result).to.not.be.ok;
      });
    });
  });

  describe('Message Processing', function() {
    it('calls a matching listener', function(done) {
      var testMessage = new TextMessage(this.user, 'message123');
      this.robot.hear(/^message123$/, function(response) {
        expect(response.message).to.equal(testMessage);
        done();
      });

      this.robot.receive(testMessage);
    });

    it('calls multiple matching listeners', function(done) {
      var testMessage = new TextMessage(this.user, 'message123');
      var listenersCalled = 0;
      var listenerCallback = function(response) {
        expect(response.message).to.equal(testMessage);
        return listenersCalled++;
      };

      this.robot.hear(/^message123$/, listenerCallback);
      this.robot.hear(/^message123$/, listenerCallback);
      this.robot.receive(testMessage, function() {
        expect(listenersCalled).to.equal(2);
        done();
      });
    });

    it('calls the catch-all listener if no listeners match', function(done) {
      var testMessage = new TextMessage(this.user, 'message123');
      var listenerCallback = sinon.spy();

      this.robot.hear(/^no-matches$/, listenerCallback);
      this.robot.catchAll(function(response) {
        expect(listenerCallback).to.not.have.been.called;
        expect(response.message).to.equal(testMessage);
        done();
      });
      this.robot.receive(testMessage);
    });

    it('does not call the catch-all listener if any listener matched', function(done) {
      var catchAllCallback, listenerCallback, testMessage;
      var testMessage = new TextMessage(this.user, 'message123');
      var listenerCallback = sinon.spy();
      this.robot.hear(/^message123$/, listenerCallback);
      var catchAllCallback = sinon.spy();
      this.robot.catchAll(catchAllCallback);

      this.robot.receive(testMessage, function() {
        expect(listenerCallback).to.have.been.called.once;
        expect(catchAllCallback).to.not.have.been.called;
        done();
      });
    });

    it('stops processing if message.finish() is called synchronously', function(done) {
      var listenerCallback, testMessage;
      var testMessage = new TextMessage(this.user, 'message123');
      this.robot.hear(/^message123$/, function(response) {
        response.message.finish();
      });
      listenerCallback = sinon.spy();

      this.robot.hear(/^message123$/, listenerCallback);
      this.robot.receive(testMessage, function() {
        expect(listenerCallback).to.not.have.been.called;
        done();
      });
    });

    it('gracefully handles listener uncaughtExceptions (move on to next listener)', function(done) {
      var _this = this;
      var testMessage = new TextMessage(this.user, 'message123');
      theError = new Error();
      this.robot.hear(/^message123$/, function() {
        throw theError;
      });

      var goodListenerCalled = false;
      this.robot.hear(/^message123$/, function() {
        goodListenerCalled = true;
      });
      var _ref1 = this.robot.listeners, badListener = _ref1[0], goodListener = _ref1[1];

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

    describe('Listener Middleware', function() {
      it('allows listener callback execution', function(testDone) {
        var listenerCallback = sinon.spy();
        this.robot.hear(/^message123$/, listenerCallback);
        this.robot.listenerMiddleware(function(context, next, done) {
          next(done);
        });

        var testMessage = new TextMessage(this.user, 'message123');
        return this.robot.receive(testMessage, function() {
          expect(listenerCallback).to.have.been.called;
          testDone();
        });
      });

      it('can block listener callback execution', function(testDone) {
        var listenerCallback = sinon.spy();
        this.robot.hear(/^message123$/, listenerCallback);
        this.robot.listenerMiddleware(function(context, next, done) {
          return done();
        });

        var testMessage = new TextMessage(this.user, 'message123');
        return this.robot.receive(testMessage, function() {
          expect(listenerCallback).to.not.have.been.called;
          testDone();
        });
      });

      it('receives the correct arguments', function(testDone) {
        var _this = this;

        this.robot.hear(/^message123$/, function() {});
        var testListener = this.robot.listeners[0];
        var testMessage = new TextMessage(this.user, 'message123');

        this.robot.listenerMiddleware(function(context, next, done) {
          process.nextTick(function() {
            expect(context.listener).to.equal(testListener);
            expect(context.response.message).to.equal(testMessage);
            expect(next).to.be.a('function');
            expect(done).to.be.a('function');
            testDone();
          });
        });
        this.robot.receive(testMessage);
      });

      it('executes middleware in order of definition', function(testDone) {
        var execution = [];
        var testMiddlewareA = function(context, next, done) {
          execution.push('middlewareA');
          next(function() {
            execution.push('doneA');
            done();
          });
        };

        var testMiddlewareB = function(context, next, done) {
          execution.push('middlewareB');
          next(function() {
            execution.push('doneB');
            done();
          });
        };

        this.robot.listenerMiddleware(testMiddlewareA);
        this.robot.listenerMiddleware(testMiddlewareB);
        this.robot.hear(/^message123$/, function() {
          execution.push('listener');
        });

        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(execution).to.deep.equal(['middlewareA', 'middlewareB', 'listener', 'doneB', 'doneA']);
          testDone();
        });
      });
    });

    describe('Receive Middleware', function() {
      it('fires for all messages, including non-matching ones', function(testDone) {
        var middlewareSpy = sinon.spy();
        var listenerCallback = sinon.spy();
        this.robot.hear(/^message123$/, listenerCallback);
        this.robot.receiveMiddleware(function(context, next, done) {
          middlewareSpy();
          next(done);
        });

        var testMessage = new TextMessage(this.user, 'not message 123');
        this.robot.receive(testMessage, function() {
          expect(listenerCallback).to.not.have.been.called;
          expect(middlewareSpy).to.have.been.called;
          testDone();
        });
      });

      it('can block listener execution', function(testDone) {
        var middlewareSpy = sinon.spy();
        var listenerCallback = sinon.spy();
        this.robot.hear(/^message123$/, listenerCallback);
        this.robot.receiveMiddleware(function(context, next, done) {
          middlewareSpy();
          done();
        });

        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(listenerCallback).to.not.have.been.called;
          expect(middlewareSpy).to.have.been.called;
          testDone();
        });
      });

      it('receives the correct arguments', function(testDone) {
        this.robot.hear(/^message123$/, function() {});
        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receiveMiddleware(function(context, next, done) {
          expect(context.response.message).to.equal(testMessage);
          expect(next).to.be.a('function');
          expect(done).to.be.a('function');
          testDone();
          next(done);
        });

        this.robot.receive(testMessage);
      });

      it('executes receive middleware in order of definition', function(testDone) {
        var execution = [];
        var testMiddlewareA = function(context, next, done) {
          execution.push('middlewareA');
          next(function() {
            execution.push('doneA');
            done();
          });
        };

        var testMiddlewareB = function(context, next, done) {
          execution.push('middlewareB');
          next(function() {
            execution.push('doneB');
            done();
          });
        };

        this.robot.receiveMiddleware(testMiddlewareA);
        this.robot.receiveMiddleware(testMiddlewareB);
        this.robot.hear(/^message123$/, function() {
          execution.push('listener');
        });
        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(execution).to.deep.equal(['middlewareA', 'middlewareB', 'listener', 'doneB', 'doneA']);
          testDone();
        });
      });

      it('allows editing the message portion of the given response', function(testDone) {
        var execution = [];
        var testMiddlewareA = function(context, next, done) {
          context.response.message.text = 'foobar';
          next();
        };
        var testMiddlewareB = function(context, next, done) {
          expect(context.response.message.text).to.equal("foobar");
          next();
        };
        this.robot.receiveMiddleware(testMiddlewareA);
        this.robot.receiveMiddleware(testMiddlewareB);

        var testCallback = sinon.spy();
        this.robot.hear(/^foobar$/, testCallback);

        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(testCallback).to.have.been.called;
          testDone();
        });
      });
    });

    describe('Response Middleware', function() {
      it('executes response middleware in order', function(testDone) {
        this.robot.adapter.send = sendSpy = sinon.spy();
        var listenerCallback = sinon.spy();
        this.robot.hear(/^message123$/, function(response) {
          response.send("foobar, sir, foobar.");
        });

        this.robot.responseMiddleware(function(context, next, done) {
          context.strings[0] = context.strings[0].replace(/foobar/g, "barfoo");
          next();
        });
        this.robot.responseMiddleware(function(context, next, done) {
          context.strings[0] = context.strings[0].replace(/barfoo/g, "replaced bar-foo");
          next();
        });

        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(sendSpy.getCall(0).args[1]).to.equal('replaced bar-foo, sir, replaced bar-foo.');
          testDone();
        });
      });

      it('allows replacing outgoing strings', function(testDone) {
        this.robot.adapter.send = sendSpy = sinon.spy();
        var listenerCallback = sinon.spy();

        this.robot.hear(/^message123$/, function(response) {
          return response.send("foobar, sir, foobar.");
        });

        this.robot.responseMiddleware(function(context, next, done) {
          context.strings = ["whatever I want."];
          next();
        });

        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(sendSpy.getCall(0).args[1]).to.deep.equal("whatever I want.");
          testDone();
        });
      });

      it('marks plaintext as plaintext', function(testDone) {
        var _this = this;
        this.robot.adapter.send = sendSpy = sinon.spy();
        var listenerCallback = sinon.spy();

        this.robot.hear(/^message123$/, function(response) {
          response.send("foobar, sir, foobar.");
        });

        var method = void 0;
        var plaintext = void 0;

        this.robot.responseMiddleware(function(context, next, done) {
          method = context.method;
          plaintext = context.plaintext;
          next(done);
        });

        var testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(plaintext).to.equal(true);
          expect(method).to.equal("send");
          testDone();
        });
      });

      it('does not send trailing functions to middleware', function(testDone) {
        this.robot.adapter.send = sendSpy = sinon.spy();
        var asserted = false;
        var postSendCallback = function() {};

        this.robot.hear(/^message123$/, function(response) {
          response.send("foobar, sir, foobar.", postSendCallback);
        });

        this.robot.responseMiddleware(function(context, next, done) {
          expect(context.strings).to.deep.equal(["foobar, sir, foobar."]);
          expect(context.method).to.equal("send");
          asserted = true;
          next();
        });

        testMessage = new TextMessage(this.user, 'message123');
        this.robot.receive(testMessage, function() {
          expect(asserted).to.equal(true);
          expect(sendSpy.getCall(0).args[1]).to.equal('foobar, sir, foobar.');
          expect(sendSpy.getCall(0).args[2]).to.equal(postSendCallback);
          testDone();
        });
      });
    });
  });
});
