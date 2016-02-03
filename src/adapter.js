var HttpClient = require('scoped-http-client');
var EventEmitter = require('events').EventEmitter;
var qs = require('qs');

var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

// An adapter is a specific interface to a chat source for robots.
//
// robot - A Robot instance.
var Adapter = (function(_super) {
  __extends(Adapter, _super);

  function Adapter(robot) {
    this.robot = robot;
  }

  // Public: Raw method for sending data back to the chat source. Extend this.
  //
  // envelope - A Object with message, room and user details.
  // strings  - One or more Strings for each message to send.
  //
  // Returns nothing.
  Adapter.prototype.send = function() {
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
  Adapter.prototype.reply = function() {
    var envelope, strings;
    envelope = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  };

  Adapter.prototype.run = function() {};

  Adapter.prototype.close = function() {};

  Adapter.prototype.receive = function(message) {
    return this.robot.receive(message);
  };

  return Adapter;
})(EventEmitter);

var NestorAdapter = (function(_super) {
  __extends(NestorAdapter, _super);

  function NestorAdapter(robot) {
    this.robot = robot;
    NestorAdapter.__super__.constructor.call(this, this.robot);
  }

  NestorAdapter.prototype.send = function() {
    var envelope, strings, callback;
    envelope = arguments[0], strings = arguments.length >= 2 ? __slice.call(arguments, 1) : [];

    this.__send(envelope, strings, false);
  };

  NestorAdapter.prototype.reply = function() {
    var envelope, strings;
    envelope = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];

    this.__send(envelope, strings, true);
  };

  NestorAdapter.prototype.__send = function(envelope, strings, reply) {
    // If robot is in debugMode, then don't actually send response back
    // just buffer them and Nestor will deal with it
    if(this.robot.debugMode) {
      if(reply) {
        this.robot.toReply = this.robot.toReply.concat(strings);
      } else {
        this.robot.toSend = this.robot.toSend.concat(strings);
      }
    } else {
      var authToken = process.env.__NESTOR_AUTH_TOKEN;
      var host = process.env.__NESTOR_API_HOST;
      if(host == null) {
        host = "https://v2.asknestor.me";
      }
      var url = host + "/teams/" + this.robot.teamId + "/messages";

      if(envelope == null || envelope.user == null || envelope.room == null || strings.length == 0) {
        return;
      }

      HttpClient.create(url).
                 header('Authorization', authToken).
                 post(qs.stringify({
                        message: {
                          user_uid: envelope.user.id,
                          channel_uid: envelope.room,
                          strings: JSON.stringify(strings),
                          reply: reply
                        }
                      }))(function(err, res, body) {});
    }
  }

  return NestorAdapter;
})(Adapter);

module.exports = {
  Adapter: Adapter,
  NestorAdapter: NestorAdapter
};
