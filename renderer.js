(function(exports) {

var guid = 0;

function putDefault(obj, key, dflt) {
  var v = obj[key];
  if (v === undefined) {
    v = obj[key] = dflt;
  }
  return v;
};

function MatrixStack() {
  this.stack_ = [geom.Mat4.ident()];
};

MatrixStack.prototype.scaleVec = function(v) {
  return this.stack_[this.stack_.length - 1].scaleVec(v);
};

MatrixStack.prototype.m_scaleVec = function(v) {
  return this.stack_[this.stack_.length - 1].m_scaleVec(v);
};

MatrixStack.prototype.top = function() {
  return this.stack_[this.stack_.length - 1].clone();
};

MatrixStack.prototype.x = function(o) {
  var end = this.stack_.length - 1;
  this.stack_[end] = this.stack_[end].mult(o);
  return this;
};

MatrixStack.prototype.push = function(opt_mtrx) {
  this.stack_.push(opt_mtrx || this.top());
};

MatrixStack.prototype.pop = function() {
  this.stack_.pop();
};


function Batch(key, stage, gl) {
  this.stage = stage;
  this.key = key;
  this.gl_ = gl;
  this.size = 16;
  this.sprites_ = [];
  this.reset();
};
Batch.getKey = function(sprite) {
  if (sprite.mtl) return '';
  var texture1 = sprite.texture.name;
  var texture2 = sprite.normalMap.name;
  if (texture1 == texture2) return texture1;
  return texture1 + ' ' + texture2;
};

Batch.KINDS = {
  position: {size: 3},
  texCord: {size: 2},
  norCord: {size: 2},
  colorFilter: {size: 3},
};

Batch.ELEM_SIZE =
  3 +  // vec3: position
  2 +  // vec2: texCord
  2 +  // vec2: norCord
  3;   // vec3: colorFilter

Batch.prototype.addSprite = function(sprite) {
  this.diffuseTexture = sprite.texture.texture;
  this.normalTexture = sprite.normalMap.texture;
  this.sprites_.push(sprite);
  if (this.size < this.sprites_.length) {
    this.size = Math.floor(this.size * 1.5);
    this.reset();
  }
};

Batch.prototype.removeSprite = function(sprite) {
  var index = this.sprites_.indexOf(sprite);
  if (index == -1) throw 'Sprite not a child!';
  this.sprites_[index] = this.sprites_[this.sprites_.length - 1];
  this.sprites_.pop();
};

Batch.prototype.reset = function() {
  var gl = this.gl_;
  this.buffer = new Float32Array(this.size * Batch.ELEM_SIZE * 4);
  this.elements = new Uint16Array(this.size * 6);
  // TODO: cleanup old buffers to stop leaks. Like woah.
  this.verBuffer = gl.createBuffer();
  this.eleBuffer = gl.createBuffer();

  this.offsets = {};
  var offset = 0;
  for (var kind in Batch.KINDS) {
    this.offsets[kind] = offset;
    offset += Batch.KINDS[kind].size;
  }
  this.steps = Batch.ELEM_SIZE;

  for (var i = 0; i < this.size; i++) {
    this.elements[i * 6 + 0] = i * 4 + UNIT_SQUARE_ELEMS[0];
    this.elements[i * 6 + 1] = i * 4 + UNIT_SQUARE_ELEMS[1];
    this.elements[i * 6 + 2] = i * 4 + UNIT_SQUARE_ELEMS[2];
    this.elements[i * 6 + 3] = i * 4 + UNIT_SQUARE_ELEMS[3];
    this.elements[i * 6 + 4] = i * 4 + UNIT_SQUARE_ELEMS[4];
    this.elements[i * 6 + 5] = i * 4 + UNIT_SQUARE_ELEMS[5];
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.eleBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.elements, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.verBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, this.buffer, gl.DYNAMIC_DRAW);
};

Batch.prototype.draw = function(mtx, prog) {
  var gl = this.gl_;
  this.fillBuffers(mtx);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.verBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.buffer)
  for (var kind in this.offsets) {
    var offset = this.offsets[kind];
    var kindStruct = Batch.KINDS[kind];
    gl.vertexAttribPointer(
        prog.getAttribLocation(kind),
        kindStruct.size,
        gl.FLOAT,
        false,
        this.steps * Float32Array.BYTES_PER_ELEMENT,
        offset * Float32Array.BYTES_PER_ELEMENT);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.eleBuffer);

  gl.drawElements(
      gl.TRIANGLES,
      this.sprites_.length * 6,
      gl.UNSIGNED_SHORT,
      0);
};

Batch.prototype.fillBuffers = function(mtx) {
  var c0 = new geom.Vec3(0,0,0);
  var c1 = new geom.Vec3(0,0,0);
  var c2 = new geom.Vec3(0,0,0);
  var c3 = new geom.Vec3(0,0,0);
  var v0 = new geom.Vec3(0,0,0);
  for (var i = 0; i < this.sprites_.length; i++) {
    var sprite = this.sprites_[i];
    var cf = sprite.colorFilter || v0;
    mtx.push();
      mtx.x(geom.Mat4.translate(sprite.pos_.x, sprite.pos_.y, sprite.pos_.z));
      if (sprite.axis_) {
        mtx.x(geom.Mat4.rotate(sprite.axis_, sprite.angle_));
      }
      if (sprite.w_ != 1 || sprite.h_ != 1) {
        mtx.x(geom.Mat4.diag(sprite.w_, sprite.h_, 1));
      }
      var b = Math.sin(Math.PI * this.stage.beat[sprite.beat || 0]) / 5;
      c0.x = -0.5 - b; c0.y =  0.5 + b; c0.z = 0;
      c1.x =  0.5 + b; c1.y =  0.5 + b; c1.z = 0;
      c2.x = -0.5 - b; c2.y = -0.5 - b; c2.z = 0;
      c3.x =  0.5 + b; c3.y = -0.5 - b; c3.z = 0;
      mtx.m_scaleVec(c0); mtx.m_scaleVec(c1);
      mtx.m_scaleVec(c2); mtx.m_scaleVec(c3);
      var po = this.offsets['position'] + i * this.steps * 4;
      var to = this.offsets['texCord'] + i * this.steps * 4;
      var no = this.offsets['norCord'] + i * this.steps * 4;
      var co = this.offsets['colorFilter'] + i * this.steps * 4;
      var datl = sprite.texture.atlas || {x: 0, y: 0, w: 1, h: 1};
      var natl = sprite.normalMap.atlas || {x: 0, y: 0, w: 1, h: 1};
      this.buffer[po + 0] = c0.x; this.buffer[po + 1] = c0.y; this.buffer[po + 2] = c0.z;
      this.buffer[to + 0] = datl.x; this.buffer[to + 1] = datl.y;
      this.buffer[no + 0] = natl.x; this.buffer[no + 1] = natl.y;
      this.buffer[co + 0] = cf.x; this.buffer[co + 1] = cf.y; this.buffer[co + 2] = cf.z;

      po += this.steps; to += this.steps; no += this.steps; co += this.steps;
      this.buffer[po + 0] = c1.x; this.buffer[po + 1] = c1.y; this.buffer[po + 2] = c1.z;
      this.buffer[to + 0] = datl.x + datl.w; this.buffer[to + 1] = datl.y;
      this.buffer[no + 0] = natl.x + natl.w; this.buffer[no + 1] = natl.y;
      this.buffer[co + 0] = cf.x; this.buffer[co + 1] = cf.y; this.buffer[co + 2] = cf.z;

      po += this.steps; to += this.steps; no += this.steps; co += this.steps;
      this.buffer[po + 0] = c2.x; this.buffer[po + 1] = c2.y; this.buffer[po + 2] = c2.z;
      this.buffer[to + 0] = datl.x; this.buffer[to + 1] = datl.y + datl.h;
      this.buffer[no + 0] = natl.x; this.buffer[no + 1] = natl.y + natl.h;
      this.buffer[co + 0] = cf.x; this.buffer[co + 1] = cf.y; this.buffer[co + 2] = cf.z;

      po += this.steps; to += this.steps; no += this.steps; co += this.steps;
      this.buffer[po + 0] = c3.x; this.buffer[po + 1] = c3.y; this.buffer[po + 2] = c3.z;
      this.buffer[to + 0] = datl.x + datl.w; this.buffer[to + 1] = datl.y + datl.h;
      this.buffer[no + 0] = natl.x + natl.h; this.buffer[no + 1] = natl.y + natl.h;
      this.buffer[co + 0] = cf.x; this.buffer[co + 1] = cf.y; this.buffer[co + 2] = cf.z;

    mtx.pop();
  }
};


function Stage(width, height) {
  this.beat = [1,1,1,1];
  this.modelToCamera_ = new MatrixStack();
  this.cameraPos_ = new geom.Vec3(0, 0, 10);
  this.cameraTarget_ = new geom.Vec3(0, 0, 0);
  this.perspective_ = geom.Mat4.ortho(
      -width / 2, width / 2, -height / 2, height / 2,
      -100, 100);

  this.lighting_ = new Lighting(new geom.Vec3(0.1, 0.1, 0.1), 1 / (70 * 70));

  this.batches_ = [];
};

Stage.prototype.clear = function() {
  this.batches_ = [];
  this.lighting_ = new Lighting(new geom.Vec3(0.1, 0.1, 0.1), 1 / (70 * 70));
};

Stage.prototype.tick = function(t) {
  this.lighting_.tick(t);
  this.beat[0] += t;
  this.beat[1] += t / 3;
  this.beat[2] += t / 5;
  this.beat[3] += t / 7;
  this.beat[0] %= 1;
  this.beat[1] %= 1;
  this.beat[2] %= 1;
  this.beat[3] %= 1;
};

Stage.prototype.lighting = function() {
  return this.lighting_;
};

Stage.prototype.addSprite = function(sprite) {
  sprite.stage = this;
  var batchKey = Batch.getKey(sprite);
  var batch;
  for (var i = 0; i < this.batches_.length; i++) {
    if (this.batches_[i].key == batchKey) {
      batch = this.batches_[i];
      break;
    }
  }
  if (!batch) {
    batch = new Batch(batchKey, this, sprite.gl_);
    this.batches_.push(batch);
  }
  batch.addSprite(sprite);
};

Stage.prototype.removeSprite = function(sprite) {
  var batchKey = Batch.getKey(sprite);
  var batch;
  for (var i = 0; i < this.batches_.length; i++) {
    if (this.batches_[i].key == batchKey) {
      batch = this.batches_[i];
      break;
    }
  }
  if (!batch) throw 'Sprite not a child!';
  batch.removeSprite(sprite);
};



function Renderer3d(attachTo, width, height) {
  this.canvasElem_ = document.createElement('canvas');
  this.canvasElem_.setAttribute('width', width);
  this.canvasElem_.setAttribute('height', height);
  attachTo.appendChild(this.canvasElem_);

  this.gl_ = this.canvasElem_.getContext('webgl');
  if (!this.gl_) {
    this.gl_ = this.canvasElem_.getContext('experimental-webgl');
  }
  if (!this.gl_) {
    alert('gl init failed');
  }
  this.w_ = this.canvasElem_.width;
  this.h_ = this.canvasElem_.height;

  this.shaders_ = new GameShaders();
  this.shaders_.load(this);
}

Renderer3d.prototype.getElement = function() {
  return this.canvasElem_;
};

Renderer3d.prototype.width = function() {
  return this.w_;
};

Renderer3d.prototype.height = function() {
  return this.h_;
};

Renderer3d.prototype.gl = function() {
  return this.gl_;
};

Renderer3d.prototype.lighting = function() {
  return this.stage_.lighting_;
};

Renderer3d.prototype.modelToCamera = function() {
  return this.stage_.modelToCamera_;
};

Renderer3d.prototype.render = function(stage) {
  this.stage_ = stage;
  var gl = this.gl_;
  gl.clearColor(0, 0, 0, 1);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.enable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.clear(gl.COLOR_BUFFER_BIT);

  var cPos = this.stage_.cameraPos_;
  var cTar = this.stage_.cameraTarget_;
  var camera = geom.Mat4.lookAt(
      cPos, cTar, new geom.Vec3(0, 1, 0));

  this.modelToCamera().push(camera);
    this.renderSprites_();
  this.modelToCamera().pop();
};

Renderer3d.prototype.renderSprites_ = function() {
  var gl = this.gl_;

  if (!this.stage_.batches_.length) return;

  this.useProgram_(this.shaders_.texturedProg);

  for (var i = 0; i < this.stage_.batches_.length; i++) {
    var batch = this.stage_.batches_[i];

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, batch.diffuseTexture);
    gl.uniform1i(this.prog_.getUniformLocation('diffuseSampler'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, batch.normalTexture);
    gl.uniform1i(this.prog_.getUniformLocation('normalSampler'), 1);

    batch.draw(this.modelToCamera(), this.prog_);
  }
};

Renderer3d.prototype.program = function() {
  return this.prog_;
};

Renderer3d.prototype.cameraToClip = function() {
  return this.stage_.perspective_;
};

Renderer3d.prototype.useProgram_ = function(prog) {
  var gl = this.gl_;
  if (this.prog_ != prog) {
    if (this.prog_) {
      this.prog_.detach();
    }
  }
  this.prog_ = prog;
  if (this.prog_) {
    this.prog_.use();
    var cameraUniform = prog.getUniformLocation('cameraToClipMatrix');
    gl.uniformMatrix4fv(cameraUniform,
        false, new Float32Array(this.cameraToClip().flatten()));

    this.stage_.lighting_.bind_(this);
    gl.uniform4f(prog.getUniformLocation('beats'),
        Math.sin(Math.PI * this.stage_.beat[0]),
        Math.sin(Math.PI * this.stage_.beat[1]),
        Math.sin(Math.PI * this.stage_.beat[2]),
        Math.sin(Math.PI * this.stage_.beat[3]));
  }
};

Renderer3d.prototype.shaderFromElement = function(elem) {
  var gl = this.gl_;
  var text = elem.textContent;
  var type;
  if (elem.type == 'x-shader/x-fragment') {
    type = gl.FRAGMENT_SHADER;
  } else if (elem.type == 'x-shader/x-vertex') {
    type = gl.VERTEX_SHADER;
  } else {
    window.console.log('Unknown shader type: ' + elem.type);
    return null;
  }
  return this.shaderFromText(text, type);
};

Renderer3d.prototype.shaderFromText = function(name, text, type) {
  var shader = new Shader(this.gl_, name, text, type);
  return shader.compile() && shader;
};

Renderer3d.prototype.shaderProgram = function(name, shaders) {
  var program = new ShaderProgram(this.gl_, name, shaders);
  return program.link() && program;
};

function Shader(gl, name, source, type) {
  this.name = name;
  this.source = source;
  this.type = type;
  this.gl_ = gl;
  this.shader = null;
};

Shader.prototype.compile = function() {
  var gl = this.gl_;
  if (this.shader) {
    window.console.log('Attempting to compile "' + this.name +
        '" a second time, aborting.');
    return true;
  }
  this.shader = gl.createShader(this.type);
  gl.shaderSource(this.shader, this.source);
  gl.compileShader(this.shader);
  if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
    window.console.log('Error loading shader "' + this.name + '": ' +
        gl.getShaderInfoLog(this.shader));
    this.shader = null;
    return false;
  }
  return true;
};

Shader.prototype.free = function() {
  var gl = this.gl_;
  gl.deleteShader(this.shader);
  this.shader = null;
};

function ShaderProgram(gl, name, shaders) {
  this.name = name;
  this.shaders = shaders;
  this.gl_ = gl;
  this.program = null;
};

ShaderProgram.prototype.link = function() {
  var gl = this.gl_;
  if (this.program) {
    window.console.log('Attempting to compile "' + this.name +
        '" a second time, aborting.');
    return true;
  }
  this.program = gl.createProgram();
  for (var i = 0; i < this.shaders.length; ++i) {
    gl.attachShader(this.program, this.shaders[i].shader);
  }
  gl.linkProgram(this.program);

  if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
    window.console.log('Unable to link shader "' + this.name + '": ' +
        gl.getProgramInfoLog(this.program));
    this.program = null;
    return false;
  }
  return true;
};

ShaderProgram.prototype.use = function() {
  var gl = this.gl_;
  this.uniforms_ = {};
  this.attribs_ = {};
  if (!this.program) {
    window.console.log('Attempting to use uncompiled shader, aborting.');
    return null;
  }
  gl.useProgram(this.program);
};

ShaderProgram.prototype.detach = function() {
  var gl = this.gl_;
  if (!this.program) {
    window.console.log('Attempting to use uncompiled shader, aborting.');
    return null;
  }
  gl.useProgram(null);
};

ShaderProgram.prototype.free = function() {
  var gl = this.gl_;
  gl.deleteProgram(this.program);
  for (var i = 0; i < this.shaders.length; ++i) {
    this.shaders[i].free();
  }
  this.program = null;
};

ShaderProgram.prototype.getUniformLocation = function(name) {
  if (name in this.uniforms_) {
    return this.uniforms_[name];
  }
  var loc = this.gl_.getUniformLocation(this.program, name);
  this.uniforms_[name] = loc;
  return loc;
};

ShaderProgram.prototype.getAttribLocation = function(name) {
  var loc;
  if (name in this.attribs_) {
    loc = this.attribs_[name];
  } else {
    loc = this.gl_.getAttribLocation(this.program, name);
    this.attribs_[name] = loc;
  }
  if (loc != -1) {
    this.gl_.enableVertexAttribArray(loc);
  }
  return loc;
};


function SpriteSheet(gl, texture, desc) {
  this.texture = texture;
  this.desc = desc;
  this.name = desc.meta.image;
  this.gl_ = gl;
  this.w = this.desc.meta.size.w;
  this.h = this.desc.meta.size.h;
  this.loaded = false;
};

SpriteSheet.prototype.fromImg_ = function(img) {
  if (this.loaded) return;
  this.loaded = true;
  var gl = this.gl_;
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, null);

  this.textures = {};
  for (var frameName in this.desc.frames) {
    var frame = this.desc.frames[frameName].frame;
    var texture = new Texture(
      gl, this.texture, this.name, {
        name: frameName,
        x: frame.x / this.w,
        y: frame.y / this.h,
        w: frame.w / this.w,
        h: frame.h / this.h
      });
    texture.w = frame.w;
    texture.h = frame.h;
    this.textures[frameName] = texture;
  }
};

SpriteSheet.load = function(gl, desc, onDone) {
  var tex = new SpriteSheet(gl, gl.createTexture(), desc);
  var image = new Image();
  image.onload = function() { tex.fromImg_(image); onDone(tex); }
  image.src = tex.name;
  return tex;
};

SpriteSheet.prototype.textureFor = function(name) {
  return this.textures[name];
};

function Texture(gl, texture, name, opt_atlas) {
  this.texture = texture;
  this.atlas = opt_atlas;
  this.gl_ = gl;
  this.loaded = false;
  this.name = name;
};

Texture.prototype.fromImg_ = function(img) {
  if (this.loaded) return;
  this.loaded = true;
  this.w = img.width;
  this.h = img.height;
  var gl = this.gl_;
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, null);
};

Texture.getCanvas_ = function(dims) {
  var scratchCanvas = document.getElementById('scratch-canvas');
  if (!scratchCanvas) {
    scratchCanvas = document.createElement('canvas');
    scratchCanvas.id = 'scratch-canvas';
    scratchCanvas.style.display = 'none';
    document.body.appendChild(scratchCanvas);
  }
  scratchCanvas.width = dims.width;
  scratchCanvas.height = dims.height;
  return scratchCanvas;
};

Texture.fromCanvas = function(gl, dims, drawFn) {
  var scratchCanvas = Texture.getCanvas_(dims);
  var ctx = scratchCanvas.getContext('2d');
  drawFn(ctx);

  var tex = new Texture(gl, gl.createTexture(), guid++ + '-canvas');
  tex.fromImg_(scratchCanvas);
  return tex;
};

Texture.ofColor = function(gl, color, opt_dims) {
  var dims = opt_dims || {width: 2, height: 2};
  return Texture.fromCanvas(gl, dims, function(ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, dims.width, dims.height);
  });
};

Texture.sub = function(other, ul, dims) {
  var atlas = {x: 0, y: 0, w: 1, h: 1};
  if (other.atlas) {
    atlas.x = other.atlas.x;
    atlas.y = other.atlas.y;
    atlas.w = other.atlas.w;
    atlas.h = other.atlas.h;
  }
  var maxw = atlas.x + atlas.w;
  var maxh = atlas.y + atlas.h;
  atlas.x += Math.min(atlas.w, ul.x / other.w * atlas.w);
  atlas.y += Math.min(atlas.h, ul.y / other.h * atlas.h);
  atlas.w = atlas.w * dims.x / other.w;
  atlas.h = atlas.h * dims.y / other.h;
  if (atlas.x + atlas.w > maxw) atlas.w = maxw - atlas.x;
  if (atlas.y + atlas.h > maxh) atlas.h = maxh - atlas.y;
  var texture = new Texture(
      other.gl,  other.texture, other.name, atlas);
  texture.w = dims.x;
  texture.h = dims.y;
  return texture;
};

Texture.load = function(gl, src, onDone) {
  var tex = new Texture(gl, gl.createTexture(), src);
  var image = new Image();
  image.onload = function() { tex.fromImg_(image); onDone(); }
  image.src = src;
  return tex;
};

Texture.prototype.free = function() {
  var gl = this.gl_;
  gl.deleteTexture(this.texture);
  this.texture = null;
};

var Light = function(pos, color) {
  this.pointLight_ = true;
  this.pos = pos;
  this.color = color;
};

Light.globalLight = function(dir, color) {
  var light = new Light(dir.normalize(), color);
  light.pointLight_ = false;
  return light;
};

Light.NO_OP = new Light(new geom.Vec3(0, 0, 0), new geom.Vec3(0, 0, 0));

var Lighting = function(ambient, atten) {
  this.ambient = ambient;
  this.atten = atten;
  this.maxIntensity = this.targetIntensity = 1;
  this.intensityV_ = 0;
  this.gamma = 1.1;
  this.lights = [
      Light.NO_OP, Light.NO_OP,
      Light.NO_OP, Light.NO_OP
  ];
};

Lighting.prototype.setMaxIntensity = function(mi) {
  this.targetIntensity = mi;
};

Lighting.prototype.tick = function(t) {
  var sgn = function(x) { return x < 0 ? -1 : (x > 0 ? 1 : 0); };
  var iDiff = this.targetIntensity - this.maxIntensity;
  if (iDiff != 0) {
    if (sgn(iDiff) != this.intensityV_) {
      this.intensityV_ = 0;
    }
    this.intensityV_ += sgn(iDiff) * t;

    if (Math.abs(iDiff) < Math.abs(this.intensityV_)) {
      this.maxIntensity = this.targetIntensity;
      this.intensityV_ = 0;
    } else {
      this.maxIntensity += this.intensityV_;
    }
  }
};

Lighting.prototype.bind_ = function(renderer) {
  var gl = renderer.gl();
  var prog = renderer.program();
  for (var i = 0; i < this.lights.length; ++i) {
    var light = this.lights[i];
    var lightDir = light.pos;
    if (!light.pointLight_) {
      lightDir = renderer.cameraToClip().scaleVec(lightDir).normalize();
    } else {
      lightDir = renderer.modelToCamera().top().scaleVec(lightDir);
    }
    var cspUniform = prog.getUniformLocation(
        'lighting.lights[' + (2 * i) + ']');
    gl.uniform4f(cspUniform,
        lightDir.x, lightDir.y, lightDir.z, light.pointLight_ ? 1 : 0);
    var intUniform = prog.getUniformLocation(
        'lighting.lights[' + (2 * i + 1) + ']');
    gl.uniform4f(intUniform,
        light.color.x, light.color.y, light.color.z, 1); 
  }

  gl.uniform1f(prog.getUniformLocation('lighting.attenuation'), this.atten);
  gl.uniform1f(prog.getUniformLocation('lighting.maxIntensity'),
      this.maxIntensity);
  gl.uniform1f(prog.getUniformLocation('lighting.gamma'), this.gamma);
  gl.uniform4f(prog.getUniformLocation('lighting.ambient'),
      this.ambient.x, this.ambient.y, this.ambient.z, 1);
};

UNIT_SQUARE_DATA = [
  {position: [-0.5,  0.5, 0, 1],
   texCord: [0, 0]},
  {position: [0.5,  0.5, 0, 1],
   texCord: [1, 0]},
  {position: [-0.5,  -0.5, 0, 1],
   texCord: [0, 1]},
  {position: [0.5,  -0.5, 0, 1],
   texCord: [1, 1]}
];

UNIT_SQUARE_ELEMS = [
  0, 2, 3,
  0, 3, 1,
];

function Sprite(gl) {
  this.visible = true;
  this.gl_ = gl;
  this.w_ = 1;
  this.h_ = 1;
  this.pos_ = new geom.Vec3(0, 0, 0);
  this.beats = 0;

  this.normalMap = Sprite.defaultNormalMap_(gl);
};

Sprite.DEFAULT_NORMAL_MAP_ = null;
Sprite.defaultNormalMap_ = function(gl) {
  if (!Sprite.DEFAULT_NORMAL_MAP_) {
    Sprite.DEFAULT_NORMAL_MAP_ = Texture.ofColor(gl, '#8888ff');
  }
  return Sprite.DEFAULT_NORMAL_MAP_;
};

Sprite.prototype.setSize = function(w, h) {
  this.w_ = w;
  this.h_ = h;
};

Sprite.prototype.size = function() {
  return new geom.Vec2(this.w_, this.h_);
};


Sprite.prototype.pos = function() {
  return this.pos_;
};

Sprite.prototype.addPos = function(x, y, z) {
  this.pos_.x += x || 0;
  this.pos_.y += y || 0;
  this.pos_.z += z || 0;
};

Sprite.prototype.setPos = function(x, y, opt_z) {
  var z = isDef(opt_z) ? opt_z : this.pos_.z;
  this.pos_.x = x;
  this.pos_.y = y;
  this.pos_.z = z;
};

Sprite.prototype.setRotation = function(axis, angle) {
  this.axis_ = axis;
  this.angle_ = angle;
};

Sprite.prototype.setTexture = function(txt) {
  this.texture = txt;
  this.setSize(txt.w, txt.h);
};

Sprite.prototype.setNormalMap = function(txt) {
  this.normalMap = txt;
};

SHARED_SHADER = {
  UNIFORMS: [
    'uniform mat4 cameraToClipMatrix;',
    'uniform mat4 modelToCameraMatrix;',
    'uniform mat3 normalModelToCameraMatrix;',
    'uniform vec3 lightPos;',
    'uniform vec4 beats;',
  ].join('\n'),

  TEXTURE_SAMPLERS: [
    'uniform sampler2D diffuseSampler;',
    'uniform sampler2D normalSampler;',
  ].join('\n'),

  SPRITE_ATTR: [
    'attribute vec3 position;',
    'attribute vec2 texCord;',
    'attribute vec2 norCord;',
    'attribute vec3 colorFilter;',
  ].join('\n'),

  SPRITE_VARY: [
    'varying vec3 frag_position;',
    'varying vec4 frag_color;',
    'varying vec2 frag_texCord;',
    'varying vec2 frag_norCord;',
    'varying vec3 frag_colorFilter;',
  ].join('\n'),

  LIGHT_UNIFORMS: [
    'const int numLights = 4;',
    'struct Light {',
    '  vec4 cameraSpacePos;',
    '  vec4 intensity;',
    '};',
    'struct Lighting {',
    '  vec4 ambient;',
    '  float attenuation;',
    '  float maxIntensity;',
    '  float gamma;',
    '  vec4 lights[numLights * 2];',
    '};',
    'uniform Lighting lighting;',
  ].join('\n'),

  CALC_LIGHT: [
    'float Attenuate(in vec3 pos, in vec3 lightPos, out vec3 lightDir) {',
    '  vec3 diff = lightPos - pos;',
    '  float distSquared = dot(diff, diff);',
    '  lightDir = diff * inversesqrt(distSquared);',
    '  return (1.0 / (1.0 + lighting.attenuation * distSquared));',
    '}',
    '',
    'vec4 CalcLight(in vec3 normal, in vec4 color, in Light light) {',
    '  vec3 lightDir;',
    '  vec4 intensity;',
    '  if (light.cameraSpacePos.w == 0.0) {',
    '    lightDir = vec3(light.cameraSpacePos);',
    '    intensity = normalize(light.intensity);',
    '  } else {',
    '    float atten = light.cameraSpacePos.w * Attenuate(frag_position, light.cameraSpacePos.xyz, lightDir);',
    '    intensity = atten * light.intensity;',
    '  }',
    '  float incidence = dot(normal, lightDir);',
    '  incidence = incidence < 0.0001 ? 0.0 : incidence;',
    '  return color * intensity * incidence;',
    '}',
  ].join('\n'),
};

SHADERS = {
  TEXTURED_SPRITE_VERT: [
    'precision mediump float;',
    'precision mediump int;',
    SHARED_SHADER.SPRITE_ATTR,
    '',
    SHARED_SHADER.UNIFORMS,
    '',
    SHARED_SHADER.LIGHT_UNIFORMS,
    '',
    SHARED_SHADER.TEXTURE_SAMPLERS,
    '',
    SHARED_SHADER.SPRITE_VARY,
    '',
    'void main(void) {',
    '  vec4 fragP = vec4(position, 1.0);',
    '  gl_Position = cameraToClipMatrix * fragP;',
    '  frag_position = fragP.xyz;',
    '  frag_texCord = texCord;',
    '  frag_norCord = norCord;',
    '  frag_colorFilter = colorFilter;',
    '}',
  ].join('\n'),

  TEXTURED_SPRITE_FRAG: [
    'precision mediump float;',
    'precision mediump int;',
    SHARED_SHADER.SPRITE_VARY,
    '',
    SHARED_SHADER.UNIFORMS,
    '',
    SHARED_SHADER.LIGHT_UNIFORMS,
    SHARED_SHADER.CALC_LIGHT,
    '',
    SHARED_SHADER.TEXTURE_SAMPLERS,
    '',
    'void main(void) {',
    '  vec3 rawNormal = texture2D(normalSampler, frag_norCord).rgb;',
    '  vec3 normal = normalize(2.0 * (rawNormal - vec3(0.5, 0.5, 0.5)));',
    '  vec4 diffuse = vec4(frag_colorFilter, 0.0) + texture2D(diffuseSampler, frag_texCord);',
    '  vec4 accum = diffuse * lighting.ambient;',
    '  for (int lightIndex = 0; lightIndex < numLights; lightIndex++) {',
    '    Light light;',
    '    light.cameraSpacePos = lighting.lights[lightIndex * 2];',
    '    light.intensity = lighting.lights[lightIndex * 2 + 1];',
    '    accum += CalcLight(normal, diffuse, light);',
    '  }',
    '  accum = accum / lighting.maxIntensity;',
    '  accum.w *= lighting.maxIntensity;',
    '  vec4 gamma = vec4(1.0 / lighting.gamma);',
    '  gamma.w = 1.0;',
    '  gl_FragColor = pow(accum, gamma);',
    '}',
  ].join('\n'),
};

function GameShaders() {
  this.texturedProg = null;
  this.flatProg = null;
};

GameShaders.prototype.load = function(renderer, opt_done) {
  if (this.loaded_) return;
  this.loaded_ = true;
  var onDone = opt_done || function() {};
  var gl = renderer.gl();

  var texturedFrag = renderer.shaderFromText(
      'TEXTURED_SPRITE_FRAG', SHADERS.TEXTURED_SPRITE_FRAG, gl.FRAGMENT_SHADER);

  var texturedVert = renderer.shaderFromText(
      'TEXTURED_SPRITE_VERT', SHADERS.TEXTURED_SPRITE_VERT, gl.VERTEX_SHADER);

  this.texturedProg = renderer.shaderProgram(
      'TEXTURE', [texturedVert, texturedFrag]);

  onDone();
};

var Resources = {};

Resources.IMAGE_TYPES = {
  '.png': true,
  '.jpg': true,
  '.jpeg': true,
  '.gif': true,
};

Resources.ATLAS_TYPES = {
  '.json': true,
};

Resources.Loader = function(gl, assets) {
  this.gl = gl;
  this.assets = assets;
  this.loading = false;
  this.loaded = false;
  this.numLoaded = 0;
  this.data = {};
};

Resources.Loader.prototype.loadTexture_ = function(txt, cb) {
  this.data[txt] = Texture.load(this.gl, txt, cb);
};

Resources.Loader.prototype.loadAtlas_ = function(txt, cb) {
  json.load(txt, function(atlasDesc) {
    SpriteSheet.load(this.gl, atlasDesc, function(sheet) {
      for (var textureName in sheet.textures) {
        this.data[textureName] = sheet.textures[textureName];
      }
      cb();
    }.bind(this));
  }.bind(this));
};

Resources.Loader.prototype.load = function(onComplete) {
  if (this.loading || this.loaded) return;
  var doneFn = function() {
    this.numLoaded++;
    if (this.numLoaded == 1 + this.assets.length) {
      this.loading = false;
      this.loaded = true;
      onComplete(this.data);
    }
  }.bind(this);
  for (var i = 0; i < this.assets.length; i++) {
    var assetPath = this.assets[i];
    var extension = assetPath.substr(assetPath.lastIndexOf('.'));
    if (extension in Resources.IMAGE_TYPES) {
      this.loadTexture_(assetPath, doneFn);
    } else if (extension in Resources.ATLAS_TYPES) {
      this.loadAtlas_(assetPath, doneFn);
    } else {
      throw 'Unknown asset type: "' + extension + '"!';
    }
  }
  window.setTimeout(doneFn, 50);
};

exports.Resources = Resources;
exports.Stage = Stage;
exports.Renderer3d = Renderer3d;
exports.MatrixStack = MatrixStack;
exports.Shader = Shader;
exports.ShaderProgram = ShaderProgram;
exports.Texture = Texture;
exports.Sprite = Sprite;
exports.Light = Light;

})(window);
