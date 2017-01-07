# Standard for HTTP API Specification


This project defines a data structure that specifies an HTTP API.

This structure is specified in a grammar-like syntax in the included [spec.grammar](spec.grammar) file.



## Template Visitor

	var visitor = {
		enterSection: function(obj) { console.log('enterSection'); },
		exitSection: function(obj) { console.log('exitSection'); },
		enterParameter: function(obj) { console.log('enterParameter'); },
		exitParameter: function(obj) { console.log('exitParameter'); },
		enterBinaryBody: function(obj) { console.log('enterBinaryBody'); },
		exitBinaryBody: function(obj) { console.log('exitBinaryBody'); },
		enterFormBody: function(obj) { console.log('enterFormBody'); },
		exitFormBody: function(obj) { console.log('exitFormBody'); },
		enterJsonBody: function(obj) { console.log('enterJsonBody'); },
		exitJsonBody: function(obj) { console.log('exitJsonBody'); },
		enterRequest: function(obj) { console.log('enterRequest'); },
		exitRequest: function(obj) { console.log('exitRequest'); },
		enterResponse: function(obj) { console.log('enterResponse'); },
		exitResponse: function(obj) { console.log('exitResponse'); },
		enterMethod: function(obj) { console.log('enterMethod'); },
		exitMethod: function(obj) { console.log('exitMethod'); },
		enterLiteralSS: function(obj) { console.log('enterLiteralSS'); },
		exitLiteralSS: function(obj) { console.log('exitLiteralSS'); },
		enterGeneralSS: function(obj) { console.log('enterGeneralSS'); },
		exitGeneralSS: function(obj) { console.log('exitGeneralSS'); },
		enterReferenceSS: function(obj) { console.log('enterReferenceSS'); },
		exitReferenceSS: function(obj) { console.log('exitReferenceSS'); },
		enterOneOfSS: function(obj) { console.log('enterOneOfSS'); },
		exitOneOfSS: function(obj) { console.log('exitOneOfSS'); },
		enterJsonItem: function(obj) { console.log('enterJsonItem'); },
		exitJsonItem: function(obj) { console.log('exitJsonItem'); },
		enterJsonProperty: function(obj) { console.log('enterJsonProperty'); },
		exitJsonProperty: function(obj) { console.log('exitJsonProperty'); },
		enterReferenceJS: function(obj) { console.log('enterReferenceJS'); },
		exitReferenceJS: function(obj) { console.log('exitReferenceJS'); },
		enterOneOfJS: function(obj) { console.log('enterOneOfJS'); },
		exitOneOfJS: function(obj) { console.log('exitOneOfJS'); },
		enterNullJS: function(obj) { console.log('enterNullJS'); },
		exitNullJS: function(obj) { console.log('exitNullJS'); },
		enterBooleanJS: function(obj) { console.log('enterBooleanJS'); },
		exitBooleanJS: function(obj) { console.log('exitBooleanJS'); },
		enterNumberJS: function(obj) { console.log('enterNumberJS'); },
		exitNumberJS: function(obj) { console.log('exitNumberJS'); },
		enterStringJS: function(obj) { console.log('enterStringJS'); },
		exitStringJS: function(obj) { console.log('exitStringJS'); },
		enterArrayJS: function(obj) { console.log('enterArrayJS'); },
		exitArrayJS: function(obj) { console.log('exitArrayJS'); },
		enterObjectJS: function(obj) { console.log('enterObjectJS'); },
		exitObjectJS: function(obj) { console.log('exitObjectJS'); },
		enterApiDocument: function(obj) { console.log('enterApiDocument'); },
		exitApiDocument: function(obj) { console.log('exitApiDocument'); }
	};
