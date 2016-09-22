"use strict";

var assert = require('assert');
var fs = require('fs');



function jsontypeof(x) {
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

function validateRequiredKey(obj, key, validator) {
	assert(key in obj);
	validator(obj[key]);
	delete obj[key];
}

function validateOptionalKey(obj, key, validator) {
	if (key in obj) {
		validator(obj[key]);
		delete obj[key];
	}
}

function validateObject(x) {
	assert(jsontypeof(x) === "object");
}

function validateArray(x) {
	assert(jsontypeof(x) === "array");
}

function validateString(x) {
	assert(jsontypeof(x) === "string");
}

function validateBoolean(x) {
	assert(jsontypeof(x) === "boolean");
}

function validateNumber(x) {
	assert(jsontypeof(x) === "number");
}

function validateNull(x) {
	assert(jsontypeof(x) === "null");
}

function validateSectionMethods(arr) {
	validateArray(arr);

	arr.forEach(function(elem) {
		validateString(elem);
	});
}

function validateSection(obj) {
	validateObject(obj);

	validateRequiredKey(obj, "name", validateString);
	validateOptionalKey(obj, "summary", validateString);
	validateOptionalKey(obj, "description", validateString);
	validateRequiredKey(obj, "methods", validateSectionMethods);
}

function validateMethod() {}
function validateJsonSchema() {}

function validateSectionList(arr) {
	validateArray(arr);

	arr.forEach(function(elem) {
		validateSection(elem);
	});
}

function validateMethods(obj) {
	validateObject(obj);

	Object.keys(obj).forEach(function(key) {
		validateMethod(obj[key]);
	});
}

function validateSchemasJson(obj) {
	validateObject(obj);

	Object.keys(obj).forEach(function(key) {
		validateJsonSchema(obj[key]);
	});
}

function validateSchemas(obj) {
	validateObject(obj);

	validateOptionalKey(obj, "json", validateSchemasJson);
}

function validateAPIDocument(obj) {
	validateObject(obj);

	validateOptionalKey(obj, "sections", validateSectionList);
	validateOptionalKey(obj, "methods", validateMethods);
	validateOptionalKey(obj, "schemas", validateSchemas);

	assert(Object.keys(obj).length === 0);
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

var obj = null;
try {
	obj = JSON.parse(body);
}
catch(e) {
	console.error("Couldn't parse: "+e);
	process.exit(1);
}

validateAPIDocument(obj);
