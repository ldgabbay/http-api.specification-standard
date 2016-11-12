"use strict";

var assert = require('assert');
var fs = require('fs');



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


function validateType(path, x, type) {
	assert(jsonTypeof(x) === type, path + " not of type " + type);
}

function validateNumber(path, x) {
	validateType(path, x, "number");
}

function validateString(path, x) {
	validateType(path, x, "string");
}

function validateBoolean(path, x) {
	validateType(path, x, "boolean");
}

function validateNull(path, x) {
	validateType(path, x, "null");
}

function validateArray(path, x) {
	validateType(path, x, "array");
}

function validateObject(path, x) {
	validateType(path, x, "object");
}



function validateRequiredKey(path, obj, key, valueValidator) {
	assert(obj.hasOwnProperty(key), path + " does not have key " + key);
	valueValidator(path + "." + key, obj[key]);
}

function validateOptionalKey(path, obj, key, valueValidator) {
	if (obj.hasOwnProperty(key)) {
		valueValidator(path + "." + key, obj[key]);
	}
}

function validateList(path, arr, valueValidator) {
	for (var i=0; i!=arr.length; ++i)
		valueValidator(path + "[" + i + "]", arr[i]);
}

function validateMap(path, obj, valueValidator) {
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			valueValidator(path + "." + key, obj[key]);
		}
	}
}

function validateApiDocument_methods(path, x) {
	validateObject(path, x);
	validateMap(path, x, validateMethod);
}

function validateApiDocument_schemas(path, x) {
	validateObject(path, x);
	validateOptionalKey(path, x, "string", function(p, y) { validateMap(p, y, validateStringSchema); });
	validateOptionalKey(path, x, "json", function(p, y) { validateMap(p, y, validateJsonSchema); });
}


function validateApiDocument(path, x) {
	validateObject(path, x);
	validateOptionalKey(path, x, "sections", validateSectionList);
	validateOptionalKey(path, x, "methods", validateApiDocument_methods);
	validateOptionalKey(path, x, "schemas", validateApiDocument_schemas);
}

function validateSectionList(path, x) {
	validateArray(path, x);
	validateList(path, x, validateSection);
}

function validateSection(path, x) {
	validateObject(path, x);
	validateRequiredKey(path, x, "name", validateString);
	validateOptionalKey(path, x, "summary", validateString);
	validateOptionalKey(path, x, "description", validateString);
	validateRequiredKey(path, x, "methods", function(p, y) { validateList(p, y, validateString); });
}

function validateMethod(path, x) {
	validateObject(path, x);
	validateRequiredKey(path, x, "method", validateString);
	validateRequiredKey(path, x, "location", validateString);
	validateRequiredKey(path, x, "location_type", validateString);
	validateOptionalKey(path, x, "summary", validateString);
	validateOptionalKey(path, x, "description", validateString);
	validateOptionalKey(path, x, "method", validateString);
	validateRequiredKey(path, x, "request", validateRequest);
	validateRequiredKey(path, x, "response", validateResponseList);
}

function validateRequest(path, x) {
	validateObject(path, x);
	validateOptionalKey(path, x, "path", validateParameterList);
	validateOptionalKey(path, x, "query", validateParameterList);
	validateOptionalKey(path, x, "header", validateParameterList);
	validateOptionalKey(path, x, "body", validateBodyList);
}

function validateResponseList(path, x) {
	validateArray(path, x);
	validateList(path, x, validateResponse);
}

function validateResponse(path, x) {
	validateObject(path, x);
	validateOptionalKey(path, x, "name", validateString);
	validateOptionalKey(path, x, "description", validateString);
	validateRequiredKey(path, x, "statusCode", validateNumber);
	validateOptionalKey(path, x, "statusMessage", validateString);
	validateOptionalKey(path, x, "header", validateParameterList);
	validateOptionalKey(path, x, "body", validateBodyList);
}

function validateBodyList(path, x) {
	validateArray(path, x);
	validateList(path, x, validateBody);
}

function validateBody(path, x) {
	validateObject(path, x);
	validateRequiredKey(path, x, "type", validateString);
	if (x["type"] === "binary") {
		;
	} else if (x["type"] === "form") {
		validateOptionalKey(path, x, "contentType", validateString);
		validateRequiredKey(path, x, "parameters", validateParameterList);
	} else if (x["type"] === "json") {
		validateOptionalKey(path, x, "contentType", validateString);
		validateRequiredKey(path, x, "schema", validateJsonSchema);
	} else {
		assert(false);
	}		
}

function validateParameterList(path, x) {
	validateArray(path, x);
	validateList(path, x, validateParameter);
}

function validateParameter(path, x) {
	validateObject(path, x);
	validateRequiredKey(path, x, "name", validateStringSchema);
	validateOptionalKey(path, x, "description", validateString);
	validateRequiredKey(path, x, "frequency", validateString);
	validateRequiredKey(path, x, "value", validateStringSchema);
}

function validateStringSchema(path, x) {
	var t = jsonTypeof(x);
	if (t === "string") {
		;
	} else if (t === "object") {
		if (x.hasOwnProperty("ref")) {
			validateString(path + ".ref", x["ref"]);
		} else {
			validateOptionalKey(path, x, "criteria", function(p, y) { validateList(p, y, validateString); });
			validateOptionalKey(path, x, "examples", function(p, y) { validateList(p, y, validateString); });
		}
	} else {
		assert(false);
	}
}

function validateJsonSchema(path, x) {
	validateObject(path, x);
	if (x.hasOwnProperty("ref")) {
		validateString(path + ".ref", x["ref"]);
	} else {
		validateRequiredKey(path, x, "type", validateString);
		if (x["type"] === "null") {
			;
		} else if (x["type"] === "boolean") {
			;
		} else if (x["type"] === "number") {
			validateOptionalKey(path, x, "criteria", function(p, y) { validateList(p, y, validateString); });
			validateOptionalKey(path, x, "examples", function(p, y) { validateList(p, y, validateString); });
		} else if (x["type"] === "string") {
			validateOptionalKey(path, x, "format", validateStringSchema);
		} else if (x["type"] === "array") {
			validateOptionalKey(path, x, "criteria", function(p, y) { validateList(p, y, validateString); });
			validateOptionalKey(path, x, "examples", function(p, y) { validateList(p, y, validateString); });
			validateRequiredKey(path, x, "items", validateJsonItemList);
		} else if (x["type"] === "object") {
			validateOptionalKey(path, x, "criteria", function(p, y) { validateList(p, y, validateString); });
			validateOptionalKey(path, x, "examples", function(p, y) { validateList(p, y, validateString); });
			validateRequiredKey(path, x, "properties", validateJsonPropertyList);
		} else {
			assert(false);
		}
	}
	return false;
}

function validateJsonItemList(path, x) {
	validateArray(path, x);
	validateList(path, x, validateJsonItem);
}

function validateJsonItem(path, x) {
	validateObject(path, x);
	validateRequiredKey(path, x, "index", validateString);
	validateOptionalKey(path, x, "description", validateString);
	validateRequiredKey(path, x, "value", validateJsonSchema);
}

function validateJsonPropertyList(path, x) {
	validateArray(path, x);
	validateList(path, x, validateJsonProperty);
}

function validateJsonProperty(path, x) {
	validateObject(path, x);
	validateRequiredKey(path, x, "key", validateStringSchema);
	validateOptionalKey(path, x, "description", validateString);
	validateRequiredKey(path, x, "frequency", validateString);
	validateRequiredKey(path, x, "value", validateJsonSchema);
}




if(process.argv.length < 3) {
	console.error("No filename specified.");
	process.exit(1);	
}

var fn = process.argv[2];
var body = null;
try {
	body = fs.readFileSync(fn, 'utf8');	
}
catch(e) {
	console.error("Couldn't read: "+e);
	process.exit(1);
}

var x = null;
try {
	x = JSON.parse(body);
}
catch(e) {
	console.error("Couldn't parse: "+e);
	process.exit(1);
}

validateApiDocument("", x);
