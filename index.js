var Robot = require('./src/robot');
var Response = require('./src/response');
var _ref = require('./src/message'), Message = _ref.Message, TextMessage = _ref.TextMessage, CatchAllMessage = _ref.CatchAllMessage;

module.exports = {
  Robot: Robot,
  Response: Response,
  Message: Message,
  TextMessage: TextMessage,
  CatchAllMessage: CatchAllMessage,
}
