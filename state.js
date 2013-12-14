(function(exports) {
var GameState = {};

GameState.STACK = [];

GameState.current = function() {
  return GameState.STACK[GameState.STACK.length - 1];
};

GameState.tick = function() {
  GameState.current().tick && GameState.current().tick();
};

GameState.render = function(renderer) {
  GameState.current().render && GameState.current().render(renderer);
};

GameState.push = function(state) {
  GameState.STACK.push(state);
  if (state.enter) {
    state.enter();
  }
};

GameState.pop = function() {
  var state = GameState.STACK.pop();
  if (state && state.exit) {
    state.exit();
  }
};

exports.GameState = GameState;
})(window);