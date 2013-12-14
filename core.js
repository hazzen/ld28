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
