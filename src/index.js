"use strict";

const validate = require('./validate.js');
const parse = require('./parse.js');
const common = require('./common.js');
const ParseError = common.ParseError;
const assert = common.assert;
const jsonTypeof = common.jsonTypeof;

module.exports = {
  version: '1.9',
  validate: validate,
  parse: parse,
  ParseError: ParseError
};
