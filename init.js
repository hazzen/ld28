(function(exports) {

// -----------------------------------------------------------------------------
// Random number stuff.
function flipCoin() {
  return randFlt(1) < 0.5;
};

function randFlt(a, opt_b) {
  var low = 0;
  var high = a;
  if (opt_b != undefined) {
    low = a;
    high = opt_b;
  }
  return low + Math.random() * (high - low);
};

function randInt(a, opt_b) {
  var low = 0;
  var high = a;
  if (opt_b != undefined) {
    low = a;
    high = opt_b;
  }
  low = Math.ceil(low);
  high = Math.ceil(high);
  return low + Math.floor(Math.random() * (high - low));
};

function pick(arrOrObj) {
  if (typeof(arrOrObj) == 'string' || 'length' in arrOrObj) {
    return arrOrObj[randInt(arrOrObj.length)];
  } else {
    var index = randInt(objectSize(arrOrObj));
    for (var k in arrOrObj) {
      if (!index) {
        return k;
      }
      index--
    }
  }
};



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
  text.setTexture(Texture.fromCanvas(RENDERER.gl(), {width: 256, height: 32}, function(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('You Only Get One', 128, 16);
  }));
  RENDERER.addSprite(text);
};

var Game = function() {
  GAME = this;
  this.player = new Player();
  this.enemies = [];
  this.enemies.push(new Enemy(new LoopController(1, 1)));
  this.fx = [];
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
    if (this.enemies[i]) {
      if (this.enemies[i].dead) {
        RENDERER.removeSprite(this.enemies[i].sprite);
        this.enemies[i] = null;
      } else {
        this.enemies[i].tick(t);
      }
    }
  }
  for (var i = 0; i < this.fx.length; i++) {
    if (this.fx[i]) {
      if (this.fx[i].dead) {
        RENDERER.removeSprite(this.fx[i].sprite);
        this.fx[i] = null;
      } else {
        this.fx[i].tick(t);
      }
    }
  }
};

Game.prototype.addFx = function(fx) {
  RENDERER.addSprite(fx.sprite);
  for (var i = 0; i < this.fx.length; i++) {
    if (!this.fx[i]) {
      this.fx[i] = fx;
      return;
    }
  }
  this.fx.push(fx);
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

var Particle = function(name, opts) {
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES[name + '_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES[name + '_normal.png']);
  this.sprite.setPos(opts.pos.x, opts.pos.y, opts.pos.z || -1);
  this.vel = opts.vel;
  this.size = this.sprite.size();
  this.life = this.duration = opts.duration || 2;
};

Particle.prototype.tick = function(t) {
  this.life -= t;
  if (this.life < 0) {
    this.dead = true;
    return;
  }
  this.sprite.addPos(this.vel.x * t, this.vel.y * t);

  var alpha = this.life / this.duration;
  this.sprite.setSize(this.size.x * alpha, this.size.y * alpha);
};

var Explode = function(where, size) {
  for (var i = 0; i < size; i++) {
    var dx = randFlt(-size * 2, size * 2);
    var dy = randFlt(-size * 2, size * 2);
    var len = Math.sqrt(dx * dx + dy * dy);
    GAME.addFx(new Particle('smoke', {
      life: randFlt(1.5, 2),
      pos: new geom.Vec3(where.x + dx, where.y + dy, -1),
      vel: new geom.Vec3(25 * dx / len, 25 * dy / len, 0),
    }));
  }
};

var Enemy = function(controller) {
  this.controller = controller;
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES['enemy_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES['enemy_normal.png']);
};

Enemy.prototype.tick = function(t) {
  this.controller.tick(t);
  if (KB.keyPressed('X')) {
    Explode(this.sprite.pos(), 5);
  }
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
