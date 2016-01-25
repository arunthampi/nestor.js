var Log = require('log');
var Path = require('path');
var HttpClient = require('scoped-http-client');
var async = require('async');
var Response = require('./response');
var _ref = require('./listener'), Listener = _ref.Listener, TextListener = _ref.TextListener;
var Middleware = require('./middleware');
var CatchAllMessage = require('./message').CatchAllMessage;

var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

// Robots receive messages from a chat source (Campfire, irc, etc), and
// dispatch them to matching listeners.
//
// teamId      - A String of the ID of the team that Hubot is serving
// name        - A String of the robot name, defaults to nestorbot.
// alias       - A String of the robot alias, defaults to nestorbot.
//
// Returns nothing.
var Robot = function(teamId, name, alias) {
  this.teamId = teamId;
  this.name = name;
  this.alias = alias;
  this.listeners = [];
  this.Response = Response;
  this.logger = new Log(process.env.NESTOR_LOG_LEVEL || 'info');
  this.parseVersion();
  this.globalHttpOptions = {};
  this.setupNullRouter();
  this.middleware = {
    listener: new Middleware(this),
    response: new Middleware(this),
    receive: new Middleware(this)
  };
};

// Public: Adds a custom Listener with the provided matcher, options, and
// callback
//
// matcher  - A Function that determines whether to call the callback.
//            Expected to return a truthy value if the callback should be
//            executed.
// options  - An Object of additional parameters keyed on extension name
//            (optional).
// callback - A Function that is called with a Response object if the
//            matcher function returns true.
//
// Returns nothing.
Robot.prototype.listen = function(matcher, options, callback) {
  this.listeners.push(new Listener(this, matcher, options, callback));
};

// Public: Adds a Listener that attempts to match incoming messages based on
// a Regex.
//
// regex    - A Regex that determines if the callback should be called.
// options  - An Object of additional parameters keyed on extension name
//            (optional).
// callback - A Function that is called with a Response object.
//
// Returns nothing.
Robot.prototype.hear = function(regex, options, callback) {
  this.listeners.push(new TextListener(this, regex, options, callback));
};

// Public: Adds a Listener that attempts to match incoming messages directed
// at the robot based on a Regex. All regexes treat patterns like they begin
// with a '^'
//
// regex    - A Regex that determines if the callback should be called.
// options  - An Object of additional parameters keyed on extension name
//            (optional).
// callback - A Function that is called with a Response object.
//
// Returns nothing.
Robot.prototype.respond = function(regex, options, callback) {
  this.hear(this.respondPattern(regex), options, callback);
};

// Public: Build a regular expression that matches messages addressed
// directly to the robot
//
// regex - A RegExp for the message part that follows the robot's name/alias
//
// Returns RegExp.
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

// Public: Loads a file in path.
//
// path - A String path on the filesystem.
// file - A String filename in path on the filesystem.
//
// Returns nothing.
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

// Public: Registers new middleware for execution after matching but before
// Listener callbacks
//
// middleware - A function that determines whether or not a given matching
//              Listener should be executed. The function is called with
//              (context, next, done). If execution should
//              continue (next middleware, Listener callback), the middleware
//              should call the 'next' function with 'done' as an argument.
//              If not, the middleware should call the 'done' function with
//              no arguments.
//
// Returns nothing.
Robot.prototype.listenerMiddleware = function(middleware) {
  this.middleware.listener.register(middleware);
  return void 0;
};

// Public: Registers new middleware for execution as a response to any
// message is being sent.
//
// middleware - A function that examines an outgoing message and can modify
//              it or prevent its sending. The function is called with
//              (context, next, done). If execution should continue,
//              the middleware should call next(done). If execution should stop,
//              the middleware should call done(). To modify the outgoing message,
//              set context.string to a new message.
//
// Returns nothing.
Robot.prototype.responseMiddleware = function(middleware) {
  this.middleware.response.register(middleware);
  return void 0;
};

// Public: Registers new middleware for execution before matching
//
// middleware - A function that determines whether or not listeners should be
//              checked. The function is called with (context, next, done). If
//              ext, next, done). If execution should continue to the next
//              middleware or matching phase, it should call the 'next'
//              function with 'done' as an argument. If not, the middleware
//              should call the 'done' function with no arguments.
//
// Returns nothing.
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

// Public: Passes the given message to any interested Listeners after running
//         receive middleware.
//
// message - A Message instance. Listeners can flag this message as 'done' to
//           prevent further execution.
//
// cb - Optional callback that is called when message processing is complete
//
// Returns nothing.
// Returns before executing callback
Robot.prototype.receive = function(message, cb) {
  this.middleware.receive.execute({
    response: new Response(this, message)
  }, this.processListeners.bind(this), cb);
};

// Private: Passes the given message to any interested Listeners.
//
// message - A Message instance. Listeners can flag this message as 'done' to
//           prevent further execution.
//
// done - Optional callback that is called when message processing is complete
//
// Returns nothing.
// Returns before executing callback
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

// Setup an empty router object
//
// returns nothing
Robot.prototype.setupNullRouter = function() {
  var msg,
    _this = this;
  msg = "A script has tried registering a HTTP route while the HTTP server is disabled.";
  return this.router = {
    get: function() {
      return _this.logger.warning(msg);
    },
    post: function() {
      return _this.logger.warning(msg);
    },
    put: function() {
      return _this.logger.warning(msg);
    },
    "delete": function() {
      return _this.logger.warning(msg);
    }
  };
};

// Public: Creates a scoped http client with chainable methods for
// modifying the request. This doesn't actually make a request though.
// Once your request is assembled, you can call `get()`/`post()`/etc to
// send the request.
//
// url - String URL to access.
// options - Optional options to pass on to the client
//
// Examples:
//
//     robot.http("http://example.com")
//       # set a single header
//       .header('Authorization', 'bearer abcdef')
//
//       # set multiple headers
//       .headers(Authorization: 'bearer abcdef', Accept: 'application/json')
//
//       # add URI query parameters
//       .query(a: 1, b: 'foo & bar')
//
//       # make the actual request
//       .get() (err, res, body) ->
//         console.log body
//
//       # or, you can POST data
//       .post(data) (err, res, body) ->
//         console.log body
//
//    # Can also set options
//    robot.http("https://example.com", {rejectUnauthorized: false})
//
// Returns a ScopedClient instance.
Robot.prototype.http = function(url, options) {
  return HttpClient.create(url, this.extend({}, this.globalHttpOptions, options)).header('User-Agent', "Nestorbot/" + this.version);
};

// Public: A helper send function which delegates to the adapter's send
// function.
//
// user    - A User instance.
// strings - One or more Strings for each message to send.
//
// Returns nothing.
Robot.prototype.send = function() {
  var ref2, strings, user;
  user = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  return (ref2 = this.adapter).send.apply(ref2, [user].concat(__slice.call(strings)));
};

// Public: A helper reply function which delegates to the adapter's reply
// function.
//
// user    - A User instance.
// strings - One or more Strings for each message to send.
//
// Returns nothing.
Robot.prototype.reply = function() {
  var ref2, strings, user;
  user = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  return (ref2 = this.adapter).reply.apply(ref2, [user].concat(__slice.call(strings)));
};

// Private: Extend obj with objects passed as additional args.
//
// Returns the original object with updated changes.
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

// Public: The version of Nestorbot from npm
//
// Returns a String of the version number.
Robot.prototype.parseVersion = function() {
  var pkg;
  pkg = require(Path.join(__dirname, '..', 'package.json'));
  return this.version = pkg.version;
};

module.exports = Robot;
