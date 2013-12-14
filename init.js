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

MainMenu.prototype.tick = function() {
  if (KB.keyPressed(Keys.ENTER)) {
    GameState.pop();
    GameState.push(new Game());
  }
};

MainMenu.prototype.enter = function() {
  RENDERER.lighting().ambient = new geom.Vec3(1, 1, 1);
  var text = new Sprite(RENDERER.gl());
  text.setSize(256, 32);
  text.setTexture(Texture.fromCanvas(RENDERER.gl(), {width: 256, height: 32}, function(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('You Only Get One', 128, 16);
  }));
  RENDERER.addSprite(text);
};

var Game = function() {
  this.player = new Player();
  this.enemies = [];
  this.enemies.push(new Enemy(new LoopController(1, 1)));
};

Game.prototype.enter = function() {
  RENDERER.addSprite(this.player.sprite);
  for (var i = 0; i < this.enemies.length; i++) {
    RENDERER.addSprite(this.enemies[i].sprite);
  }
  RENDERER.lighting().lights[0] = new Light(
      new geom.Vec3(0, 0, -20), new geom.Vec3(1.8, 1.8, 1.8));
  RENDERER.lighting().lights[3] = Light.globalLight(
      new geom.Vec3(1, 1, -1), new geom.Vec3(0.8, 0.8, 0.8));
};

Game.prototype.tick = function(t) {
  RENDERER.lighting().lights[0].pos.x = this.player.sprite.pos().x;
  RENDERER.lighting().lights[0].pos.y = this.player.sprite.pos().y;
  this.player.tick(t);
  for (var i = 0; i < this.enemies.length; i++) {
    this.enemies[i].tick(t);
  }
};

var PlayerKbController = function() {
};

PlayerKbController.prototype.tick = function() {
};

PlayerKbController.prototype.left = function() {
  return KB.keyDown(Keys.LEFT);
};

PlayerKbController.prototype.right = function() {
  return KB.keyDown(Keys.RIGHT);
};

PlayerKbController.prototype.up = function() {
  return KB.keyDown(Keys.UP);
};

PlayerKbController.prototype.down = function() {
  return KB.keyDown(Keys.DOWN);
};

PlayerKbController.prototype.shoot = function() {
  return KB.keyDown('z');
};

var LoopController = function(initial, duration) {
  this.dir = initial % 4;
  this.duration = duration;
  this.t = 0;
};

LoopController.prototype.tick = function(t) {
  this.t += t;
  if (this.t > this.duration) {
    this.t -= this.duration;
    this.dir++;
    this.dir %= 4;
  }
};

LoopController.prototype.left = function() {
  return this.dir == 0;
};

LoopController.prototype.right = function() {
  return this.dir == 2;
};

LoopController.prototype.up = function() {
  return this.dir == 1;
};

LoopController.prototype.down = function() {
  return this.dir == 3;
};

var Enemy = function(controller) {
  this.controller = controller;
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES['enemy_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES['enemy_normal.png']);
  this.sprite.setSize(16, 16);
};

Enemy.prototype.tick = function(t) {
  this.controller.tick(t);
  if (this.controller.left()) {
    this.sprite.addPos(-100 * t, 0);
  }
  if (this.controller.right()) {
    this.sprite.addPos(100 * t, 0);
  }
  if (this.controller.up()) {
    this.sprite.addPos(0, 100 * t);
  }
  if (this.controller.down()) {
    this.sprite.addPos(0, -100 * t);
  }
};

var Player = function() {
  this.controller = new PlayerKbController();
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES['player_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES['player_normal.png']);
  this.sprite.setSize(16, 16);
};

Player.prototype.tick = function(t) {
  this.controller.tick(t);
  if (this.controller.left()) {
    this.sprite.addPos(-100 * t, 0);
  }
  if (this.controller.right()) {
    this.sprite.addPos(100 * t, 0);
  }
  if (this.controller.up()) {
    this.sprite.addPos(0, 100 * t);
  }
  if (this.controller.down()) {
    this.sprite.addPos(0, -100 * t);
  }
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
      'sprite.json',
  ]);

  var gameStruct = {
    elem: mainElem,
    tick: function(t) {
      RENDERER.tick(t);
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
    RESOURCES = resources;
    GameState.push(new MainMenu());
    Pidgine.run(gameStruct);
  });
};

exports.init = init;
})(window);
