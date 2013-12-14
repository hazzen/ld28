(function(exports) {

var scaleCanvas = function(view) {
  var scaleX = view.width / (window.innerWidth - 50);
  var scaleY = view.height / (window.innerHeight - 50);

  var scaleToFit = Math.max(scaleX, scaleY);
  var scaleToCover = Math.min(scaleX, scaleY);

  view.style.transformOrigin = "0 0";
  view.style.transform = "scale(" + 1 / scaleToFit + ")";
  view.style.webkitTransformOrigin = "0 0";
  view.style.webkitTransform = "scale(" + 1 / scaleToFit + ")";

  view.style.marginLeft = ((view.width / scaleToFit) / -2) + 'px';
};

var MainMenu = function() {
};

var init = function() {
  var mainElem = document.getElementById('game');
  var renderer = new Renderer3d(mainElem, 800, 600);
  RENDERER = renderer;
  var view = renderer.getElement();
  scaleCanvas(view);
  window.addEventListener('resize', scaleCanvas.bind(null, view));

  var gl = renderer.gl();

  var running = true;
  var render = true;

  var loader = new Resources.Loader(gl, [
  ]);

  var gameStruct = {
    elem: mainElem,
    tick: function(t) {
      if (running || KB.keyPressed(']')) {
        GameState.tick(t);
      }
      if (KB.keyPressed('P')) {
        running = !running;
      }
      if (KB.keyPressed('O')) {
        render = !render;
      }
      if (KB.keyPressed(Keys.ESCAPE)) {
        mainElem.blur();
      }
    },
    render: function() {
      if (render) {
        renderer.render(GameState.render);
      }
    },
  };

  loader.load(function(resources) {
    GameState.push(new MainMenu());
    Pidgine.run(gameStruct);
  });
};

exports.init = init;
})(window);
