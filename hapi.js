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

		return {
			version: '1.4',
			validate: validate,
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
