// +----------------------------------------------------------------------------
// | Helpers
function isDef(x) { return x !== undefined; };

// from: http://paulirish.com/2011/requestanimationrender-for-smart-animating/
var requestAnimFrame = (function(){
  return window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.oRequestAnimationFrame
  || window.msRequestAnimationFrame
  || function(callback, element){ window.setTimeout(callback, 1000 / 60); };
}());

// +----------------------------------------------------------------------------
// | JSON
json = {};

json.load = function(url, cb) {
  var xhr = new XMLHttpRequest();
  if (xhr.onload) {
    xhr.onload = function() {
      cb(JSON.parse(xhr.responseText));
    };
    xhr.onerror = function() {
      throw xhr.statusText;
    };
  } else {
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          cb(JSON.parse(xhr.responseText));
        } else {
          throw xhr.statusText;
        }
      }
    };
  }
  xhr.open('get', url, true /* async */);
  xhr.send();
};

// +----------------------------------------------------------------------------
// | MT - MersenneTwister
MT = function(seed) {
  this.pool = new Array(624);
  this.index = 0;
  this.init_(seed);
};

MT.prototype.init_ = function(seed) {
  this.pool[0] = seed;
  for (var i = 1; i < this.pool.length; i++) {
    var last = this.pool[i - 1];
    this.pool[i] = (1812433253 * (last ^ (last >> 30)) + i) & 0xffffffff;
  }
};

MT.prototype.next = function() {
  if (this.index == 0) this.gen();
  var y = this.pool[this.index];
  y = y ^ (y >> 11);
  y = y ^ ((y << 7) & 0x9d2c5680);
  y = y ^ ((y << 15) & 0xefc60000);
  y = y ^ (y >> 18);

  this.index = (this.index + 1) % 624;
  return y / 0x7ffff97d;
};

MT.prototype.nextFloat = function(a, opt_b) {
  var min = 0;
  var max = a;
  if (isDef(opt_b)) {
    min = a;
    max = opt_b;
  }
  return this.next() * (max - min) + min;
};

MT.prototype.nextInt = function(a, opt_b) {
  return Math.floor(this.nextFloat(a, opt_b));
};

MT.prototype.nextSign = function() {
  return this.next() < 0.5 ? -1 : 1;
};

MT.prototype.gen = function() {
  for (var i = 0; i < this.pool.length; i++) {
    var ni = (i + 1) % this.pool.length;
    var y = (this.pool[i] & 0x80000000) + (this.pool[ni] & 0x7fffffff);
    this.pool[i] = this.pool[(i + 397) % 624] ^ (y >> 1);
    if (y % 2) {
      this.pool[i] ^= 0x9908b0df;
    }
  }
};
