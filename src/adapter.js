var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

var NestorAdapter = function NestorAdapter(robot) {
  this.robot = robot;
}

NestorAdapter.prototype.send = function() {
  var envelope, strings;
  envelope = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
};

NestorAdapter.prototype.reply = function() {
  var envelope, strings;
  envelope = arguments[0], strings = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
};

module.exports = NestorAdapter;
