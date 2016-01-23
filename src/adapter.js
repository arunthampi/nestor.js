var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

// An adapter is a specific interface to a chat source for robots.
//
// robot - A Robot instance.
var NestorAdapter = function NestorAdapter(robot) {
  this.robot = robot;
}

// Public: Raw method for sending data back to the chat source. Extend this.
//
// envelope - A Object with message, room and user details.
// strings  - One or more Strings for each message to send.
//
// Returns nothing.
NestorAdapter.prototype.send = function() {
  var envelope, strings;
  envelope = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
};

// Public: Raw method for building a reply and sending it back to the chat
// source. Extend this.
//
// envelope - A Object with message, room and user details.
// strings  - One or more Strings for each reply to send.
//
// Returns nothing.
NestorAdapter.prototype.reply = function() {
  var envelope, strings;
  envelope = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
};

module.exports = NestorAdapter;
