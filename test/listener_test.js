var chai = require('chai');
var sinon = require('sinon');
chai.use(require('sinon-chai'));
var expect = chai.expect;

var _ref = require('../src/message'), CatchAllMessage = _ref.CatchAllMessage, TextMessage = _ref.TextMessage;
var _ref1 = require('../src/listener'), Listener = _ref1.Listener, TextListener = _ref1.TextListener;

var Response = require('../src/response');
var User = require('../src/user');

describe('Listener', function() {
  beforeEach(function() {
    this.robot = {
      emit: function(name, err, response) {
        if (err.constructor.name === "AssertionError") {
          return process.nextTick(function() {
            throw err;
          });
        }
      },
      logger: {
        debug: function() {}
      },
      Response: Response
    };

    this.user = new User({
      id: 1,
      name: 'nestorbottester',
      room: 'CDEADBEEF1'
    });
  });

  describe('Unit Tests', function() {
    describe('#call', function() {
      it('calls the matcher', function(done) {
        var callback, testListener, testMatcher, testMessage;
        var callback = sinon.spy();
        var testMatcher = sinon.spy();
        var testMessage = {};
        var testListener = new Listener(this.robot, testMatcher, callback);

        testListener.call(testMessage, function(_) {
          expect(testMatcher).to.have.been.calledWith(testMessage);
          return done();
        });
      });

      it('passes the matcher result on to the listener callback', function(done) {
        var matcherResult = {};
        var testMatcher = sinon.stub().returns(matcherResult);
        var testMessage = {};
        listenerCallback = function(response) {
          expect(response.match).to.be.equal(matcherResult);
        };
        expect(matcherResult).to.be.ok;
        var testListener = new Listener(this.robot, testMatcher, listenerCallback);

        testListener.call(testMessage, function(result) {
          expect(testMatcher).to.have.been.called;
          expect(result).to.be.ok;
          return done();
        });
      });

      describe('if the matcher returns true', function() {
        beforeEach(function() {
          this.createListener = function(cb) {
            return new Listener(this.robot, sinon.stub().returns(true), cb);
          };
        });

        it('executes the listener callback', function(done) {
          var listenerCallback = sinon.spy();
          var testMessage = {};
          var testListener = this.createListener(listenerCallback);

          testListener.call(testMessage, function(_) {
            expect(listenerCallback).to.have.been.called;
            return done();
          });
        });

        it('returns true', function() {
          var testMessage = {};
          var testListener = this.createListener(function() {});
          var result = testListener.call(testMessage);
          expect(result).to.be.ok;
        });

        it('calls the provided callback with true', function(done) {
          var testMessage = {};
          var testListener = this.createListener(function() {});

          testListener.call(testMessage, function(result) {
            expect(result).to.be.ok;
            return done();
          });
        });

        it('calls the provided callback after the function returns', function(done) {
          var finished, testListener, testMessage;
          testMessage = {};
          testListener = this.createListener(function() {});
          finished = false;

          testListener.call(testMessage, function(result) {
            expect(finished).to.be.ok;
            return done();
          });

          finished = true;
        });

        it('handles uncaught errors from the listener callback', function(done) {
          var listenerCallback, testListener, testMessage, theError;
          testMessage = {};
          theError = new Error();
          listenerCallback = function(response) {
            throw theError;
          };

          this.robot.emit = function(name, err, response) {
            expect(name).to.equal('error');
            expect(err).to.equal(theError);
            expect(response.message).to.equal(testMessage);
            return done();
          };
          testListener = this.createListener(listenerCallback);
          testListener.call(testMessage, sinon.spy());
        });

        it('calls the provided callback with true if there is an error thrown by the listener callback', function(done) {
          var listenerCallback, testListener, testMessage, theError;
          testMessage = {};
          theError = new Error();
          listenerCallback = function(response) {
            throw theError;
          };

          testListener = this.createListener(listenerCallback);
          testListener.call(testMessage, function(result) {
            expect(result).to.be.ok;
            return done();
          });
        });

        it('calls the listener callback with a Response that wraps the Message', function(done) {
          var listenerCallback, testListener, testMessage;
          testMessage = {};
          listenerCallback = function(response) {
            expect(response.message).to.equal(testMessage);
            return done();
          };
          testListener = this.createListener(listenerCallback);
          testListener.call(testMessage, sinon.spy());
        });

        it('passes through the provided middleware stack', function(testDone) {
          var testListener, testMessage, testMiddleware;
          testMessage = {};
          testListener = this.createListener(function() {});
          testMiddleware = {
            execute: function(context, next, done) {
              expect(context.listener).to.be.equal(testListener);
              expect(context.response).to.be["instanceof"](Response);
              expect(context.response.message).to.be.equal(testMessage);
              expect(next).to.be.a('function');
              expect(done).to.be.a('function');
              return testDone();
            }
          };

          testListener.call(testMessage, testMiddleware, sinon.spy());
        });

        it('executes the listener callback if middleware succeeds', function(testDone) {
          var listenerCallback, testListener, testMessage;
          listenerCallback = sinon.spy();
          testMessage = {};
          testListener = this.createListener(listenerCallback);
          return testListener.call(testMessage, function(result) {
            expect(listenerCallback).to.have.been.called;
            expect(result).to.be.ok;
            testDone();
          });
        });

        it('does not execute the listener callback if middleware fails', function(testDone) {
          var listenerCallback, testListener, testMessage, testMiddleware;
          listenerCallback = sinon.spy();
          testMessage = {};
          testListener = this.createListener(listenerCallback);
          testMiddleware = {
            execute: function(context, next, done) {
              return done();
            }
          };

          testListener.call(testMessage, testMiddleware, function(result) {
            expect(listenerCallback).to.not.have.been.called;
            expect(result).to.be.ok;
            return testDone();
          });
        });

        it('unwinds the middleware stack if there is an error in the listener callback', function(testDone) {
          var extraDoneFunc, listenerCallback, testListener, testMessage, testMiddleware;
          listenerCallback = sinon.stub().throws(new Error());
          testMessage = {};
          extraDoneFunc = null;
          testListener = this.createListener(listenerCallback);
          testMiddleware = {
            execute: function(context, next, done) {
              extraDoneFunc = sinon.spy(done);
              return next(context, extraDoneFunc);
            }
          };

          testListener.call(testMessage, testMiddleware, function(result) {
            expect(listenerCallback).to.have.been.called;
            expect(extraDoneFunc).to.have.been.called;
            expect(result).to.be.ok;
            return testDone();
          });
        });
      });

      describe('if the matcher returns false', function() {
        beforeEach(function() {
          this.createListener = function(cb) {
            return new Listener(this.robot, sinon.stub().returns(false), cb);
          };
        });

        it('does not execute the listener callback', function(done) {
          var listenerCallback, testListener, testMessage;
          listenerCallback = sinon.spy();
          testMessage = {};
          testListener = this.createListener(listenerCallback);
          return testListener.call(testMessage, function(_) {
            expect(listenerCallback).to.not.have.been.called;
            return done();
          });
        });

        it('returns false', function() {
          var result, testListener, testMessage;
          testMessage = {};
          testListener = this.createListener(function() {});
          result = testListener.call(testMessage);
          return expect(result).to.not.be.ok;
        });

        it('calls the provided callback with false', function(done) {
          var testListener, testMessage;
          testMessage = {};
          testListener = this.createListener(function() {});
          testListener.call(testMessage, function(result) {
            expect(result).to.not.be.ok;
            return done();
          });
        });

        it('calls the provided callback after the function returns', function(done) {
          var finished, testListener, testMessage;
          testMessage = {};
          testListener = this.createListener(function() {});
          finished = false;
          testListener.call(testMessage, function(result) {
            expect(finished).to.be.ok;
            return done();
          });
          finished = true;
        });

        it('does not execute any middleware', function(done) {
          var testListener, testMessage, testMiddleware,
            _this = this;
          testMessage = {};
          testListener = this.createListener(function() {});
          testMiddleware = {
            execute: sinon.spy()
          };
          testListener.call(testMessage, function(result) {
            expect(testMiddleware.execute).to.not.have.been.called;
            done();
          });
        });
      });
    });

    describe('#constructor', function() {
      it('requires a matcher', function() {
        return expect(function() {
          return new Listener(this.robot, void 0, {}, sinon.spy());
        }).to["throw"](Error);
      });

      it('requires a callback', function() {
        expect(function() {
          return new Listener(this.robot, sinon.spy());
        }).to["throw"](Error);

        expect(function() {
          return new Listener(this.robot, sinon.spy(), {});
        }).to["throw"](Error);
      });

      it('gracefully handles missing options', function() {
        var listenerCallback, testListener, testMatcher;
        testMatcher = sinon.spy();
        listenerCallback = sinon.spy();
        testListener = new Listener(this.robot, testMatcher, listenerCallback);
        expect(testListener.options).to.deep.equal({
          id: null
        });
        expect(testListener.callback).to.be.equal(listenerCallback);
      });

      it('gracefully handles a missing ID (set to null)', function() {
        var listenerCallback, testListener, testMatcher;
        testMatcher = sinon.spy();
        listenerCallback = sinon.spy();
        testListener = new Listener(this.robot, testMatcher, {}, listenerCallback);
        expect(testListener.options.id).to.be["null"];
      });
    });

    describe('TextListener', function() {
      describe('#matcher', function() {
        it('matches TextMessages', function() {
          var callback, result, testListener, testMessage, testRegex;
          callback = sinon.spy();
          testMessage = new TextMessage(this.user, 'test');
          testMessage.match = sinon.stub().returns(true);
          testRegex = /test/;
          testListener = new TextListener(this.robot, testRegex, callback);
          result = testListener.matcher(testMessage);
          expect(result).to.be.ok;
          expect(testMessage.match).to.have.been.calledWith(testRegex);
        });
      });
    });
  });
});

