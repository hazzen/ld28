(function(exports) {

var Vec2 = function(xOrP, opt_y) {
  if (opt_y === undefined) {
    if (xOrP == undefined) {
      throw 'Bad x val';
    }
    this.x = xOrP.x;
    this.y = xOrP.y;
  } else {
    this.x = xOrP;
    this.y = opt_y;
  }
};

Vec2.prototype.toVec3 = function() {
  return new Vec3(this.x, this.y, 0);
};

Vec2.prototype.m_plus = function(o) {
  this.x += o.x;
  this.y += o.y;
};

Vec2.prototype.plus = function(o) {
  var newP = new Vec2(this.x, this.y);
  newP.m_plus(o);
  return newP;
};

Vec2.prototype.m_minus = function(o) {
  this.x -= o.x;
  this.y -= o.y;
};

Vec2.prototype.minus = function(o) {
  var newP = new Vec2(this.x, this.y);
  newP.m_minus(o);
  return newP;
};

Vec2.prototype.m_times = function(v) {
  this.x *= v;
  this.y *= v;
};

Vec2.prototype.times = function(v) {
  var newP = new Vec2(this.x, this.y);
  newP.m_times(v);
  return newP;
};

Vec2.prototype.dot = function(o) {
  return this.x * o.x + this.y * o.y;
};

Vec2.prototype.cross = function(o) {
  return this.x * o.y - this.y * o.x;
};

Vec2.prototype.m_normalize = function(v) {
  var mag = this.mag();
  this.x /= mag;
  this.y /= mag;
};

Vec2.prototype.normalize = function() {
  var newP = new Vec2(this.x, this.y);
  newP.m_normalize();
  return newP;
};

Vec2.prototype.mag = function() {
  var mag = Math.sqrt(this.x * this.x + this.y * this.y);
  return mag;
};

Vec2.prototype.mag2 = function() {
  return this.x * this.x + this.y * this.y;
  return mag;
};

Vec2.fromTheta = function(theta) {
  return new Vec2(Math.cos(theta), Math.sin(theta));
};

Vec2.prototype.theta = function() {
  var curTheta = Math.atan2(this.y, this.x);
  return curTheta;
};

Vec2.prototype.m_normal = function(opt_rev) {
  var nx = (opt_rev ? 1 : -1) * this.y;
  var ny = (opt_rev ? -1 : 1) * this.x;
  this.x = nx;
  this.y = ny;
};

Vec2.prototype.normal = function(opt_rev) {
  var newP = new Vec2(this.x, this.y);
  newP.m_normal(opt_rev);
  return newP;
};

Vec2.prototype.m_rotate = function(t) {
  var curTheta = this.theta();
  curTheta += t;
  var mag = this.mag();
  this.x = Math.cos(curTheta) * mag;
  this.y = Math.sin(curTheta) * mag;
};

Vec2.prototype.rotate = function(t) {
  var newP = new Vec2(this.x, this.y);
  newP.m_rotate(t);
  return newP;
};

var Vec3 = function(xOrP, opt_y, opt_z) {
  if (opt_y === undefined) {
    if (xOrP == undefined) {
      throw 'Bad x val';
    }
    this.x = xOrP.x;
    this.y = xOrP.y;
    this.z = xOrP.z;
  } else {
    this.x = xOrP;
    this.y = opt_y;
    this.z = opt_z;
  }
};

Vec3.prototype.toVec2 = function() {
  return new Vec2(this.x, this.y);
};

Vec3.prototype.m_plus = function(o) {
  this.x += o.x;
  this.y += o.y;
  this.z += o.z;
};

Vec3.prototype.plus = function(o) {
  var newP = new Vec3(this);
  newP.m_plus(o);
  return newP;
};

Vec3.prototype.m_minus = function(o) {
  this.x -= o.x;
  this.y -= o.y;
  this.z -= o.z;
};

Vec3.prototype.minus = function(o) {
  var newP = new Vec3(this);
  newP.m_minus(o);
  return newP;
};

Vec3.prototype.m_times = function(v) {
  this.x *= v;
  this.y *= v;
  this.z *= v;
};

Vec3.prototype.times = function(v) {
  var newP = new Vec3(this);
  newP.m_times(v);
  return newP;
};

Vec3.prototype.dot = function(o) {
  return this.x * o.x + this.y * o.y + this.z * o.z;
};

Vec3.prototype.cross = function(o) {
  return new Vec3(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x);
};

Vec3.prototype.m_normalize = function(v) {
  var mag = this.mag();
  this.x /= mag;
  this.y /= mag;
  this.z /= mag;
};

Vec3.prototype.normalize = function() {
  var newP = new Vec3(this);
  newP.m_normalize();
  return newP;
};

Vec3.prototype.mag = function() {
  var mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  return mag;
};

Vec3.prototype.mag2 = function() {
  return this.x * this.x + this.y * this.y + this.z * this.z;
  return mag;
};

// NOT AN ACTUAL 3x3 MATRIX!!!
// We restrict ourselves to an orthographic projection and affine
// transformations, so we can cheat with our matrix representation
// by omitting the bottom row, assuming it to be [0, 0, 1].
var Mat3 = function(m11, m12, m21, m22, tx, ty) {
  // +-         -+
  // | m11 m12 tx|
  // | m21 m22 ty|
  // |  0   0   1|
  // +-         -+
  this.m11 = m11;
  this.m12 = m12;
  this.m21 = m21;
  this.m22 = m22;
  this.tx = tx;
  this.ty = ty;
};

Mat3.ident = function() {
  return new Mat3(
      1, 0,
      0, 1,
      0, 0);
};

Mat3.diag = function(x, y) {
  return new Mat3(
      x, 0,
      0, y,
      0, 0);
};

Mat3.translate = function(dx, dy) {
  return new Mat3(
      1, 0,
      0, 1,
      dx, dy);
};

Mat3.rotate = function(theta) {
  return new Mat3(
      Math.cos(theta), -Math.sin(theta),
      Math.sin(theta), Math.cos(theta),
      0, 0);
};

Mat3.translateRotate = function(dx, dy, theta) {
  return new Mat3(
      Math.cos(theta), -Math.sin(theta),
      Math.sin(theta), Math.cos(theta),
      dx, dy);
};


Mat3.prototype.mult = function(other) {
  var newM = new Mat3(
      this.m11, this.m12,
      this.m21, this.m22,
      this.tx, this.ty);
  newM.m_mult(other);
  return newM;
};

Mat3.prototype.m_mult = function(other) {
  var m11 = this.m11 * other.m11 + this.m12 * other.m21;
  var m12 = this.m11 * other.m12 + this.m12 * other.m22;
  var tx =  this.m11 * other.tx  + this.m12 * other.ty + this.tx;

  var m21 = this.m21 * other.m11 + this.m22 * other.m21;
  var m22 = this.m21 * other.m12 + this.m22 * other.m22;
  var ty =  this.m21 * other.tx  + this.m22 * other.ty + this.ty;

  this.m11 = m11;
  this.m12 = m12;
  this.m21 = m21;
  this.m22 = m22;
  this.tx = tx;
  this.ty = ty;
};

Mat3.prototype.scaleVec = function(p) {
  var newP = new Vec3(p.x, p.y);
  this.m_scaleVec(newP);
  return newP;
};

Mat3.prototype.m_scaleVec = function(p) {
  var nx = this.m11 * p.x + this.m12 * p.y + this.tx;
  var ny = this.m21 * p.x + this.m22 * p.y + this.ty;
  p.x = nx;
  p.y = ny;
};

// NOT AN ACTUAL 4x4 MATRIX!!!
// We restrict ourselves to an orthographic projection and affine
// transformations, so we can cheat with our matrix representation
// by omitting the bottom row, assuming it to be [0, 0, 0, 1].
var Mat4 = function(m11, m12, m13, m21, m22, m23, m31, m32, m33, tx, ty, tz) {
  // +-         -+
  // | m11 m12 m13 tx|
  // | m21 m22 m23 ty|
  // | m31 m32 m33 tz|
  // |  0   0    0  1|
  // +-         -+
  this.m11 = m11;
  this.m12 = m12;
  this.m13 = m13;
  this.m21 = m21;
  this.m22 = m22;
  this.m23 = m23;
  this.m31 = m31;
  this.m32 = m32;
  this.m33 = m33;
  this.tx = tx;
  this.ty = ty;
  this.tz = tz;
};

Mat4.ident = function() {
  return new Mat4(
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
      0, 0, 0);
};

Mat4.diag = function(x, y, z) {
  return new Mat4(
      x, 0, 0,
      0, y, 0,
      0, 0, z,
      0, 0, 0);
};

Mat4.lookAt = function(eye, center, up) {
  var z = eye.minus(center);
  z.m_normalize();
  var x = up.cross(z);
  x.m_normalize();
  var y = z.cross(x);
  y.m_normalize();

  var m = new Mat4(
      x.x, x.y, x.z,
      y.x, y.y, y.z,
      z.x, z.y, z.z,
      0, 0, 0);
  var t = Mat4.translate(-eye.x, -eye.y, -eye.z);

  m.m_mult(t);
  return m;
};

Mat4.ortho = function(left, right, bottom, top, znear, zfar) {
  var tx = -(right + left) / (right - left);
  var ty = -(top + bottom) / (top - bottom);
  var tz = -(zfar + znear) / (zfar - znear);
  var x  = 2 / (right - left);
  var y = 2 / (top - bottom);
  var z = -2 / (zfar - znear);
  return new Mat4(
      x,  0,   0,
      0,  y,   0,
      0,  0,   z,
      tx, ty, tz);
};

Mat4.translate = function(dx, dy, dz) {
  return new Mat4(
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
      dx, dy, dz);
};

Mat4.rotate = function(axis, theta) {
  var cos = Math.cos(theta);
  var cosm = 1 - cos;
  var sin = Math.sin(theta);
  var x = axis.x;
  var y = axis.y;
  var z = axis.z;
  var x2 = x * x;
  var y2 = y * y;
  var z2 = z * z;
  return new Mat4(
      cos + x2 * cosm,        x * y * cosm - z * sin, x * z * cosm + y * sin,
      y * x * cosm + z * sin, cos + y * cosm,         y * z * cosm - x * sin,
      z * x * cosm - y * sin, z * y * cosm + x * sin, cos + z2 * cosm,
      0, 0, 0);
};

Mat4.prototype.clone = function() {
  return new Mat4(
      this.m11, this.m12, this.m13,
      this.m21, this.m22, this.m23,
      this.m31, this.m32, this.m33,
      this.tx, this.ty, this.tz);
};

Mat4.prototype.flatten = function() {
  return [
    this.m11, this.m21, this.m31, 0,
    this.m12, this.m22, this.m32, 0,
    this.m13, this.m23, this.m33, 0,
    this.tx,  this.ty,  this.tz,  1
  ];
  return [
    this.m11, this.m12, this.m13, this.tx,
    this.m21, this.m22, this.m23, this.ty,
    this.m31, this.m32, this.m33, this.tz,
    0, 0, 0, 1
 ];
};

Mat4.prototype.inverseTranspose = function() {
  var s0 = this.m11 * this.m22 - this.m21 * this.m12;
  var s1 = this.m11 * this.m23 - this.m21 * this.m13;
  var s2 = this.m11 * this.ty - this.m21 * this.tx;
  var s3 = this.m12 * this.m23 - this.m22 * this.m13;
  var s4 = this.m12 * this.ty - this.m22 * this.tx;
  var s5 = this.m13 * this.ty - this.m23 * this.tx;

  var c5 = this.m33 * 1 - 0 * this.tz;
  var c4 = this.m32 * 1 - 0 * this.tz;
  var c3 = this.m32 * 0 - 0 * this.m33;
  var c2 = this.m31 * 1 - 0 * this.tz;
  var c1 = this.m31 * 0 - 0 * this.m33;
  var c0 = this.m31 * 0 - 0 * this.m32;

  var invdet = 1.0 / (s0 * c5 - s1 * c4 + s2 * c3 + s3 * c2 - s4 * c1 + s5 * c0);

  var m11 = ( this.m22 * c5 - this.m23 * c4 + this.ty * c3) * invdet;
  var m12 = (-this.m12 * c5 + this.m13 * c4 - this.tx * c3) * invdet;
  var m13 = ( 0 * s5 - 0 * s4 + 1 * s3) * invdet;

  var m21 = (-this.m21 * c5 + this.m23 * c2 - this.ty * c1) * invdet;
  var m22 = ( this.m11 * c5 - this.m13 * c2 + this.tx * c1) * invdet;
  var m23 = (-0 * s5 + 0 * s2 - 1 * s1) * invdet;

  var m31 = ( this.m21 * c4 - this.m22 * c2 + this.ty * c0) * invdet;
  var m32 = (-this.m11 * c4 + this.m12 * c2 - this.tx * c0) * invdet;
  var m33 = ( 0 * s4 - 0 * s2 + 1 * s0) * invdet;

  return [m11, m21, m31, m12, m22, m32, m13, m23, m33];
};

Mat4.prototype.mult = function(other) {
  var newM = new Mat4(
      this.m11, this.m12, this.m13,
      this.m21, this.m22, this.m23,
      this.m31, this.m32, this.m33,
      this.tx, this.ty, this.tz);
  newM.m_mult(other);
  return newM;
};

Mat4.prototype.m_mult = function(other) {
  var m11 = this.m11 * other.m11 + this.m12 * other.m21 + this.m13 * other.m31;
  var m12 = this.m11 * other.m12 + this.m12 * other.m22 + this.m13 * other.m32;
  var m13 = this.m11 * other.m13 + this.m12 * other.m23 + this.m13 * other.m33;
  var tx =  this.m11 * other.tx  + this.m12 * other.ty  + this.m13 * other.tz + this.tx;

  var m21 = this.m21 * other.m11 + this.m22 * other.m21 + this.m23 * other.m31;
  var m22 = this.m21 * other.m12 + this.m22 * other.m22 + this.m23 * other.m32;
  var m23 = this.m21 * other.m13 + this.m22 * other.m23 + this.m23 * other.m33;
  var ty =  this.m21 * other.tx  + this.m22 * other.ty  + this.m23 * other.tz + this.ty;

  var m31 = this.m31 * other.m11 + this.m32 * other.m21 + this.m33 * other.m31;
  var m32 = this.m31 * other.m12 + this.m32 * other.m22 + this.m33 * other.m32;
  var m33 = this.m31 * other.m13 + this.m32 * other.m23 + this.m33 * other.m33;
  var tz =  this.m31 * other.tx  + this.m32 * other.ty  + this.m33 * other.tz + this.tz;

  this.m11 = m11;
  this.m12 = m12;
  this.m13 = m13;
  this.m21 = m21;
  this.m22 = m22;
  this.m23 = m23;
  this.m31 = m31;
  this.m32 = m32;
  this.m33 = m33;
  this.tx = tx;
  this.ty = ty;
  this.tz = tz;
};

Mat4.prototype.scaleVec = function(p) {
  var newP = new Vec3(p.x, p.y, p.z);
  this.m_scaleVec(newP);
  return newP;
};

Mat4.prototype.m_scaleVec = function(p) {
  var nx = this.m11 * p.x + this.m12 * p.y + this.m13 * p.z + this.tx;
  var ny = this.m21 * p.x + this.m22 * p.y + this.m23 * p.z + this.ty;
  var nz = this.m31 * p.x + this.m32 * p.y + this.m33 * p.z + this.tz;
  p.x = nx;
  p.y = ny;
  p.z = nz;
};

var AABB = function(x, y, w, h) {
  this.x1 = x;
  this.y1 = y;
  this.x2 = x + w;
  this.y2 = y + h;
};

AABB.prototype.m_fromCenterAndSize = function(c, s) {
  this.x1 = c.x - s.x / 2;
  this.y1 = c.y - s.y / 2;
  this.x2 = c.x + s.x / 2;
  this.y2 = c.y + s.y / 2;
};

AABB.fromCenterAndSize = function(c, s) {
  return new AABB(c.x - s.x / 2, c.y - s.y / 2, s.x, s.y);
};

AABB.prototype.overlaps = function(aabb) {
  return !(this.x1 > aabb.x2 || this.x2 < aabb.x1 ||
           this.y1 > aabb.y2 || this.y2 < aabb.y1);
};

exports.geom = {
  Vec2: Vec2,
  Vec3: Vec3,
  Mat3: Mat3,
  Mat4: Mat4,
  AABB: AABB,
};

})(window);
