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
				validateOnlyKeys(top, path, x, ["method", "location", "location_type", "summary", "description", "request", "response"]);
				validateRequiredKey(top, path, x, "method", validateString);
				validateRequiredKey(top, path, x, "location", validateString);
				validateRequiredKey(top, path, x, "location_type", validateString);
				validateOptionalKey(top, path, x, "summary", validateString);
				validateOptionalKey(top, path, x, "description", validateString);
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
					validateOnlyKeys(top, path, x, ["type", "contentType"]);
					validateOptionalKey(top, path, x, "contentType", validateString);
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
						validateOnlyKeys(top, path, x, ["oneOf", "description"]);
						validateRequiredKey(top, path, x, "oneOf", validateStringSchemaList);
						validateOptionalKey(top, path, x, "description", validateString);
					} else {
						validateOnlyKeys(top, path, x, ["description", "criteria", "examples"]);
						validateOptionalKey(top, path, x, "description", validateString);
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
					validateOnlyKeys(top, path, x, ["oneOf", "description"]);
					validateRequiredKey(top, path, x, "oneOf", validateJsonSchemaList);
					validateOptionalKey(top, path, x, "description", validateString);
				} else {
					validateRequiredKey(top, path, x, "type", validateString);
					validateOptionalKey(top, path, x, "description", validateString);
					if (x["type"] === "null") {
						validateOnlyKeys(top, path, x, ["type", "description"]);
					} else if (x["type"] === "boolean") {
						validateOnlyKeys(top, path, x, ["type", "description"]);
					} else if (x["type"] === "number") {
						validateOnlyKeys(top, path, x, ["type", "description", "criteria", "examples"]);
						validateOptionalKey(top, path, x, "criteria", function(t, p, y) { validateList(t, p, y, validateString); });
						validateOptionalKey(top, path, x, "examples", function(t, p, y) { validateList(t, p, y, validateString); });
					} else if (x["type"] === "string") {
						validateOnlyKeys(top, path, x, ["type", "description", "format"]);
						validateOptionalKey(top, path, x, "format", validateStringSchema);
					} else if (x["type"] === "array") {
						validateOnlyKeys(top, path, x, ["type", "description", "criteria", "examples", "items"]);
						validateOptionalKey(top, path, x, "criteria", function(t, p, y) { validateList(t, p, y, validateString); });
						validateOptionalKey(top, path, x, "examples", function(t, p, y) { validateList(t, p, y, validateString); });
						validateRequiredKey(top, path, x, "items", validateJsonItems);
					} else if (x["type"] === "object") {
						validateOnlyKeys(top, path, x, ["type", "description", "criteria", "examples", "properties"]);
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

			function validateJsonItems(top, path, x) {
				var t = jsonTypeof(x);
				if (t === "array") {
					validateJsonItemList(top, path, x);
				} else if (t === "object") {
					validateJsonSchema(top, path, x);
				} else {
					assert(false, path + " has an invalid value " + JSON.stringify(x));
				}
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
		})();

		var parse = (function() {
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

			function makeParameter(parameter) { return new Parameter(parameter); }

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

			return parse;
		})();

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
