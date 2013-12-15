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
  this.stage = new Stage(WIDTH, HEIGHT);
};

MainMenu.prototype.tick = function() {
  if (KB.keyPressed(Keys.ENTER)) {
    GameState.push(new PlayState());
  }
};

MainMenu.prototype.enter = function() {
  this.stage.lighting().ambient = new geom.Vec3(1, 1, 1);
  var text = new Sprite(RENDERER.gl());
  text.setTexture(Texture.fromCanvas(RENDERER.gl(), {width: 256, height: 32}, function(ctx) {
    ctx.fillStyle = '#fff';
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SAVE YOURSELF', 128, 16);
  }));
  this.stage.addSprite(text);
};

var DeathState = function(play) {
  this.play = play;
  this.gameOver = this.play.game.killers.length != 0;
  this.stage = play.stage;
  this.t = 0;
  this.delayTime = 2;
};

DeathState.prototype.tick = function(t) {
  this.t += t;

  var a = this.t / this.delayTime;
  a = Math.abs(Math.sin(a * 2 * Math.PI));
  this.stage.lighting().lights[1] = new Light(
      new geom.Vec3(20 * a, 200 * a, 100),
      new geom.Vec3(0.5 + 100 * a, 0.5 + 10 * a, 0.5 + 10 * a));
  var fx = this.play.game.fx;
  for (var i = 0; i < fx.length; i++) {
    if (fx[i]) {
      if (fx[i].dead) {
        if (fx[i].sprite) this.stage.removeSprite(fx[i].sprite);
        fx[i] = null;
      } else {
        fx[i].tick(t);
      }
    }
  }
  if (this.t >= this.delayTime) {
    GameState.pop();
    if (this.gameOver) {
      GameState.pop();
    } else {
      this.play.resetFromDeath();
    }
  }
};

DeathState.prototype.enter = function() {
  this.text = new Sprite(RENDERER.gl());
  if (this.gameOver) {
    this.text.setTexture(RESOURCES['txt_broken.png']);
  } else {
    this.text.setTexture(RESOURCES['txt_fractured.png']);
  }
  this.text.setPos(0, 0, 50);
  this.text.setScale(3, 3);
  BreakSprite(this.text);
  this.stage.addSprite(this.text);
};

DeathState.prototype.exit = function() {
  this.text.stage.removeSprite(this.text);
};

var PlayState = function() {
  this.stage = new Stage(WIDTH, HEIGHT);
  this.seed = 42;
  this.recordings = [];
  this.game = new Game(this.seed, this.recordings, this.stage);
};

PlayState.prototype.enter = function() {
  this.game.enter();
};

PlayState.prototype.resetFromDeath = function() {
  this.stage.clear();
  this.game = new Game(this.seed, this.recordings, this.stage);
  this.game.enter();
};

PlayState.prototype.tick = function(t) {
  var anyDead = this.game.players.some(function(p) { return p && p.dead; });
  if (anyDead) {
    this.recordings.unshift(this.game.players[0].getRecording());
    this.restoreText && this.restoreText.stage.removeSprite(this.restoreText);
    this.restoreText = null;
    GameState.push(new DeathState(this));
    return;
  }
  this.game.tick(t);
};

var Game = function(seed, recordings, stage) {
  this.stage = stage;
  GAME = this;
  this.detRand = new MT(seed);
  this.players = [new Player()];
  for (var i = 0; i < recordings.length; i++) {
    this.players.push(new Player(recordings[i]));
  }
  this.killers = this.players.map(function(p) { return p.wasKilledBy; })
    .filter(isDef);
  this.enemies = [];
  this.bullets = [];
  this.fx = [];
};

Game.prototype.spawn = function(kind, pos) {
  this.id++;
  if (kind == 'homing') {
    this.addEnemy(new Enemy(
          pos,
          new HomingController(this.players),
          this.id));
  } else if (kind == 'spinner') {
    var spinner = new Spinner(pos, this.id);
    spinner.sprite.setScale(0.01, 0.01);
    spinner.tick(0);
    var timed = {
      game: this,
      spinner: spinner,
      sprite: spinner.sprite,
      left: 1,
      tick: function(t) {
        this.left -= t;
        var alpha = Math.max(0.01, Math.pow(this.left, 2));
        this.sprite.setScale(1 - alpha, 1 - alpha);
        if (this.left <= 0) {
          this.dead = true;
          this.sprite.setScale(1, 1);
          this.sprite.stage.removeSprite(this.sprite);
          this.sprite = null;
          this.game.addEnemy(this.spinner);
        }
      }
    };
    this.addFx(timed);
  }
};

Game.prototype.enter = function() {
  this.t = 0;
  this.id = 0;
  for (var i = 0; i < this.players.length; i++) {
    this.stage.addSprite(this.players[i].sprite);
  }
  for (var i = 0; i < this.enemies.length; i++) {
    this.stage.addSprite(this.enemies[i].sprite);
  }
  this.stage.lighting().lights[0] = new Light(
      new geom.Vec3(0, 0, 20), new geom.Vec3(1.8, 1.8, 1.8));
  this.stage.lighting().lights[3] = Light.globalLight(
      new geom.Vec3(1, 1, -1), new geom.Vec3(0.8, 0.8, 0.8));

  for (var i = 0; i < 30; i++) {
    var x = this.detRand.nextSign();
    x *= this.detRand.nextFloat(100, 300);
    var y = this.detRand.nextSign();
    y *= this.detRand.nextFloat(100, 200);
    this.spawn('homing', new geom.Vec3(x, y, 0));
  }
  for (var i = 30; i < 40; i++) {
    var x = this.detRand.nextSign();
    x *= this.detRand.nextFloat(100, 300);
    var y = this.detRand.nextSign();
    y *= this.detRand.nextFloat(100, 200);
    this.spawn('spinner', new geom.Vec3(x, y, 0));
  }
};

Game.prototype.removeBulletsFrom = function(shooter) {
  for (var i = 0; i < this.bullets.length; i++) {
    if (this.bullets[i] && this.bullets[i].source == shooter.id) {
      var bullet = this.bullets[i];
      this.bullets[i] = null;
      bullet.dead = true;
      bullet.sprite.colorFilter = new geom.Vec3(-0.5, -0.5, -0.5);

      var timed = {
        sp: new geom.Vec3(bullet.sprite.pos()),
        ep: new geom.Vec3(shooter.sprite.pos()),

        left: 0.3,
        sprite: bullet.sprite,
        tick: function(t) {
          this.left -= t;
          var alpha = Math.sqrt(this.left / 0.3);
          this.sprite.setPos(
              alpha * this.sp.x + (1 - alpha) * this.ep.x,
              alpha * this.sp.y + (1 - alpha) * this.ep.y,
              alpha * this.sp.z + (1 - alpha) * this.ep.z);
          this.sprite.setScale(alpha, alpha);
          if (this.left <= 0) {
            this.dead = true;
            this.sprite.stage.removeSprite(this.sprite);
          }
        }
      };
      GAME.addFx(timed);
    }
  }
};

Game.prototype.killerIsDead = function(killer) {
  for (var i = this.killers.length - 1; i >= 0; i--) {
    if (this.killers[i] == killer.id) {
      this.killers.splice(i, 1);
    }
  }
  if (this.killers.length == 0) {
    this.restoreNextFrame = killer;
  }
};

Game.prototype.mergePlayer = function(player) {
  var index = this.players.indexOf(player);
  if (index == 0) throw 'Bad bad bad';
  this.players[index] = null;
  player.dead = true;
  var sp = new geom.Vec3(player.sprite.pos());
  var p0 = this.players[0];
  var timed = {
    left: 1,
    sprite: player.sprite,
    tick: function(t) {
      this.left -= t;
      var alpha = Math.sqrt(this.left);
      var ep = p0.sprite.pos();
      player.sprite.setPos(
          alpha * sp.x + (1 - alpha) * ep.x,
          alpha * sp.y + (1 - alpha) * ep.y,
          alpha * sp.z + (1 - alpha) * ep.z);
      if (this.left <= 0) {
        this.dead = true;
        this.sprite.stage.removeSprite(this.sprite);
      }
    }
  };
  GAME.addFx(timed);
};

Game.prototype.tick = function(t) {
  this.t += t;
  if (this.restoreNextFrame) {
    this.restoreNextFrame = false;
    this.restoreText = new Sprite(RENDERER.gl());
    this.restoreText.setTexture(RESOURCES['txt_restored.png']);
    this.restoreText.setScale(3, 3);
    var timed = {
      left: 2,
      sprite: this.restoreText,
      tick: function(t) {
        this.left -= t;
        if (!this.sprite.stage) {
          this.dead = true;
          return;
        }
        this.sprite.visible = 3 != (Math.floor(this.left * 8) % 4);
        if (this.left <= 0) {
          this.dead = true;
          this.sprite.stage.removeSprite(this.sprite);
        }
      }
    };
    this.stage.addSprite(this.restoreText);
    this.addFx(timed);
  }
  this.collidePlayersWithEnemies();

  for (var i = 0; i < this.bullets.length; i++) {
    if (this.bullets[i]) {
      if (this.bullets[i].dead) {
        this.stage.removeSprite(this.bullets[i].sprite);
        this.bullets[i] = null;
      } else {
        this.bullets[i].tick(t);
        if (this.bullets[i].friendly) {
          var deaths = this.collideBullet(this.bullets[i], this.enemies);
          for (var j = 0; j < deaths.length; j++) {
            deaths[j].kill();
          }
        } else {
          var deaths = this.collideBullet(this.bullets[i], this.players);
          for (var j = 0; j < deaths.length; j++) {
            deaths[j].kill(this.bullets[i].source);
          }
        }
      }
    }
  }

  this.stage.lighting().lights[0].pos.x = this.players[0].sprite.pos().x;
  this.stage.lighting().lights[0].pos.y = this.players[0].sprite.pos().y;
  for (var i = 0; i < this.players.length; i++) {
    if (this.players[i] && !this.players[i].dead) {
      this.players[i].tick(t);
    }
  }
  for (var i = 0; i < this.enemies.length; i++) {
    var enemy = this.enemies[i];
    if (enemy) {
      if (!enemy.dead) {
        enemy.tick(t);
      }
    }
  }

  for (var i = 0; i < this.fx.length; i++) {
    if (this.fx[i]) {
      if (this.fx[i].dead) {
        if (this.fx[i].sprite) this.stage.removeSprite(this.fx[i].sprite);
        this.fx[i] = null;
      } else {
        this.fx[i].tick(t);
      }
    }
  }

  var justPassed = 0;
  if (Math.floor(this.t) != Math.floor(this.t - t)) {
    justPassed = Math.floor(this.t);
  }
  if (justPassed == 10 || (justPassed > 10 && justPassed % 5 == 0)) {
    for (var i = 0; i < 20; i++) {
      var theta = this.detRand.nextFloat(Math.PI * 2);
      this.spawn('homing',
          new geom.Vec2(WIDTH * Math.cos(theta), HEIGHT * Math.sin(theta)));
    }
  }
  if (justPassed >= 8 && justPassed % 4 == 0) {
    for (var i = 0; i < 2; i++) {
      var x = this.detRand.nextInt(-350, 350);
      var y = this.detRand.nextInt(-250, 250);
      this.spawn('spinner', new geom.Vec2(x, y));
    }
  }
};

Game.prototype.collidePlayersWithEnemies = function() {
  var pAabb = new geom.AABB();
  var eAabb = new geom.AABB();
  var playersToKill = [];
  var enemiesToKill = [];
  for (var i = 0; i < this.players.length; i++) {
    var player = this.players[i];
    if (!player || player.dead) continue;
    pAabb.m_fromCenterAndSize(player.sprite.pos(), player.sprite.size());
    for (var j = 0; j < this.enemies.length; j++) {
      var enemy = this.enemies[j];
      if (!enemy || enemy.dead) continue;
      eAabb.m_fromCenterAndSize(enemy.sprite.pos(), enemy.sprite.size());
      if (pAabb.overlaps(eAabb)) {
        playersToKill.push([player, enemy.id]);
        var eIndex = enemiesToKill.indexOf(enemy);
        if (eIndex == -1) {
          enemiesToKill.push(enemy);
        }
      }
    }
  }

  for (var i = 0; i < enemiesToKill.length; i++) {
    enemiesToKill[i].kill();
  }
  for (var i = 0; i < playersToKill.length; i++) {
    playersToKill[i][0].kill(playersToKill[i][1]);
  }
};

Game.prototype.collideBullet = function(bullet, against) {
  var hit = [];
  var bAabb = geom.AABB.fromCenterAndSize(
      bullet.sprite.pos(), bullet.sprite.size());
  var aabb = new geom.AABB(0,0,0,0);
  for (var i = 0; i < against.length; i++) {
    var target = against[i];
    if (!target || target.dead) continue;
    aabb.m_fromCenterAndSize(target.sprite.pos(), target.sprite.size());
    if (aabb.overlaps(bAabb)) {
      bullet.dead = true;
      hit.push(target);
    }
  }
  return hit;
};

Game.prototype.addEnemy = function(enemy) {
  if (this.killers.indexOf(enemy.id) != -1) {
    enemy.setKiller();
  }
  this.stage.addSprite(enemy.sprite);
  for (var i = 0; i < this.enemies.length; i++) {
    if (!this.enemies[i]) {
      this.enemies[i] = enemy;
      return;
    }
  }
  this.enemies.push(enemy);
};

Game.prototype.addBullet = function(bullet) {
  this.stage.addSprite(bullet.sprite);
  for (var i = 0; i < this.bullets.length; i++) {
    if (!this.bullets[i]) {
      this.bullets[i] = bullet;
      return;
    }
  }
  this.bullets.push(bullet);
};

Game.prototype.addFx = function(fx) {
  this.stage.addSprite(fx.sprite);
  for (var i = 0; i < this.fx.length; i++) {
    if (!this.fx[i]) {
      this.fx[i] = fx;
      return;
    }
  }
  this.fx.push(fx);
};

var ControllerRecorder = function(controller) {
  this.c = controller;
  this.t = 0;
  this.es = [{t:0, d:0}];
};

ControllerRecorder.prototype.get = function() {
  return this.es.concat({t:this.t, d:1<<5});
};

ControllerRecorder.prototype.tick = function(t) {
  this.c.tick(t);
  var d = 0;
  if (this.c.left()) {
    d |= 1 << 0;
  }
  if (this.c.right()) {
    d |= 1 << 1;
  }
  if (this.c.up()) {
    d |= 1 << 2;
  }
  if (this.c.down()) {
    d |= 1 << 3;
  }
  if (this.c.shoot()) {
    d |= 1 << 4;
  }
  if (d != this.es[this.es.length - 1].d) {
    this.es.push({t:this.t, d:d});
  }
  this.t += t;
};

ControllerRecorder.prototype.left = function() {
  return this.c.left();
};

ControllerRecorder.prototype.right = function() {
  return this.c.right();
};

ControllerRecorder.prototype.up = function() {
  return this.c.up();
};

ControllerRecorder.prototype.down = function() {
  return this.c.down();
};

ControllerRecorder.prototype.shoot = function() {
  return this.c.shoot();
};

ControllerRecorder.prototype.merge = function() {
  return this.c.merge();
};

var PlaybackController = function(es) {
  this.es = es;
  this.ei = -1;
  this.t = 0;

  this.dleft = this.dright = this.dup = this.ddown = this.dshoot = false;
};

PlaybackController.prototype.tick = function(t) {
  this.t += t;
  if (this.ei + 1 < this.es.length && this.es[this.ei + 1].t < this.t) {
    this.ei++;
    var d = (this.es[this.ei] && this.es[this.ei].d) || 0;
    this.dleft = d & (1 << 0);
    this.dright = d & (1 << 1);
    this.dup = d & (1 << 2);
    this.ddown = d & (1 << 3);
    this.dshoot = d & (1 << 4);
    this.dmerge = this.ei == this.es.length - 1;
  }
};
PlaybackController.prototype.left = function() {return this.dleft;};
PlaybackController.prototype.right = function() {return this.dright;};
PlaybackController.prototype.up = function() {return this.dup;};
PlaybackController.prototype.down = function() {return this.ddown;};
PlaybackController.prototype.shoot = function() {return this.dshoot;};
PlaybackController.prototype.merge = function() {return this.dmerge;};

var PlayerKbController = function() {
  this.shotTimer = 0;
};

PlayerKbController.prototype.tick = function(t) {
  this.shotTimer -= t;
  if (this.didShoot) {
    this.didShoot = false;
    this.shotTimer = 0.13;
  }
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
  if (this.didShoot || this.shotTimer <= 0) {
    this.didShoot = true;
    return true;
  }
  return false;
};

PlayerKbController.prototype.merge = function() { return false; };

var HomingController = function(targets) {
  this.targets = targets;
  this.ti = this.targets.length - 1;
};

HomingController.prototype.tick = function(t) {
  while (this.ti >= 0 && (!this.target || this.target.dead)) {
    this.target = this.targets[this.ti];
    this.ti--;
  }
  var mePos = this.me.sprite.pos().toVec2();
  var targetPos = this.target.sprite.pos().toVec2();

  var thetaToTarget = targetPos.minus(mePos).theta();
  var myTheta = this.me.vel.theta();
  var thetaDiff = thetaToTarget - myTheta;
  if (thetaDiff > Math.PI || (thetaDiff < 0 && thetaDiff > -Math.PI)) {
    myTheta -= t;
  } else {
    myTheta += t;
  }
  this.me.vel.x = 100 * Math.cos(myTheta);
  this.me.vel.y = 100 * Math.sin(myTheta);
};

var Bullet = function(name, opts) {
  this.scale = opts.scale || 1;
  this.vel = opts.vel;
  this.friendly = !!opts.friendly;
  this.source = opts.source;

  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES[name + '_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES[name + '_normal.png']);
  this.sprite.setPos(opts.pos.x, opts.pos.y, opts.pos.z || -1);
  this.sprite.setRotation(
      new geom.Vec3(0, 0, 1),
      this.vel.toVec2().theta());
  if (this.scale != 1) {
    this.sprite.setScale(this.scale, this.scale);
  }
};

Bullet.prototype.tick = function(t) {
  var p = this.sprite.pos();
  if (p.x < -WIDTH / 2 || p.x > WIDTH / 2 ||
      p.y < -HEIGHT / 2 || p.y > HEIGHT / 2) {
    this.dead = true;
    return;
  }
  this.sprite.addPos(this.vel.x * t, this.vel.y * t);
};

var Particle = function(nameOrTextures, opts) {
  this.sprite = new Sprite(RENDERER.gl());
  if (nameOrTextures.diffuse) {
    var textures = nameOrTextures;
    this.sprite.setTexture(textures.diffuse);
    this.sprite.setNormalMap(textures.normal);
  } else {
    var name = nameOrTextures;
    this.sprite.setTexture(RESOURCES[name + '_diffuse.png']);
    this.sprite.setNormalMap(RESOURCES[name + '_normal.png']);
  }
  this.sprite.setPos(opts.pos.x, opts.pos.y, opts.pos.z || -1);
  this.vel = opts.vel;
  this.rotAxis = new geom.Vec3(
      this.vel.y, -this.vel.x, randFlt(-0.5, 0.5)).normalize();
  this.rotAngle = 0;
  this.scale = this.sprite.scale();
  if (isDef(opts.scale)) {
    if (opts.scale.x) {
      this.scale = opts.scale;
    } else {
      this.scale = new geom.Vec2(opts.scale, opts.scale);
    }
    this.sprite.setScale(this.scale.x, this.scale.y);
  }
  this.life = this.duration = opts.duration || 2;
  this.shrink = isDef(opts.shrink) ? opts.shrink : true;
};

Particle.prototype.tick = function(t) {
  this.life -= t;
  if (this.life < 0) {
    this.dead = true;
    return;
  }
  this.rotAngle += t * this.vel.mag() / 10;
  this.sprite.addPos(this.vel.x * t, this.vel.y * t);
  this.sprite.setRotation(this.rotAxis, this.rotAngle);

  var alpha = this.life / this.duration;
  if (this.shrink) {
    this.sprite.setScale(this.scale.x * alpha, this.scale.y * alpha);
  }
};

var BreakSprite = function(sprite) {
  if (sprite.axis) throw 'Cannae break rotated sprites';
  var center = sprite.pos();
  var dims = sprite.size();
  var scale = sprite.scale();
  var hw = dims.x / 2 / scale.x;
  var hh = dims.y / 2 / scale.y;
  for (var y = -hh; y < hh; y += 8) {
    for (var x = -hw; x < hw; x += 8) {
      var textures = {
        diffuse: Texture.sub(
            sprite.texture, new geom.Vec2(hw + x, hh + y),
            new geom.Vec2(8, 8)),
        normal: Texture.sub(
            sprite.normalMap, new geom.Vec2(hw + x, hh + y),
            new geom.Vec2(8, 8)),
      };

      GAME.addFx(new Particle(textures, {
        life: randFlt(1.5, 2),
        pos: new geom.Vec3(center.x + x * scale.x, center.y - y * scale.y, center.z),
        vel: new geom.Vec3(x, -y, 0).normalize().times(randFlt(15, 27)),
        scale: sprite.scale(),
        shrink: false,
      }));
    }
  }
};

var Explode = function(where, size) {
  for (var i = 0; i < size; i++) {
    var dx = randFlt(-size * 2, size * 2);
    var dy = randFlt(-size * 2, size * 2);
    var len = Math.sqrt(dx * dx + dy * dy);
    GAME.addFx(new Particle('smoke', {
      life: randFlt(1.5, 2),
      pos: new geom.Vec3(where.x + dx / size, where.y + dy / size, -1),
      vel: new geom.Vec3(5 * dx, 5 * dy, 0),
      scale: Math.max(1, Math.log(size) / Math.log(10)),
    }));
  }
};

var Spinner = function(pos, id) {
  this.id = id;
  this.shotDelay = 1.3;
  this.theta = (id * 0xf3502) % (2 * Math.PI);
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES['spinner_diffuse.png']);
  //this.sprite.setNormalMap(RESOURCES['enemy_normal.png']);
  this.sprite.setPos(pos.x, pos.y, pos.z);
  this.sprite.beat = id % 4;
};

Spinner.prototype.setKiller = function() {
  this.killer = true;
  this.sprite.colorFilter = new geom.Vec3(0.2, 0.2, 1);
};

Spinner.prototype.kill = function() {
  if (!this.dead) {
    this.dead = true;
    Explode(this.sprite.pos(), randInt(15, 25));
    this.sprite.stage.removeSprite(this.sprite);
    if (this.killer) {
      GAME.killerIsDead(this);
    }
    GAME.removeBulletsFrom(this);
  }
};

Spinner.prototype.tick = function(t) {
  this.theta += t;
  this.theta %= (2 * Math.PI);
  this.sprite.setRotation(
      new geom.Vec3(Math.cos(this.theta), Math.sin(this.theta), 10).normalize(),
      this.theta);
  this.shotDelay -= t;
  if (this.shotDelay < 0) {
    this.shotDelay += 1.3;
    var size = this.sprite.size();
    for (var i = 0; i < 3; i++) {
      var delta = new geom.Vec3(
          size.x * Math.cos(this.theta + i * 2 * Math.PI / 3),
          size.y * Math.sin(this.theta + i * 2 * Math.PI / 3),
          0);
      GAME.addBullet(new Bullet('rbullet', {
        scale: 2,
        pos: delta.plus(this.sprite.pos()),
        vel: delta.normalize().times(80),
        friendly: false,
        source: this.id,
      }));
    }
  }
};

var Enemy = function(pos, controller, id) {
  this.id = id;
  this.vel = new geom.Vec2(0, 0);
  this.inertia = 0.2;
  this.controller = controller;
  this.controller.me = this;
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES['enemy_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES['enemy_normal.png']);
  this.sprite.setPos(pos.x, pos.y, pos.z);
  this.sprite.beat = id % 4;
};

Enemy.prototype.setKiller = function() {
  this.killer = true;
  this.sprite.colorFilter = new geom.Vec3(0.2, 0.2, 1);
};

Enemy.prototype.kill = function() {
  if (!this.dead) {
    this.dead = true;
    Explode(this.sprite.pos(), randInt(4, 10));
    this.sprite.stage.removeSprite(this.sprite);
    if (this.killer) {
      GAME.killerIsDead(this);
    }
  }
};

Enemy.prototype.tick = function(t) {
  this.controller.tick(t);
  var force = new geom.Vec2(0, 0);
  this.sprite.addPos(this.vel.x * t, this.vel.y * t);
};

var Player = function(opt_recording) {
  if (opt_recording) {
    this.controller = new PlaybackController(opt_recording.moves);
    this.wasKilledBy = opt_recording.killedBy;
  } else {
    this.primary = true;
    this.controller = new PlayerKbController();
  }
  this.controller = new ControllerRecorder(this.controller);
  this.sprite = new Sprite(RENDERER.gl());
  this.sprite.setTexture(RESOURCES['player_diffuse.png']);
  this.sprite.setNormalMap(RESOURCES['player_normal.png']);
  this.shotDir = new geom.Vec2(1, 0);
  this.targetShotDir = new geom.Vec2(1, 0);
};

Player.prototype.getRecording = function(source) {
  return {
    moves: this.controller.get(),
    killedBy: this.killedBy,
  };
};

Player.prototype.kill = function(source) {
  if (!this.dead) {
    this.dead = true;
    this.killedBy = source;
    Explode(this.sprite.pos(), 20);
    this.sprite.stage.removeSprite(this.sprite);
  }
};

Player.prototype.tick = function(t) {
  this.controller.tick(t);
  var side = false;
  var vert = false;
  if (this.controller.left()) {
    side = true;
    this.targetShotDir.x = -1;
    this.sprite.addPos(-100 * t, 0);
  }
  if (this.controller.right()) {
    side = true;
    this.targetShotDir.x = 1;
    this.sprite.addPos(100 * t, 0);
  }
  if (this.controller.up()) {
    vert = true;
    this.targetShotDir.y = 1;
    this.sprite.addPos(0, 100 * t);
  }
  if (this.controller.down()) {
    vert = true;
    this.targetShotDir.y = -1;
    this.sprite.addPos(0, -100 * t);
  }
  if (side != vert) {
    if (!side) this.targetShotDir.x = 0;
    if (!vert) this.targetShotDir.y = 0;
  }

  var targetTheta = this.targetShotDir.theta();
  var myTheta = this.shotDir.theta();
  var thetaDiff = targetTheta - myTheta;
  if (thetaDiff > Math.PI || (thetaDiff < 0 && thetaDiff > -Math.PI)) {
    myTheta -= Math.min(Math.abs(thetaDiff), 7 * t);
  } else {
    myTheta += Math.min(Math.abs(thetaDiff), 7 * t);
  }
  this.shotDir.x = Math.cos(myTheta);
  this.shotDir.y = Math.sin(myTheta);

  if (this.controller.shoot()) {
    GAME.addBullet(new Bullet('bullet', {
      pos: new geom.Vec3(this.sprite.pos()),
      vel: this.shotDir.toVec3().times(290),
      friendly: true,
      scale: 1.5,
      source: this.id,
    }));
  }
  if (KB.keyPressed('Q')) {
    this.kill();
  }
  if (this.controller.merge()) {
    GAME.mergePlayer(this);
  }
};

WIDTH = 800;
HEIGHT = 600;

var init = function() {
  var mainElem = document.getElementById('game');
  var renderer = new Renderer3d(mainElem, WIDTH, HEIGHT);
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
        GameState.render(renderer);
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
