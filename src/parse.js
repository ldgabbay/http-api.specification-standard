"use strict";

const common = require('./common.js');
const ParseError = common.ParseError;
const jsonTypeof = common.jsonTypeof;


function ApiDocument(httpapiSpec) {

  function Section(section) {
    this.name = section.name;
    if (section.hasOwnProperty('summary')) this.summary = section.summary;
    if (section.hasOwnProperty('description')) this.description = section.description;
    this.methods = section.methods.slice();
  }

  Section.prototype.accept = function(visitor) {
    if (visitor.enterSection)
      visitor.enterSection(this);

    if (visitor.exitSection)
      visitor.exitSection(this);
  };

  function makeSection(section) { return new Section(section); }

  function Parameter(parameter) {
    this.name = makeStringSchema(parameter.name);
    if (parameter.hasOwnProperty('description')) this.description = parameter.description;
    this.frequency = parameter.frequency;
    this.value = makeStringSchema(parameter.value);
  }

  Parameter.prototype.accept = function(visitor) {
    if (visitor.enterParameter)
      visitor.enterParameter(this);

    this.name.accept(visitor);
    this.value.accept(visitor);

    if (visitor.exitParameter)
      visitor.exitParameter(this);
  };

  function makeParameter(parameter) {
    if (jsonTypeof(parameter) === "string")
      parameter = templates.parameter[parameter];

    return new Parameter(parameter);
  }

  function BinaryBody(body) {
    this.type = body.type;
    if (body.hasOwnProperty('contentType'))
      this.contentType = body.contentType;
    else
      this.contentType = 'application/octet-stream';
  }

  BinaryBody.prototype.accept = function(visitor) {
    if (visitor.enterBinaryBody)
      visitor.enterBinaryBody(this);

    if (visitor.exitBinaryBody)
      visitor.exitBinaryBody(this);
  };

  function FormBody(body) {
    this.type = body.type;
    if (body.hasOwnProperty('contentType'))
      this.contentType = body.contentType;
    else
      this.contentType = 'application/x-www-form-urlencoded';
    this.parameters = body.parameters.map(makeParameter);
  }

  FormBody.prototype.accept = function(visitor) {
    if (visitor.enterFormBody)
      visitor.enterFormBody(this);

    this.parameters.map(function(parameter) { parameter.accept(visitor); });

    if (visitor.exitFormBody)
      visitor.exitFormBody(this);
  };

  function JsonBody(body) {
    this.type = body.type;
    if (body.hasOwnProperty('contentType'))
      this.contentType = body.contentType;
    else
      this.contentType = 'application/json';
    if (body.hasOwnProperty('description')) this.description = body.description;
    this.schema = makeJsonSchema(body.schema);
  }

  JsonBody.prototype.accept = function(visitor) {
    if (visitor.enterJsonBody)
      visitor.enterJsonBody(this);

    this.schema.accept(visitor);

    if (visitor.exitJsonBody)
      visitor.exitJsonBody(this);
  };

  function makeBody(body) {
    if (body.type === 'binary')
      return new BinaryBody(body);
    if (body.type === 'form')
      return new FormBody(body);
    if (body.type === 'json')
      return new JsonBody(body);
    throw new ParseError();
  }

  function Request(request) {
    if (request.hasOwnProperty('path')) this.path = request.path.map(makeParameter);
    if (request.hasOwnProperty('query')) this.query = request.query.map(makeParameter);
    if (request.hasOwnProperty('header')) this.header = request.header.map(makeParameter);
    if (request.hasOwnProperty('body')) this.body = request.body.map(makeBody);
  }

  Request.prototype.accept = function(visitor) {
    if (visitor.enterRequest)
      visitor.enterRequest(this);

    if (this.path)
      this.path.map(function(parameter) { parameter.accept(visitor); });
    if (this.query)
      this.query.map(function(parameter) { parameter.accept(visitor); });
    if (this.header)
      this.header.map(function(parameter) { parameter.accept(visitor); });
    if (this.body)
      this.body.map(function(body) { body.accept(visitor); });

    if (visitor.exitRequest)
      visitor.exitRequest(this);
  };

  function makeRequest(request) { return new Request(request); }

  function Response(response) {
    if (response.hasOwnProperty('name')) this.name = response.name;
    if (response.hasOwnProperty('description')) this.description = response.description;
    this.statusCode = response.statusCode;
    if (response.hasOwnProperty('statusMessage')) this.statusMessage = response.statusMessage;
    if (response.hasOwnProperty('header')) this.header = response.header.map(makeParameter);
    if (response.hasOwnProperty('body')) this.body = response.body.map(makeBody);
  }

  Response.prototype.accept = function(visitor) {
    if (visitor.enterResponse)
      visitor.enterResponse(this);

    if (this.header)
      this.header.map(function(parameter) { parameter.accept(visitor); });
    if (this.body)
      this.body.map(function(body) { body.accept(visitor); });

    if (visitor.exitResponse)
      visitor.exitResponse(this);
  };

  function makeResponse(response) {
    if (jsonTypeof(response) === "string")
      response = templates.response[response];

    return new Response(response);
  }

  function Method(method) {
    this.method = method.method;
    this.location = method.location;
    this.location_type = method.location_type;
    if (method.hasOwnProperty('summary')) this.summary = method.summary;
    if (method.hasOwnProperty('description')) this.description = method.description;
    this.request = makeRequest(method.request);
    this.response = method.response.map(makeResponse);
  }

  Method.prototype.accept = function(visitor) {
    if (visitor.enterMethod)
      visitor.enterMethod(this);

    this.request.accept(visitor);
    this.response.map(function(response) { response.accept(visitor); });

    if (visitor.exitMethod)
      visitor.exitMethod(this);
  };

  function makeMethod(method) { return new Method(method); }

  function LiteralSS(ss) {
    this.type = 'literal';
    this.value = ss;
  }

  LiteralSS.prototype.accept = function(visitor) {
    if (visitor.enterLiteralSS)
      visitor.enterLiteralSS(this);

    if (visitor.exitLiteralSS)
      visitor.exitLiteralSS(this);
  };

  function GeneralSS(ss) {
    this.type = 'general';
    if (ss.hasOwnProperty('description')) this.description = ss.description;
    if (ss.hasOwnProperty('criteria')) this.criteria = ss.criteria;
    if (ss.hasOwnProperty('examples')) this.examples = ss.examples.map(function(value) { return JSON.stringify(value); });
  }

  GeneralSS.prototype.accept = function(visitor) {
    if (visitor.enterGeneralSS)
      visitor.enterGeneralSS(this);

    if (visitor.exitGeneralSS)
      visitor.exitGeneralSS(this);
  };

  function ReferenceSS(ss) {
    this.type = 'reference';
    this.ref = ss.ref;
  }

  ReferenceSS.prototype.accept = function(visitor) {
    if (visitor.enterReferenceSS)
      visitor.enterReferenceSS(this);

    if (visitor.exitReferenceSS)
      visitor.exitReferenceSS(this);
  };

  function OneOfSS(ss) {
    this.type = 'oneOf';
    if (ss.hasOwnProperty('description')) this.description = ss.description;
    this.oneOf = ss.oneOf.map(makeStringSchema);
  }

  OneOfSS.prototype.accept = function(visitor) {
    if (visitor.enterOneOfSS)
      visitor.enterOneOfSS(this);

    this.oneOf.map(function(stringSchema) { stringSchema.accept(visitor); });

    if (visitor.exitOneOfSS)
      visitor.exitOneOfSS(this);
  };

  function makeStringSchema(ss) {
    if (jsonTypeof(ss) === "string") return new LiteralSS(ss);
    if (ss.hasOwnProperty("ref")) return new ReferenceSS(ss);
    if (ss.hasOwnProperty("oneOf")) return new OneOfSS(ss);
    return new GeneralSS(ss);
  }

  function JsonItem(item) {
    this.index = item.index;
    if (item.hasOwnProperty('description')) this.description = item.description;
    this.value = makeJsonSchema(item.value);
  }

  JsonItem.prototype.accept = function(visitor) {
    if (visitor.enterJsonItem)
      visitor.enterJsonItem(this);

    this.value.accept(visitor);

    if (visitor.exitJsonItem)
      visitor.exitJsonItem(this);
  };

  function makeJsonItem(item) { return new JsonItem(item); }

  function JsonProperty(property) {
    this.key = makeStringSchema(property.key);
    if (property.hasOwnProperty('description')) this.description = property.description;
    this.frequency = property.frequency;
    this.value = makeJsonSchema(property.value);
  }

  JsonProperty.prototype.accept = function(visitor) {
    if (visitor.enterJsonProperty)
      visitor.enterJsonProperty(this);

    this.key.accept(visitor);
    this.value.accept(visitor);

    if (visitor.exitJsonProperty)
      visitor.exitJsonProperty(this);
  };

  function makeJsonProperty(property) { return new JsonProperty(property); }

  function ReferenceJS(js) {
    this.type = 'reference';
    this.ref = js.ref;
  }

  ReferenceJS.prototype.accept = function(visitor) {
    if (visitor.enterReferenceJS)
      visitor.enterReferenceJS(this);

    if (visitor.exitReferenceJS)
      visitor.exitReferenceJS(this);
  };

  function StringReferenceJS(js) {
    this.type = 'stringReference';
    this.sref = js.sref;
  }

  StringReferenceJS.prototype.accept = function(visitor) {
    if (visitor.enterStringReferenceJS)
      visitor.enterStringReferenceJS(this);

    if (visitor.exitStringReferenceJS)
      visitor.exitStringReferenceJS(this);
  };

  function OneOfJS(js) {
    this.type = 'oneOf';
    if (js.hasOwnProperty('description')) this.description = js.description;
    this.oneOf = js.oneOf.map(makeJsonSchema);
  }

  OneOfJS.prototype.accept = function(visitor) {
    if (visitor.enterOneOfJS)
      visitor.enterOneOfJS(this);

    this.oneOf.map(function(jsonSchema) { jsonSchema.accept(visitor); });

    if (visitor.exitOneOfJS)
      visitor.exitOneOfJS(this);
  };

  function LiteralJS(js) {
    this.type = 'literal';
    this.value = js.literal;
  }
  
  LiteralJS.prototype.accept = function(visitor) {
    if (visitor.enterLiteralJS)
      visitor.enterLiteralJS(this);

    if (visitor.exitLiteralJS)
      visitor.exitLiteralJS(this);
  };
  
  function NullJS(js) {
    this.type = js.type;
    if (js.hasOwnProperty('description')) this.description = js.description;
  }

  NullJS.prototype.accept = function(visitor) {
    if (visitor.enterNullJS)
      visitor.enterNullJS(this);

    if (visitor.exitNullJS)
      visitor.exitNullJS(this);
  };

  function BooleanJS(js) {
    this.type = js.type;
    if (js.hasOwnProperty('description')) this.description = js.description;
  }

  BooleanJS.prototype.accept = function(visitor) {
    if (visitor.enterBooleanJS)
      visitor.enterBooleanJS(this);

    if (visitor.exitBooleanJS)
      visitor.exitBooleanJS(this);
  };

  function NumberJS(js) {
    this.type = js.type;
    if (js.hasOwnProperty('description')) this.description = js.description;
    if (js.hasOwnProperty('criteria')) this.criteria = js.criteria;
    if (js.hasOwnProperty('examples')) this.examples = js.examples;
  }

  NumberJS.prototype.accept = function(visitor) {
    if (visitor.enterNumberJS)
      visitor.enterNumberJS(this);

    if (visitor.exitNumberJS)
      visitor.exitNumberJS(this);
  };

  function StringJS(js) {
    this.type = js.type;
    if (js.hasOwnProperty('description')) this.description = js.description;
    if (js.hasOwnProperty('format')) this.format = makeStringSchema(js.format);
  }

  StringJS.prototype.accept = function(visitor) {
    if (visitor.enterStringJS)
      visitor.enterStringJS(this);

    if (this.format)
      this.format.accept(visitor);

    if (visitor.exitStringJS)
      visitor.exitStringJS(this);
  };

  function ArrayJS(js) {
    this.type = js.type;
    if (js.hasOwnProperty('description')) this.description = js.description;
    if (js.hasOwnProperty('criteria')) this.criteria = js.criteria;
    if (js.hasOwnProperty('examples')) this.examples = js.examples;
    if (jsonTypeof(js.items) === "array") {
      this.arrayType = 'record';
      this.items = js.items.map(makeJsonItem);
    } else if (jsonTypeof(js.items) === "object") {
      this.arrayType = 'simple';
      this.items = makeJsonSchema(js.items);
    }
  }

  ArrayJS.prototype.accept = function(visitor) {
    if (visitor.enterArrayJS)
      visitor.enterArrayJS(this);

    if (this.arrayType === 'simple') {
      this.items.accept(visitor);
    } else if (this.arrayType === 'record') {
      this.items.map(function(item) { item.accept(visitor); });
    }

    if (visitor.exitArrayJS)
      visitor.exitArrayJS(this);
  };

  function ObjectJS(js) {
    this.type = js.type;
    if (js.hasOwnProperty('description')) this.description = js.description;
    if (js.hasOwnProperty('criteria')) this.criteria = js.criteria;
    if (js.hasOwnProperty('examples')) this.examples = js.examples;
    this.properties = js.properties.map(makeJsonProperty);
  }

  ObjectJS.prototype.accept = function(visitor) {
    if (visitor.enterObjectJS)
      visitor.enterObjectJS(this);

    this.properties.map(function(property) { property.accept(visitor); });

    if (visitor.exitObjectJS)
      visitor.exitObjectJS(this);
  };

  function makeJsonSchema(js) {
    if (js.hasOwnProperty("ref")) return new ReferenceJS(js);
    if (js.hasOwnProperty("sref")) return new StringReferenceJS(js);
    if (js.hasOwnProperty("oneOf")) return new OneOfJS(js);
    if (js.hasOwnProperty("literal")) return new LiteralJS(js);
    if (js.type === 'null') return new NullJS(js);
    if (js.type === 'boolean') return new BooleanJS(js);
    if (js.type === 'number') return new NumberJS(js);
    if (js.type === 'string') return new StringJS(js);
    if (js.type === 'array') return new ArrayJS(js);
    if (js.type === 'object') return new ObjectJS(js);
    throw new ParseError();
  }

  var templates = {
    response: {},
    parameter: {}
  };

  if (httpapiSpec.templates) {
    if (httpapiSpec.templates.response) {
      templates.response = Object.getOwnPropertyNames(httpapiSpec.templates.response).reduce(function(r, key) {
        r[key] = httpapiSpec.templates.response[key];
        return r;
      }, {});
    }
    if (httpapiSpec.templates.parameter) {
      templates.parameter = Object.getOwnPropertyNames(httpapiSpec.templates.parameter).reduce(function(p, key) {
        p[key] = httpapiSpec.templates.parameter[key];
        return p;
      }, {});
    }
  }

  this.sections = httpapiSpec.sections.map(makeSection);
  this.methods = Object.getOwnPropertyNames(httpapiSpec.methods).reduce(function(methods, key) {
    methods[key] = makeMethod(httpapiSpec.methods[key]);
    return methods;
  }, {});
  this.schemas = {
    string: Object.getOwnPropertyNames(httpapiSpec.schemas.string).reduce(function(ss, key) {
      ss[key] = makeStringSchema(httpapiSpec.schemas.string[key]);
      return ss;
    }, {}),
    json: Object.getOwnPropertyNames(httpapiSpec.schemas.json).reduce(function(js, key) {
      js[key] = makeJsonSchema(httpapiSpec.schemas.json[key]);
      return js;
    }, {})
  };
}

ApiDocument.prototype.accept = function(visitor) {
  if (visitor.enterApiDocument)
    visitor.enterApiDocument(this);

  for (var key in this.sections)
    if (this.sections.hasOwnProperty(key))
      this.sections[key].accept(visitor);

  for (var key in this.methods)
    if (this.methods.hasOwnProperty(key))
      this.methods[key].accept(visitor);

  for (var key in this.schemas.string)
    if (this.schemas.string.hasOwnProperty(key))
      this.schemas.string[key].accept(visitor);

  for (var key in this.schemas.json)
    if (this.schemas.json.hasOwnProperty(key))
      this.schemas.json[key].accept(visitor);

  if (visitor.exitApiDocument)
    visitor.exitApiDocument(this);
};

function parse(httpapiSpec) {
  return new ApiDocument(httpapiSpec);
}

module.exports = parse;
