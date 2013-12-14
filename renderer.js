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


function Renderer3d(attachTo, width, height) {
  this.modelToCamera_ = new MatrixStack();
  this.cameraPos_ = new geom.Vec3(0, 0, 10);
  this.cameraTarget_ = new geom.Vec3(0, 0, 0);
  this.perspective_ = geom.Mat4.ortho(
      -width / 2, width / 2, -height / 2, height / 2,
      -100, 100);

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

  this.lighting_ = new Lighting(new geom.Vec3(0.1, 0.1, 0.1), 1 / (70 * 70));

  this.sprites_ = [];
}

Renderer3d.prototype.getElement = function() {
  return this.canvasElem_;
};

Renderer3d.prototype.tick = function(t) {
  this.lighting_.tick(t);
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
  return this.lighting_;
};

Renderer3d.prototype.modelToCamera = function() {
  return this.modelToCamera_;
};

Renderer3d.prototype.render = function(cb) {
  var gl = this.gl_;
  gl.clearColor(0, 0, 0, 1);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var cPos = this.cameraPos_;
  var cTar = this.cameraTarget_;
  var camera = geom.Mat4.lookAt(
      cPos, cTar, new geom.Vec3(0, 1, 0));

  this.modelToCamera_.push(camera);

  cb(this);
  this.renderSprites_();
  this.modelToCamera_.pop();
};

Renderer3d.prototype.renderOneSprite_ = function(sprite) {
  var gl = this.gl_;
  var mtrxStack = this.modelToCamera();
  mtrxStack.push();
    mtrxStack.x(geom.Mat4.translate(sprite.pos_.x, sprite.pos_.y, sprite.pos_.z));
    if (sprite.w_ != 1 || sprite.h_ != 1) {
      mtrxStack.x(geom.Mat4.diag(sprite.w_, sprite.h_, 1));
    }

    var modelToCamera = mtrxStack.top();

    var normalModelToCamera = modelToCamera.inverseTranspose();

    gl.uniformMatrix4fv(this.prog_.getUniformLocation('modelToCameraMatrix'),
        false, new Float32Array(modelToCamera.flatten()));
    gl.uniformMatrix3fv(this.prog_.getUniformLocation('normalModelToCameraMatrix'),
        false, new Float32Array(normalModelToCamera));

    sprite.renderImpl_(this.prog_);
  mtrxStack.pop();
};

Renderer3d.prototype.renderSprites_ = function() {
  var gl = this.gl_;

  if (!this.sprites_.length) return;

  var flatByColor = {};
  var byTexture = {};
  var textureInfo = {};
  for (var i = 0; i < this.sprites_.length; i++) {
    var sprite = this.sprites_[i];
    if (sprite.material) {
      putDefault(flatByColor, sprite.material.diffuseColor, []).push(sprite);
    } else if (sprite.texture) {
      var name = sprite.texture.name + ' ' + sprite.normalMap.name;
      textureInfo[name] = {
        diffuse: sprite.texture,
        normal: sprite.normalMap
      };
      putDefault(byTexture, name, []).push(sprite);
    } else {
      throw 'Cannae render sprite, capn!';
    }
  }

  this.useProgram_(this.shaders_.flatProg);

  for (var colorKey in flatByColor) {
    var sprites = flatByColor[colorKey];
    for (var i = 0; i < sprites.length; i++) {
      var sprite = sprites[i];
      if (i == 0) {
        gl.uniform4fv(this.prog_.getUniformLocation('diffuseColor'),
            new Float32Array(sprite.material.diffuseColor));
      }
      this.renderOneSprite_(sprite);
    }
  }

  this.useProgram_(this.shaders_.texturedProg);

  for (var textureKey in byTexture) {
    var sprites = byTexture[textureKey];
    var theTexture = textureInfo[textureKey];
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, theTexture.diffuse.texture);
    gl.uniform1i(this.prog_.getUniformLocation('diffuseSampler'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, theTexture.normal.texture);
    gl.uniform1i(this.prog_.getUniformLocation('normalSampler'), 1);

    for (var i = 0; i < sprites.length; i++) {
      var sprite = sprites[i];
      if (sprite.texture.atlas) {
        gl.uniform4f(this.prog_.getUniformLocation('diffuseCords'),
            sprite.texture.atlas.x, sprite.texture.atlas.y,
            sprite.texture.atlas.w, sprite.texture.atlas.h);
      } else {
        gl.uniform4f(this.prog_.getUniformLocation('diffuseCords'), 0, 0, 1, 1);
      }
      if (sprite.normalMap.atlas) {
        gl.uniform4f(this.prog_.getUniformLocation('normalCords'),
            sprite.normalMap.atlas.x, sprite.normalMap.atlas.y,
            sprite.normalMap.atlas.w, sprite.normalMap.atlas.h);
      } else {
        gl.uniform4f(this.prog_.getUniformLocation('normalCords'), 0, 0, 1, 1);
      }
      this.renderOneSprite_(sprite);
    }
  }
};

Renderer3d.prototype.program = function() {
  return this.prog_;
};

Renderer3d.prototype.cameraToClip = function() {
  return this.perspective_;
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
        false, new Float32Array(this.perspective_.flatten()));
    UNIT_SQUARE_STRUCT.bindBuffers(gl, this.prog_);

    this.lighting_.bind_(this);
  }
};

Renderer3d.prototype.addSprite = function(sprite) {
  this.sprites_.push(sprite);
};

Renderer3d.prototype.removeSprite = function(sprite) {
  var index = this.sprites_.indexOf(sprite);
  if (index == -1) {
    throw 'Sprite not a child!';
  }
  this.sprites_.splice(index, 1);
};

Renderer3d.prototype.clear = function() {
  this.sprites_ = [];
  this.lighting_ = new Lighting(new geom.Vec3(0.1, 0.1, 0.1), 1 / (70 * 70));
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
    this.textures[frameName] = new Texture(
      gl, this.texture, this.name, {
        name: frameName,
        x: frame.x / this.w,
        y: frame.y / this.h,
        w: frame.w / this.w,
        h: frame.h / this.h
      });
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

UNIT_SQUARE_STRUCT = undefined;

var UnitSquare = function(gl) {
  var verts = UNIT_SQUARE_DATA;
  var elems = UNIT_SQUARE_ELEMS;

  var size = Mesh.Vertex.sizeOf(verts);
  var buf = new ArrayBuffer(verts.length * size);

  var arrays = {};
  var initialOffsets = {};
  var offsets = {};
  var steps = {};
  var offset = 0;
  var kinds = [];
  for (var i = 0; i < Mesh.Vertex.KINDS.length; ++i) {
    var kind = Mesh.Vertex.KINDS[i];
    if (kind in verts[0]) {
      kinds.push(kind);
      var sizeStruct = Mesh.Vertex.KIND_SIZES[kind];
      arrays[kind] = new sizeStruct.type(buf);
      offsets[kind] = initialOffsets[kind] =
          offset / sizeStruct.type.BYTES_PER_ELEMENT;
      steps[kind] = size / sizeStruct.type.BYTES_PER_ELEMENT;
      offset += sizeStruct.type.BYTES_PER_ELEMENT * sizeStruct.num;
    }
  }

  for (var i = 0; i < verts.length; ++i) {
    var vert = verts[i];
    for (var kind in arrays) {
      var sizeStruct = Mesh.Vertex.KIND_SIZES[kind];
      for (var index = 0; index < sizeStruct.num; ++index) {
        var v = vert[kind];
        arrays[kind][offsets[kind] + index] = v[index] || 0;
      }
      offsets[kind] += steps[kind];
    }
  }

  this.vertexData = {
    buffer: buf,
    size: size,
    kinds: kinds,
    offset: initialOffsets,
    steps: steps,
    arrays: arrays
  };
  this.vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.buffer, gl.STATIC_DRAW);

  this.elementArrayBuffer = gl.createBuffer();
  var elementData = new Uint16Array(elems);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementData, gl.STATIC_DRAW);
};

UnitSquare.prototype.bindBuffers = function(gl, program) {
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  for (var i = 0 ; i < this.vertexData.kinds.length; ++i) {
    var kind = this.vertexData.kinds[i];
    var sizeStruct = Mesh.Vertex.KIND_SIZES[kind];
    var normalize = sizeStruct.type == Uint8Array;
    var glType = sizeStruct.type == Float32Array ? gl.FLOAT :
                 sizeStruct.type == Uint8Array ? gl.UNSIGNED_BYTE : null;
    var loc = program.getAttribLocation(kind);
    if (loc != -1) {
      gl.vertexAttribPointer(
          loc,
          sizeStruct.num,
          glType,
          normalize,
          this.vertexData.size,
          this.vertexData.offset[kind] * sizeStruct.type.BYTES_PER_ELEMENT);
    }
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementArrayBuffer);
};

function Sprite(gl) {
  this.gl_ = gl;
  this.w_ = 1;
  this.h_ = 1;
  this.pos_ = new geom.Vec3(0, 0, 0);

  if (!UNIT_SQUARE_STRUCT) {
    UNIT_SQUARE_STRUCT = new UnitSquare(gl);
  }

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

Sprite.prototype.setTexture = function(txt) {
  this.texture = txt;
};

Sprite.prototype.setNormalMap = function(txt) {
  this.normalMap = txt;
};

Sprite.prototype.setMaterial = function(mtl) {
  this.material = mtl;
};

Sprite.prototype.renderImpl_ = function(renderer) {
  var gl = renderer.gl_;

  gl.drawElements(
      gl.TRIANGLES,
      UNIT_SQUARE_ELEMS.length,
      gl.UNSIGNED_SHORT,
      0);
};

var Mesh = {};

Mesh.Vertex = {};
Mesh.Vertex.KINDS = [
  'position', 'normal', 'color', 'texCord',
];

Mesh.Vertex.KIND_SIZES = {
  'position': {type: Float32Array, num: 4},
  'normal': {type: Float32Array, num: 4},
  'texCord': {type: Float32Array, num: 2},
};

Mesh.Vertex.sizeOf = function(vertexData) {
  var vert = vertexData[0];
  var size = 0;
  for (var i = 0; i < Mesh.Vertex.KINDS.length; ++i) {
    if (Mesh.Vertex.KINDS[i] in vert) {
      var sizeStruct = Mesh.Vertex.KIND_SIZES[Mesh.Vertex.KINDS[i]];
      size += sizeStruct.type.BYTES_PER_ELEMENT * sizeStruct.num;
    }
  }
  return size;
};

SHARED_SHADER = {
  MTX_UNIFORMS: [
    'uniform mat4 cameraToClipMatrix;',
    'uniform mat4 modelToCameraMatrix;',
    'uniform mat3 normalModelToCameraMatrix;',
    'uniform vec3 lightPos;',
  ].join('\n'),

  TEXTURE_SAMPLERS: [
    'uniform sampler2D diffuseSampler;',
    'uniform sampler2D normalSampler;',
    'uniform vec4 diffuseCords;',
    'uniform vec4 normalCords;',
  ].join('\n'),

  SPRITE_ATTR: [
    'attribute vec3 position;',
    'attribute vec2 texCord;',
  ].join('\n'),

  SPRITE_VARY: [
    'varying vec3 frag_position;',
    'varying vec4 frag_color;',
    'varying vec2 frag_texCord;',
    'varying vec2 frag_normalTexCord;',
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
  FLAT_SPRITE_VERT: [
    'precision mediump float;',
    SHARED_SHADER.SPRITE_ATTR,
    '',
    SHARED_SHADER.MTX_UNIFORMS,
    '',
    SHARED_SHADER.LIGHT_UNIFORMS,
    '',
    'uniform vec4 diffuseColor;',
    'varying vec3 frag_normal;',
    '',
    SHARED_SHADER.SPRITE_VARY,
    '',
    'void main(void) {',
    '  vec4 fragP = modelToCameraMatrix * vec4(position, 1.0);',
    '  gl_Position = cameraToClipMatrix * fragP;',
    '  frag_position = fragP.xyz;',
    '  frag_color = diffuseColor;',
    '  frag_normal = normalModelToCameraMatrix * vec3(0.0, 0.0, 1.0);',
    '}',
  ].join('\n'),

  FLAT_SPRITE_FRAG: [
    'precision mediump float;',
    SHARED_SHADER.SPRITE_VARY,
    '',
    SHARED_SHADER.LIGHT_UNIFORMS,
    SHARED_SHADER.CALC_LIGHT,
    'varying vec3 frag_normal;',
    '',
    SHARED_SHADER.MTX_UNIFORMS,
    '',
    'void main(void) {',
    '  vec4 accum = frag_color * lighting.ambient;',
    '  for (int lightIndex = 0; lightIndex < numLights; lightIndex++) {',
    '    Light light;',
    '    light.cameraSpacePos = lighting.lights[lightIndex * 2];',
    '    light.intensity = lighting.lights[lightIndex * 2 + 1];',
    '    accum += CalcLight(frag_normal, frag_color, light);',
    '  }',
    '  accum = accum / lighting.maxIntensity;',
    '  accum.w *= lighting.maxIntensity;',
    '  vec4 gamma = vec4(1.0 / lighting.gamma);',
    '  gamma.w = 1.0;',
    '  gl_FragColor = pow(accum, gamma);',
    '}',
  ].join('\n'),

  TEXTURED_SPRITE_VERT: [
    'precision mediump float;',
    SHARED_SHADER.SPRITE_ATTR,
    '',
    SHARED_SHADER.MTX_UNIFORMS,
    '',
    SHARED_SHADER.LIGHT_UNIFORMS,
    '',
    SHARED_SHADER.TEXTURE_SAMPLERS,
    '',
    SHARED_SHADER.SPRITE_VARY,
    '',
    'void main(void) {',
    '  vec4 fragP = modelToCameraMatrix * vec4(position, 1.0);',
    '  gl_Position = cameraToClipMatrix * fragP;',
    '  frag_position = fragP.xyz;',
    '  frag_texCord = diffuseCords.xy + (diffuseCords.zw * texCord);',
    '  frag_normalTexCord = normalCords.xy + (normalCords.zw * texCord);',
    '}',
  ].join('\n'),

  TEXTURED_SPRITE_FRAG: [
    'precision mediump float;',
    SHARED_SHADER.SPRITE_VARY,
    '',
    SHARED_SHADER.MTX_UNIFORMS,
    '',
    SHARED_SHADER.LIGHT_UNIFORMS,
    SHARED_SHADER.CALC_LIGHT,
    '',
    SHARED_SHADER.TEXTURE_SAMPLERS,
    '',
    'void main(void) {',
    '  vec3 rawNormal = texture2D(normalSampler, frag_normalTexCord).rgb;',
    '  vec3 normal = normalize(2.0 * (rawNormal - vec3(0.5, 0.5, 0.5)));',
    /*
    '  vec3 toLight = lightPos - frag_position;',
    '  float distSquared = dot(toLight, toLight);',
    '  toLight = toLight * inversesqrt(distSquared);',
    '  float intensity = 5.0 * (1.0 / (1.0 + 1.0 / (70.0 * 70.0) * distSquared));',
    '  float incidence = dot(normal, toLight);',
    '  gl_FragColor = vec4(incidence * intensity * diffuse.rgb, diffuse.a);',
    */

    '  vec4 diffuse = texture2D(diffuseSampler, frag_texCord);',
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

  var flatFrag = renderer.shaderFromText(
      'FLAT_SPRITE_FRAG', SHADERS.FLAT_SPRITE_FRAG, gl.FRAGMENT_SHADER);

  var flatVert = renderer.shaderFromText(
      'FLAT_SPRITE_VERT', SHADERS.FLAT_SPRITE_VERT, gl.VERTEX_SHADER);

  this.flatProg = renderer.shaderProgram(
      'FLAT', [flatVert, flatFrag]);

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
exports.Renderer3d = Renderer3d;
exports.MatrixStack = MatrixStack;
exports.Shader = Shader;
exports.ShaderProgram = ShaderProgram;
exports.Texture = Texture;
exports.Sprite = Sprite;
exports.Light = Light;

})(window);
