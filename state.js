(function(exports) {
var GameState = {};

GameState.STACK = [];

GameState.current = function() {
  return GameState.STACK[GameState.STACK.length - 1];
};

GameState.tick = function(t) {
  GameState.current().stage.tick(t);
  GameState.current().tick && GameState.current().tick(t);
};

GameState.render = function(renderer) {
  renderer.render(GameState.current().stage);
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
