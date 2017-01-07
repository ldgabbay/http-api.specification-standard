(function() {
	var Hapi = (function() {
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

		var validate = (function() {
			function validateType(top, path, x, type) {
				assert(jsonTypeof(x) === type, path + " not of type \"" + type + "\"");
			}

			function validateNumber(top, path, x) {
				validateType(top, path, x, "number");
			}

			function validateString(top, path, x) {
				validateType(top, path, x, "string");
			}

			function validateBoolean(top, path, x) {
				validateType(top, path, x, "boolean");
			}

			function validateNull(top, path, x) {
				validateType(top, path, x, "null");
			}

			function validateArray(top, path, x) {
				validateType(top, path, x, "array");
			}

			function validateObject(top, path, x) {
				validateType(top, path, x, "object");
			}

			function validateOnlyKeys(top, path, obj, keys) {
				for (var key in obj) {
					if (obj.hasOwnProperty(key))
						assert(keys.indexOf(key) !== -1, path + " contains unexpected key " + JSON.stringify(key));
				}
			}

			function validateRequiredKey(top, path, obj, key, valueValidator) {
				assert(obj.hasOwnProperty(key), path + " does not have key " + JSON.stringify(key));
				valueValidator(top, path + "[" + JSON.stringify(key) + "]", obj[key]);
			}

			function validateOptionalKey(top, path, obj, key, valueValidator) {
				if (obj.hasOwnProperty(key)) {
					valueValidator(top, path + "[" + JSON.stringify(key) + "]", obj[key]);
				}
			}

			function validateList(top, path, arr, valueValidator) {
				for (var i=0; i!=arr.length; ++i)
					valueValidator(top, path + "[" + i + "]", arr[i]);
			}

			function validateMap(top, path, obj, valueValidator) {
				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						valueValidator(top, path + "[" + JSON.stringify(key) + "]", obj[key]);
					}
				}
			}

			function prevalidateSchemas(top, path, x) {
				validateObject(top, path, x);
				validateRequiredKey(top, path, x, "string", validateObject);
				validateRequiredKey(top, path, x, "json", validateObject);
			}

			function prevalidateApiDocument(top, path, x) {
				validateObject(top, path, x);
				validateRequiredKey(top, path, x, "methods", validateObject);
				validateRequiredKey(top, path, x, "schemas", prevalidateSchemas);
			}

			function validateMethods(top, path, x) {
				validateObject(top, path, x);
				validateMap(top, path, x, validateMethod);
			}

			function validateSchemas(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["string", "json"]);
				validateRequiredKey(top, path, x, "string", function(t, p, y) { validateMap(t, p, y, validateStringSchema); });
				validateRequiredKey(top, path, x, "json", function(t, p, y) { validateMap(t, p, y, validateJsonSchema); });
			}

			function validateApiDocument(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["sections", "methods", "schemas"]);
				validateRequiredKey(top, path, x, "sections", validateSectionList);
				validateRequiredKey(top, path, x, "methods", validateMethods);
				validateRequiredKey(top, path, x, "schemas", validateSchemas);
			}

			function validateSectionList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateSection);
			}

			function validateSection(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["name", "summary", "description", "methods"]);
				validateRequiredKey(top, path, x, "name", validateString);
				validateOptionalKey(top, path, x, "summary", validateString);
				validateOptionalKey(top, path, x, "description", validateString);
				validateRequiredKey(top, path, x, "methods", function(t, p, y) { validateList(t, p, y, function(u, q, z) {
					validateString(u, q, z);
					assert(top.methods.hasOwnProperty(z), q + " method reference " + JSON.stringify(z) + " not found");
				}); });
			}

			function validateMethod(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["method", "location", "location_type", "summary", "description", "method", "request", "response"]);
				validateRequiredKey(top, path, x, "method", validateString);
				validateRequiredKey(top, path, x, "location", validateString);
				validateRequiredKey(top, path, x, "location_type", validateString);
				validateOptionalKey(top, path, x, "summary", validateString);
				validateOptionalKey(top, path, x, "description", validateString);
				validateOptionalKey(top, path, x, "method", validateString);
				validateRequiredKey(top, path, x, "request", validateRequest);
				validateRequiredKey(top, path, x, "response", validateResponseList);
			}

			function validateRequest(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["path", "query", "header", "body"]);
				validateOptionalKey(top, path, x, "path", validateParameterList);
				validateOptionalKey(top, path, x, "query", validateParameterList);
				validateOptionalKey(top, path, x, "header", validateParameterList);
				validateOptionalKey(top, path, x, "body", validateBodyList);
			}

			function validateResponseList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateResponse);
			}

			function validateResponse(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["name", "description", "statusCode", "statusMessage", "header", "body"]);
				validateOptionalKey(top, path, x, "name", validateString);
				validateOptionalKey(top, path, x, "description", validateString);
				validateRequiredKey(top, path, x, "statusCode", validateNumber);
				validateOptionalKey(top, path, x, "statusMessage", validateString);
				validateOptionalKey(top, path, x, "header", validateParameterList);
				validateOptionalKey(top, path, x, "body", validateBodyList);
			}

			function validateBodyList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateBody);
			}

			function validateBody(top, path, x) {
				validateObject(top, path, x);
				validateRequiredKey(top, path, x, "type", validateString);
				if (x["type"] === "binary") {
					validateOnlyKeys(top, path, x, ["type"]);
				} else if (x["type"] === "form") {
					validateOnlyKeys(top, path, x, ["type", "contentType", "parameters"]);
					validateOptionalKey(top, path, x, "contentType", validateString);
					validateRequiredKey(top, path, x, "parameters", validateParameterList);
				} else if (x["type"] === "json") {
					validateOnlyKeys(top, path, x, ["type", "contentType", "schema"]);
					validateOptionalKey(top, path, x, "contentType", validateString);
					validateRequiredKey(top, path, x, "schema", validateJsonSchema);
				} else {
					assert(false, path + " has invalid type " + JSON.stringify(x["type"]));
				}		
			}

			function validateParameterList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateParameter);
			}

			function validateParameter(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["name", "description", "frequency", "value"]);
				validateRequiredKey(top, path, x, "name", validateStringSchema);
				validateOptionalKey(top, path, x, "description", validateString);
				validateRequiredKey(top, path, x, "frequency", validateString);
				validateRequiredKey(top, path, x, "value", validateStringSchema);
			}

			function validateStringSchema(top, path, x) {
				var t = jsonTypeof(x);
				if (t === "string") {
					;
				} else if (t === "object") {
					if (x.hasOwnProperty("ref")) {
						validateOnlyKeys(top, path, x, ["ref"]);
						validateRequiredKey(top, path, x, "ref", validateString);
						assert(top.schemas.string.hasOwnProperty(x["ref"]), path + " string schema reference " + JSON.stringify(x["ref"]) + " not found");
					} else if (x.hasOwnProperty("oneOf")) {
						validateOnlyKeys(top, path, x, ["oneOf"]);
						validateRequiredKey(top, path, x, "oneOf", validateStringSchemaList);
					} else {
						validateOnlyKeys(top, path, x, ["criteria", "examples"]);
						validateOptionalKey(top, path, x, "criteria", function(t, p, y) { validateList(t, p, y, validateString); });
						validateOptionalKey(top, path, x, "examples", function(t, p, y) { validateList(t, p, y, validateString); });
					}
				} else {
					assert(false, path + " is of invalid type " + JSON.stringify(t));
				}
			}

			function validateStringSchemaList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateStringSchema);
			}

			function validateJsonSchema(top, path, x) {
				validateObject(top, path, x);
				if (x.hasOwnProperty("ref")) {
					validateOnlyKeys(top, path, x, ["ref"]);
					validateRequiredKey(top, path, x, "ref", validateString);
					assert(top.schemas.json.hasOwnProperty(x["ref"]), path + " json schema reference " + JSON.stringify(x["ref"]) + " not found");
				} else if (x.hasOwnProperty("oneOf")) {
					validateOnlyKeys(top, path, x, ["oneOf"]);
					validateRequiredKey(top, path, x, "oneOf", validateJsonSchemaList);
				} else {
					validateRequiredKey(top, path, x, "type", validateString);
					if (x["type"] === "null") {
						validateOnlyKeys(top, path, x, ["type"]);
					} else if (x["type"] === "boolean") {
						validateOnlyKeys(top, path, x, ["type"]);
					} else if (x["type"] === "number") {
						validateOnlyKeys(top, path, x, ["type", "criteria", "examples"]);
						validateOptionalKey(top, path, x, "criteria", function(t, p, y) { validateList(t, p, y, validateString); });
						validateOptionalKey(top, path, x, "examples", function(t, p, y) { validateList(t, p, y, validateString); });
					} else if (x["type"] === "string") {
						validateOnlyKeys(top, path, x, ["type", "format"]);
						validateOptionalKey(top, path, x, "format", validateStringSchema);
					} else if (x["type"] === "array") {
						validateOnlyKeys(top, path, x, ["type", "criteria", "examples", "items"]);
						validateOptionalKey(top, path, x, "criteria", function(t, p, y) { validateList(t, p, y, validateString); });
						validateOptionalKey(top, path, x, "examples", function(t, p, y) { validateList(t, p, y, validateString); });
						validateRequiredKey(top, path, x, "items", validateJsonItemList);
					} else if (x["type"] === "object") {
						validateOnlyKeys(top, path, x, ["type", "criteria", "examples", "properties"]);
						validateOptionalKey(top, path, x, "criteria", function(t, p, y) { validateList(t, p, y, validateString); });
						validateOptionalKey(top, path, x, "examples", function(t, p, y) { validateList(t, p, y, validateString); });
						validateRequiredKey(top, path, x, "properties", validateJsonPropertyList);
					} else {
						assert(false, path + "[\"type\"] has an invalid value " + JSON.stringify(x["type"]));
					}
				}
				return false;
			}

			function validateJsonSchemaList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateJsonSchema);
			}

			function validateJsonItemList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateJsonItem);
			}

			function validateJsonItem(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["index", "description", "value"]);
				validateRequiredKey(top, path, x, "index", validateString);
				validateOptionalKey(top, path, x, "description", validateString);
				validateRequiredKey(top, path, x, "value", validateJsonSchema);
			}

			function validateJsonPropertyList(top, path, x) {
				validateArray(top, path, x);
				validateList(top, path, x, validateJsonProperty);
			}

			function validateJsonProperty(top, path, x) {
				validateObject(top, path, x);
				validateOnlyKeys(top, path, x, ["key", "description", "frequency", "value"]);
				validateRequiredKey(top, path, x, "key", validateStringSchema);
				validateOptionalKey(top, path, x, "description", validateString);
				validateRequiredKey(top, path, x, "frequency", validateString);
				validateRequiredKey(top, path, x, "value", validateJsonSchema);
			}

			function validate(httpapiSpec) {
				prevalidateApiDocument(httpapiSpec, "document", httpapiSpec);
				validateApiDocument(httpapiSpec, "document", httpapiSpec);
			};

			return validate;
		});

		var parse = (function() {
			var context = null;

			function Section(section) {
				context.sections.push(this);

				this.name = section.name;
				if (section.hasOwnProperty('summary')) this.summary = section.summary;
				if (section.hasOwnProperty('description')) this.description = section.description;
				this.methods = section.methods.slice();
			}

			function makeSection(section) { return new Section(section); }

			function Parameter(parameter) {
				this.name = makeStringSchema(parameter.name);
				if (parameter.hasOwnProperty('description')) this.description = parameter.description;
				this.frequency = parameter.frequency;
				this.value = makeStringSchema(parameter.value);
			}

			function makeParameter(parameter) { return new Parameter(parameter); }

			function BinaryBody(body) {
				this.type = body.type;
			}

			function FormBody(body) {
				this.type = body.type;
				if (body.hasOwnProperty('contentType')) this.contentType = body.contentType;
				this._parameters = body.parameters.map(makeParameter);
			}

			function JsonBody(body) {
				this.type = body.type;
				if (body.hasOwnProperty('contentType')) this.contentType = body.contentType;
				this._schema = makeJsonSchema(body.schema);
			}

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

			function makeRequest(request) { return new Request(request); }

			function Response(response) {
				if (response.hasOwnProperty('name')) this.name = response.name;
				if (response.hasOwnProperty('description')) this.description = response.description;
				this.statusCode = response.statusCode;
				if (response.hasOwnProperty('statusMessage')) this.statusMessage = response.statusMessage;
				if (response.hasOwnProperty('header')) this.header = response.header.map(makeParameter);
				if (response.hasOwnProperty('body')) this.body = response.body.map(makeBody);
			}

			function makeResponse(response) { return new Response(response); }

			function Method(method) {
				this.method = method.method;
				this.location = method.location;
				this.location_type = method.location_type;
				if (method.hasOwnProperty('summary')) this.summary = method.summary;
				if (method.hasOwnProperty('description')) this.description = method.description;
				this.request = makeRequest(method.request);
				this.response = method.response.map(makeResponse);
			}

			function makeMethod(method) { return new Method(method); }

			function LiteralSS(ss) {
				this.type = 'literal';
				this._value = ss;
			}

			function GeneralSS(ss) {
				this.type = 'general';
				if (ss.hasOwnProperty('criteria')) this._criteria = ss.criteria;
				if (ss.hasOwnProperty('examples')) this._examples = ss.examples.map(function(value) { return JSON.stringify(value); });
			}

			function ReferenceSS(ss) {
				context.srefs.push(this);

				this.type = 'reference';
				this._ref = ss.ref;
			}

			function OneOfSS(ss) {
				this.type = 'oneOf';
				this._oneOf = ss.oneOf.map(makeStringSchema);
			}

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

			function makeJsonItem(item) { return new JsonItem(item); }

			function JsonProperty(property) {
				this.key = makeStringSchema(property.key);
				if (property.hasOwnProperty('description')) this.description = property.description;
				this.frequency = property.frequency;
				this.value = makeJsonSchema(property.value);
			}

			function makeJsonProperty(property) { return new JsonProperty(property); }

			function ReferenceJS(js) {
				context.jrefs.push(this);

				this.type = 'reference';
				this._ref = js.ref;
			}

			function OneOfJS(js) {
				this.type = 'oneOf';
				this._oneOf = js.oneOf.map(makeJsonSchema);
			}

			function NullJS(js) {
				this.type = js.type;
			}

			function BooleanJS(js) {
				this.type = js.type;
			}

			function NumberJS(js) {
				this.type = js.type;
				if (js.hasOwnProperty('criteria')) this._criteria = js.criteria;
				if (js.hasOwnProperty('examples')) this._examples = js.examples;
			}

			function StringJS(js) {
				this.type = js.type;
				if (js.hasOwnProperty('format')) this._format = makeStringSchema(js.format);
			}

			function ArrayJS(js) {
				this.type = js.type;
				if (js.hasOwnProperty('criteria')) this._criteria = js.criteria;
				if (js.hasOwnProperty('examples')) this._examples = js.examples;
				this._items = js.items.map(makeJsonItem);
			}

			function ObjectJS(js) {
				this.type = js.type;
				if (js.hasOwnProperty('criteria')) this._criteria = js.criteria;
				if (js.hasOwnProperty('examples')) this._examples = js.examples;
				this._properties = js.properties.map(makeJsonProperty);
			}

			function makeJsonSchema(js) {
				if (js.hasOwnProperty("ref")) return new ReferenceJS(js);
				if (js.hasOwnProperty("oneOf")) return new OneOfJS(js);
				if (js.type === 'null') return new NullJS(js);
				if (js.type === 'boolean') return new BooleanJS(js);
				if (js.type === 'number') return new NumberJS(js);
				if (js.type === 'string') return new StringJS(js);
				if (js.type === 'array') return new ArrayJS(js);
				if (js.type === 'object') return new ObjectJS(js);
				throw new ParseError();
			}

			function ApiDocument(httpapiSpec) {
				context = {
					srefs: [],
					jrefs: [],
					sections: []
				};

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
				this.schemaTags = {
					string: Object.getOwnPropertyNames(httpapiSpec.schemas.string).sort(),
					json: Object.getOwnPropertyNames(httpapiSpec.schemas.json).sort(),
				}
				for(var key in this.methods) {
					if(this.methods.hasOwnProperty(key)) {
						this.methods[key].tag = key;
					}
				}

				for(var i=0; i!=context.srefs.length; ++i) {
					var ref = context.srefs[i];
					ref._refObj = this.schemas.string[ref._ref];
				}
				for(var i=0; i!=context.jrefs.length; ++i) {
					var ref = context.jrefs[i];
					ref._refObj = this.schemas.json[ref._ref];
				}
				for(var i=0; i!=context.sections.length; ++i) {
					var section = context.sections[i];
					var that = this;
					section.methods = section.methods.map(function(methodTag) {
						return that.methods[methodTag];
					});
				}
				context = null;
			}

			function parse(httpapiSpec) {
				return new ApiDocument(httpapiSpec);
			}

			return parse;
		});

		return {
			version: '1.4',
			validate: validate,
			parse: parse,
			ParseError: ParseError
		};
	})();

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = Hapi;
	}
	else {
		if (typeof define === 'function' && define.amd) {
			define([], function() {
				return Hapi;
			});
		}
		else {
			window.Hapi = Hapi;
		}
	}
})();
