"use strict";

function ParseError(message) {
  this.message = message;
}

function assert(test, message) {
  if (!test) {
    throw new ParseError(message);
  }
}

function jsonTypeof(x) {
  var t = typeof x;
  if (t === "number") {
    return t;
  } else if (t === "string") {
    return t;
  } else if (t === "boolean") {
    return t;
  } else {
    if (x === null) {
      return "null";
    } else {
      var y = Object.prototype.toString.call(x);
      if (y === "[object Array]") {
        return "array";
      } else if (y === "[object Object]") {
        return "object";
      }
    }
  }
  return undefined;
}

module.exports = {
  ParseError: ParseError,
  assert: assert,
  jsonTypeof: jsonTypeof
};
