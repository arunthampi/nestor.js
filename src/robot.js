var Log = require('log');
var Path = require('path');
var HttpClient = require('scoped-http-client');
var async = require('async');
var Response = require('./response');
var NestorAdapter = require('./adapter');
var _ref = require('./listener'), Listener = _ref.Listener, TextListener = _ref.TextListener;
var Middleware = require('./middleware');
var CatchAllMessage = require('./message').CatchAllMessage;

var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

var Robot = function(teamId, name, alias) {
  this.teamId = teamId;
  this.name = name;
  this.alias = alias;
  this.listeners = [];
  this.Response = Response;
  this.adapter = new NestorAdapter(this.teamId);
  this.logger = new Log(process.env.NESTOR_LOG_LEVEL || 'info');
  this.parseVersion();
  this.globalHttpOptions = {};
  this.middleware = {
    listener: new Middleware(this),
    response: new Middleware(this),
    receive: new Middleware(this)
  };
};

Robot.prototype.listen = function(matcher, options, callback) {
  return this.listeners.push(new Listener(this, matcher, options, callback));
};

Robot.prototype.hear = function(regex, options, callback) {
  this.listeners.push(new TextListener(this, regex, options, callback));
};

Robot.prototype.respond = function(regex, options, callback) {
  this.hear(this.respondPattern(regex), options, callback);
};

Robot.prototype.respondPattern = function(regex) {
  var a, b, alias, newRegex, _ref;
  var re = regex.toString().split('/');
  re.shift();

  var modifiers = re.pop();
  if (re[0] && re[0][0] === '^') {
    this.logger.warning("Anchors don't work well with respond, perhaps you want to use 'hear'");
    this.logger.warning("The regex in question was " + (regex.toString()));
  }

  var pattern = re.join('/');
  var name = this.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

  if (this.alias) {
    alias = this.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    // Port of: [a,b] = if name.length > alias.length then [name,alias] else [alias,name]
    _ref = name.length > alias.length ? [name, alias] : [alias, name], a = _ref[0], b = _ref[1];
    newRegex = new RegExp("^\\s*[@]?(?:" + a + "[:,]?|" + b + "[:,]?)\\s*(?:" + pattern + ")", modifiers);
  } else {
    newRegex = new RegExp("^\\s*[@]?" + name + "[:,]?\\s*(?:" + pattern + ")", modifiers);
  }
  return newRegex;
};

Robot.prototype.loadFile = function(path, file) {
  var error, e, script;
  var ext = Path.extname(file);
  var full = Path.join(path, Path.basename(file, ext));

  if (require.extensions[ext]) {
    try {
      script = require(full);
      if (typeof script === 'function') {
        script(this);
      } else {
        return this.logger.warning("Expected " + full + " to assign a function to module.exports, got " + (typeof script));
      }
    } catch (e) {
      error = e;
      this.logger.error("Unable to load " + full + ": " + error.stack);
      return process.exit(1);
    }
  }
};

Robot.prototype.listenerMiddleware = function(middleware) {
  this.middleware.listener.register(middleware);
  return void 0;
};

Robot.prototype.responseMiddleware = function(middleware) {
  this.middleware.response.register(middleware);
  return void 0;
};

Robot.prototype.receiveMiddleware = function(middleware) {
  this.middleware.receive.register(middleware);
  return void 0;
};

Robot.prototype.catchAll = function(options, callback) {
  if (callback == null) {
    callback = options;
    options = {};
  }
  this.listen((function(msg) {
    return msg instanceof CatchAllMessage;
  }), options, (function(msg) {
    msg.message = msg.message.message;
    return callback(msg);
  }));
};

Robot.prototype.receive = function(message, cb) {
  this.middleware.receive.execute({
    response: new Response(this, message)
  }, this.processListeners.bind(this), cb);
};

Robot.prototype.processListeners = function(context, done) {
  var anyListenersExecuted,
    _this = this;
  anyListenersExecuted = false;
  async.detectSeries(this.listeners, function(listener, cb) {
    var err;
    try {
      return listener.call(context.response.message, _this.middleware.listener, function(listenerExecuted) {
        anyListenersExecuted = anyListenersExecuted || listenerExecuted;
        return process.nextTick(function() {
          return cb(context.response.message.done);
        });
      });
    } catch (_error) {
      err = _error;
      _this.emit('error', err, new _this.Response(_this, context.response.message, []));
      cb(false);
    }
  }, function(_) {
    if (!(context.response.message instanceof CatchAllMessage) && !anyListenersExecuted) {
      _this.logger.debug('No listeners executed; falling back to catch-all');
      return _this.receive(new CatchAllMessage(context.response.message), done);
    } else {
      if (done != null) {
        return process.nextTick(done);
      }
    }
  });
  return void 0;
};

Robot.prototype.http = function(url, options) {
  return HttpClient.create(url, this.extend({}, this.globalHttpOptions, options)).header('User-Agent', "Nestorbot/" + this.version);
};

Robot.prototype.send = function() {
  var ref2, strings, user;
  user = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  return (ref2 = this.adapter).send.apply(ref2, [user].concat(__slice.call(strings)));
};

Robot.prototype.reply = function() {
  var ref2, strings, user;
  user = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  return (ref2 = this.adapter).reply.apply(ref2, [user].concat(__slice.call(strings)));
};

Robot.prototype.extend = function() {
  var i, key, len, obj, source, sources, value;
  obj = arguments[0], sources = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  for (i = 0, len = sources.length; i < len; i++) {
    source = sources[i];
    for (key in source) {
      if (!__hasProp.call(source, key)) continue;
      value = source[key];
      obj[key] = value;
    }
  }
  return obj;
};

Robot.prototype.parseVersion = function() {
  var pkg;
  pkg = require(Path.join(__dirname, '..', 'package.json'));
  return this.version = pkg.version;
};

module.exports = Robot;
