var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

var inspect = require('util').inspect;
var async = require('async');
var TextMessage = require('./message').TextMessage;
var Middleware = require('./middleware');

var Listener = function Listener(robot, matcher, options, callback) {
  this.robot = robot;
  this.matcher = matcher;
  this.options = options;
  this.callback = callback;
  if (this.matcher == null) {
    throw new Error("Missing a matcher for Listener");
  }
  if (this.callback == null) {
    this.callback = this.options;
    this.options = {};
  }
  if (this.options.id == null) {
    this.options.id = null;
  }
  if ((this.callback == null) || typeof this.callback !== 'function') {
    throw new Error("Missing a callback for Listener");
  }
};

Listener.prototype.call = function(message, middleware, cb) {
  var allDone, executeListener, match, response,
    _this = this;
  if ((cb == null) && typeof middleware === 'function') {
    cb = middleware;
    middleware = void 0;
  }
  if (middleware == null) {
    middleware = new Middleware(this.robot);
  }
  if (match = this.matcher(message)) {
    if (this.regex) {
      this.robot.logger.debug("Message '" + message + "' matched regex /" + (inspect(this.regex)) + "/; listener.options = " + (inspect(this.options)));
    }
    executeListener = function(context, done) {
      var err;
      _this.robot.logger.debug("Executing listener callback for Message '" + message + "'");
      try {
        _this.callback(context.response);
      } catch (_error) {
        err = _error;
        _this.robot.emit('error', err, context.response);
      }
      return done();
    };
    allDone = function() {
      if (cb != null) {
        return process.nextTick(function() {
          return cb(true);
        });
      }
    };
    response = new this.robot.Response(this.robot, message, match);
    middleware.execute({
      listener: this,
      response: response
    }, executeListener, allDone);
    return true;
  } else {
    if (cb != null) {
      process.nextTick(function() {
        return cb(false);
      });
    }
    return false;
  }
};

TextListener = (function(_super) {
  __extends(TextListener, _super);

  function TextListener(robot, regex, options, callback) {
    var _this = this;
    this.robot = robot;
    this.regex = regex;
    this.options = options;
    this.callback = callback;
    this.matcher = function(message) {
      if (message instanceof TextMessage) {
        return message.match(_this.regex);
      }
    };
    TextListener.__super__.constructor.call(this, this.robot, this.matcher, this.options, this.callback);
  }

  return TextListener;

})(Listener);

module.exports = {
  Listener: Listener,
  TextListener: TextListener
};

