// XRegExp 1.5.1
// (c) 2007-2012 Steven Levithan
// MIT License
// <http://xregexp.com>
// Provides an augmented, extensible, cross-browser implementation of regular expressions,
// including support for additional syntax, flags, and methods

var XRegExp;

if (XRegExp) {
    // Avoid running twice, since that would break references to native globals
    throw Error("can't load XRegExp twice in the same frame");
}

// Run within an anonymous function to protect variables and avoid new globals
(function (undefined) {

    //---------------------------------
    //  Constructor
    //---------------------------------

    // Accepts a pattern and flags; returns a new, extended `RegExp` object. Differs from a native
    // regular expression in that additional syntax and flags are supported and cross-browser
    // syntax inconsistencies are ameliorated. `XRegExp(/regex/)` clones an existing regex and
    // converts to type XRegExp
    XRegExp = function (pattern, flags) {
        var output = [],
            currScope = XRegExp.OUTSIDE_CLASS,
            pos = 0,
            context, tokenResult, match, chr, regex;

        if (XRegExp.isRegExp(pattern)) {
            if (flags !== undefined)
                throw TypeError("can't supply flags when constructing one RegExp from another");
            return clone(pattern);
        }
        // Tokens become part of the regex construction process, so protect against infinite
        // recursion when an XRegExp is constructed within a token handler or trigger
        if (isInsideConstructor)
            throw Error("can't call the XRegExp constructor within token definition functions");

        flags = flags || "";
        context = { // `this` object for custom tokens
            hasNamedCapture: false,
            captureNames: [],
            hasFlag: function (flag) {return flags.indexOf(flag) > -1;},
            setFlag: function (flag) {flags += flag;}
        };

        while (pos < pattern.length) {
            // Check for custom tokens at the current position
            tokenResult = runTokens(pattern, pos, currScope, context);

            if (tokenResult) {
                output.push(tokenResult.output);
                pos += (tokenResult.match[0].length || 1);
            } else {
                // Check for native multicharacter metasequences (excluding character classes) at
                // the current position
                if (match = nativ.exec.call(nativeTokens[currScope], pattern.slice(pos))) {
                    output.push(match[0]);
                    pos += match[0].length;
                } else {
                    chr = pattern.charAt(pos);
                    if (chr === "[")
                        currScope = XRegExp.INSIDE_CLASS;
                    else if (chr === "]")
                        currScope = XRegExp.OUTSIDE_CLASS;
                    // Advance position one character
                    output.push(chr);
                    pos++;
                }
            }
        }

        regex = RegExp(output.join(""), nativ.replace.call(flags, flagClip, ""));
        regex._xregexp = {
            source: pattern,
            captureNames: context.hasNamedCapture ? context.captureNames : null
        };
        return regex;
    };


    //---------------------------------
    //  Public properties
    //---------------------------------

    XRegExp.version = "1.5.1";

    // Token scope bitflags
    XRegExp.INSIDE_CLASS = 1;
    XRegExp.OUTSIDE_CLASS = 2;


    //---------------------------------
    //  Private variables
    //---------------------------------

    var replacementToken = /\$(?:(\d\d?|[$&`'])|{([$\w]+)})/g,
        flagClip = /[^gimy]+|([\s\S])(?=[\s\S]*\1)/g, // Nonnative and duplicate flags
        quantifier = /^(?:[?*+]|{\d+(?:,\d*)?})\??/,
        isInsideConstructor = false,
        tokens = [],
    // Copy native globals for reference ("native" is an ES3 reserved keyword)
        nativ = {
            exec: RegExp.prototype.exec,
            test: RegExp.prototype.test,
            match: String.prototype.match,
            replace: String.prototype.replace,
            split: String.prototype.split
        },
        compliantExecNpcg = nativ.exec.call(/()??/, "")[1] === undefined, // check `exec` handling of nonparticipating capturing groups
        compliantLastIndexIncrement = function () {
            var x = /^/g;
            nativ.test.call(x, "");
            return !x.lastIndex;
        }(),
        hasNativeY = RegExp.prototype.sticky !== undefined,
        nativeTokens = {};

    // `nativeTokens` match native multicharacter metasequences only (including deprecated octals,
    // excluding character classes)
    nativeTokens[XRegExp.INSIDE_CLASS] = /^(?:\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S]))/;
    nativeTokens[XRegExp.OUTSIDE_CLASS] = /^(?:\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S])|\(\?[:=!]|[?*+]\?|{\d+(?:,\d*)?}\??)/;


    //---------------------------------
    //  Public methods
    //---------------------------------

    // Lets you extend or change XRegExp syntax and create custom flags. This is used internally by
    // the XRegExp library and can be used to create XRegExp plugins. This function is intended for
    // users with advanced knowledge of JavaScript's regular expression syntax and behavior. It can
    // be disabled by `XRegExp.freezeTokens`
    XRegExp.addToken = function (regex, handler, scope, trigger) {
        tokens.push({
            pattern: clone(regex, "g" + (hasNativeY ? "y" : "")),
            handler: handler,
            scope: scope || XRegExp.OUTSIDE_CLASS,
            trigger: trigger || null
        });
    };

    // Accepts a pattern and flags; returns an extended `RegExp` object. If the pattern and flag
    // combination has previously been cached, the cached copy is returned; otherwise the newly
    // created regex is cached
    XRegExp.cache = function (pattern, flags) {
        var key = pattern + "/" + (flags || "");
        return XRegExp.cache[key] || (XRegExp.cache[key] = XRegExp(pattern, flags));
    };

    // Accepts a `RegExp` instance; returns a copy with the `/g` flag set. The copy has a fresh
    // `lastIndex` (set to zero). If you want to copy a regex without forcing the `global`
    // property, use `XRegExp(regex)`. Do not use `RegExp(regex)` because it will not preserve
    // special properties required for named capture
    XRegExp.copyAsGlobal = function (regex) {
        return clone(regex, "g");
    };

    // Accepts a string; returns the string with regex metacharacters escaped. The returned string
    // can safely be used at any point within a regex to match the provided literal string. Escaped
    // characters are [ ] { } ( ) * + ? - . , \ ^ $ | # and whitespace
    XRegExp.escape = function (str) {
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };

    // Accepts a string to search, regex to search with, position to start the search within the
    // string (default: 0), and an optional Boolean indicating whether matches must start at-or-
    // after the position or at the specified position only. This function ignores the `lastIndex`
    // of the provided regex in its own handling, but updates the property for compatibility
    XRegExp.execAt = function (str, regex, pos, anchored) {
        var r2 = clone(regex, "g" + ((anchored && hasNativeY) ? "y" : "")),
            match;
        r2.lastIndex = pos = pos || 0;
        match = r2.exec(str); // Run the altered `exec` (required for `lastIndex` fix, etc.)
        if (anchored && match && match.index !== pos)
            match = null;
        if (regex.global)
            regex.lastIndex = match ? r2.lastIndex : 0;
        return match;
    };

    // Breaks the unrestorable link to XRegExp's private list of tokens, thereby preventing
    // syntax and flag changes. Should be run after XRegExp and any plugins are loaded
    XRegExp.freezeTokens = function () {
        XRegExp.addToken = function () {
            throw Error("can't run addToken after freezeTokens");
        };
    };

    // Accepts any value; returns a Boolean indicating whether the argument is a `RegExp` object.
    // Note that this is also `true` for regex literals and regexes created by the `XRegExp`
    // constructor. This works correctly for variables created in another frame, when `instanceof`
    // and `constructor` checks would fail to work as intended
    XRegExp.isRegExp = function (o) {
        return Object.prototype.toString.call(o) === "[object RegExp]";
    };

    // Executes `callback` once per match within `str`. Provides a simpler and cleaner way to
    // iterate over regex matches compared to the traditional approaches of subverting
    // `String.prototype.replace` or repeatedly calling `exec` within a `while` loop
    XRegExp.iterate = function (str, regex, callback, context) {
        var r2 = clone(regex, "g"),
            i = -1, match;
        while (match = r2.exec(str)) { // Run the altered `exec` (required for `lastIndex` fix, etc.)
            if (regex.global)
                regex.lastIndex = r2.lastIndex; // Doing this to follow expectations if `lastIndex` is checked within `callback`
            callback.call(context, match, ++i, str, regex);
            if (r2.lastIndex === match.index)
                r2.lastIndex++;
        }
        if (regex.global)
            regex.lastIndex = 0;
    };

    // Accepts a string and an array of regexes; returns the result of using each successive regex
    // to search within the matches of the previous regex. The array of regexes can also contain
    // objects with `regex` and `backref` properties, in which case the named or numbered back-
    // references specified are passed forward to the next regex or returned. E.g.:
    // var xregexpImgFileNames = XRegExp.matchChain(html, [
    //     {regex: /<img\b([^>]+)>/i, backref: 1}, // <img> tag attributes
    //     {regex: XRegExp('(?ix) \\s src=" (?<src> [^"]+ )'), backref: "src"}, // src attribute values
    //     {regex: XRegExp("^http://xregexp\\.com(/[^#?]+)", "i"), backref: 1}, // xregexp.com paths
    //     /[^\/]+$/ // filenames (strip directory paths)
    // ]);
    XRegExp.matchChain = function (str, chain) {
        return function recurseChain (values, level) {
            var item = chain[level].regex ? chain[level] : {regex: chain[level]},
                regex = clone(item.regex, "g"),
                matches = [], i;
            for (i = 0; i < values.length; i++) {
                XRegExp.iterate(values[i], regex, function (match) {
                    matches.push(item.backref ? (match[item.backref] || "") : match[0]);
                });
            }
            return ((level === chain.length - 1) || !matches.length) ?
                matches : recurseChain(matches, level + 1);
        }([str], 0);
    };


    //---------------------------------
    //  New RegExp prototype methods
    //---------------------------------

    // Accepts a context object and arguments array; returns the result of calling `exec` with the
    // first value in the arguments array. the context is ignored but is accepted for congruity
    // with `Function.prototype.apply`
    RegExp.prototype.apply = function (context, args) {
        return this.exec(args[0]);
    };

    // Accepts a context object and string; returns the result of calling `exec` with the provided
    // string. the context is ignored but is accepted for congruity with `Function.prototype.call`
    RegExp.prototype.call = function (context, str) {
        return this.exec(str);
    };


    //---------------------------------
    //  Overriden native methods
    //---------------------------------

    // Adds named capture support (with backreferences returned as `result.name`), and fixes two
    // cross-browser issues per ES3:
    // - Captured values for nonparticipating capturing groups should be returned as `undefined`,
    //   rather than the empty string.
    // - `lastIndex` should not be incremented after zero-length matches.
    RegExp.prototype.exec = function (str) {
        var match, name, r2, origLastIndex;
        if (!this.global)
            origLastIndex = this.lastIndex;
        match = nativ.exec.apply(this, arguments);
        if (match) {
            // Fix browsers whose `exec` methods don't consistently return `undefined` for
            // nonparticipating capturing groups
            if (!compliantExecNpcg && match.length > 1 && indexOf(match, "") > -1) {
                r2 = RegExp(this.source, nativ.replace.call(getNativeFlags(this), "g", ""));
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                nativ.replace.call((str + "").slice(match.index), r2, function () {
                    for (var i = 1; i < arguments.length - 2; i++) {
                        if (arguments[i] === undefined)
                            match[i] = undefined;
                    }
                });
            }
            // Attach named capture properties
            if (this._xregexp && this._xregexp.captureNames) {
                for (var i = 1; i < match.length; i++) {
                    name = this._xregexp.captureNames[i - 1];
                    if (name)
                        match[name] = match[i];
                }
            }
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (!compliantLastIndexIncrement && this.global && !match[0].length && (this.lastIndex > match.index))
                this.lastIndex--;
        }
        if (!this.global)
            this.lastIndex = origLastIndex; // Fix IE, Opera bug (last tested IE 9.0.5, Opera 11.61 on Windows)
        return match;
    };

    // Fix browser bugs in native method
    RegExp.prototype.test = function (str) {
        // Use the native `exec` to skip some processing overhead, even though the altered
        // `exec` would take care of the `lastIndex` fixes
        var match, origLastIndex;
        if (!this.global)
            origLastIndex = this.lastIndex;
        match = nativ.exec.call(this, str);
        // Fix browsers that increment `lastIndex` after zero-length matches
        if (match && !compliantLastIndexIncrement && this.global && !match[0].length && (this.lastIndex > match.index))
            this.lastIndex--;
        if (!this.global)
            this.lastIndex = origLastIndex; // Fix IE, Opera bug (last tested IE 9.0.5, Opera 11.61 on Windows)
        return !!match;
    };

    // Adds named capture support and fixes browser bugs in native method
    String.prototype.match = function (regex) {
        if (!XRegExp.isRegExp(regex))
            regex = RegExp(regex); // Native `RegExp`
        if (regex.global) {
            var result = nativ.match.apply(this, arguments);
            regex.lastIndex = 0; // Fix IE bug
            return result;
        }
        return regex.exec(this); // Run the altered `exec`
    };

    // Adds support for `${n}` tokens for named and numbered backreferences in replacement text,
    // and provides named backreferences to replacement functions as `arguments[0].name`. Also
    // fixes cross-browser differences in replacement text syntax when performing a replacement
    // using a nonregex search value, and the value of replacement regexes' `lastIndex` property
    // during replacement iterations. Note that this doesn't support SpiderMonkey's proprietary
    // third (`flags`) parameter
    String.prototype.replace = function (search, replacement) {
        var isRegex = XRegExp.isRegExp(search),
            captureNames, result, str, origLastIndex;

        // There are too many combinations of search/replacement types/values and browser bugs that
        // preclude passing to native `replace`, so don't try
        //if (...)
        //    return nativ.replace.apply(this, arguments);

        if (isRegex) {
            if (search._xregexp)
                captureNames = search._xregexp.captureNames; // Array or `null`
            if (!search.global)
                origLastIndex = search.lastIndex;
        } else {
            search = search + ""; // Type conversion
        }

        if (Object.prototype.toString.call(replacement) === "[object Function]") {
            result = nativ.replace.call(this + "", search, function () {
                if (captureNames) {
                    // Change the `arguments[0]` string primitive to a String object which can store properties
                    arguments[0] = new String(arguments[0]);
                    // Store named backreferences on `arguments[0]`
                    for (var i = 0; i < captureNames.length; i++) {
                        if (captureNames[i])
                            arguments[0][captureNames[i]] = arguments[i + 1];
                    }
                }
                // Update `lastIndex` before calling `replacement` (fix browsers)
                if (isRegex && search.global)
                    search.lastIndex = arguments[arguments.length - 2] + arguments[0].length;
                return replacement.apply(null, arguments);
            });
        } else {
            str = this + ""; // Type conversion, so `args[args.length - 1]` will be a string (given nonstring `this`)
            result = nativ.replace.call(str, search, function () {
                var args = arguments; // Keep this function's `arguments` available through closure
                return nativ.replace.call(replacement + "", replacementToken, function ($0, $1, $2) {
                    // Numbered backreference (without delimiters) or special variable
                    if ($1) {
                        switch ($1) {
                            case "$": return "$";
                            case "&": return args[0];
                            case "`": return args[args.length - 1].slice(0, args[args.length - 2]);
                            case "'": return args[args.length - 1].slice(args[args.length - 2] + args[0].length);
                            // Numbered backreference
                            default:
                                // What does "$10" mean?
                                // - Backreference 10, if 10 or more capturing groups exist
                                // - Backreference 1 followed by "0", if 1-9 capturing groups exist
                                // - Otherwise, it's the string "$10"
                                // Also note:
                                // - Backreferences cannot be more than two digits (enforced by `replacementToken`)
                                // - "$01" is equivalent to "$1" if a capturing group exists, otherwise it's the string "$01"
                                // - There is no "$0" token ("$&" is the entire match)
                                var literalNumbers = "";
                                $1 = +$1; // Type conversion; drop leading zero
                                if (!$1) // `$1` was "0" or "00"
                                    return $0;
                                while ($1 > args.length - 3) {
                                    literalNumbers = String.prototype.slice.call($1, -1) + literalNumbers;
                                    $1 = Math.floor($1 / 10); // Drop the last digit
                                }
                                return ($1 ? args[$1] || "" : "$") + literalNumbers;
                        }
                        // Named backreference or delimited numbered backreference
                    } else {
                        // What does "${n}" mean?
                        // - Backreference to numbered capture n. Two differences from "$n":
                        //   - n can be more than two digits
                        //   - Backreference 0 is allowed, and is the entire match
                        // - Backreference to named capture n, if it exists and is not a number overridden by numbered capture
                        // - Otherwise, it's the string "${n}"
                        var n = +$2; // Type conversion; drop leading zeros
                        if (n <= args.length - 3)
                            return args[n];
                        n = captureNames ? indexOf(captureNames, $2) : -1;
                        return n > -1 ? args[n + 1] : $0;
                    }
                });
            });
        }

        if (isRegex) {
            if (search.global)
                search.lastIndex = 0; // Fix IE, Safari bug (last tested IE 9.0.5, Safari 5.1.2 on Windows)
            else
                search.lastIndex = origLastIndex; // Fix IE, Opera bug (last tested IE 9.0.5, Opera 11.61 on Windows)
        }

        return result;
    };

    // A consistent cross-browser, ES3 compliant `split`
    String.prototype.split = function (s /* separator */, limit) {
        // If separator `s` is not a regex, use the native `split`
        if (!XRegExp.isRegExp(s))
            return nativ.split.apply(this, arguments);

        var str = this + "", // Type conversion
            output = [],
            lastLastIndex = 0,
            match, lastLength;

        // Behavior for `limit`: if it's...
        // - `undefined`: No limit
        // - `NaN` or zero: Return an empty array
        // - A positive number: Use `Math.floor(limit)`
        // - A negative number: No limit
        // - Other: Type-convert, then use the above rules
        if (limit === undefined || +limit < 0) {
            limit = Infinity;
        } else {
            limit = Math.floor(+limit);
            if (!limit)
                return [];
        }

        // This is required if not `s.global`, and it avoids needing to set `s.lastIndex` to zero
        // and restore it to its original value when we're done using the regex
        s = XRegExp.copyAsGlobal(s);

        while (match = s.exec(str)) { // Run the altered `exec` (required for `lastIndex` fix, etc.)
            if (s.lastIndex > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index));

                if (match.length > 1 && match.index < str.length)
                    Array.prototype.push.apply(output, match.slice(1));

                lastLength = match[0].length;
                lastLastIndex = s.lastIndex;

                if (output.length >= limit)
                    break;
            }

            if (s.lastIndex === match.index)
                s.lastIndex++;
        }

        if (lastLastIndex === str.length) {
            if (!nativ.test.call(s, "") || lastLength)
                output.push("");
        } else {
            output.push(str.slice(lastLastIndex));
        }

        return output.length > limit ? output.slice(0, limit) : output;
    };


    //---------------------------------
    //  Private helper functions
    //---------------------------------

    // Supporting function for `XRegExp`, `XRegExp.copyAsGlobal`, etc. Returns a copy of a `RegExp`
    // instance with a fresh `lastIndex` (set to zero), preserving properties required for named
    // capture. Also allows adding new flags in the process of copying the regex
    function clone (regex, additionalFlags) {
        if (!XRegExp.isRegExp(regex))
            throw TypeError("type RegExp expected");
        var x = regex._xregexp;
        regex = XRegExp(regex.source, getNativeFlags(regex) + (additionalFlags || ""));
        if (x) {
            regex._xregexp = {
                source: x.source,
                captureNames: x.captureNames ? x.captureNames.slice(0) : null
            };
        }
        return regex;
    }

    function getNativeFlags (regex) {
        return (regex.global     ? "g" : "") +
            (regex.ignoreCase ? "i" : "") +
            (regex.multiline  ? "m" : "") +
            (regex.extended   ? "x" : "") + // Proposed for ES4; included in AS3
            (regex.sticky     ? "y" : "");
    }

    function runTokens (pattern, index, scope, context) {
        var i = tokens.length,
            result, match, t;
        // Protect against constructing XRegExps within token handler and trigger functions
        isInsideConstructor = true;
        // Must reset `isInsideConstructor`, even if a `trigger` or `handler` throws
        try {
            while (i--) { // Run in reverse order
                t = tokens[i];
                if ((scope & t.scope) && (!t.trigger || t.trigger.call(context))) {
                    t.pattern.lastIndex = index;
                    match = t.pattern.exec(pattern); // Running the altered `exec` here allows use of named backreferences, etc.
                    if (match && match.index === index) {
                        result = {
                            output: t.handler.call(context, match, scope),
                            match: match
                        };
                        break;
                    }
                }
            }
        } catch (err) {
            throw err;
        } finally {
            isInsideConstructor = false;
        }
        return result;
    }

    function indexOf (array, item, from) {
        if (Array.prototype.indexOf) // Use the native array method if available
            return array.indexOf(item, from);
        for (var i = from || 0; i < array.length; i++) {
            if (array[i] === item)
                return i;
        }
        return -1;
    }


    //---------------------------------
    //  Built-in tokens
    //---------------------------------

    // Augment XRegExp's regular expression syntax and flags. Note that when adding tokens, the
    // third (`scope`) argument defaults to `XRegExp.OUTSIDE_CLASS`

    // Comment pattern: (?# )
    XRegExp.addToken(
        /\(\?#[^)]*\)/,
        function (match) {
            // Keep tokens separated unless the following token is a quantifier
            return nativ.test.call(quantifier, match.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        }
    );

    // Capturing group (match the opening parenthesis only).
    // Required for support of named capturing groups
    XRegExp.addToken(
        /\((?!\?)/,
        function () {
            this.captureNames.push(null);
            return "(";
        }
    );

    // Named capturing group (match the opening delimiter only): (?<name>
    XRegExp.addToken(
        /\(\?<([$\w]+)>/,
        function (match) {
            this.captureNames.push(match[1]);
            this.hasNamedCapture = true;
            return "(";
        }
    );

    // Named backreference: \k<name>
    XRegExp.addToken(
        /\\k<([\w$]+)>/,
        function (match) {
            var index = indexOf(this.captureNames, match[1]);
            // Keep backreferences separate from subsequent literal numbers. Preserve back-
            // references to named groups that are undefined at this point as literal strings
            return index > -1 ?
                "\\" + (index + 1) + (isNaN(match.input.charAt(match.index + match[0].length)) ? "" : "(?:)") :
                match[0];
        }
    );

    // Empty character class: [] or [^]
    XRegExp.addToken(
        /\[\^?]/,
        function (match) {
            // For cross-browser compatibility with ES3, convert [] to \b\B and [^] to [\s\S].
            // (?!) should work like \b\B, but is unreliable in Firefox
            return match[0] === "[]" ? "\\b\\B" : "[\\s\\S]";
        }
    );

    // Mode modifier at the start of the pattern only, with any combination of flags imsx: (?imsx)
    // Does not support x(?i), (?-i), (?i-m), (?i: ), (?i)(?m), etc.
    XRegExp.addToken(
        /^\(\?([imsx]+)\)/,
        function (match) {
            this.setFlag(match[1]);
            return "";
        }
    );

    // Whitespace and comments, in free-spacing (aka extended) mode only
    XRegExp.addToken(
        /(?:\s+|#.*)+/,
        function (match) {
            // Keep tokens separated unless the following token is a quantifier
            return nativ.test.call(quantifier, match.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        },
        XRegExp.OUTSIDE_CLASS,
        function () {return this.hasFlag("x");}
    );

    // Dot, in dotall (aka singleline) mode only
    XRegExp.addToken(
        /\./,
        function () {return "[\\s\\S]";},
        XRegExp.OUTSIDE_CLASS,
        function () {return this.hasFlag("s");}
    );


    //---------------------------------
    //  Backward compatibility
    //---------------------------------

    // Uncomment the following block for compatibility with XRegExp 1.0-1.2:
    /*
     XRegExp.matchWithinChain = XRegExp.matchChain;
     RegExp.prototype.addFlags = function (s) {return clone(this, s);};
     RegExp.prototype.execAll = function (s) {var r = []; XRegExp.iterate(s, this, function (m) {r.push(m);}); return r;};
     RegExp.prototype.forEachExec = function (s, f, c) {return XRegExp.iterate(s, this, f, c);};
     RegExp.prototype.validate = function (s) {var r = RegExp("^(?:" + this.source + ")$(?!\\s)", getNativeFlags(this)); if (this.global) this.lastIndex = 0; return s.search(r) === 0;};
     */

})();

//
// Begin anonymous function. This is used to contain local scope variables without polutting global scope.
//
if (typeof(SyntaxHighlighter) == 'undefined') var SyntaxHighlighter = function() {

// CommonJS
    if (typeof(require) != 'undefined' && typeof(XRegExp) == 'undefined')
    {
        XRegExp = require('XRegExp').XRegExp;
    }

// Shortcut object which will be assigned to the SyntaxHighlighter variable.
// This is a shorthand for local reference in order to avoid long namespace
// references to SyntaxHighlighter.whatever...
    var sh = {
        defaults : {
            /** Additional CSS class names to be added to highlighter elements. */
            'class-name' : '',

            /** First line number. */
            'first-line' : 1,

            /**
             * Pads line numbers. Possible values are:
             *
             *   false - don't pad line numbers.
             *   true  - automaticaly pad numbers with minimum required number of leading zeroes.
             *   [int] - length up to which pad line numbers.
             */
            'pad-line-numbers' : false,

            /** Lines to highlight. */
            'highlight' : false,

            /** Title to be displayed above the code block. */
            'title' : null,

            /** Enables or disables smart tabs. */
            'smart-tabs' : true,

            /** Gets or sets tab size. */
            'tab-size' : 4,

            /** Enables or disables gutter. */
            'gutter' : true,

            /** Enables or disables toolbar. */
            'toolbar' : true,

            /** Enables quick code copy and paste from double click. */
            'quick-code' : true,

            /** Forces code view to be collapsed. */
            'collapse' : false,

            /** Enables or disables automatic links. */
            'auto-links' : false,

            /** Gets or sets light mode. Equavalent to turning off gutter and toolbar. */
            'light' : false,

            'unindent' : true,

            'html-script' : false
        },

        config : {
            space : '&nbsp;',

            /** Enables use of <SCRIPT type="syntaxhighlighter" /> tags. */
            useScriptTags : true,

            /** Blogger mode flag. */
            bloggerMode : false,

            stripBrs : false,

            /** Name of the tag that SyntaxHighlighter will automatically look for. */
            tagName : 'pre',

            strings : {
                expandSource : 'expand source',
                help : '?',
                alert: 'SyntaxHighlighter\n\n',
                noBrush : 'Can\'t find brush for: ',
                brushNotHtmlScript : 'Brush wasn\'t configured for html-script option: ',

                // this is populated by the build script
                aboutDialog : '@ABOUT@'
            }
        },

        /** Internal 'global' variables. */
        vars : {
            discoveredBrushes : null,
            highlighters : {}
        },

        /** This object is populated by user included external brush files. */
        brushes : {},

        /** Common regular expressions. */
        regexLib : {
            multiLineCComments			: /\/\*[\s\S]*?\*\//gm,
            singleLineCComments			: /\/\/.*$/gm,
            singleLinePerlComments		: /#.*$/gm,
            doubleQuotedString			: /"([^\\"\n]|\\.)*"/g,
            singleQuotedString			: /'([^\\'\n]|\\.)*'/g,
            multiLineDoubleQuotedString	: new XRegExp('"([^\\\\"]|\\\\.)*"', 'gs'),
            multiLineSingleQuotedString	: new XRegExp("'([^\\\\']|\\\\.)*'", 'gs'),
            xmlComments					: /(&lt;|<)!--[\s\S]*?--(&gt;|>)/gm,
            url							: /\w+:\/\/[\w-.\/?%&=:@;#]*/g,

            /** <?= ?> tags. */
            phpScriptTags 				: { left: /(&lt;|<)\?(?:=|php)?/g, right: /\?(&gt;|>)/g, 'eof' : true },

            /** <%= %> tags. */
            aspScriptTags				: { left: /(&lt;|<)%=?/g, right: /%(&gt;|>)/g },

            /** <script> tags. */
            scriptScriptTags			: { left: /(&lt;|<)\s*script.*?(&gt;|>)/gi, right: /(&lt;|<)\/\s*script\s*(&gt;|>)/gi }
        },

        toolbar: {
            /**
             * Generates HTML markup for the toolbar.
             * @param {Highlighter} highlighter Highlighter instance.
             * @return {String} Returns HTML markup.
             */
            getHtml: function(highlighter)
            {
                var html = '<div class="toolbar">',
                    items = sh.toolbar.items,
                    list = items.list
                    ;

                function defaultGetHtml(highlighter, name)
                {
                    return sh.toolbar.getButtonHtml(highlighter, name, sh.config.strings[name]);
                };

                for (var i = 0; i < list.length; i++)
                    html += (items[list[i]].getHtml || defaultGetHtml)(highlighter, list[i]);

                html += '</div>';

                return html;
            },

            /**
             * Generates HTML markup for a regular button in the toolbar.
             * @param {Highlighter} highlighter Highlighter instance.
             * @param {String} commandName		Command name that would be executed.
             * @param {String} label			Label text to display.
             * @return {String}					Returns HTML markup.
             */
            getButtonHtml: function(highlighter, commandName, label)
            {
                return '<span><a href="#" class="toolbar_item'
                    + ' command_' + commandName
                    + ' ' + commandName
                    + '">' + label + '</a></span>'
                    ;
            },

            /**
             * Event handler for a toolbar anchor.
             */
            handler: function(e)
            {
                var target = e.target,
                    className = target.className || ''
                    ;

                function getValue(name)
                {
                    var r = new RegExp(name + '_(\\w+)'),
                        match = r.exec(className)
                        ;

                    return match ? match[1] : null;
                };

                var highlighter = getHighlighterById(findParentElement(target, '.syntaxhighlighter').id),
                    commandName = getValue('command')
                    ;

                // execute the toolbar command
                if (highlighter && commandName)
                    sh.toolbar.items[commandName].execute(highlighter);

                // disable default A click behaviour
                e.preventDefault();
            },

            /** Collection of toolbar items. */
            items : {
                // Ordered lis of items in the toolbar. Can't expect `for (var n in items)` to be consistent.
                list: ['expandSource', 'help'],

                expandSource: {
                    getHtml: function(highlighter)
                    {
                        if (highlighter.getParam('collapse') != true)
                            return '';

                        var title = highlighter.getParam('title');
                        return sh.toolbar.getButtonHtml(highlighter, 'expandSource', title ? title : sh.config.strings.expandSource);
                    },

                    execute: function(highlighter)
                    {
                        var div = getHighlighterDivById(highlighter.id);
                        removeClass(div, 'collapsed');
                    }
                },

                /** Command to display the about dialog window. */
                help: {
                    execute: function(highlighter)
                    {
                        var wnd = popup('', '_blank', 500, 250, 'scrollbars=0'),
                            doc = wnd.document
                            ;

                        doc.write(sh.config.strings.aboutDialog);
                        doc.close();
                        wnd.focus();
                    }
                }
            }
        },

        /**
         * Finds all elements on the page which should be processes by SyntaxHighlighter.
         *
         * @param {Object} globalParams		Optional parameters which override element's
         * 									parameters. Only used if element is specified.
         *
         * @param {Object} element	Optional element to highlight. If none is
         * 							provided, all elements in the current document
         * 							are returned which qualify.
         *
         * @return {Array}	Returns list of <code>{ target: DOMElement, params: Object }</code> objects.
         */
        findElements: function(globalParams, element)
        {
            var elements = element ? [element] : toArray(document.getElementsByTagName(sh.config.tagName)),
                conf = sh.config,
                result = []
                ;

            // support for <SCRIPT TYPE="syntaxhighlighter" /> feature
            if (conf.useScriptTags)
                elements = elements.concat(getSyntaxHighlighterScriptTags());

            if (elements.length === 0)
                return result;

            for (var i = 0; i < elements.length; i++)
            {
                var item = {
                    target: elements[i],
                    // local params take precedence over globals
                    params: merge(globalParams, parseParams(elements[i].className))
                };

                if (item.params['brush'] == null)
                    continue;

                result.push(item);
            }

            return result;
        },

        /**
         * Shorthand to highlight all elements on the page that are marked as
         * SyntaxHighlighter source code.
         *
         * @param {Object} globalParams		Optional parameters which override element's
         * 									parameters. Only used if element is specified.
         *
         * @param {Object} element	Optional element to highlight. If none is
         * 							provided, all elements in the current document
         * 							are highlighted.
         */
        highlight: function(globalParams, element)
        {
            var elements = this.findElements(globalParams, element),
                propertyName = 'innerHTML',
                highlighter = null,
                conf = sh.config
                ;

            if (elements.length === 0)
                return;

            for (var i = 0; i < elements.length; i++)
            {
                var element = elements[i],
                    target = element.target,
                    params = element.params,
                    brushName = params.brush,
                    code
                    ;

                if (brushName == null)
                    continue;

                // Instantiate a brush
                if (params['html-script'] == 'true' || sh.defaults['html-script'] == true)
                {
                    highlighter = new sh.HtmlScript(brushName);
                    brushName = 'htmlscript';
                }
                else
                {
                    var brush = findBrush(brushName);

                    if (brush)
                        highlighter = new brush();
                    else
                        continue;
                }

                code = target[propertyName];

                // remove CDATA from <SCRIPT/> tags if it's present
                if (conf.useScriptTags)
                    code = stripCData(code);

                // Inject title if the attribute is present
                if ((target.title || '') != '')
                    params.title = target.title;

                params['brush'] = brushName;
                highlighter.init(params);
                element = highlighter.getDiv(code);

                // carry over ID
                if ((target.id || '') != '')
                    element.id = target.id;
                //by zhanyi 去掉多余的外围div
                var tmp = element.firstChild.firstChild;
                tmp.className = element.firstChild.className;

                target.parentNode.replaceChild(tmp, target);
            }
        },

        /**
         * Main entry point for the SyntaxHighlighter.
         * @param {Object} params Optional params to apply to all highlighted elements.
         */
        all: function(params)
        {
            attachEvent(
                window,
                'load',
                function() { sh.highlight(params); }
            );
        }
    }; // end of sh

    /**
     * Checks if target DOM elements has specified CSS class.
     * @param {DOMElement} target Target DOM element to check.
     * @param {String} className Name of the CSS class to check for.
     * @return {Boolean} Returns true if class name is present, false otherwise.
     */
    function hasClass(target, className)
    {
        return target.className.indexOf(className) != -1;
    };

    /**
     * Adds CSS class name to the target DOM element.
     * @param {DOMElement} target Target DOM element.
     * @param {String} className New CSS class to add.
     */
    function addClass(target, className)
    {
        if (!hasClass(target, className))
            target.className += ' ' + className;
    };

    /**
     * Removes CSS class name from the target DOM element.
     * @param {DOMElement} target Target DOM element.
     * @param {String} className CSS class to remove.
     */
    function removeClass(target, className)
    {
        target.className = target.className.replace(className, '');
    };

    /**
     * Converts the source to array object. Mostly used for function arguments and
     * lists returned by getElementsByTagName() which aren't Array objects.
     * @param {List} source Source list.
     * @return {Array} Returns array.
     */
    function toArray(source)
    {
        var result = [];

        for (var i = 0; i < source.length; i++)
            result.push(source[i]);

        return result;
    };

    /**
     * Splits block of text into lines.
     * @param {String} block Block of text.
     * @return {Array} Returns array of lines.
     */
    function splitLines(block)
    {
        return block.split(/\r?\n/);
    }

    /**
     * Generates HTML ID for the highlighter.
     * @param {String} highlighterId Highlighter ID.
     * @return {String} Returns HTML ID.
     */
    function getHighlighterId(id)
    {
        var prefix = 'highlighter_';
        return id.indexOf(prefix) == 0 ? id : prefix + id;
    };

    /**
     * Finds Highlighter instance by ID.
     * @param {String} highlighterId Highlighter ID.
     * @return {Highlighter} Returns instance of the highlighter.
     */
    function getHighlighterById(id)
    {
        return sh.vars.highlighters[getHighlighterId(id)];
    };

    /**
     * Finds highlighter's DIV container.
     * @param {String} highlighterId Highlighter ID.
     * @return {Element} Returns highlighter's DIV element.
     */
    function getHighlighterDivById(id)
    {
        return document.getElementById(getHighlighterId(id));
    };

    /**
     * Stores highlighter so that getHighlighterById() can do its thing. Each
     * highlighter must call this method to preserve itself.
     * @param {Highilghter} highlighter Highlighter instance.
     */
    function storeHighlighter(highlighter)
    {
        sh.vars.highlighters[getHighlighterId(highlighter.id)] = highlighter;
    };

    /**
     * Looks for a child or parent node which has specified classname.
     * Equivalent to jQuery's $(container).find(".className")
     * @param {Element} target Target element.
     * @param {String} search Class name or node name to look for.
     * @param {Boolean} reverse If set to true, will go up the node tree instead of down.
     * @return {Element} Returns found child or parent element on null.
     */
    function findElement(target, search, reverse /* optional */)
    {
        if (target == null)
            return null;

        var nodes			= reverse != true ? target.childNodes : [ target.parentNode ],
            propertyToFind	= { '#' : 'id', '.' : 'className' }[search.substr(0, 1)] || 'nodeName',
            expectedValue,
            found
            ;

        expectedValue = propertyToFind != 'nodeName'
            ? search.substr(1)
            : search.toUpperCase()
        ;

        // main return of the found node
        if ((target[propertyToFind] || '').indexOf(expectedValue) != -1)
            return target;

        for (var i = 0; nodes && i < nodes.length && found == null; i++)
            found = findElement(nodes[i], search, reverse);

        return found;
    };

    /**
     * Looks for a parent node which has specified classname.
     * This is an alias to <code>findElement(container, className, true)</code>.
     * @param {Element} target Target element.
     * @param {String} className Class name to look for.
     * @return {Element} Returns found parent element on null.
     */
    function findParentElement(target, className)
    {
        return findElement(target, className, true);
    };

    /**
     * Finds an index of element in the array.
     * @ignore
     * @param {Object} searchElement
     * @param {Number} fromIndex
     * @return {Number} Returns index of element if found; -1 otherwise.
     */
    function indexOf(array, searchElement, fromIndex)
    {
        fromIndex = Math.max(fromIndex || 0, 0);

        for (var i = fromIndex; i < array.length; i++)
            if(array[i] == searchElement)
                return i;

        return -1;
    };

    /**
     * Generates a unique element ID.
     */
    function guid(prefix)
    {
        return (prefix || '') + Math.round(Math.random() * 1000000).toString();
    };

    /**
     * Merges two objects. Values from obj2 override values in obj1.
     * Function is NOT recursive and works only for one dimensional objects.
     * @param {Object} obj1 First object.
     * @param {Object} obj2 Second object.
     * @return {Object} Returns combination of both objects.
     */
    function merge(obj1, obj2)
    {
        var result = {}, name;

        for (name in obj1)
            result[name] = obj1[name];

        for (name in obj2)
            result[name] = obj2[name];

        return result;
    };

    /**
     * Attempts to convert string to boolean.
     * @param {String} value Input string.
     * @return {Boolean} Returns true if input was "true", false if input was "false" and value otherwise.
     */
    function toBoolean(value)
    {
        var result = { "true" : true, "false" : false }[value];
        return result == null ? value : result;
    };

    /**
     * Opens up a centered popup window.
     * @param {String} url		URL to open in the window.
     * @param {String} name		Popup name.
     * @param {int} width		Popup width.
     * @param {int} height		Popup height.
     * @param {String} options	window.open() options.
     * @return {Window}			Returns window instance.
     */
    function popup(url, name, width, height, options)
    {
        var x = (screen.width - width) / 2,
            y = (screen.height - height) / 2
            ;

        options +=	', left=' + x +
            ', top=' + y +
            ', width=' + width +
            ', height=' + height
        ;
        options = options.replace(/^,/, '');

        var win = window.open(url, name, options);
        win.focus();
        return win;
    };

    /**
     * Adds event handler to the target object.
     * @param {Object} obj		Target object.
     * @param {String} type		Name of the event.
     * @param {Function} func	Handling function.
     */
    function attachEvent(obj, type, func, scope)
    {
        function handler(e)
        {
            e = e || window.event;

            if (!e.target)
            {
                e.target = e.srcElement;
                e.preventDefault = function()
                {
                    this.returnValue = false;
                };
            }

            func.call(scope || window, e);
        };

        if (obj.attachEvent)
        {
            obj.attachEvent('on' + type, handler);
        }
        else
        {
            obj.addEventListener(type, handler, false);
        }
    };

    /**
     * Displays an alert.
     * @param {String} str String to display.
     */
    function alert(str)
    {
        window.alert(sh.config.strings.alert + str);
    };

    /**
     * Finds a brush by its alias.
     *
     * @param {String} alias		Brush alias.
     * @param {Boolean} showAlert	Suppresses the alert if false.
     * @return {Brush}				Returns bursh constructor if found, null otherwise.
     */
    function findBrush(alias, showAlert)
    {
        var brushes = sh.vars.discoveredBrushes,
            result = null
            ;

        if (brushes == null)
        {
            brushes = {};

            // Find all brushes
            for (var brush in sh.brushes)
            {
                var info = sh.brushes[brush],
                    aliases = info.aliases
                    ;

                if (aliases == null)
                    continue;

                // keep the brush name
                info.brushName = brush.toLowerCase();

                for (var i = 0; i < aliases.length; i++)
                    brushes[aliases[i]] = brush;
            }

            sh.vars.discoveredBrushes = brushes;
        }

        result = sh.brushes[brushes[alias]];

        if (result == null && showAlert)
            alert(sh.config.strings.noBrush + alias);

        return result;
    };

    /**
     * Executes a callback on each line and replaces each line with result from the callback.
     * @param {Object} str			Input string.
     * @param {Object} callback		Callback function taking one string argument and returning a string.
     */
    function eachLine(str, callback)
    {
        var lines = splitLines(str);

        for (var i = 0; i < lines.length; i++)
            lines[i] = callback(lines[i], i);

        // include \r to enable copy-paste on windows (ie8) without getting everything on one line
        return lines.join('\r\n');
    };

    /**
     * This is a special trim which only removes first and last empty lines
     * and doesn't affect valid leading space on the first line.
     *
     * @param {String} str   Input string
     * @return {String}      Returns string without empty first and last lines.
     */
    function trimFirstAndLastLines(str)
    {
        return str.replace(/^[ ]*[\n]+|[\n]*[ ]*$/g, '');
    };

    /**
     * Parses key/value pairs into hash object.
     *
     * Understands the following formats:
     * - name: word;
     * - name: [word, word];
     * - name: "string";
     * - name: 'string';
     *
     * For example:
     *   name1: value; name2: [value, value]; name3: 'value'
     *
     * @param {String} str    Input string.
     * @return {Object}       Returns deserialized object.
     */
    function parseParams(str)
    {
        var match,
            result = {},
            arrayRegex = new XRegExp("^\\[(?<values>(.*?))\\]$"),
            regex = new XRegExp(
                "(?<name>[\\w-]+)" +
                    "\\s*:\\s*" +
                    "(?<value>" +
                    "[\\w-%#]+|" +		// word
                    "\\[.*?\\]|" +		// [] array
                    '".*?"|' +			// "" string
                    "'.*?'" +			// '' string
                    ")\\s*;?",
                "g"
            )
            ;

        while ((match = regex.exec(str)) != null)
        {
            var value = match.value
                    .replace(/^['"]|['"]$/g, '') // strip quotes from end of strings
                ;

            // try to parse array value
            if (value != null && arrayRegex.test(value))
            {
                var m = arrayRegex.exec(value);
                value = m.values.length > 0 ? m.values.split(/\s*,\s*/) : [];
            }

            result[match.name] = value;
        }

        return result;
    };

    /**
     * Wraps each line of the string into <code/> tag with given style applied to it.
     *
     * @param {String} str   Input string.
     * @param {String} css   Style name to apply to the string.
     * @return {String}      Returns input string with each line surrounded by <span/> tag.
     */
    function wrapLinesWithCode(str, css)
    {
        if (str == null || str.length == 0 || str == '\n')
            return str;

        str = str.replace(/</g, '&lt;');

        // Replace two or more sequential spaces with &nbsp; leaving last space untouched.
        str = str.replace(/ {2,}/g, function(m)
        {
            var spaces = '';

            for (var i = 0; i < m.length - 1; i++)
                spaces += sh.config.space;

            return spaces + ' ';
        });

        // Split each line and apply <span class="...">...</span> to them so that
        // leading spaces aren't included.
        if (css != null)
            str = eachLine(str, function(line)
            {
                if (line.length == 0)
                    return '';

                var spaces = '';

                line = line.replace(/^(&nbsp;| )+/, function(s)
                {
                    spaces = s;
                    return '';
                });

                if (line.length == 0)
                    return spaces;

                return spaces + '<code class="' + css + '">' + line + '</code>';
            });

        return str;
    };

    /**
     * Pads number with zeros until it's length is the same as given length.
     *
     * @param {Number} number	Number to pad.
     * @param {Number} length	Max string length with.
     * @return {String}			Returns a string padded with proper amount of '0'.
     */
    function padNumber(number, length)
    {
        var result = number.toString();

        while (result.length < length)
            result = '0' + result;

        return result;
    };

    /**
     * Replaces tabs with spaces.
     *
     * @param {String} code		Source code.
     * @param {Number} tabSize	Size of the tab.
     * @return {String}			Returns code with all tabs replaces by spaces.
     */
    function processTabs(code, tabSize)
    {
        var tab = '';

        for (var i = 0; i < tabSize; i++)
            tab += ' ';

        return code.replace(/\t/g, tab);
    };

    /**
     * Replaces tabs with smart spaces.
     *
     * @param {String} code    Code to fix the tabs in.
     * @param {Number} tabSize Number of spaces in a column.
     * @return {String}        Returns code with all tabs replaces with roper amount of spaces.
     */
    function processSmartTabs(code, tabSize)
    {
        var lines = splitLines(code),
            tab = '\t',
            spaces = ''
            ;

        // Create a string with 1000 spaces to copy spaces from...
        // It's assumed that there would be no indentation longer than that.
        for (var i = 0; i < 50; i++)
            spaces += '                    '; // 20 spaces * 50

        // This function inserts specified amount of spaces in the string
        // where a tab is while removing that given tab.
        function insertSpaces(line, pos, count)
        {
            return line.substr(0, pos)
                + spaces.substr(0, count)
                + line.substr(pos + 1, line.length) // pos + 1 will get rid of the tab
                ;
        };

        // Go through all the lines and do the 'smart tabs' magic.
        code = eachLine(code, function(line)
        {
            if (line.indexOf(tab) == -1)
                return line;

            var pos = 0;

            while ((pos = line.indexOf(tab)) != -1)
            {
                // This is pretty much all there is to the 'smart tabs' logic.
                // Based on the position within the line and size of a tab,
                // calculate the amount of spaces we need to insert.
                var spaces = tabSize - pos % tabSize;
                line = insertSpaces(line, pos, spaces);
            }

            return line;
        });

        return code;
    };

    /**
     * Performs various string fixes based on configuration.
     */
    function fixInputString(str)
    {
        var br = /<br\s*\/?>|&lt;br\s*\/?&gt;/gi;

        if (sh.config.bloggerMode == true)
            str = str.replace(br, '\n');

        if (sh.config.stripBrs == true)
            str = str.replace(br, '');

        return str;
    };

    /**
     * Removes all white space at the begining and end of a string.
     *
     * @param {String} str   String to trim.
     * @return {String}      Returns string without leading and following white space characters.
     */
    function trim(str)
    {
        return str.replace(/^\s+|\s+$/g, '');
    };

    /**
     * Unindents a block of text by the lowest common indent amount.
     * @param {String} str   Text to unindent.
     * @return {String}      Returns unindented text block.
     */
    function unindent(str)
    {
        var lines = splitLines(fixInputString(str)),
            indents = new Array(),
            regex = /^\s*/,
            min = 1000
            ;

        // go through every line and check for common number of indents
        for (var i = 0; i < lines.length && min > 0; i++)
        {
            var line = lines[i];

            if (trim(line).length == 0)
                continue;

            var matches = regex.exec(line);

            // In the event that just one line doesn't have leading white space
            // we can't unindent anything, so bail completely.
            if (matches == null)
                return str;

            min = Math.min(matches[0].length, min);
        }

        // trim minimum common number of white space from the begining of every line
        if (min > 0)
            for (var i = 0; i < lines.length; i++)
                lines[i] = lines[i].substr(min);

        return lines.join('\n');
    };

    /**
     * Callback method for Array.sort() which sorts matches by
     * index position and then by length.
     *
     * @param {Match} m1	Left object.
     * @param {Match} m2    Right object.
     * @return {Number}     Returns -1, 0 or -1 as a comparison result.
     */
    function matchesSortCallback(m1, m2)
    {
        // sort matches by index first
        if(m1.index < m2.index)
            return -1;
        else if(m1.index > m2.index)
            return 1;
        else
        {
            // if index is the same, sort by length
            if(m1.length < m2.length)
                return -1;
            else if(m1.length > m2.length)
                return 1;
        }

        return 0;
    };

    /**
     * Executes given regular expression on provided code and returns all
     * matches that are found.
     *
     * @param {String} code    Code to execute regular expression on.
     * @param {Object} regex   Regular expression item info from <code>regexList</code> collection.
     * @return {Array}         Returns a list of Match objects.
     */
    function getMatches(code, regexInfo)
    {
        function defaultAdd(match, regexInfo)
        {
            return match[0];
        };

        var index = 0,
            match = null,
            matches = [],
            func = regexInfo.func ? regexInfo.func : defaultAdd
            ;

        while((match = regexInfo.regex.exec(code)) != null)
        {
            var resultMatch = func(match, regexInfo);

            if (typeof(resultMatch) == 'string')
                resultMatch = [new sh.Match(resultMatch, match.index, regexInfo.css)];

            matches = matches.concat(resultMatch);
        }

        return matches;
    };

    /**
     * Turns all URLs in the code into <a/> tags.
     * @param {String} code Input code.
     * @return {String} Returns code with </a> tags.
     */
    function processUrls(code)
    {
        var gt = /(.*)((&gt;|&lt;).*)/;

        return code.replace(sh.regexLib.url, function(m)
        {
            var suffix = '',
                match = null
                ;

            // We include &lt; and &gt; in the URL for the common cases like <http://google.com>
            // The problem is that they get transformed into &lt;http://google.com&gt;
            // Where as &gt; easily looks like part of the URL string.

            if (match = gt.exec(m))
            {
                m = match[1];
                suffix = match[2];
            }

            return '<a href="' + m + '">' + m + '</a>' + suffix;
        });
    };

    /**
     * Finds all <SCRIPT TYPE="syntaxhighlighter" /> elementss.
     * @return {Array} Returns array of all found SyntaxHighlighter tags.
     */
    function getSyntaxHighlighterScriptTags()
    {
        var tags = document.getElementsByTagName('script'),
            result = []
            ;

        for (var i = 0; i < tags.length; i++)
            if (tags[i].type == 'syntaxhighlighter')
                result.push(tags[i]);

        return result;
    };

    /**
     * Strips <![CDATA[]]> from <SCRIPT /> content because it should be used
     * there in most cases for XHTML compliance.
     * @param {String} original	Input code.
     * @return {String} Returns code without leading <![CDATA[]]> tags.
     */
    function stripCData(original)
    {
        var left = '<![CDATA[',
            right = ']]>',
        // for some reason IE inserts some leading blanks here
            copy = trim(original),
            changed = false,
            leftLength = left.length,
            rightLength = right.length
            ;

        if (copy.indexOf(left) == 0)
        {
            copy = copy.substring(leftLength);
            changed = true;
        }

        var copyLength = copy.length;

        if (copy.indexOf(right) == copyLength - rightLength)
        {
            copy = copy.substring(0, copyLength - rightLength);
            changed = true;
        }

        return changed ? copy : original;
    };


    /**
     * Quick code mouse double click handler.
     */
    function quickCodeHandler(e)
    {
        var target = e.target,
            highlighterDiv = findParentElement(target, '.syntaxhighlighter'),
            container = findParentElement(target, '.container'),
            textarea = document.createElement('textarea'),
            highlighter
            ;

        if (!container || !highlighterDiv || findElement(container, 'textarea'))
            return;

        highlighter = getHighlighterById(highlighterDiv.id);

        // add source class name
        addClass(highlighterDiv, 'source');

        // Have to go over each line and grab it's text, can't just do it on the
        // container because Firefox loses all \n where as Webkit doesn't.
        var lines = container.childNodes,
            code = []
            ;

        for (var i = 0; i < lines.length; i++)
            code.push(lines[i].innerText || lines[i].textContent);

        // using \r instead of \r or \r\n makes this work equally well on IE, FF and Webkit
        code = code.join('\r');

        // For Webkit browsers, replace nbsp with a breaking space
        code = code.replace(/\u00a0/g, " ");

        // inject <textarea/> tag
        textarea.appendChild(document.createTextNode(code));
        container.appendChild(textarea);

        // preselect all text
        textarea.focus();
        textarea.select();

        // set up handler for lost focus
        attachEvent(textarea, 'blur', function(e)
        {
            textarea.parentNode.removeChild(textarea);
            removeClass(highlighterDiv, 'source');
        });
    };

    /**
     * Match object.
     */
    sh.Match = function(value, index, css)
    {
        this.value = value;
        this.index = index;
        this.length = value.length;
        this.css = css;
        this.brushName = null;
    };

    sh.Match.prototype.toString = function()
    {
        return this.value;
    };

    /**
     * Simulates HTML code with a scripting language embedded.
     *
     * @param {String} scriptBrushName Brush name of the scripting language.
     */
    sh.HtmlScript = function(scriptBrushName)
    {
        var brushClass = findBrush(scriptBrushName),
            scriptBrush,
            xmlBrush = new sh.brushes.Xml(),
            bracketsRegex = null,
            ref = this,
            methodsToExpose = 'getDiv getHtml init'.split(' ')
            ;

        if (brushClass == null)
            return;

        scriptBrush = new brushClass();

        for(var i = 0; i < methodsToExpose.length; i++)
            // make a closure so we don't lose the name after i changes
            (function() {
                var name = methodsToExpose[i];

                ref[name] = function()
                {
                    return xmlBrush[name].apply(xmlBrush, arguments);
                };
            })();

        if (scriptBrush.htmlScript == null)
        {
            alert(sh.config.strings.brushNotHtmlScript + scriptBrushName);
            return;
        }

        xmlBrush.regexList.push(
            { regex: scriptBrush.htmlScript.code, func: process }
        );

        function offsetMatches(matches, offset)
        {
            for (var j = 0; j < matches.length; j++)
                matches[j].index += offset;
        }

        function process(match, info)
        {
            var code = match.code,
                matches = [],
                regexList = scriptBrush.regexList,
                offset = match.index + match.left.length,
                htmlScript = scriptBrush.htmlScript,
                result
                ;

            // add all matches from the code
            for (var i = 0; i < regexList.length; i++)
            {
                result = getMatches(code, regexList[i]);
                offsetMatches(result, offset);
                matches = matches.concat(result);
            }

            // add left script bracket
            if (htmlScript.left != null && match.left != null)
            {
                result = getMatches(match.left, htmlScript.left);
                offsetMatches(result, match.index);
                matches = matches.concat(result);
            }

            // add right script bracket
            if (htmlScript.right != null && match.right != null)
            {
                result = getMatches(match.right, htmlScript.right);
                offsetMatches(result, match.index + match[0].lastIndexOf(match.right));
                matches = matches.concat(result);
            }

            for (var j = 0; j < matches.length; j++)
                matches[j].brushName = brushClass.brushName;

            return matches;
        }
    };

    /**
     * Main Highlither class.
     * @constructor
     */
    sh.Highlighter = function()
    {
        // not putting any code in here because of the prototype inheritance
    };

    sh.Highlighter.prototype = {
        /**
         * Returns value of the parameter passed to the highlighter.
         * @param {String} name				Name of the parameter.
         * @param {Object} defaultValue		Default value.
         * @return {Object}					Returns found value or default value otherwise.
         */
        getParam: function(name, defaultValue)
        {
            var result = this.params[name];
            return toBoolean(result == null ? defaultValue : result);
        },

        /**
         * Shortcut to document.createElement().
         * @param {String} name		Name of the element to create (DIV, A, etc).
         * @return {HTMLElement}	Returns new HTML element.
         */
        create: function(name)
        {
            return document.createElement(name);
        },

        /**
         * Applies all regular expression to the code and stores all found
         * matches in the `this.matches` array.
         * @param {Array} regexList		List of regular expressions.
         * @param {String} code			Source code.
         * @return {Array}				Returns list of matches.
         */
        findMatches: function(regexList, code)
        {
            var result = [];

            if (regexList != null)
                for (var i = 0; i < regexList.length; i++)
                    // BUG: length returns len+1 for array if methods added to prototype chain (oising@gmail.com)
                    if (typeof (regexList[i]) == "object")
                        result = result.concat(getMatches(code, regexList[i]));

            // sort and remove nested the matches
            return this.removeNestedMatches(result.sort(matchesSortCallback));
        },

        /**
         * Checks to see if any of the matches are inside of other matches.
         * This process would get rid of highligted strings inside comments,
         * keywords inside strings and so on.
         */
        removeNestedMatches: function(matches)
        {
            // Optimized by Jose Prado (http://joseprado.com)
            for (var i = 0; i < matches.length; i++)
            {
                if (matches[i] === null)
                    continue;

                var itemI = matches[i],
                    itemIEndPos = itemI.index + itemI.length
                    ;

                for (var j = i + 1; j < matches.length && matches[i] !== null; j++)
                {
                    var itemJ = matches[j];

                    if (itemJ === null)
                        continue;
                    else if (itemJ.index > itemIEndPos)
                        break;
                    else if (itemJ.index == itemI.index && itemJ.length > itemI.length)
                        matches[i] = null;
                    else if (itemJ.index >= itemI.index && itemJ.index < itemIEndPos)
                        matches[j] = null;
                }
            }

            return matches;
        },

        /**
         * Creates an array containing integer line numbers starting from the 'first-line' param.
         * @return {Array} Returns array of integers.
         */
        figureOutLineNumbers: function(code)
        {
            var lines = [],
                firstLine = parseInt(this.getParam('first-line'))
                ;

            eachLine(code, function(line, index)
            {
                lines.push(index + firstLine);
            });

            return lines;
        },

        /**
         * Determines if specified line number is in the highlighted list.
         */
        isLineHighlighted: function(lineNumber)
        {
            var list = this.getParam('highlight', []);

            if (typeof(list) != 'object' && list.push == null)
                list = [ list ];

            return indexOf(list, lineNumber.toString()) != -1;
        },

        /**
         * Generates HTML markup for a single line of code while determining alternating line style.
         * @param {Integer} lineNumber	Line number.
         * @param {String} code Line	HTML markup.
         * @return {String}				Returns HTML markup.
         */
        getLineHtml: function(lineIndex, lineNumber, code)
        {
            var classes = [
                'line',
                'number' + lineNumber,
                'index' + lineIndex,
                'alt' + (lineNumber % 2 == 0 ? 1 : 2).toString()
            ];

            if (this.isLineHighlighted(lineNumber))
                classes.push('highlighted');

            if (lineNumber == 0)
                classes.push('break');

            return '<div class="' + classes.join(' ') + '">' + code + '</div>';
        },

        /**
         * Generates HTML markup for line number column.
         * @param {String} code			Complete code HTML markup.
         * @param {Array} lineNumbers	Calculated line numbers.
         * @return {String}				Returns HTML markup.
         */
        getLineNumbersHtml: function(code, lineNumbers)
        {
            var html = '',
                count = splitLines(code).length,
                firstLine = parseInt(this.getParam('first-line')),
                pad = this.getParam('pad-line-numbers')
                ;

            if (pad == true)
                pad = (firstLine + count - 1).toString().length;
            else if (isNaN(pad) == true)
                pad = 0;

            for (var i = 0; i < count; i++)
            {
                var lineNumber = lineNumbers ? lineNumbers[i] : firstLine + i,
                    code = lineNumber == 0 ? sh.config.space : padNumber(lineNumber, pad)
                    ;

                html += this.getLineHtml(i, lineNumber, code);
            }

            return html;
        },

        /**
         * Splits block of text into individual DIV lines.
         * @param {String} code			Code to highlight.
         * @param {Array} lineNumbers	Calculated line numbers.
         * @return {String}				Returns highlighted code in HTML form.
         */
        getCodeLinesHtml: function(html, lineNumbers)
        {
            html = trim(html);

            var lines = splitLines(html),
                padLength = this.getParam('pad-line-numbers'),
                firstLine = parseInt(this.getParam('first-line')),
                html = '',
                brushName = this.getParam('brush')
                ;

            for (var i = 0; i < lines.length; i++)
            {
                var line = lines[i],
                    indent = /^(&nbsp;|\s)+/.exec(line),
                    spaces = null,
                    lineNumber = lineNumbers ? lineNumbers[i] : firstLine + i;
                ;

                if (indent != null)
                {
                    spaces = indent[0].toString();
                    line = line.substr(spaces.length);
                    spaces = spaces.replace(' ', sh.config.space);
                }

                line = trim(line);

                if (line.length == 0)
                    line = sh.config.space;

                html += this.getLineHtml(
                    i,
                    lineNumber,
                    (spaces != null ? '<code class="' + brushName + ' spaces">' + spaces + '</code>' : '') + line
                );
            }

            return html;
        },

        /**
         * Returns HTML for the table title or empty string if title is null.
         */
        getTitleHtml: function(title)
        {
            return title ? '<caption>' + title + '</caption>' : '';
        },

        /**
         * Finds all matches in the source code.
         * @param {String} code		Source code to process matches in.
         * @param {Array} matches	Discovered regex matches.
         * @return {String} Returns formatted HTML with processed mathes.
         */
        getMatchesHtml: function(code, matches)
        {
            var pos = 0,
                result = '',
                brushName = this.getParam('brush', '')
                ;

            function getBrushNameCss(match)
            {
                var result = match ? (match.brushName || brushName) : brushName;
                return result ? result + ' ' : '';
            };

            // Finally, go through the final list of matches and pull the all
            // together adding everything in between that isn't a match.
            for (var i = 0; i < matches.length; i++)
            {
                var match = matches[i],
                    matchBrushName
                    ;

                if (match === null || match.length === 0)
                    continue;

                matchBrushName = getBrushNameCss(match);

                result += wrapLinesWithCode(code.substr(pos, match.index - pos), matchBrushName + 'plain')
                    + wrapLinesWithCode(match.value, matchBrushName + match.css)
                ;

                pos = match.index + match.length + (match.offset || 0);
            }

            // don't forget to add whatever's remaining in the string
            result += wrapLinesWithCode(code.substr(pos), getBrushNameCss() + 'plain');

            return result;
        },

        /**
         * Generates HTML markup for the whole syntax highlighter.
         * @param {String} code Source code.
         * @return {String} Returns HTML markup.
         */
        getHtml: function(code)
        {
            var html = '',
                classes = [ 'syntaxhighlighter' ],
                tabSize,
                matches,
                lineNumbers
                ;

            // process light mode
            if (this.getParam('light') == true)
                this.params.toolbar = this.params.gutter = false;

            className = 'syntaxhighlighter';

            if (this.getParam('collapse') == true)
                classes.push('collapsed');

            if ((gutter = this.getParam('gutter')) == false)
                classes.push('nogutter');

            // add custom user style name
            classes.push(this.getParam('class-name'));

            // add brush alias to the class name for custom CSS
            classes.push(this.getParam('brush'));

            code = trimFirstAndLastLines(code)
                .replace(/\r/g, ' ') // IE lets these buggers through
            ;

            tabSize = this.getParam('tab-size');

            // replace tabs with spaces
            code = this.getParam('smart-tabs') == true
                ? processSmartTabs(code, tabSize)
                : processTabs(code, tabSize)
            ;

            // unindent code by the common indentation
            if (this.getParam('unindent'))
                code = unindent(code);

            if (gutter)
                lineNumbers = this.figureOutLineNumbers(code);

            // find matches in the code using brushes regex list
            matches = this.findMatches(this.regexList, code);
            // processes found matches into the html
            html = this.getMatchesHtml(code, matches);
            // finally, split all lines so that they wrap well
            html = this.getCodeLinesHtml(html, lineNumbers);

            // finally, process the links
            if (this.getParam('auto-links'))
                html = processUrls(html);

            if (typeof(navigator) != 'undefined' && navigator.userAgent && navigator.userAgent.match(/MSIE/))
                classes.push('ie');

            html =
                '<div id="' + getHighlighterId(this.id) + '" class="' + classes.join(' ') + '">'
                    + (this.getParam('toolbar') ? sh.toolbar.getHtml(this) : '')
                    + '<table border="0" cellpadding="0" cellspacing="0">'
                    + this.getTitleHtml(this.getParam('title'))
                    + '<tbody>'
                    + '<tr>'
                    + (gutter ? '<td class="gutter">' + this.getLineNumbersHtml(code) + '</td>' : '')
                    + '<td class="code">'
                    + '<div class="container">'
                    + html
                    + '</div>'
                    + '</td>'
                    + '</tr>'
                    + '</tbody>'
                    + '</table>'
                    + '</div>'
            ;

            return html;
        },

        /**
         * Highlights the code and returns complete HTML.
         * @param {String} code     Code to highlight.
         * @return {Element}        Returns container DIV element with all markup.
         */
        getDiv: function(code)
        {
            if (code === null)
                code = '';

            this.code = code;

            var div = this.create('div');

            // create main HTML
            div.innerHTML = this.getHtml(code);

            // set up click handlers
            if (this.getParam('toolbar'))
                attachEvent(findElement(div, '.toolbar'), 'click', sh.toolbar.handler);

            if (this.getParam('quick-code'))
                attachEvent(findElement(div, '.code'), 'dblclick', quickCodeHandler);

            return div;
        },

        /**
         * Initializes the highlighter/brush.
         *
         * Constructor isn't used for initialization so that nothing executes during necessary
         * `new SyntaxHighlighter.Highlighter()` call when setting up brush inheritence.
         *
         * @param {Hash} params Highlighter parameters.
         */
        init: function(params)
        {
            this.id = guid();

            // register this instance in the highlighters list
            storeHighlighter(this);

            // local params take precedence over defaults
            this.params = merge(sh.defaults, params || {})

            // process light mode
            if (this.getParam('light') == true)
                this.params.toolbar = this.params.gutter = false;
        },

        /**
         * Converts space separated list of keywords into a regular expression string.
         * @param {String} str    Space separated keywords.
         * @return {String}       Returns regular expression string.
         */
        getKeywords: function(str)
        {
            str = str
                .replace(/^\s+|\s+$/g, '')
                .replace(/\s+/g, '|')
            ;

            return '\\b(?:' + str + ')\\b';
        },

        /**
         * Makes a brush compatible with the `html-script` functionality.
         * @param {Object} regexGroup Object containing `left` and `right` regular expressions.
         */
        forHtmlScript: function(regexGroup)
        {
            var regex = { 'end' : regexGroup.right.source };

            if(regexGroup.eof)
                regex.end = "(?:(?:" + regex.end + ")|$)";

            this.htmlScript = {
                left : { regex: regexGroup.left, css: 'script' },
                right : { regex: regexGroup.right, css: 'script' },
                code : new XRegExp(
                    "(?<left>" + regexGroup.left.source + ")" +
                        "(?<code>.*?)" +
                        "(?<right>" + regex.end + ")",
                    "sgi"
                )
            };
        }
    }; // end of Highlighter

    return sh;
}(); // end of anonymous function

// CommonJS
typeof(exports) != 'undefined' ? exports.SyntaxHighlighter = SyntaxHighlighter : null;

;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        // Created by Peter Atoria @ http://iAtoria.com

        var inits 	 =  'class interface function package';

        var keywords =	'-Infinity ...rest Array as AS3 Boolean break case catch const continue Date decodeURI ' +
                'decodeURIComponent default delete do dynamic each else encodeURI encodeURIComponent escape ' +
                'extends false final finally flash_proxy for get if implements import in include Infinity ' +
                'instanceof int internal is isFinite isNaN isXMLName label namespace NaN native new null ' +
                'Null Number Object object_proxy override parseFloat parseInt private protected public ' +
                'return set static String super switch this throw true try typeof uint undefined unescape ' +
                'use void while with'
            ;

        this.regexList = [
            { regex: SyntaxHighlighter.regexLib.singleLineCComments,	css: 'comments' },		// one line comments
            { regex: SyntaxHighlighter.regexLib.multiLineCComments,		css: 'comments' },		// multiline comments
            { regex: SyntaxHighlighter.regexLib.doubleQuotedString,		css: 'string' },		// double quoted strings
            { regex: SyntaxHighlighter.regexLib.singleQuotedString,		css: 'string' },		// single quoted strings
            { regex: /\b([\d]+(\.[\d]+)?|0x[a-f0-9]+)\b/gi,				css: 'value' },			// numbers
            { regex: new RegExp(this.getKeywords(inits), 'gm'),			css: 'color3' },		// initializations
            { regex: new RegExp(this.getKeywords(keywords), 'gm'),		css: 'keyword' },		// keywords
            { regex: new RegExp('var', 'gm'),							css: 'variable' },		// variable
            { regex: new RegExp('trace', 'gm'),							css: 'color1' }			// trace
        ];

        this.forHtmlScript(SyntaxHighlighter.regexLib.scriptScriptTags);
    };

    Brush.prototype	= new SyntaxHighlighter.Highlighter();
    Brush.aliases	= ['actionscript3', 'as3'];

    SyntaxHighlighter.brushes.AS3 = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();

;(function()
{
    // CommonJS
    SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

    function Brush()
    {
        // AppleScript brush by David Chambers
        // http://davidchambersdesign.com/
        var keywords   = 'after before beginning continue copy each end every from return get global in local named of set some that the then times to where whose with without';
        var ordinals   = 'first second third fourth fifth sixth seventh eighth ninth tenth last front back middle';
        var specials   = 'activate add alias AppleScript ask attachment boolean class constant delete duplicate empty exists false id integer list make message modal modified new no paragraph pi properties quit real record remove rest result reveal reverse run running save string true word yes';

        this.regexList = [

            { regex: /(--|#).*$/gm,
                css: 'comments' },

            { regex: /\(\*(?:[\s\S]*?\(\*[\s\S]*?\*\))*[\s\S]*?\*\)/gm, // support nested comments
                css: 'comments' },

            { regex: /"[\s\S]*?"/gm,
                css: 'string' },

            { regex: /(?:,|:|¬|'s\b|\(|\)|\{|\}|«|\b\w*»)/g,
                css: 'color1' },

            { regex: /(-)?(\d)+(\.(\d)?)?(E\+(\d)+)?/g, // numbers
                css: 'color1' },

            { regex: /(?:&(amp;|gt;|lt;)?|=|� |>|<|≥|>=|≤|<=|\*|\+|-|\/|÷|\^)/g,
                css: 'color2' },

            { regex: /\b(?:and|as|div|mod|not|or|return(?!\s&)(ing)?|equals|(is(n't| not)? )?equal( to)?|does(n't| not) equal|(is(n't| not)? )?(greater|less) than( or equal( to)?)?|(comes|does(n't| not) come) (after|before)|is(n't| not)?( in)? (back|front) of|is(n't| not)? behind|is(n't| not)?( (in|contained by))?|does(n't| not) contain|contain(s)?|(start|begin|end)(s)? with|((but|end) )?(consider|ignor)ing|prop(erty)?|(a )?ref(erence)?( to)?|repeat (until|while|with)|((end|exit) )?repeat|((else|end) )?if|else|(end )?(script|tell|try)|(on )?error|(put )?into|(of )?(it|me)|its|my|with (timeout( of)?|transaction)|end (timeout|transaction))\b/g,
                css: 'keyword' },

            { regex: /\b\d+(st|nd|rd|th)\b/g, // ordinals
                css: 'keyword' },

            { regex: /\b(?:about|above|against|around|at|below|beneath|beside|between|by|(apart|aside) from|(instead|out) of|into|on(to)?|over|since|thr(ough|u)|under)\b/g,
                css: 'color3' },

            { regex: /\b(?:adding folder items to|after receiving|choose( ((remote )?application|color|folder|from list|URL))?|clipboard info|set the clipboard to|(the )?clipboard|entire contents|display(ing| (alert|dialog|mode))?|document( (edited|file|nib name))?|file( (name|type))?|(info )?for|giving up after|(name )?extension|quoted form|return(ed)?|second(?! item)(s)?|list (disks|folder)|text item(s| delimiters)?|(Unicode )?text|(disk )?item(s)?|((current|list) )?view|((container|key) )?window|with (data|icon( (caution|note|stop))?|parameter(s)?|prompt|properties|seed|title)|case|diacriticals|hyphens|numeric strings|punctuation|white space|folder creation|application(s( folder)?| (processes|scripts position|support))?|((desktop )?(pictures )?|(documents|downloads|favorites|home|keychain|library|movies|music|public|scripts|sites|system|users|utilities|workflows) )folder|desktop|Folder Action scripts|font(s| panel)?|help|internet plugins|modem scripts|(system )?preferences|printer descriptions|scripting (additions|components)|shared (documents|libraries)|startup (disk|items)|temporary items|trash|on server|in AppleTalk zone|((as|long|short) )?user name|user (ID|locale)|(with )?password|in (bundle( with identifier)?|directory)|(close|open for) access|read|write( permission)?|(g|s)et eof|using( delimiters)?|starting at|default (answer|button|color|country code|entr(y|ies)|identifiers|items|name|location|script editor)|hidden( answer)?|open(ed| (location|untitled))?|error (handling|reporting)|(do( shell)?|load|run|store) script|administrator privileges|altering line endings|get volume settings|(alert|boot|input|mount|output|set) volume|output muted|(fax|random )?number|round(ing)?|up|down|toward zero|to nearest|as taught in school|system (attribute|info)|((AppleScript( Studio)?|system) )?version|(home )?directory|(IPv4|primary Ethernet) address|CPU (type|speed)|physical memory|time (stamp|to GMT)|replacing|ASCII (character|number)|localized string|from table|offset|summarize|beep|delay|say|(empty|multiple) selections allowed|(of|preferred) type|invisibles|showing( package contents)?|editable URL|(File|FTP|News|Media|Web) [Ss]ervers|Telnet hosts|Directory services|Remote applications|waiting until completion|saving( (in|to))?|path (for|to( (((current|frontmost) )?application|resource))?)|POSIX (file|path)|(background|RGB) color|(OK|cancel) button name|cancel button|button(s)?|cubic ((centi)?met(re|er)s|yards|feet|inches)|square ((kilo)?met(re|er)s|miles|yards|feet)|(centi|kilo)?met(re|er)s|miles|yards|feet|inches|lit(re|er)s|gallons|quarts|(kilo)?grams|ounces|pounds|degrees (Celsius|Fahrenheit|Kelvin)|print( (dialog|settings))?|clos(e(able)?|ing)|(de)?miniaturized|miniaturizable|zoom(ed|able)|attribute run|action (method|property|title)|phone|email|((start|end)ing|home) page|((birth|creation|current|custom|modification) )?date|((((phonetic )?(first|last|middle))|computer|host|maiden|related) |nick)?name|aim|icq|jabber|msn|yahoo|address(es)?|save addressbook|should enable action|city|country( code)?|formatte(r|d address)|(palette )?label|state|street|zip|AIM [Hh]andle(s)?|my card|select(ion| all)?|unsaved|(alpha )?value|entr(y|ies)|group|(ICQ|Jabber|MSN) handle|person|people|company|department|icon image|job title|note|organization|suffix|vcard|url|copies|collating|pages (across|down)|request print time|target( printer)?|((GUI Scripting|Script menu) )?enabled|show Computer scripts|(de)?activated|awake from nib|became (key|main)|call method|of (class|object)|center|clicked toolbar item|closed|for document|exposed|(can )?hide|idle|keyboard (down|up)|event( (number|type))?|launch(ed)?|load (image|movie|nib|sound)|owner|log|mouse (down|dragged|entered|exited|moved|up)|move|column|localization|resource|script|register|drag (info|types)|resigned (active|key|main)|resiz(e(d)?|able)|right mouse (down|dragged|up)|scroll wheel|(at )?index|should (close|open( untitled)?|quit( after last window closed)?|zoom)|((proposed|screen) )?bounds|show(n)?|behind|in front of|size (mode|to fit)|update(d| toolbar item)?|was (hidden|miniaturized)|will (become active|close|finish launching|hide|miniaturize|move|open|quit|(resign )?active|((maximum|minimum|proposed) )?size|show|zoom)|bundle|data source|movie|pasteboard|sound|tool(bar| tip)|(color|open|save) panel|coordinate system|frontmost|main( (bundle|menu|window))?|((services|(excluded from )?windows) )?menu|((executable|frameworks|resource|scripts|shared (frameworks|support)) )?path|(selected item )?identifier|data|content(s| view)?|character(s)?|click count|(command|control|option|shift) key down|context|delta (x|y|z)|key( code)?|location|pressure|unmodified characters|types|(first )?responder|playing|(allowed|selectable) identifiers|allows customization|(auto saves )?configuration|visible|image( name)?|menu form representation|tag|user(-| )defaults|associated file name|(auto|needs) display|current field editor|floating|has (resize indicator|shadow)|hides when deactivated|level|minimized (image|title)|opaque|position|release when closed|sheet|title(d)?)\b/g,
                css: 'color3' },

            { regex: new RegExp(this.getKeywords(specials), 'gm'), css: 'color3' },
            { regex: new RegExp(this.getKeywords(keywords), 'gm'), css: 'keyword' },
            { regex: new RegExp(this.getKeywords(ordinals), 'gm'), css: 'keyword' }
        ];
    };

    Brush.prototype = new SyntaxHighlighter.Highlighter();
    Brush.aliases = ['applescript'];

    SyntaxHighlighter.brushes.AppleScript = Brush;

    // CommonJS
    typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();
;(function()
{
	// CommonJS
	SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

	function Brush()
	{
		var keywords =	'if fi then elif else for do done until while break continue case esac function return in eq ne ge le';
		var commands =  'alias apropos awk basename bash bc bg builtin bzip2 cal cat cd cfdisk chgrp chmod chown chroot' +
						'cksum clear cmp comm command cp cron crontab csplit cut date dc dd ddrescue declare df ' +
						'diff diff3 dig dir dircolors dirname dirs du echo egrep eject enable env ethtool eval ' +
						'exec exit expand export expr false fdformat fdisk fg fgrep file find fmt fold format ' +
						'free fsck ftp gawk getopts grep groups gzip hash head history hostname id ifconfig ' +
						'import install join kill less let ln local locate logname logout look lpc lpr lprint ' +
						'lprintd lprintq lprm ls lsof make man mkdir mkfifo mkisofs mknod more mount mtools ' +
						'mv netstat nice nl nohup nslookup open op passwd paste pathchk ping popd pr printcap ' +
						'printenv printf ps pushd pwd quota quotacheck quotactl ram rcp read readonly renice ' +
						'remsync rm rmdir rsync screen scp sdiff sed select seq set sftp shift shopt shutdown ' +
						'sleep sort source split ssh strace su sudo sum symlink sync tail tar tee test time ' +
						'times touch top traceroute trap tr true tsort tty type ulimit umask umount unalias ' +
						'uname unexpand uniq units unset unshar useradd usermod users uuencode uudecode v vdir ' +
						'vi watch wc whereis which who whoami Wget xargs yes'
						;

		this.regexList = [
			{ regex: /^#!.*$/gm,											css: 'preprocessor bold' },
			{ regex: /\/[\w-\/]+/gm,										css: 'plain' },
			{ regex: SyntaxHighlighter.regexLib.singleLinePerlComments,		css: 'comments' },		// one line comments
			{ regex: SyntaxHighlighter.regexLib.doubleQuotedString,			css: 'string' },		// double quoted strings
			{ regex: SyntaxHighlighter.regexLib.singleQuotedString,			css: 'string' },		// single quoted strings
			{ regex: new RegExp(this.getKeywords(keywords), 'gm'),			css: 'keyword' },		// keywords
			{ regex: new RegExp(this.getKeywords(commands), 'gm'),			css: 'functions' }		// commands
			];
	}

	Brush.prototype	= new SyntaxHighlighter.Highlighter();
	Brush.aliases	= ['bash', 'shell', 'sh'];

	SyntaxHighlighter.brushes.Bash = Brush;

	// CommonJS
	typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();
;(function()
{
	// CommonJS
	SyntaxHighlighter = SyntaxHighlighter || (typeof require !== 'undefined'? require('shCore').SyntaxHighlighter : null);

	function Brush()
	{
		// Contributed by Jen
		// http://www.jensbits.com/2009/05/14/coldfusion-brush-for-syntaxhighlighter-plus
	
		var funcs	=	'Abs ACos AddSOAPRequestHeader AddSOAPResponseHeader AjaxLink AjaxOnLoad ArrayAppend ArrayAvg ArrayClear ArrayDeleteAt ' + 
						'ArrayInsertAt ArrayIsDefined ArrayIsEmpty ArrayLen ArrayMax ArrayMin ArraySet ArraySort ArraySum ArraySwap ArrayToList ' + 
						'Asc ASin Atn BinaryDecode BinaryEncode BitAnd BitMaskClear BitMaskRead BitMaskSet BitNot BitOr BitSHLN BitSHRN BitXor ' + 
						'Ceiling CharsetDecode CharsetEncode Chr CJustify Compare CompareNoCase Cos CreateDate CreateDateTime CreateObject ' + 
						'CreateODBCDate CreateODBCDateTime CreateODBCTime CreateTime CreateTimeSpan CreateUUID DateAdd DateCompare DateConvert ' + 
						'DateDiff DateFormat DatePart Day DayOfWeek DayOfWeekAsString DayOfYear DaysInMonth DaysInYear DE DecimalFormat DecrementValue ' + 
						'Decrypt DecryptBinary DeleteClientVariable DeserializeJSON DirectoryExists DollarFormat DotNetToCFType Duplicate Encrypt ' + 
						'EncryptBinary Evaluate Exp ExpandPath FileClose FileCopy FileDelete FileExists FileIsEOF FileMove FileOpen FileRead ' + 
						'FileReadBinary FileReadLine FileSetAccessMode FileSetAttribute FileSetLastModified FileWrite Find FindNoCase FindOneOf ' + 
						'FirstDayOfMonth Fix FormatBaseN GenerateSecretKey GetAuthUser GetBaseTagData GetBaseTagList GetBaseTemplatePath ' + 
						'GetClientVariablesList GetComponentMetaData GetContextRoot GetCurrentTemplatePath GetDirectoryFromPath GetEncoding ' + 
						'GetException GetFileFromPath GetFileInfo GetFunctionList GetGatewayHelper GetHttpRequestData GetHttpTimeString ' + 
						'GetK2ServerDocCount GetK2ServerDocCountLimit GetLocale GetLocaleDisplayName GetLocalHostIP GetMetaData GetMetricData ' + 
						'GetPageContext GetPrinterInfo GetProfileSections GetProfileString GetReadableImageFormats GetSOAPRequest GetSOAPRequestHeader ' + 
						'GetSOAPResponse GetSOAPResponseHeader GetTempDirectory GetTempFile GetTemplatePath GetTickCount GetTimeZoneInfo GetToken ' + 
						'GetUserRoles GetWriteableImageFormats Hash Hour HTMLCodeFormat HTMLEditFormat IIf ImageAddBorder ImageBlur ImageClearRect ' + 
						'ImageCopy ImageCrop ImageDrawArc ImageDrawBeveledRect ImageDrawCubicCurve ImageDrawLine ImageDrawLines ImageDrawOval ' + 
						'ImageDrawPoint ImageDrawQuadraticCurve ImageDrawRect ImageDrawRoundRect ImageDrawText ImageFlip ImageGetBlob ImageGetBufferedImage ' + 
						'ImageGetEXIFTag ImageGetHeight ImageGetIPTCTag ImageGetWidth ImageGrayscale ImageInfo ImageNegative ImageNew ImageOverlay ImagePaste ' + 
						'ImageRead ImageReadBase64 ImageResize ImageRotate ImageRotateDrawingAxis ImageScaleToFit ImageSetAntialiasing ImageSetBackgroundColor ' + 
						'ImageSetDrawingColor ImageSetDrawingStroke ImageSetDrawingTransparency ImageSharpen ImageShear ImageShearDrawingAxis ImageTranslate ' + 
						'ImageTranslateDrawingAxis ImageWrite ImageWriteBase64 ImageXORDrawingMode IncrementValue InputBaseN Insert Int IsArray IsBinary ' + 
						'IsBoolean IsCustomFunction IsDate IsDDX IsDebugMode IsDefined IsImage IsImageFile IsInstanceOf IsJSON IsLeapYear IsLocalHost ' + 
						'IsNumeric IsNumericDate IsObject IsPDFFile IsPDFObject IsQuery IsSimpleValue IsSOAPRequest IsStruct IsUserInAnyRole IsUserInRole ' + 
						'IsUserLoggedIn IsValid IsWDDX IsXML IsXmlAttribute IsXmlDoc IsXmlElem IsXmlNode IsXmlRoot JavaCast JSStringFormat LCase Left Len ' + 
						'ListAppend ListChangeDelims ListContains ListContainsNoCase ListDeleteAt ListFind ListFindNoCase ListFirst ListGetAt ListInsertAt ' + 
						'ListLast ListLen ListPrepend ListQualify ListRest ListSetAt ListSort ListToArray ListValueCount ListValueCountNoCase LJustify Log ' + 
						'Log10 LSCurrencyFormat LSDateFormat LSEuroCurrencyFormat LSIsCurrency LSIsDate LSIsNumeric LSNumberFormat LSParseCurrency LSParseDateTime ' + 
						'LSParseEuroCurrency LSParseNumber LSTimeFormat LTrim Max Mid Min Minute Month MonthAsString Now NumberFormat ParagraphFormat ParseDateTime ' + 
						'Pi PrecisionEvaluate PreserveSingleQuotes Quarter QueryAddColumn QueryAddRow QueryConvertForGrid QueryNew QuerySetCell QuotedValueList Rand ' + 
						'Randomize RandRange REFind REFindNoCase ReleaseComObject REMatch REMatchNoCase RemoveChars RepeatString Replace ReplaceList ReplaceNoCase ' + 
						'REReplace REReplaceNoCase Reverse Right RJustify Round RTrim Second SendGatewayMessage SerializeJSON SetEncoding SetLocale SetProfileString ' + 
						'SetVariable Sgn Sin Sleep SpanExcluding SpanIncluding Sqr StripCR StructAppend StructClear StructCopy StructCount StructDelete StructFind ' + 
						'StructFindKey StructFindValue StructGet StructInsert StructIsEmpty StructKeyArray StructKeyExists StructKeyList StructKeyList StructNew ' + 
						'StructSort StructUpdate Tan TimeFormat ToBase64 ToBinary ToScript ToString Trim UCase URLDecode URLEncodedFormat URLSessionFormat Val ' + 
						'ValueList VerifyClient Week Wrap Wrap WriteOutput XmlChildPos XmlElemNew XmlFormat XmlGetNodeType XmlNew XmlParse XmlSearch XmlTransform ' + 
						'XmlValidate Year YesNoFormat';

		var keywords =	'cfabort cfajaximport cfajaxproxy cfapplet cfapplication cfargument cfassociate cfbreak cfcache cfcalendar ' + 
						'cfcase cfcatch cfchart cfchartdata cfchartseries cfcol cfcollection cfcomponent cfcontent cfcookie cfdbinfo ' + 
						'cfdefaultcase cfdirectoryxp 1.vxp 1ocument07-2012 Steitem07-2012 Stesectionxp 1ump cfelgExp exp.ifcom>rror ' + 
	mente'cfexchangecalendarcom>tensibleonn
// <httpowser impletacevenowser imfiltes-browser immailessions,
//taskan augmented, extecut.com>xievenfeed XReilExp flush(XReor/ MI
   grouxreg
   n
// MIftunninun// <httpgrixp;
reakcolumnan augmented, ereakrow refereupdahods
headludinhtmlt lo XRegnce t in para/ MI ProvimagExp imporevenincludRun wndexan augmented, einpun an asein an aterfacmous fvokglobals
(farg2 Stevenlayoriabl{

   area //-daxregloca/ <httplock-----gan augmented, elogi------ginusludinlog    //-ooxregt for at foe frame"// Acceevenmenu and fln
// MImoduf (XRNTauththanc("can augmented, eobjepresss fromcachExp outariable frame"pdProvpd{
    //hat addxpression ixpression isub additioowicepop object. Differpresent--------ntax inconsisliymousntax inludinpritevenprocessing1.5.1
ivrated.ocxpressionrocresultowser
    // syntopert (c)que/ (c)gExp e frame"regist/ (c)rethin an {
   on (patterth  throreturhttpsavlar eStevenscheew, en augmented, escripXRegEearcp) {selrom a se      cting    il= XRegEliors-brsprydata  contetored // chr,wit 0,
 tabTSIDE_CLASS,
    tex--------thr twice],
     tim, chrtooltixregtrw globtransa// <httptrerow Tyeen
// MIflags)ror("can'wddction to protectwind throxmor az     zime fra';

		var p
  ators =	'all and any between cross in join like not null or ouegExsomelone(pthis.regexList = [gmen{ otect: new RegExp('--(.*)$', 'gm'),mentedcss: 'comcense' },  // one line     multien hastructed infinite
   SyntaxHighlighterrotect ab.xmlCtructedRegEis constructed withihin aes ale quoted string    if (isInsideConstructor)
            doubleQwithiStoken,can't ca tokenRegExp cons flagsr within token definition functions");

        flags =tructo || "";
        context = { // `this` tructor within token definition fu     // recso prgetKeywords(hat s)en ani XRegis conhat would with// ion (flag) {return flags.indexOf(flag) > -1;},
   rn);
        setFlagis constlor1RegExp consrn);
         such) {return flags.indexOf(flag) > -1;},
   k1;},
      setFlag: functunToken' }xp consunTokengmen];
	}

	Brush.prototype	=ags.ideConstructor)
   tructor)
  ();(tokenRealiases	= [/ Chdfusion','cf'   i
	deConstructor)
   bkenRes.ColdFpos + = okenRone(// ow EonJS
	 {
 of(exthins) != 'undefined' ? eck for.okenR  } else :ex co;
})lt.o;     / <h()
{
              deConstructor)
   =         output.pu || (  // C require !=tive multicha?tch = na('shCore').ition
            luding)one(hat wouldokenR()
	{
	      pyror)
 2006 Shin, YoungJinResupattegex; {
      ATOM BOOLth;
 EAN BYTE CHAR COLORREF DWORD      LONG      _PTRIDE_gmented,     32      64 FLOAT HACCEL HALF pattHANDLE HBITMAP HBRUSHtern.charAt(Hse {
SPACE HCONVgExp.ILIST HCURSOR HDC HDDEDATA HDESK HDROP HDWP        currSENHMETAFI
          ONT HGDIOBJ HGLOBAL HHOOK HICON HINSTANRegEKEY        currSKL HLOC.OUTMENUtion        MODUcter
 NIT    PALETTE HPEN HRESULT        currSRGpushSRC HSZ HW      HWND INT     pattINT32    64 LANGID LC }

 TYPEtern.charAt(LGRP }

    .joi.join("") patt.joi32ce.ca    PARAM LPh;
  LP     LPse {
    ex = RegExp(PCSlacePCT       VO }

PCW            LP"[")
  LP    LP.join(P        souregexp = {
  : patte       n,
   h(chr);, "")), "")    
     P } el          souern,
  ern.charAt(      .join       patt      32  //  P64 P      P(chr ===  captureP     ames:------------ }
        Xubli }
   P
    contexconte
    // ToRegExpe.call(ags
  "1.OINTER_32---------

  NSIDE_C "1.SHORT PSIZE_CLASSS = 2;

gExpTturn rTegex;


    Uegex;
U(chr === ------------U    ablesRegExpbles   Xbles "1.U
    /----------------/------gs
    XmentT64Private variabIDE_CLA: patPWegex;
     s : nuSC_"[")
  SC_LOCK SERVICE_STATUSp = /[^giDE_CLern.charAt(SS = 2;

    //------------------
    //  Pbles
   //------------------------ern.charAt(-----

   var replacmentToke = /\$(?'])|{([USN : pat)/g,
      WlagClials for refereern.charAt(char bool shhin egex__int32ord)
 64ord)
 8ord)
 16 long float object __wn ES_rts tgmented, --
 _t _complex _devtestdiskfree_t diototl      _excep/ <ht_EXCEPTION_XRegExpSnative" is a     _s fugex;matc String.i64matcw String.prot         place,
totype.relace,ec,
       _split: Strlace,
FPIEEE_REC    fposmatcHEAPINFO _      lconvkeywpte.exec,
       jmp_buf mbstat,
  _offg of n
varg ofPNH ptrdinonparpurle, l_handle an agmented,sig_atomic_t sizng ofndli _n () ativndlii64 terminlinghat wouldantLastIndeed)
.proted)
lace,
ed)
b(x, "")br x m u undefine_utimec` antLastIndeva_lagaiotype.exwcTypeE RegExypall(winatinsigichaone(patteunTokens    }uto break RegExpaisReglass const declpe.srototyally _ch: String.p_flagec,
        ns` _castkenstinue priv("capublic sultecthin__atchspecnces only (idef// X delete dep
   thindlleck foIDE_within do dynaent ng deantLastIndeexp.cenumcterlicit extern if for friend goto inen haantLastIndemuxp(patnaked namespw gl    nos\S]))/no       no],
   antLastIndeern, fer reoid npreding de               //antLastIndexIz(mat   vac|[\s\S]7]{0,2struct xp.isRetempl("caso p   nativ.testlags !],
   true faxp.cflagpe.sdef---
 id---
 p.OU un      nativ.tesues a uuid virtual vo----olatif (whc = Reghilocesmente    posion (flag    }s and isaldA-Fate pha iscntrl isdigireatgraph islower is/regeantLastIndeispclas isTSIDE_isupp    /xused itoby
   tosed toerrno ----lmplevFa-f]{4}|c[A-etunctio acos asin atah adva2 cefor ookenshcter fabsxec:4}|cmodFa-f]{4}|c[AfraScrldax anoghavi10 modf powasFlasFlh sqrt dvantanh  `exec` antLastInde   ejmp setegExraise undeal undcrement = va_argndle-Za-va    r,2}|[4-7][0-7clearerr fclose f(matvides aRegExp)fgetclone(poslone(s fope    nativ.tes(/regef fpu(regpu(hasags !freNativfscanf fseek    , "g" tellveY ? "y" : "write ne(rene(r ES3+ (hapides a")),
            ES3   haremov)/;
    nativrmethodreothe 
     setec` setvnd fl")),
  s
     tmp
if (tmpnam //----------onalc v"")),
  vand flagturns anabSS] pt'sat
var atofly bily be || XRegExp.bos = 0,
alloc     
var est,    env lpt's     meturnemblen handowc;


    //---mbcach qsSS] r    reeturnesctionstrtolags) {lags) {ul sys
// antLastIndewcstombsegExomb memchr     mp     py     });
mem  costrca| (XRehliantLastIndextrurn gExpol  vargExplagsspn;
  ides astrgex strnegExp.cnurn [key] = XRegExns));
  pbrk a `cachestr };

  st flagtothe `xfrm asced)
xec,
                // ing   // gm  // uncti  // mk  // str If yoed)
cess, so protect against infinite
      hasNamedCapture: false,
      LineCow Error("is constructed wit	put.p token haer
        if (isInsideConstructor)
            r or xp(regex)` becaause it will not preserver or trigger
        if (isInsideConstructor)
             flags || "";
        context = { // eservetom tokens
            hasNamedCapture: false,
            captureNames: [],
       metacharacters escaped. Th/^ *#.*/gmRegExp Exp is conpre` cloneor wit) {return flags.indexOf(flag) > -1;},
    += match    seFlag: funct Check bol, coers are [ ] { } ( ) * + ? - . , \ ^ $ | # ion (flagspace
    XRegExpegExp synt = function (str) {
        return str.replace(/[unTokens(patten, pos, currScope,    };

       ifone(okenResult) {
                output.push(tokenResult.output);
            pphen ckenRsult.match[0].length || 1);
 pp  } else {
                // Check for native multicharacter metasequences (excluding character classes) at
                // the current position
                if (match = nativ.exec.call(nativeTokens[currScope], pattern.slice(pos))) {
                    outpu       nativeTokebs  tht as begEx rese {};

byhods   // `nati ES3checegExiveTokens` mces only (inclcated decimal  nativeTokeng("ca?:[0bject ]?|x[\dA-FavSteva-f]{2}|u

    // }|[4-7][0-7]\dA-Fa------ multichfixedxec: Re{4}|coreach    -z]|[\sf imf]{2}|uinkeywo XRegExp libid new glnull;ctiois to k    exp.OUTSIDE_CLASS cons from rn);
   ruct    match = overriorae fras octals,
 xcluding     // ags only reatcha-f]{2     sealhin e r2.lastIndexrved k-Za-z]|[\sckpattern\s\S])|\oken[?*+]\?|{\d+(?:,)/;
-----------quences only (iif (matastI u   exun      r2unsafe urved k------------------- exte attepression syntom id runby    o{2}|u[\ leou eere orderbyart ofon equals wicendtingde Error("ned,
 hat wouldfixow Error(m `na,nite
 Info)
	outpug" + css = ");
  [0]. funcOf("///") == 0  };		?// Check  indiconstructed  indid or  indunresto[            output.pusM `nas any val, );
  ue; re, Acc)   iif (t `global`
    // property, use `XRegExp(regex)`. Do not use `RegExp(regex)` becahat  :freezeTokensin a rve
    // special properties required for named capture
    XRegExp.copyAsGlobal = function (regex) {
        return clone(regex, "g");/@"(?:[^"]|"")*"/    ing. Escapednt within a rege@- within token definition functions");

        flags = flags || "";
        context = { // metacharacters escaped. The returned string
    // can safely be used at any point within a regex to match the provide\s literal string. Escaped
    // characteer fr
    // char tagsf the #ern,ont the#end loop
   // Accepts a string to search, regex to search with, position to startsimpler anc#;

                 re\bternial(?=\s+(?:iveTo|null;
   |?*+]\?)\b)totys, currScope, coex, "g")pe =x-----unTokenped
h;
   t is  i = -1, matyield     whilunrest| {};
)) { // "can't ca clone(regexec` (required for `lastIn    it is s andegexes cforHtmlS     (deConstructor)
            asp`lastITagst.ouin the
    // string (default: 0), and an optional Boolean indicating whether ma#hes m-sharches mh.indest start at-or-
    // after theS.ind  } else {
                // Check for native multicharacter metasequences (excluding character classes) at
                // the current position
                if (match = nativ.exec.call(nativeTokens[currScope], pattern.slice(pos))) {
                    outpuhat would > -1;},
  CSS(str  };

   unresto'\\b([a-z_]|)n aust    place(/ /g, '(?=:)\\b|ies, in w\\*]|\\*|)') +umbered band or}nResu// objects wiValueex` and `backref` propertiesh case the named or numbe!-)(?!ed back-
 es spec\: are passed "g" + ((anchored && Errt azimuth backid rnd-attach Stevbackref: 1} Chec tag attribu
// Rubackref: 1}posi       nativ.tesbackref: 1}repea> tag attribY) ? en habbox bn () uteslap? "y"e values
        {TSIDting XRegExptyl //     {tbrowse" (?<src>     {match[ackref:bottom// xregelef // xregetop{regex: XRegExmatch{regex: XRegExxp.com{regex: XRegEx   /utes
  )", "i"), backref:^\/]exp\\.com(/[^mes (sexp\\.com(/[^y pathsexp\\.com(/[^    Xexp\\.com(/[^#?]-widi, bchain) {
         )", "i"), backref:y paths         var     X         var          var xp.com cap-heatch[catring-sioratXRegE // spens. cl    egExp.matchChainope = XReouRegE-incre Steveor (i =tax t cue-afegExpue-bech &     curithimulti \\s -srccan't r    existon displa-Fa-f]{4}|c[Aelev------empty-cell's re && mnt--Za--adjusem.backfamiif (backref ef] || tr,
   : matchp\\.f] ||varianem.backwne(itef] |n[level].regone(ite   //let(i =p("^httpen hlone(itesNat      regex: hes.length)ix) \\s shes.length) natihes.length margin^#?]+)", "i"), bvel + 1match[vel + 1xp.com vel + 1   //vel + ----ker-of   co----s forhen hamaxlone(itep pr      minrototype inthods
 orphan;


    //---out 1) |hes =     // A          // A-------   //   : 0flow pador("^#?]+s the rematch[s the rexp.com s the re   //s the r p/ Ru)", "i"), bthe - {};
 {
    ray. the co       ray. the coin "g")pausgruity
ontext is // but is a.isReotype-rsibl tch)-duntingix) \\s src=" (?<src withs match[richnessist o slope s[i]spe cot load s.execnumertion.execary au------  // ntexely`
 le ltemhtringv

   s;


    //----p(pa-{

    quir-align #?]+with decor------with  funn` with shaer")with TypeE
    unicode-bidied for co
    Runits-per-ttern + "/" + veregExl the prvisibility----cem.backrevces / Leite.lenge widows retth this.s },
 .length -prototypeze conxned,
     vext red && });
absolthod}
   lways aqua armenivancetr au

  ens =a----- // src atehs a beturnngru- : 0;
   black blin sup.globlu "y"lt the plia, "i"), bac     .com prailf (Xapital    m.regex),
    ),
    irst vowser imatch[circf (X
   ct Reg or cches
    /: Rexpresocontsedreturned as|| 0;
 ouokenr (i eturned s becp becomebecomhai    rstingdashNSID    match   ma-leahe rezerotch = r2.esed s (mac dotINSIDbject eturned asembed embosurinength    expand  Rextra-g capturinec = ftotype.exfantasy fa issues, namatch[fg detInder (anchororm && uchsiazero-lengthgray grens gro});
  coheld hebrew help hidden    e high nati    co     1) |xp(pats\S]))/es a     "g")inRegE xes tczero-lengthmatcify landscain(mar    ec` rel ==, "g")l === cftwativelevel         lant ts, arhrough(matchn
// uncti loud by
  - flagseturned asby
       uring igLalobaing     nNpcg &&romach.lengNpcg ltr-------   /oon medium messay. tox midd levix  });
narry
   eturned asnavy negExp.prono-aptured valun tokno-Natithis), "g), backrn(!thl nowrap n(getNativwgExp.prooblique oltingonceex =        out XReg-------

    "g") : 0en haponull; thinraitg `eger: ttch;from// cpurplccepon (    vccepbackr      -xnativ.rey rgb ridgeext, args
    h = ad allowed(matcreturnrtl run- be cgLastscrn, flemifunction (s(var totype.exsee frle ligExp.prosh  // sult,silvs[0]by
     ifex), r2, fusreat  unde-capsfined)
   a contreation pft solidobject ntexll- ? rsquare s+) {
    \s\S])|\(\us-bar sub sud tosindex)` rad allowedlling         / Attacope / Attacces tooperties
   -id runlling fooer ihis._xregexpt loadis._xregexp.c-----
       is._xregeal          //ith ult.nam but ividehick    provideypeEparntextty tv ul = function (sexp.catotype.exe mu      sed t groupssed t         if matchad allowed    ifh > 1 urlpe.cal// Lue t) {
  reter index)` rx-tIndex-nativx-xec` mx- captwserw x-rgumex- undefx- matcx Fix brow `lastInyellowned,
     f] |----	'[mM]onoTSIDE_[tT]ahoma [vV]erdana [aA]rial [hH]elveegEx [sS]ans-serifngth his.lacC]ouri"") ono s----this.nd oegexes created by the `XRegExp`
    // constructor. This work XRegExp.copyAsGlobal = function (regex)
        return clone(regex, "g");
    };

    // Accepts a string; returns the string with regex ms` object for custom tokens
            hasNamedCapture: false,
            captureNames: [],
       tachaructor within token definition fu/\#[a-fA-F0-9]{3,6}totype.toString.c-----y callingegExches =some processing(-?\d+)(\.last?(px|em|pt|\:|\%|         regex        // `exp.prsome processing!withinanttotype.toSt XRegExp.esca3e the na)
         infinite
        // rec with `regex` antext) {
        var r2 = clone(regext);

     ;}
        };

        whhe next regex------    s XRegExorigLastIndex;
     ------) {return flags.indexOf(flag) > -1;},
     if h && !compl    // Check foer frastIn followxpectations if `lastIn{ugmently  the&lt;|<)\s*     .*?(&gt;|>)/gi,ugmen(matc
           /  this.l\s*Index = oriugmen}      callback.call(context, match, ++i, str, regex);
            if (r2.lastIndex =ss          r2.lastIndex++;
        Sosition or at the specified position only. This function ignores the `lastIndex`
    // of the provided regex in its own handling, but updates the property for compatibility
    XRegExp.execAt = function (str, regex, pos, anchored) {
        var r2 = clone(regex, "g" + ((anchored && h addr       sih;
      ventingar  oras wim be---- resean
       rdmult= pos = pos |egExp;
   veToken/xrens` m };

+]\?oer threncycan'/ Adds s// c; // Run tlasses)
    owxp.a]?|x[\d(str Strcter metu[\dA    var
         multiz------ multicheY ? "y" : "atte objects ndex !== poi < v------     heTSIDd    64 te(vaides named   match = nullods null;
     sly
 ndefibrary    eacte   etart r exnig `stlastInde---------

 f    iggea   r2p      retalue,ventingpnull
 upport foor("c  // pt text,
 rguments arro
    // matchiurn match;cedu charogframExp
    Xprved alue of ventingrguments arr});
    p
   null
 
   alue of h;
    };

    /    /emptyken =  (pa.repl480-7]{0,2}|[4-7cart       n || (hserved acteesn't suppors` flructor      var entingd `R


    //---------attetochanges. S natiion. until usesnt &s = f});
rnou exte}
   teredrn + "/" + (d (`flags`wis.exart UTSIDEUTSIDln xorcess, so protect against infinite
   /\(\*[\s\S]*?\*\)eral string.is constructed withi// Fix IE, Opera bug ( (* *n indclude pass{(?!\$)to nativ}eplace`, so don't try
        //if (...)
        //    {earch ty, use `XRegExp(regex)`. Do not use `RegExp(regex)` because it will not pr//if ( token hs escaped. The returned string
    // can safely be used at any point within a egex to match the provid\{\$ in A-Z]+ .+\hough the altered
 Check forxec` (rmpi    D existinat theRloop
 n a , etc.)
        [\d\.]+\b    origLastorigLastIndex;
      numbdefi12345, etc.)
        search , event) === "[objct Function]") {
            $F5D3rent position
            tokenResult = runTokens(pattern, pos, currScope, co
    

            ifn the
    // string (default: 0), and an optional Boolean indicating whether mdelphihen pascalts[0]);          r2.lastIndex++;
      Dgumen  } else {
                // Check for native multicharacter metasequences (excluding character classes) at
                // the current position
                if (match = nativ.exec.call(nativeTokens[currScope], pattern.slice(pos))) {
                    outpugs that
        // preclude pass^\+llin .*$eral Type conver2ment `la    and ndex` before cal-egex`replacement` (fix browsers)
efer            if (isResreplacem Type conversion
 //nd ansibl      i = -1, m^@@.*th;
placement` (});
 bl    ////ipatisidendex` before call= arguments[arg // Use the na theflag;}
        };
sReg= arguments[argument.las
    okenslag;}
  g object which can store properties
                    arguments[0] = new String(ariffts[0])tch           // Store named backrefiff  } else {
                // Check for native multicharacter metasequences (excluding character classes) at
                // the current position
                if (match = nativ.exec.call(nativeTokens[currScope], pattern.slice(pos))) {
                    output.pusntribu Alsby Jean-Lou Dupo   ma`exectp://jld     .blogspot.com/2009/06/erlang-seCons    /tor)
   ec` w ndex// Ach, r,
   o:$1) {
  $1) {
.org/doc/refeort e_manual/introdutside     #1.lt =       nativeT '{
          dalso b          remenb
   sl bsr bxExp., "i"the alt `nationded; otndlacex != = fementfnstrurexp.c0, argsgExp =rece      mes. Sw    rows, "i"} else {
  al args a rw, eCLASS] ^(?:\\(?ulticcess, so protect against infinite
        // rec"[ch =    a-z0-9_]+" && !co so don't trns    d witNumbered backreference
  \\%.      , podefaso don't try
                          // What d?                     defaEscaped
    // characters are [ ] { } ( ) * + ?" in       :  // - Bac        default:
 ion (flag) {f(regex, "g");
    };

    // Accepts a string; returns the string with regex ens
            hasNamedCapture: false,
            captureNames: [],
          // Accepts a string to search, regex to search w	      var r2 = clone(regargs.length - 1]` will be a string (given nonstring `this`)
            result = nativ.er     $1) {
          r2.lastIndex++;
      E1) {d       var args = arguments; // Keep this function's `arguments` available through closure
                return nativ.replace.call(replacement + "", replacementToken, function ($0, $1, $2) {
                    // Numbered backreference (without delimiters) or special variable
    AgExps Almiray if ($1) {
    forer     aa"00"
 /entry/nice_source_or c_      _            //     {regex: /<img\ and cre {};

    // `nativeTokens0;
     ftch = r2.eckrefere textsd backreferences to  !==ns as `argusngth);
 i     c(matnull;
        earc/ RuExp
    Xunrestorp.isRe

    //------red ; //sength - man    // excluding cement i
     nd or, resatch[   =  '------eturn regex.e ES3rved keywo   exec: RegExp.p    }
                gex.    }
   method        llPxp
   iereturneatch.}
            /r nooken&& ma&& m       ymited numbereNthod&& mWithIfuncts fu     Ape || XRegExp.Oind     OfrigLp infrom ma r2 n reverseE& ma= fun)", "i"), basImeTokens[asSynchronizchoreatte     an?
ctart of-bro mean?
});
Map to agairguments arradRng `execLsues r exins      is a toChasNatp pluL  extoUrl toke to lastIndex` fiachF manreferencRe thace 0 iB     refexp(r// BrByontexeadre magetTexRegExp's privaplit    re maemenR load appencesnor cBase64.
  exists and inclure mahould be runs accept dig   nam (!tto named OegulaStreamamed PregeWTSIDramed / - Othtions of seartring "$n ththt's the strt's thAn, if s/values anerriddsses)
    //xrinter lNums
(fM     haractersintls a eporcins upto         ForOrKipe |                g the `global`
    // property, use `XRegExp(regex)`. Do not use `RegExp(regex)` becaso don't try
        er frame, when `instanceof`
    // and `constructor` checks would fail to work as i                    return      return clone(regex, "g");
    };

    // Accepts a string; returns the stoString.call(o) === "acharacters escaped. The returned string
    // can safely be used at a = 0; // Fix IE, Safari bug (last tested IE /""".*""ototype.toStse
                search.G;
    this.global && !match[0].ties, \\d]+(\\.}

   )?|0xverhthis d areen a         //ction]") {
              // Accepts a string to search, regex to search with, posi    regex.lastIndexafari goovy
            i = -1, gs.indexOf(flag) > -1;},
   whitespace
    XastIndex = thission
     
    /java     ) {return flags.indexOf(flag) > -1;},
            unction (s /* separa             xec` (re      ) {return flags.indexOf(flag) > -1;},
          unction (s /* separaion (flag) {            .lastIndex--;
        if (!thdex` is checked within `callback`
            the
    // string (default: 0), and an optional Boolean indicating whether mIndexy          r2.lastIndex++;
      Ger: Uosition or at the specified position only. This function ignores the `lastIndex`
    // of the provided regex in its own handling, but updates the property for compatibility
    XRegExp.execAt = function (str, regex, pos, anchored) {
        var r2 = clone(regex, "g" + ((anchored && hasNativeh - 3)eturn re")),
            match;
   lastIndex = pos = pos || 0;
       literal/ Run the altered s = StreY ? "y" : ")
              if (ed && matunctions as `argu literalN   match = nubers;
                 bal)
         regex.lrguments arra        rn match;
    };

    // ropertExp's private lisby preventctfp         .isReserence to nu and flag chrop the uidden by numbered intextrfunct--

    // Lextend he `global`
    // property, use `XRegExp(regex)`. Do not use `RegExp(regex)` because it will not presrve
    // special properties req/\/\*([^\*]to nati)ve `/eral strin                 re/if (...)
        //   y(output, match.sli?!    )g to native `        lalace` or repeatedly cals` ob12 Ste-------n clone(regex, "g");
    };

    // Accepts a string; returns the string with regex meacharacters escaped. The returned string
    // can safely be used at any point within a        } else {
           }
     .astLen result;
    };borigobject Function]") {
           ake care of the?!\@null;
   \b)\@[\$\ws + "", searType conversion
     anno       @ out, etc.)
       (str.slice(l) === "[object Funfix browser[objenull;
       // If separator `s` is not a regex, use the nntext) {
        var r2 = clone(reg//---
    

            dex--;
        if (!thi.global)	
          %[@!=]?r nuastIndex;RegE%Index = oretc.0.5, Opera 11.61 on Windows)
        return !!match;
    };

    // Adds named captu
             r2.lastIndex++;
      J          var args = arguments; // Keep this function's `arguments` available through closure
                return nativ.replace.call(replacement + "", replacementToken, function ($0, $1, $2) {
                    // Numbered backreference (without delimiters) or special variable
    Pa    k Web
    if ($1) {
  px) + (wdition              switch4)
   fx- || 1-for                           pos += match[0].Beturn r      digits
  Dbject Du stringt is a		+ 'F(itemIerences     N      Sved k;
     Voito fols a `                     hasNativ     case ength - 3ckre      b-

  rc"}, {};

  `nativeTok.captureNam               ens[XNumberscluan thrs = Stri)
        if (artch[i}|c[om     ? "g" :acement f !== pralNum  func     
    d crea.copyAsGlobal[\s\nces fl{0,2}captureNamlazygExp---- reple (m
     CLASS]gex consgex s : 0;
            ost.exte ES4; inclu) parameter
    Stringc-.exte scope,ags !he nameired forrences frZa-z]| ES4; inclu.leng            and flag changes. Sokens if (matatteunctiooo many ain[captureNam//--iable     the alte/ Breaks  etc.)
trigger token hch.index));

                if (match.length > 1 && match.index < str.length)
                    Arr       }
        if (!this.global)
            this.lastIndex = origLastIndex; ring "$10"
                                // Also note:
                                /xist
                                // - Otherwise, it's the string "$10"
  he `l.?)(\b(\d*\.`las|\d+c(pat*)(e[+-]`last result;)
   \b\.?origLt;
    };


    /owser, ES3 compliant `split`
    String.prototype.sand whitespace
    XRegExpreturn replaceme += match------------
    //  Private helper functions
    //------------------------
ollow ectations if `lastIndex` is checked within `callback`
            callback.call(context, match, ++i, str, regex);
            if (r2.lastIndex jfx    ex._xrred for named
    // capture. Also aFXosition or at the specified position only. This function ignores the `lastIndex`
    // of the provided regex in its own handling, but updates the property for compatibility
    XRegExp.execAt = function (str, regex, pos, anchored) {
        var r2 = clone(regex, "g" + ((anchored & {};

    // `nati        lasses)
    nativeTokens[XRckrefer: "") ferences to replacement f.call($.copyAsGlo `lastIndex  regex.lunrestor  if (s.last

    //-----     // Protect agaonstructing ps withistructor = tratte position
                    ow expectatiotect against infinite
   r        thcaptur           else
                sear   // Fix browser bugs in native methogular expreSws)
            else
                seare native `exec` to skip some processinreNames, $2) : -1;
                           rety.prototype.push.apply(output, matgular expre    /\(\?#[^)]*\)/,
        function (matgExp = function (o) {
        reString.prototype.relace` or repeatedly calling `exec` within a `while` loop
    XRegExp.iterate = function (str, regex, callback, context) {
        v regex.lastIndex = r2.stIndex` aftenResu),
                 r.                        };
                        break;
                    }
                }
  s                   ll);
  ed for named
    // capture. Als`lastIllows adding new flags in the process of copying the regex
    function clone (regex, additionalFlags) {
        if (!XRegExp.isRegExp(regex))
            throw TypeError("type RegExp expected");
        var x = regex._xregexp;
        regex = XRegExp(regex.source, getNativeFlags(regDavid Si    s-Duffth and MaeredKube      pos      =etc.  IE bucin realaesh
ed kn      inms forhdher h    ch
    hd`,
hown ache[ke\k<([\enceotCapturCaptur     lementdge ofryp
       ty s    (relimindg= thihis.captuendhos = XRendne ne numbsult). Preserw. Preseser`exec`of d meothesttore sequentScricnt vallenoen wck (rehis pthis.ormen ha_CLASS,
 from 
    giprope\k<([\
     objg    stbyug
           ethod                //--getne       "n index > -1t.chadex + 1)ers. Prex, e if x + 1)pgrp? "" pid? "" rior= fun index > -1sult)tch[0].len    );

      // Empty)) ? ""      or [^
      pw----n index > -1 // tch[0].len[\^?]/          fu]
    Xsock,
       ockopt globn(
         want  // Whex   (reobal(soctlart ofkeys k    lc lc      lengt/ nonyntax, fla'sNatech.l copy a x.globag l () {map mk    msg] tomsgtch.msgrcv    snen(
       ondex =n"[]"     art    } pip    p   f  if (n <= af`) pa) {
  p(excn index > withmetanction (phe pat     paten ha, with kny co\\S]"recv  // Accn index >gth; irences fepts aonly, functrm    ;
  rn (xecN(?i:), (?      sem] ton index >sem // NemoExp.flag        s1) + (isNasength)) ?scop    scopmatch[0];
       atch)ss: [] scop     smatch) {
 ;
  r crossshiatchh
    shToken(hm patt        thhmUTSIDEshuted b// be let, mock// Nng (apther= funefercee onlde o );

         thled n, flagsgExp.udy});
he coyral k = pretu = p[]" ?sys pattsys(?i:         th pattesysUTSIDEcope cope    ut forcinthe     RegEe uc us\S].
 um syntax, flave mul uhis,k un"[\\sun";
       ns =-----vec       ait    warnonversi `lastI    eatur     'say';
                      tiv.teblhe rretud as         bm{
    dbm[]" ?dir); ////xr]?|x[\lsif e  //
var  `lastI replah && matndex !== pSS] d forpatingmegexx     ou searc/ Ruredo the ?imsx)
     = nat      retb tiforc     
    ex;
Last;

     wr ma     --
    ? "" : "(?:)";
      givenh - 1]tIndex`  ? "" : "(Try::Tin    mberyregex.g backreferences// Moos      haent text      egex) {
tion gesrc"}, : 0;
   aug Ste,
        gs that
        // preclude pass(<<|        )((\w+)|(['"])(.+?)\4y(this,+?\n\3\5\n // Run th // Use the nanctiodocts aybexec` wit exidrn nativ.replac#= argumen : output;
    }   t = tokens[i];
     /^#!.*  XRegtype.replace` or repeatedly cal    hebangn nativ.replac-?\w+     *=(>|ndex){ // Run thxt = { // `    a    mmaretun (snd flnd foo much?, etc.)
        q[qwxr]?\(to nativeunction (m) {r.push(m);}) with- the rn);
        oforEachExec = function {to nativehoughrn XRegExp.iterate(s, this, f, c);};
    {_xregexp)
     = function [to native](s) {var r = RegExp("^(?:" + this.source + ")[]egExp.prototype.validate(compaty(this, a this, f(s) {var r = RegExp("^(?:" + this.source + ")<>h(r) === 0;};
     */

})[^\w({<[]y(this, a\1(s) {var r = RegExp("^(?:" + this.source + ")non-ndededr;};
ntext))) {
                    t.pattern.lastIndex = indise, it's the string "$10"
                                // Also note:
                       "g")pporttly ignonting
ructor with    }

  gth - 2o  caseutf8
            output.pu:&amp;|[$@%efer$#)search _]y wi|::)*r nu  index) {
           egExp.prototype.__(?:END|    )__repl nati$totype.ion (s) {return clone(this, s);}(^|\n)=\w
// Begin\n=cut\s*\n|$         regex           returnpoIf separator `s` is not a regex, use the n         seFlag: function (flag) {f }
    );

    // Capturing group (match the opening parenthesis only).
   , scoppe),
                            match: match
   phined`: No limit
        // - `NaN` or zero: Return an empty array
        // - A positive     p a captP a captplurn "(";
        }
    );

    /utomosition or at the specified position only. This function ignores the `lastIndex`
    // of the provided regex in its own handling, but updates the property for compatibility
    XRegExp.execAt = function (str, regex, pos, anchored) {
        var r2 = clone(regex, "g" +      	ix IE buers wf Javaddcsl emp bug
e' : nul                _2] + a_key7]{0e;
    _chunkrt tabs.ombn han       unt_ice(matart-tarepl        ret          _assoc
          able. */
       u size. */
       u     'tab-f           retEnables o------ablesmatc      apture n. utter' : true,
b size. */
        /**     disables gutter.      /**  : 4,

        'toolbar'     'tab-bles named nables qude copy liabdisables gutter.mec` mck. */
    _rowed,    ck. */
 or = fun      pad    /** o'gutter'peturn  double click. */ modi      ction 'collaeduc: true,
rences f      os = 0,Enables;
   disables gutter.snly
 . */
  only
 . */
  uminks' :u     se,

      b size.disables gutter.** Get : 4,

      astItrue,

      ng off gutts or sets light mode. E  'toolbar' : true,

  uner th    'uni autom      true,

      walksets light mode. pt' ck-code' : tdvanced knig :, bas anharas fo  spaceit exibsp;'_n is {
 eturned as asmethodbcadd bc`
   bc// cbc    bcmulion (ecion (ch.ldoma   rz{
    bz   }the re, "i"), baz : 'true,

bzThis f mode
   modehe cbzegExp)bz[]" ?bz pattbzUTSIDEowledg      backrefere    r("can,

  nsr              var = indexOf(treNames, */
'autoes, assick code backrefere[1]);
   
   ut icopydge of Jav      bs' : turns         bi"s")ch ES : 'ollapsed. */
deg2raferences sighlc2ascii echo  matcrencesreg',
  _   var i,
  i alert         alror_//  Cro-length hter\ {
       eose `sheletho : 'Can\'t fcmd // Dot, to nareplac` (r    nd reos +_loa` pro ? "y" : "     rn: clone(regex,csv" + (has    trinleick code     gd*|xpe = X   // tpus is populaasn\'t confileaut.sl       //     id run    in         want     own     leperm   //  "") :ile Modeasn\'t conf(ite  //at thisregulan: clo    fn);
  asNativfpassthru "")),
        opt   handler: 
     asn\'t conf      sr croler,
+|#.scope f hasnal lxp twdefiriptw      : {
he newl             "\\" + (index +       return + (index lrush
// Rp.proN(maast    getmxrter cmyetur   re'
       re       my----getross       return    );

    // Empty character cctios "$ngleu     (match)]/,
        function (mach.lts			: /\/\*[\ut.sofd oriet Mode-browgm extermregex wini_a/
   ringtch."([^\\"_atchringre    i,
   kahead allowednull;
   ick codein */
 ip2   exis_gs. _,
    is_ reseis_retuguments_    g	: fter zero-lengthiicalmethString	:and ps'),
n   }s'),(itemis_in      multbal(sring	ences s_quantp("'  ex"([^\\\\"]|\\nan\\\\gex.l     meric    astIndeis_ patString	:repla[\s\S
     ?--(?i-m), m,
 oap_;}
    ([^\\\\"]|\\ch),
  \/[\ubomatic    s_upBrush ),
      UTSIString	:UTSIDp(patle in Fegex wnl2bipBrs : falsparse_ringand p/(&lt;he c/(&lt;h[i]Brushes :pa    foharactey combinatiolg, 'cepts a support x(?i), (x), r2, funrc"},str_i   var itTag FortTagplacemenlt;|<)	: { leftrot13/g, rshuffsReg},

l autnts[i] === tr_ typabs' : (XRegsep(patter` flagp(pattern, flags };

   If yoch),p_n a `t.*?(le' : nulscript> tags.i    \s*sce' : nul\s*she copypts a `RaXRegEp(patte    oolbar:    toolbar:
      th thscript> tags.cript\spscript.*iptTags	rerns t*script\sML marku set. The copy has a RegExp plight  // `cript> tags.lugins.        *   //             t: Rear       " + ((anchored && hasNativse' : faiveY){};

    // `natihat would veTokel tok };

    0;
      l     should no+) {
}|[4-7][0-7]?|x[\
// Prendr html =end(regms = sseparate      (s.lastend--
   rs = String.p& match && maeY ? "y" : " objects lobalone using the regex
 anonymotGetHtm_tch[0null;
      bers;
     st Bref
            re---------

 ld          igger: altered `exec` (required for () {retur = naghter, etc.)
 1;
    }


    //-due t--------yIDE_C------
   ice(0ow expeteralNumbers;	= '__    __ __LIN  htmlMETHOD htmlFUNCype.mhtmlCLASS__g the `global`
    // property, use `XRegExp(regex)`. Do not use `RegExp(regex)` because it will not preserve
    // special properties required for named capture
    XRegExp.copyAsGlobal = function (regex) {
        return clone(regex, "g");
    };

    // Accepts a string; returns the string with regex metach/ Fix browser bugs in native method
    RegExp.prototype.test = function (str) {
        // Use the/ Comment pattern: (?# )
    XRegExp.ad/astI+ Fix IE, Operadex) {
            rement turn rg) {return flags.indexOf(flag) > -1;},
            setFlag: function (flag) {fexec` (r    s += flag;}
        };

        while (pos < patternts);

                 // C "", // Type  conversion
            output = [],
            lastLions
    //-------------------------- `lastIndex   // Behavior for `limit`: if it's...
        // - `unde values are:
    n the
    // string (default: 0), and an optional Boolean indicating whether mph           r2.lastIndex++;
      Ph       if (regex.global)
            regex.lastIndex = 0;
    };

    // Accepts a string and an array of regexes; returns the result of using each successive regex
    // to search within the matches of the previous regex. The array of regexes can also contain
    a toolbar anchor.
             */
            handler: function(e)
            ch.laticalain               var target = e.tar           var args = arguments; // Keep this function's `arguments` available through closure
                return nativ.replace.call(replacement + "", replacementToken, function ($0, $1, $2) {
                    // Numbered backreference (without delimiters) or special variable
     oel 'Jaykul' Bennett,$1) {
  Pocurrde     |$1) {
  Hu= RedM// Ts    up.
             */Tokens =li : {    entDefau
    RentDefauperedrn },

           entDefau      ect. If the p;

 tr.sl      }h.config.
    lone            e	: /"(          :{}
        } after frlbar.it(rege    if (a/
   ences       xp.c0-3][0-e framto z);}
    );


 ps should be cmdlet    http:")),
      
     \\? % #       #Html(hig#pating#       nstance.
 m "`"
// (d lis of     ?:)"ix) \\s sice(mex.m\\S]S]))/;
    nativ                 byExp
                  rrt fningundefines;
          lenge(pattern);
        getNativturn ags.lengthice( scrsipt sting  can be mceq c Runges, / `lastIndex` (the clt c   disc    not');
      not.toolbnotetButtocan be mec,
                aq exNatif and p		: tapplyn be mieq ige i
       .tooli['expandSourcei   dis;
    (highlighten(hi      Source', s				: { is istickl    k|| 0; i < arrlreli dis", ""              
       Source', oly, g (?-ght: /%wildexecnd or chhange XRverb (!coms/value XRegEue tDE_Cror("caun-7][0-7]?undult,ar ites` wie tak fros, if [key] = XRegE    er) {   XRegmode kip       ken(
  /^\), etc  for convAccep          };

    /ut dia&gt;l     p.pro  // Doe/ Accep });
-7][0-7]?)?gs[args.a};

odifie{ left: /
        ? r    che[keyasons.limi. Two dals
(fue only
id runtch.nt as lerences to repseparaLASS] totype      bRegExenp(patincr       dis

    ebug cx    return sh.tme : 'p* Enatogs.aboutex.mus.about           as `aluesTML m       ative" is an eck// ma aggrc(str)adined,
 // I can't     }a wayesuletHight  // {retubsp;'astIl    fier
 - // special p, becity
 SH wo }
          
            s,            ret does }
 usednly
 ook----

; i++)
  ructe },

= 'ose()ongex, e           xaas `u[\dA-Fal },

forretu },
ier
g// ( which overtec`       ent's
         * 						classesa = fu vari `whnk.id)eslanks sped lis of i    te },
ruame r i osRegynopsiscess, so protect against infinite
        // recu^\Stri[#\\s]*\\.('+_item'
                  * @)+').*when ain XRegEscaped
    // char  },

 = funct     retuent-       },
operty, use `XRegExp(regex)`. Do not use `RegExp(rutom   /\(\?#[^)]*\)*\)/,
        function (n (match) {
            // Keep toke         #to nativ#Index = oral string. Ect }</code> objectn = Xs.
      tifier
 /**
         *`RegExp`inite
        // recu@"\\n[\\s\native\n"@hen an XRegExp pera bug (las      ch),
   = element Name		Command namnctitch[ Opera 11.61 on Windows)
   "@'config.tagName))'@ "$10" me {
            varonfig,
        Shortc = element hasFlag: functio         ;

            // support f'urn \\$\\utti\)d, a)|Objec`"ct.pr[^`]"',& !compliOUTSIDE_CLASS`

    // dding tokens, the
    // third (`scope`)/ support fo'rn Ob']|'')*'           {
            var    if (conf.lement ? [eltive `exec` to skip some  infinite
        // recu[\\$|@|@@](?:(?:      |onfig,|Html(hi|env):)ce 10          // A cp.
             */
     resul$     getButtonHtml: function(high 0;     +lapsethe named or num back-
'ent
-his is a e.call(thi_]*hen an         // {
             " : "(?gExp synt    ],

   result = {
                            output: t.handles
        conf = sh.c clone(regex,              arams, parseParams(element- elements in the cun.length) {
           conf = sh.cx = matchction]") {
 y.pron);
    ra 11.61 on Windows)
      [    _\\[     tem.. `,\\[\\]d, a]lobals
      str = this + "", // Type  source.Net [Type]        *
         * @param s+-(?!ll elements on the page that +'This is a   if (item.params['brush'] == onversion
   source          	E_CLAg object which can store properties
                    arguments[0] = new String(apcg &\'t faticaush(npos(str, search, function () {
     Pcg &S't fllows adding new flags in the process of copying the regex
    function clone (regex, additionalFlags) {
        if (!XRegExp.isRegExp(regex))
            throw TypeError("type RegExp expected");
        var x = regex._xregexp;
        regex = XRegExp(regex.source, getNativeFlags(regGheorghe Miltivend Ahmad Sme`.f      posExp.OUTSIDE_'etNatih - 3) {
                       l elstent.
 astIndex` fixin replecn in itemsregex.mu        +
            title : sh.clambda      , ri// O true type.re     (var    iex, match.in
        /\\'__e only__as pre
    ye n,lybsp;'ch),
      y" : "uffd astedStrinwnd = popureN      

     
   coe>)/g   }

    doc.    beretoke                'div    \dA-);
 e          and pro(param     ed && mathis.rozpturdoc = wnd.d> -1           s has     hash;
     convlso
ariabal(s);

or `lastInd'is        nd c@;#]*/g s thegex sNatirk ligex.ngeliabl "${n}"dToke    highliastIndex= "[]" ?  : "urnsracters            Rraw_
     se,

      highlireBrus     * @ean?
d pScriptken(
tml-sc      ndowhin ts\S]           highling} Rem match, ution ModerigLastI== nd for c    s x    elzip

        ter  && ++)
N tokT    F  // self cl   {atictch.index));

              n {Array}	Returns list of <code>{ target: DOMElement, paramsows use o   t = tokens[ing
    // `Str@urns mean?
   ct }</code  // staracters ats: function['\"]{3})utti1])pe.
//nt
      ove CDATA from <SCRIPT/> tags if "(?!")s[i].|\\\"|[^\""\n]protont
                         ativ.replacName'tle if (\\\'Tags\''ute i' present
               if ((target.titl\+|\-|\*|\/ var=|==sent
       
        },

    et.title;

     brn); //wd ford as
         *        /f ((target.titgs.indexOf(flag) > -1;},
            setFlag: function (flag) {fment = highlighter.getDiv(code);

        o search with, polocal refme;
                highlgs.indexOf(flag) > -1;},
         e    element.id = t Check fo indis andexpectations if `lastIndex` is checked within `callback`
            callback.call(context, match, ++i, str, regex);
            if (r2.lastIndex py    *ytho      var highlighter = getHighlig     llows adding new flags in the process of copying the regex
    function clone (regex, additionalFlags) {
        if (!XRegExp.isRegExp(regex))
            throw TypeError("type RegExp expected");
        var x = regex._xregexp;
        regex = XRegExp(regex.source, getNativeFlags(regErik P     on.elements.length; i+  }
urce(varBEGIN args[ar{};

    //veTok       ine_       backrefero separa  );

    wnd = popupEND be con'scro: "") +or        + argsCLASSTokenlacementr              s XRere(varred for `lastIndex`    match, t;
   ---------st.call(q   XRegElh - 1]--
   his to
        builtbe m0].l     BigdA-FB       CveTokl vains a conDir E: String.     t, falrenc::S+|#.renceFixdA-Fes.sto display thH    ce(0) : IO  is aData        M+ argsNilt, falNmlCommeO from P(XReR    RR    p};
     S/ Add::TMS Symbd, the cached Tlags Gd run     * Tt.sl    t, fatch.index));

                if (match.length > 1 && match.index < str.leement, params:                 return n > -1 ? args[n + 1] : $0;
                    }
       stIndex === match.index)
                se		Command name that would be executed.
             * @param {String} label			Label text to display
             * @return {String}					Rebnce over glimit) : output;
    } "", // Type conversion
            ou/krefe             d fo: output;
    };


    //---sget Dhe SyntaxHighlig    @|@)urns HTML markudex) {
       alify.
   erge      ,----bers;
ld be @@sh

       getButtonHtml: function(highlighter, commandNntext) {
        var r2 = clone(regex, Required for seturn flags.indexOf(flag) > -1;},
   urns truspace
    XRegExp.escapdex = r2.urns tru   // Behavior for `limit`: if it's...
        // - `undefined`: No limit
n the
    // string (default: 0), and an optional Boolean indicating whether mrub     `), ush(nrorurce[burn "(";
        }
    );

    /Rub negative number: No limit
        // - Other: Type-convert, then use the above rules
        if (limit === undefined || +limit < 0) {
            limit = Infinity;
        } else {
            limit = Math.floor(+limit);
            if (!limit)
                retur/ objects with `regex` and `backref` properties, in which case the named or numbered back-
    // references specified are passed forward to the next regex or returned. E.g.:
    // var xregexpImgFileNames = XRegExp.matchChain(html, [
    //     {regex: /<img\b([^>]+)>/i, backref: 1}, // <img> tag attributes
    //     {regex: XRegExp('(?ix) \\s src=" (?<src> [^"]+ )'), backref: "src"}, // src attribute values
    //     {regex: XRegExp("^http://xregexp\\.com(/[^#?]+)", "i"), backref: 1}, // xregexp.com paths
    //     /[^\/]+$/ // filenames (strip directory paths)
    // ]);
    XRegExp.matchChain = function (str, chain) {
        return function recurseChain (values, level) {
            var item = chain[level].regex ? chain[level] : {regex: chain[level]},
                regex = clone(item.regex, "g"),
                matches = [], i;
            for (i = 0; i < values.length; i++) {
                XRegExp.iterate(values[i], regex, function (match) {
                    matches.push(item.backref ? (match[item.backref] || "") : match[0]);
                });
            }
            return ((level === chain.length - 1) || !matches.length) ?
                matches : recurseChain(matches, level + 1);
        }([str], 0);
    };


    //---------------------------------
    //  New RegExp prototype methods
    //---------------------------------

    // Accepts a context object and arguments array; returns the result of calling `exec` with the
    // first value in the arguments array. the context is ignored but is accepted for congruity
    // with `Function.prototype.apply`
    RegExp.prototype.apply = function (context, args) {
        return this.exec(args[0]);
    };

    // Accepts a context object and string; returns the result of calling `exec` with the provided
    // string. the context is ignored but is accepted for congruity with `Function.prototype.call`
    RegExp.prototype.call = function (context, str) {
        return this.exec(str);
    };


    //--------------div, 'coll-----------
    //  Overriden native methods
    //---------------------------------

    // Adds named capture support (with backreferences returned as `result.name`), and fixes two
    // cross-browser issues per ES3:
    // - Captured values for nonparticipating capturing groups should be returned as `undefined`,
    //   rather than the empty string.
    // - `lastIndex` ot be incremented after zero-length matches.
    RegExp.prototype.exec = function (str) {
        var match, name, r2, origLastIndex;
        if (!this.global)
            origLastIndex = this.lastIndex;
        match = nativ.exec.apply(this, arguments);
        if (match) {
            // Fix browsers whose `exec` methods don't consistently return `undefined` for
            // nonparticipating capturing groups
            if (!compliantExecNpcg && match.length > 1 && indexOf(match, "") > -1) {
                r2 = RegExp(this.source, nativ.replace.call(getNativeFlags(this), "g", ""));
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                nativ.replace.call((str + "").slice(match.index), r2, function () {
                    for (var i = 1; i < arguments.length - 2; i++) {
                        if (arguments[i] === undefined)
                            match[i] = undefined;
                    }
                });
            }
            // Attach named capture properties
            if (this._xregexp && this._xregexp.captureNames) {
                for (var i = 1; i < match.length; i++) {
                    name = this._xregexp.captureNames[i - 1];
                    if (name)
                        match[name] = match[i];
                }
            }
            // Fix browsers that increment `lastIndex` after zero-length matches
   change XRe if (!compliantLastIndexIncrement && this.global && !match[0].length && (this.lastIndex > match.index))
              hange XRndlin      *  ')
         !ist: ['    }
   
    // char    @e only
@nd res @  doc.@0].le@if @aram@--
   @n AS3
@tGetHtmme in obj1)
    //---------------------------------

    // Augment XRegExp's regular expre    /\(\?#[^)]*\)  });
        }

        if (isRegex) {
            if dToken(
        /\(\?#[^)]*\) function addClass(targe Short {
        var result = { "t     search.lastIndex = params.title = targding tokens, the
    // third (`scope`) aows)
            else
   Opens up a centered poptive `exec` to skip some processing overhead, even though the altered
        //  `exec` would take care of th\be `lastIndex` fixes
        var limit) :onsistent cross-brows   if (!this.globaleturns HTML markup.
             */
           getButtonHtml: function(highlighter, commandNt;
    };
h && !compndex = this.lastI!nativ
    };
f separator `s` is not a regex, use the n
    // charh && !comtype.execAll = function (s
    // char match = nativ.exec.call(this, str);
        // Fix browsers that increment  `lastIndex` after zero-length matches
        if (match && !compliantLastIndexIncreement && this.global && !match[0].length && (this.lastIndex > match.index))
             this.lastIn var result = [];

        for (var i = 0; i < source.length; i++)
            rsget ,
   e support and fixes browser bugs iSlScr      var args = arguments; // Keep this function's `arguments` available through closure
                return nativ.replace.call(replacement + "", replacementToken, function ($0, $1, $2) {
                    // Numbered backreference (without delimiters) or special variable
    Ye el Jbanov
    eferenBparardt(params); }
         n {Stink to smar   //anges.ue t= pos)
  forSodStr only
;
      from gex.l in itemeturn 2.lastIndex : 0;
   (varded iaramteral}
      // DModend restosh

  Exps within      ms.l brush
    func}|[4-7][0-7]?|x[dex !=                         egExp   }

  : "")ned,
        opue if[_:=><%#@]+s[n];
                        n = captureNames ? indexOf(captureNames, $2) : -1;
       = origLastIndex; // F n > -1 ? args[n + 1] : $0;
                    }
                });
           = origLastIndex; // Fix IE, Opera bug (last tested IE 9.0.5, Opera 11.61 on Winrgument defaults to `XRegExp.Exp.matchWithinChainement] : to token definition functions");

        flags =lar expression syntax and fl    Exp.matchWithinChainegExp(ct RegExp]";
 st tested IE 9.0.5, Safari 5.1.2 on Windows)
            else
 Exp.matchWithinChainreturn {String}					Result;
    ern)Index` fput.pushch, origLastIndex;
     er, ES3 compliant `split`
    String.prototype.split = function (s /*rs that increment `lastIndex` after zero-length matchntList               co regex.lastIndex rs.di-m);

            if (tokenResult) {
                output.push(tokenResult.output);
           sh.br type		Name of the event.
     * h.bruumber of leading zeroes.
             *   [int] - length up to which pad line numbers.
             */
            'pad-line-numbers' : false,

            /** Lines to highlight. */
            'highlight' : false,

            /** Title to be displayed above the code block. */
   vg        

   aln't                 XRegEx     stastance; returnes[alias-----*$/gisgex.ll === y
   mon    ul = e   var i he pa{String} classt : '-----ct} elReturnting
     patt      sed to-----yeawser bu" + ((anchored && h  Overrtside pe="tion ge/
    row E (reded ores named      rien pe)", "i"), bainntaxbit    c);
  {
  
    igits
       Objectwnd.fo, match nonh)) ? "" :eferencs toATA autong ar
             ementation  // aegex/);
       from || 0; i < arrcre("canubRegEx= thies[aliasr("cans[alias]];
egExp.iteata) ? " : {
lasses)
    neturn: {
   y string.
  tml = '<div clkens[XRecremifunc    bject ded`,lasses)
    -3][0-kreferencesnd-      ose `e            d method: "") +0]);
      eY ? "y" : "ed && match c@paraee pr which wise tex.muf     ;

                fgr  * wnd = popup       d ru     av             }     conve  },ndedam('titlnded   ? "x // WhitedString		, namnces in re n.  + //     
    o\B an
    XR`undef    RegExp. "${n}"       }([stind trmodwserthis.soTags * @png `    *dToken(
xmlComme    fnregexaks ---------

 ]" ? "etButto     ? rregulardex` fit.par typegExpi     
   ;
  primntaxwnd = popup(matcer fuog :eramsrations. 
    // Br.replace                        p(pattercute: functi    
                 s
(fu forbackng foup op thrw, eExp.ma {
     {String} clash - 2e
// <ht?m), etc.qu         ides ');
indBr    rExp(searchs\S])[key] = XRegEatinescs      :,\d*:,\d*oyntax t;
  oken is a     sult     nameplacesden by numbered   * @pasideConlue = faifier
  nument and s
    nindentror("ca       f (highlighter    *vary   XReew    * @rXRegEment tyklone(pattern);
        }
        // Tokens become part of the regex construction process, so protect against infinite
   /rsion w       {
       use it will not preserve
    // sndler or trigger
        if (isInsideConstructor)
            lar expression syntax and flaam {String} commandName		Command name that would be executed.
             * @paramaram {String} alias		Brush alias.
     * @paraam {DOMElement} target Target DOM elemegs.indexOf(flag) > -1;},
            setFlag:width - width
    //        conti}
        };

        while (pos < pattern.length) {
              }

        returce code.
  t the current position
            tokenResult = runTokens(pattern, po   regex.lastIndex = r2. to a String object which can store properties
                    arguments[0] = new String(asqly pad numbers with minimum requiSqelement)
        {
            var elements = this.findElements(globalParams, element),
       e provided regex in its own handling, but updates the property for compatibility
    XRegExp.execAt = function (str, regex, pos, anchored) {
        var r2 = clone(regex, "g" + ((anchored &AddH compliAd0" osOfs "0A: reA  );
Avar nsi As Assembly Ans =ct.
     *
       capRefcapturByVal C  coCsmarCtHighC     Captureure
 CDunction taking CDec CDblreNam CIntnt, falsLsentObjlse st C     }CSsentStr C				tern.charAt(punctD    matD       DIndex` Dxec(str)Dim      iC  reDo.capture     s specified xp.c  ifIf End EdA-FErsmarE */
 E) {
 E          FmultichFor F[A-Za-         repat wouldGetr = h linGoSub GoTo  with s If Ithe regex
I onlys I    *
     * Iame`. wo oarget.cid new glIs Let Lib L         L----MelasslassNamect.
     *
Mustntial s ce(/O: 0;
   Mysts  My= -1;
 .OUTSIDE_New NLineNo = ''hiderMonkey's prNo/ {2,}/g * - Nonction(m * -     /**On O trimF      al Or Or  if ct.
     *
ctior   s ength - 1; i+: 0;
  s P fra classPtax rve Ptml(hig numbered------------xcluding P   // Ren == 0 ||captOaks Re wraREM R   {
 with giR      ct.
     *
R      Shelp: Set Sgnores    ch
      };ructortargic SlengSme3:;
     nnative and / Addons.(/</fereL thiT    T (objTo      Try 				Of Uer = neUr.
  ct.
     *
V);
    W    W-
            = 0 |s t's t to tXowser bugs that
        // preclude pass'.addFlags = function (s) {return cleserve
    // special properties required for named capture
   JS
    if (typeof(require) != 'undefaches of subverting
    // `String         regexmatch.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        }
    );

    // Capturing group (match the opening parenthesis only).
    // Revb

    // Supporting function for `XRedex` is checked within `callback`
            callback.call(context, match, ++i, str, regex);
            if (r2.lastIndex v
    vbneturn "(";
        }
    );

    /Vb
     * Splits block of text into lines.
     * @param {String} block Block of text.
     * @return {Array} Returns array of lines.
     */
    function splitLines(block)
    {
        return block.split(/\r?\n/);
    }

    /**
     * Generates HTML ID for the highlighter.
     //");
        };
    };

    // A  // Adds s  //---------------- is a       '&nb=      rue` inditag       X(elements       fig.ta/\\?]*(?<urns>[:\\w-\ceme){Strxg').    ( '&n)	Size convert=arch(r)a `Rent.fifts any .ler and tsnati))) {etc. gExp`allbacode, tabS	Size 	      he tab.
     * @turns c [\\w:\\ith all t.
     *king 			p=			p   tab += ' ';
(?<     > ".*?"|\'.*?\'|\ wit'        ' ';
s re
    		--
   ((code, tabSi=      places by s nati
    {
         v.
     . var(    {String} comart spaces.urns` for regex l +tab = '';

egex lit  var tm)t.ou  Code to fix the tabs in.
     * @param {N     r} tabSize Number of spaces in amber of spacevalue; retur code with all t    xt = {     * @r = el regerocesof tm {Strinaces.
     fix th * @ree tabs in.
     tagNumber} tabSize Numbetagvalue; retur\t',
        clone(r = splces tabh.config.nver and r   this.lastIndex--;
        }
     tab.
     * @\\        \!m {O\\wided,?\\[(f thscode\]\\] thedex = hen an XRegEws use of named back<![ ...       ]]ope variables deConstructor)
            throw Error("ca function(s)
               +)
  --     --ope variables  tab.
     * @return {String}			Re

   (?<code, tabS>.*? {String}			Re.
        fs    d/**
:      // h, scopevar result = [];

        for (var i = 0; i < source.length; i++)
            rxm.
   xegExubstrsl     (0, cst start at-or-
    // after thXmelement)
        {
            var elements = this.findElements(globalParams, element),
       