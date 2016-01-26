var Brain, EventEmitter, User, extend,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

EventEmitter = require('events').EventEmitter;

User = require('./user');

Brain = (function(_super) {
  __extends(Brain, _super);

  // Represents persistent storage for the robot. Extend this.
  //
  // Returns a new Brain with no external storage.
  function Brain(robot) {
    var _this = this;
    this.data = {
      _private: {}
    };
    this.users = {};
    this.autoSave = true;
    this.resetSaveInterval(5);
  }

  // Public: Store key-value pair under the private namespace and extend
  // existing @data before emitting the 'loaded' event.
  //
  // Returns the instance for chaining.
  Brain.prototype.set = function(key, value) {
    var pair;
    if (key === Object(key)) {
      pair = key;
    } else {
      pair = {};
      pair[key] = value;
    }
    extend(this.data._private, pair);
    this.emit('loaded', this.data);
    return this;
  };

  // Public: Get value by key from the private namespace in @data
  // or return null if not found.
  //
  // Returns the value.
  Brain.prototype.get = function(key) {
    var _ref;
    return (_ref = this.data._private[key]) != null ? _ref : null;
  };

  // Public: Remove value by key from the private namespace in @data
  // if it exists
  //
  // Returns the instance for chaining.
  Brain.prototype.remove = function(key) {
    if (this.data._private[key] != null) {
      delete this.data._private[key];
    }
    return this;
  };

  // Public: Emits the 'save' event so that 'brain' scripts can handle
  // persisting.
  //
  // Returns nothing.
  Brain.prototype.save = function() {
    return this.emit('save', this.data);
  };

  //Public: Emits the 'close' event so that 'brain' scripts can handle closing.
  //
  //Returns nothing.
  Brain.prototype.close = function() {
    clearInterval(this.saveInterval);
    this.save();
    return this.emit('close');
  };

  // Public: Enable or disable the automatic saving
  //
  // enabled - A boolean whether to autosave or not
  //
  // Returns nothing
  Brain.prototype.setAutoSave = function(enabled) {
    return this.autoSave = enabled;
  };

  // Public: Reset the interval between save function calls.
  //
  // seconds - An Integer of seconds between saves.
  //
  // Returns nothing.
  Brain.prototype.resetSaveInterval = function(seconds) {
    var _this = this;
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    return this.saveInterval = setInterval(function() {
      if (_this.autoSave) {
        return _this.save();
      }
    }, seconds * 1000);
  };

  // Public: Merge keys loaded from a DB against the in memory representation.
  //
  // Returns nothing.
  //
  // Caveats: Deeply nested structures don't merge well.
  Brain.prototype.mergeData = function(data) {
    var k;
    for (k in data || {}) {
      this.data._private[k] = data[k];
    }
    return this.emit('loaded', this.data);
  };

  // Public: Get an Array of User objects stored in the brain.
  //
  // Returns an Array of User objects.
  Brain.prototype.users = function() {
    return this.users;
  };

  // Public: Get a User object given a unique identifier.
  //
  // Returns a User instance of the specified user.
  Brain.prototype.userForId = function(id, options) {
    var user;
    user = this.users[id];
    if (!user) {
      user = new User(id, options);
      this.users[id] = user;
    }
    if (options && options.room && (!user.room || user.room !== options.room)) {
      user = new User(id, options);
      this.users[id] = user;
    }
    return user;
  };

  // Public: Get a User object given a name.
  //
  // Returns a User instance for the user with the specified name.
  Brain.prototype.userForName = function(name) {
    var k, lowerName, result, userName;
    result = null;
    lowerName = name.toLowerCase();
    for (k in this.users || {}) {
      userName = this.users[k]['name'];
      if ((userName != null) && userName.toString().toLowerCase() === lowerName) {
        result = this.users[k];
      }
    }
    return result;
  };

  // Public: Get all users whose names match fuzzyName. Currently, match
  // means 'starts with', but this could be extended to match initials,
  // nicknames, etc.
  //
  // Returns an Array of User instances matching the fuzzy name.
  Brain.prototype.usersForRawFuzzyName = function(fuzzyName) {
    var key, lowerFuzzyName, user, _ref, _results;
    lowerFuzzyName = fuzzyName.toLowerCase();
    _ref = this.users || {};
    _results = [];
    for (key in _ref) {
      user = _ref[key];
      if (user.name.toLowerCase().lastIndexOf(lowerFuzzyName, 0) === 0) {
        _results.push(user);
      }
    }
    return _results;
  };

  // Public: If fuzzyName is an exact match for a user, returns an array with
  // just that user. Otherwise, returns an array of all users for which
  // fuzzyName is a raw fuzzy match (see usersForRawFuzzyName).
  //
  // Returns an Array of User instances matching the fuzzy name.
  Brain.prototype.usersForFuzzyName = function(fuzzyName) {
    var lowerFuzzyName, matchedUsers, user, _i, _len;
    matchedUsers = this.usersForRawFuzzyName(fuzzyName);
    lowerFuzzyName = fuzzyName.toLowerCase();
    for (_i = 0, _len = matchedUsers.length; _i < _len; _i++) {
      user = matchedUsers[_i];
      if (user.name.toLowerCase() === lowerFuzzyName) {
        return [user];
      }
    }
    return matchedUsers;
  };

  return Brain;

})(EventEmitter);

extend = function() {
  var key, obj, source, sources, value, _i, _len;
  obj = arguments[0], sources = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  for (_i = 0, _len = sources.length; _i < _len; _i++) {
    source = sources[_i];
    for (key in source) {
      if (!__hasProp.call(source, key)) continue;
      value = source[key];
      obj[key] = value;
    }
  }
  return obj;
};

module.exports = Brain;

