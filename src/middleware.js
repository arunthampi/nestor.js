var async = require('async');

var Middleware = function Middleware(robot) {
  this.robot = robot;
  this.stack = [];
}

Middleware.prototype.execute = function(context, next, done) {
  var allDone, executeSingleMiddleware,
    _this = this;
  if (done == null) {
    done = function() {};
  }
  executeSingleMiddleware = function(doneFunc, middlewareFunc, cb) {
    var err, nextFunc;
    nextFunc = function(newDoneFunc) {
      return cb(null, newDoneFunc || doneFunc);
    };
    try {
      return middlewareFunc.call(void 0, context, nextFunc, doneFunc);
    } catch (_error) {
      err = _error;
      _this.robot.emit('error', err, context.response);
      return doneFunc();
    }
  };
  allDone = function(_, finalDoneFunc) {
    return next(context, finalDoneFunc);
  };
  return process.nextTick(function() {
    return async.reduce(_this.stack, done, executeSingleMiddleware, allDone);
  });
};

Middleware.prototype.register = function(middleware) {
  if (middleware.length !== 3) {
    throw new Error("Incorrect number of arguments for middleware callback (expected 3, got " + middleware.length + ")");
  }
  this.stack.push(middleware);
  return void 0;
};

module.exports = Middleware;

