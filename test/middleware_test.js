var chai = require('chai');
var sinon = require('sinon');
var nock = require('nock');
var Robot = require('../src/robot');
var _ref = require('../src/message'), CatchAllMessage = _ref.CatchAllMessage, TextMessage = _ref.TextMessage;
var Response = require('../src/response');
var Middleware = require('../src/middleware');
var User = require('../src/user');

chai.use(require('sinon-chai'));
expect = chai.expect;

describe('Middleware', function() {
  describe('Unit Tests', function() {
    beforeEach(function() {
      this.robot = {
        emit: sinon.spy()
      };
      this.middleware = new Middleware(this.robot);
      nock.disableNetConnect();
    });

    describe('#execute', function() {
      it('executes synchronous middleware', function(testDone) {
        var middlewareFinished, testMiddleware,
          _this = this;
        testMiddleware = sinon.spy(function(context, next, done) {
          return next(done);
        });
        this.middleware.register(testMiddleware);
        middlewareFinished = function() {
          expect(testMiddleware).to.have.been.called;
          return testDone();
        };
        return this.middleware.execute({}, function(_, done) {
          return done();
        }, middlewareFinished);
      });

      it('executes asynchronous middleware', function(testDone) {
        var middlewareFinished, testMiddleware;

        testMiddleware = sinon.spy(function(context, next, done) {
          process.nextTick(function() {
            next(done);
          });
        });

        this.middleware.register(testMiddleware);
        middlewareFinished = function(context, done) {
          expect(testMiddleware).to.have.been.called;
          testDone();
        };

        this.middleware.execute({}, function(_, done) {
          done();
        }, middlewareFinished);
      });

      it('passes the correct arguments to each middleware', function(testDone) {
        var testContext, testMiddleware, testRobot;
        testContext = {};
        testRobot = this.robot;
        testMiddleware = function(context, next, done) {
          return process.nextTick(function() {
            expect(context).to.equal(testContext);
            return next(done);
          });
        };
        this.middleware.register(testMiddleware);
        return this.middleware.execute(testContext, function(_, done) {
          return done();
        }, function() {
          return testDone();
        });
      });

      it('executes all registered middleware in definition order', function(testDone) {
        var middlewareExecution, middlewareFinished, testMiddlewareA, testMiddlewareB,
          _this = this;
        middlewareExecution = [];
        testMiddlewareA = function(context, next, done) {
          middlewareExecution.push('A');
          return next(done);
        };
        testMiddlewareB = function(context, next, done) {
          middlewareExecution.push('B');
          return next(done);
        };
        this.middleware.register(testMiddlewareA);
        this.middleware.register(testMiddlewareB);
        middlewareFinished = function() {
          expect(middlewareExecution).to.deep.equal(['A', 'B']);
          return testDone();
        };
        return this.middleware.execute({}, function(_, done) {
          return done();
        }, middlewareFinished);
      });

      it('executes the next callback after the function returns when there is no middleware', function(testDone) {
        var finished;
        finished = false;
        this.middleware.execute({}, function() {
          expect(finished).to.be.ok;
          return testDone();
        }, function() {});
        return finished = true;
      });

      it('always executes middleware after the function returns', function(testDone) {
        var finished;
        finished = false;
        this.middleware.register(function(context, next, done) {
          expect(finished).to.be.ok;
          return testDone();
        });
        this.middleware.execute({}, (function() {}), (function() {}));
        return finished = true;
      });

      it('creates a default "done" function', function(testDone) {
        var finished;
        finished = false;
        this.middleware.register(function(context, next, done) {
          expect(finished).to.be.ok;
          testDone();
        });
        this.middleware.execute({}, (function() {}));
        finished = true;
      });

      it('does the right thing with done callbacks', function(testDone) {
        var allDone, execution, testMiddlewareA, testMiddlewareB;
        execution = [];
        testMiddlewareA = function(context, next, done) {
          execution.push('middlewareA');
          return next(function() {
            execution.push('doneA');
            return done();
          });
        };
        testMiddlewareB = function(context, next, done) {
          execution.push('middlewareB');
          return next(function() {
            execution.push('doneB');
            return done();
          });
        };
        this.middleware.register(testMiddlewareA);
        this.middleware.register(testMiddlewareB);
        allDone = function() {
          expect(execution).to.deep.equal(['middlewareA', 'middlewareB', 'doneB', 'doneA']);
          return testDone();
        };
        this.middleware.execute({}, function(_, done) {
          return done();
        }, allDone);
      });

      it('defaults to the latest done callback if none is provided', function(testDone) {
        var allDone, execution, testMiddlewareA, testMiddlewareB;
        execution = [];
        testMiddlewareA = function(context, next, done) {
          execution.push('middlewareA');
          return next(function() {
            execution.push('doneA');
            return done();
          });
        };
        testMiddlewareB = function(context, next, done) {
          execution.push('middlewareB');
          return next();
        };
        this.middleware.register(testMiddlewareA);
        this.middleware.register(testMiddlewareB);
        allDone = function() {
          expect(execution).to.deep.equal(['middlewareA', 'middlewareB', 'doneA']);
          testDone();
        };

        this.middleware.execute({}, function(_, done) {
          return done();
        }, allDone);
      });

      describe('error handling', function() {
        it('does not execute subsequent middleware after the error is thrown', function(testDone) {
          var middlewareExecution, middlewareFailed, middlewareFinished, testMiddlewareA, testMiddlewareB, testMiddlewareC,
            _this = this;
          middlewareExecution = [];
          testMiddlewareA = function(context, next, done) {
            middlewareExecution.push('A');
            return next(done);
          };
          testMiddlewareB = function(context, next, done) {
            middlewareExecution.push('B');
            throw new Error;
          };
          testMiddlewareC = function(context, next, done) {
            middlewareExecution.push('C');
            return next(done);
          };
          this.middleware.register(testMiddlewareA);
          this.middleware.register(testMiddlewareB);
          this.middleware.register(testMiddlewareC);
          middlewareFinished = sinon.spy();
          middlewareFailed = function() {
            expect(middlewareFinished).to.not.have.been.called;
            expect(middlewareExecution).to.deep.equal(['A', 'B']);
            return testDone();
          };
          return this.middleware.execute({}, middlewareFinished, middlewareFailed);
        });

        it('emits an error event', function(testDone) {
          var middlewareFailed, middlewareFinished, testMiddleware, testResponse, theError,
            _this = this;
          testResponse = {};
          theError = new Error;
          testMiddleware = function(context, next, done) {
            throw theError;
          };
          this.middleware.register(testMiddleware);
          this.robot.emit = sinon.spy(function(name, err, response) {
            expect(name).to.equal('error');
            expect(err).to.equal(theError);
            return expect(response).to.equal(testResponse);
          });
          middlewareFinished = sinon.spy();
          middlewareFailed = function() {
            expect(_this.robot.emit).to.have.been.called;
            return testDone();
          };
          return this.middleware.execute({
            response: testResponse
          }, middlewareFinished, middlewareFailed);
        });

        it('unwinds the middleware stack (calling all done functions)', function(testDone) {
          var extraDoneFunc, middlewareFailed, middlewareFinished, testMiddlewareA, testMiddlewareB;
          extraDoneFunc = null;
          testMiddlewareA = function(context, next, done) {
            extraDoneFunc = sinon.spy(done);
            return next(extraDoneFunc);
          };
          testMiddlewareB = function(context, next, done) {
            throw new Error;
          };
          this.middleware.register(testMiddlewareA);
          this.middleware.register(testMiddlewareB);
          middlewareFinished = sinon.spy();
          middlewareFailed = function() {
            expect(middlewareFinished).to.not.have.been.called;
            expect(extraDoneFunc).to.have.been.called;
            return testDone();
          };
          return this.middleware.execute({}, middlewareFinished, middlewareFailed);
        });
      });
    });

    describe('#register', function() {
      it('adds to the list of middleware', function() {
        var testMiddleware;
        testMiddleware = function(context, next, done) {};
        this.middleware.register(testMiddleware);
        expect(this.middleware.stack).to.include(testMiddleware);
      });

      it('validates the arity of middleware', function() {
        var testMiddleware,
          _this = this;
        testMiddleware = function(context, next, done, extra) {};
        expect(function() {
          return _this.middleware.register(testMiddleware);
        }).to["throw"](/Incorrect number of arguments/);
      });
    });
  });

  describe('Public Middleware APIs', function() {
    beforeEach(function() {
      this.robot = new Robot('TDEADBEEF', 'Nestorbot', 'nestorbot');
      this.user = new User('1', {
        name: 'nestorbottester',
        room: 'CDEADBEEF1'
      });
      this.middleware = sinon.spy(function(context, next, done) {
        return next(done);
      });
      this.textMessage = new TextMessage(this.user, 'message123');
      this.robot.hear(/^message123$/, function(response) {});
      this.textListener = this.robot.listeners[0];
    });

    describe('listener middleware context', function() {
      beforeEach(function() {
        var _this = this;
        this.robot.listenerMiddleware(function(context, next, done) {
          _this.middleware.call(_this, context, next, done);
        });
      });

      describe('listener', function() {
        it('is the listener object that matched', function(testDone) {
          var _this = this;
          this.robot.receive(this.textMessage, function() {
            expect(_this.middleware).to.have.been.calledWithMatch(sinon.match.has('listener', sinon.match.same(_this.textListener)), sinon.match.any, sinon.match.any);
            testDone();
          });
        });

        it('has options.id (metadata)', function(testDone) {
          var _this = this;
          this.robot.receive(this.textMessage, function() {
            expect(_this.middleware).to.have.been.calledWithMatch(sinon.match.has('listener', sinon.match.has('options', sinon.match.has('id'))), sinon.match.any, sinon.match.any);
            testDone();
          });
        });
      });

      describe('response', function() {
        return it('is a Response that wraps the message', function(testDone) {
          var _this = this;
          this.robot.receive(this.textMessage, function() {
            expect(_this.middleware).to.have.been.calledWithMatch(sinon.match.has('response', sinon.match.instanceOf(Response).and(sinon.match.has('message', sinon.match.same(_this.textMessage)))), sinon.match.any, sinon.match.any);
            testDone();
          });
        });
      });
    });

    describe('receive middleware context', function() {
      beforeEach(function() {
        var _this = this;
        this.robot.receiveMiddleware(function(context, next, done) {
          _this.middleware.call(_this, context, next, done);
        });
      });

      describe('response', function() {
        it('is a match-less Response object', function(testDone) {
          var _this = this;
          this.robot.receive(this.textMessage, function() {
            expect(_this.middleware).to.have.been.calledWithMatch(sinon.match.has('response', sinon.match.instanceOf(Response).and(sinon.match.has('message', sinon.match.same(_this.textMessage)))), sinon.match.any, sinon.match.any);
            testDone();
          });
        });
      });
    });

    describe('next', function() {
      beforeEach(function() {
        var _this = this;
        this.robot.listenerMiddleware(function(context, next, done) {
          _this.middleware.call(_this, context, next, done);
        });
      });

      it('is a function with arity one', function(testDone) {
        var _this = this;
        this.robot.receive(this.textMessage, function() {
          expect(_this.middleware).to.have.been.calledWithMatch(sinon.match.any, sinon.match.func.and(sinon.match.has('length', sinon.match(1))), sinon.match.any);
          testDone();
        });
      });
    });

    describe('done', function() {
      beforeEach(function() {
        var _this = this;
        this.robot.listenerMiddleware(function(context, next, done) {
          _this.middleware.call(_this, context, next, done);
        });
      });

      it('is a function with arity zero', function(testDone) {
        var _this = this;
        this.robot.receive(this.textMessage, function() {
          expect(_this.middleware).to.have.been.calledWithMatch(sinon.match.any, sinon.match.any, sinon.match.func.and(sinon.match.has('length', sinon.match(0))));
          testDone();
        });
      });
    });
  });
});

