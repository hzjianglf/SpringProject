/*!
 * FullCalendar v2.5.0
 * Docs & License: http://fullcalendar.io/
 * (c) 2015 Adam Shaw
 */

(function(factory) {
	if (typeof define === 'function' && define.amd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		module.exports = factory(require('jquery'), require('moment'));
	}
	else {
		factory(jQuery, moment);
	}
})(function($, moment) {

;;

var FC = $.fullCalendar = {
	version: "2.5.0",
	internalApiVersion: 1
};
var fcViews = FC.views = {};


$.fn.fullCalendar = function(options) {
	var args = Array.prototype.slice.call(arguments, 1); // for a possible method call
	var res = this; // what this function will return (this jQuery object by default)

	this.each(function(i, _element) { // loop each DOM element involved
		var element = $(_element);
		var calendar = element.data('fullCalendar'); // get the existing calendar object (if any)
		var singleRes; // the returned value of this single method call

		// a method call
		if (typeof options === 'string') {
			if (calendar && $.isFunction(calendar[options])) {
				singleRes = calendar[options].apply(calendar, args);
				if (!i) {
					res = singleRes; // record the first method call result
				}
				if (options === 'destroy') { // for the destroy method, must remove Calendar object data
					element.removeData('fullCalendar');
				}
			}
		}
		// a new calendar initialization
		else if (!calendar) { // don't initialize twice
			calendar = new Calendar(element, options);
			element.data('fullCalendar', calendar);
			calendar.render();
		}
	});
	
	return res;
};


var complexOptions = [ // names of options that are objects whose properties should be combined
	'header',
	'buttonText',
	'buttonIcons',
	'themeButtonIcons'
];


// Merges an array of option objects into a single object
function mergeOptions(optionObjs) {
	return mergeProps(optionObjs, complexOptions);
}


// Given options specified for the calendar's constructor, massages any legacy options into a non-legacy form.
// Converts View-Option-Hashes into the View-Specific-Options format.
function massageOverrides(input) {
	var overrides = { views: input.views || {} }; // the output. ensure a `views` hash
	var subObj;

	// iterate through all option override properties (except `views`)
	$.each(input, function(name, val) {
		if (name != 'views') {

			// could the value be a legacy View-Option-Hash?
			if (
				$.isPlainObject(val) &&
				!/(time|duration|interval)$/i.test(name) && // exclude duration options. might be given as objects
				$.inArray(name, complexOptions) == -1 // complex options aren't allowed to be View-Option-Hashes
			) {
				subObj = null;

				// iterate through the properties of this possible View-Option-Hash value
				$.each(val, function(subName, subVal) {

					// is the property targeting a view?
					if (/^(month|week|day|default|basic(Week|Day)?|agenda(Week|Day)?)$/.test(subName)) {
						if (!overrides.views[subName]) { // ensure the view-target entry exists
							overrides.views[subName] = {};
						}
						overrides.views[subName][name] = subVal; // record the value in the `views` object
					}
					else { // a non-View-Option-Hash property
						if (!subObj) {
							subObj = {};
						}
						subObj[subName] = subVal; // accumulate these unrelated values for later
					}
				});

				if (subObj) { // non-View-Option-Hash properties? transfer them as-is
					overrides[name] = subObj;
				}
			}
			else {
				overrides[name] = val; // transfer normal options as-is
			}
		}
	});

	return overrides;
}

;;

// exports
FC.intersectRanges = intersectRanges;
FC.applyAll = applyAll;
FC.debounce = debounce;
FC.isInt = isInt;
FC.htmlEscape = htmlEscape;
FC.cssToStr = cssToStr;
FC.proxy = proxy;
FC.capitaliseFirstLetter = capitaliseFirstLetter;


/* FullCalendar-specific DOM Utilities
----------------------------------------------------------------------------------------------------------------------*/


// Given the scrollbar widths of some other container, create borders/margins on rowEls in order to match the left
// and right space that was offset by the scrollbars. A 1-pixel border first, then margin beyond that.
function compensateScroll(rowEls, scrollbarWidths) {
	if (scrollbarWidths.left) {
		rowEls.css({
			'border-left-width': 1,
			'margin-left': scrollbarWidths.left - 1
		});
	}
	if (scrollbarWidths.right) {
		rowEls.css({
			'border-right-width': 1,
			'margin-right': scrollbarWidths.right - 1
		});
	}
}


// Undoes compensateScroll and restores all borders/margins
function uncompensateScroll(rowEls) {
	rowEls.css({
		'margin-left': '',
		'margin-right': '',
		'border-left-width': '',
		'border-right-width': ''
	});
}


// Make the mouse cursor express that an event is not allowed in the current area
function disableCursor() {
	$('body').addClass('fc-not-allowed');
}


// Returns the mouse cursor to its original look
function enableCursor() {
	$('body').removeClass('fc-not-allowed');
}


// Given a total available height to fill, have `els` (essentially child rows) expand to accomodate.
// By default, all elements that are shorter than the recommended height are expanded uniformly, not considering
// any other els that are already too tall. if `shouldRedistribute` is on, it considers these tall rows and 
// reduces the available height.
function distributeHeight(els, availableHeight, shouldRedistribute) {

	// *FLOORING NOTE*: we floor in certain places because zoom can give inaccurate floating-point dimensions,
	// and it is better to be shorter than taller, to avoid creating unnecessary scrollbars.

	var minOffset1 = Math.floor(availableHeight / els.length); // for non-last element
	var minOffset2 = Math.floor(availableHeight - minOffset1 * (els.length - 1)); // for last element *FLOORING NOTE*
	var flexEls = []; // elements that are allowed to expand. array of DOM nodes
	var flexOffsets = []; // amount of vertical space it takes up
	var flexHeights = []; // actual css height
	var usedHeight = 0;

	undistributeHeight(els); // give all elements their natural height

	// find elements that are below the recommended height (expandable).
	// important to query for heights in a single first pass (to avoid reflow oscillation).
	els.each(function(i, el) {
		var minOffset = i === els.length - 1 ? minOffset2 : minOffset1;
		var naturalOffset = $(el).outerHeight(true);

		if (naturalOffset < minOffset) {
			flexEls.push(el);
			flexOffsets.push(naturalOffset);
			flexHeights.push($(el).height());
		}
		else {
			// this element stretches past recommended height (non-expandable). mark the space as occupied.
			usedHeight += naturalOffset;
		}
	});

	// readjust the recommended height to only consider the height available to non-maxed-out rows.
	if (shouldRedistribute) {
		availableHeight -= usedHeight;
		minOffset1 = Math.floor(availableHeight / flexEls.length);
		minOffset2 = Math.floor(availableHeight - minOffset1 * (flexEls.length - 1)); // *FLOORING NOTE*
	}

	// assign heights to all expandable elements
	$(flexEls).each(function(i, el) {
		var minOffset = i === flexEls.length - 1 ? minOffset2 : minOffset1;
		var naturalOffset = flexOffsets[i];
		var naturalHeight = flexHeights[i];
		var newHeight = minOffset - (naturalOffset - naturalHeight); // subtract the margin/padding

		if (naturalOffset < minOffset) { // we check this again because redistribution might have changed things
			$(el).height(newHeight);
		}
	});
}


// Undoes distrubuteHeight, restoring all els to their natural height
function undistributeHeight(els) {
	els.height('');
}


// Given `els`, a jQuery set of <td> cells, find the cell with the largest natural width and set the widths of all the
// cells to be that width.
// PREREQUISITE: if you want a cell to take up width, it needs to have a single inner element w/ display:inline
function matchCellWidths(els) {
	var maxInnerWidth = 0;

	els.find('> *').each(function(i, innerEl) {
		var innerWidth = $(innerEl).outerWidth();
		if (innerWidth > maxInnerWidth) {
			maxInnerWidth = innerWidth;
		}
	});

	maxInnerWidth++; // sometimes not accurate of width the text needs to stay on one line. insurance

	els.width(maxInnerWidth);

	return maxInnerWidth;
}


// Turns a container element into a scroller if its contents is taller than the allotted height.
// Returns true if the element is now a scroller, false otherwise.
// NOTE: this method is best because it takes weird zooming dimensions into account
function setPotentialScroller(containerEl, height) {
	containerEl.height(height).addClass('fc-scroller');

	// are scrollbars needed?
	if (containerEl[0].scrollHeight - 1 > containerEl[0].clientHeight) { // !!! -1 because IE is often off-by-one :(
		return true;
	}

	unsetScroller(containerEl); // undo
	return false;
}


// Takes an element that might have been a scroller, and turns it back into a normal element.
function unsetScroller(containerEl) {
	containerEl.height('').removeClass('fc-scroller');
}


/* General DOM Utilities
----------------------------------------------------------------------------------------------------------------------*/

FC.getOuterRect = getOuterRect;
FC.getClientRect = getClientRect;
FC.getContentRect = getContentRect;
FC.getScrollbarWidths = getScrollbarWidths;


// borrowed from https://github.com/jquery/jquery-ui/blob/1.11.0/ui/core.js#L51
function getScrollParent(el) {
	var position = el.css('position'),
		scrollParent = el.parents().filter(function() {
			var parent = $(this);
			return (/(auto|scroll)/).test(
				parent.css('overflow') + parent.css('overflow-y') + parent.css('overflow-x')
			);
		}).eq(0);

	return position === 'fixed' || !scrollParent.length ? $(el[0].ownerDocument || document) : scrollParent;
}


// Queries the outer bounding area of a jQuery element.
// Returns a rectangle with absolute coordinates: left, right (exclusive), top, bottom (exclusive).
function getOuterRect(el) {
	var offset = el.offset();

	return {
		left: offset.left,
		right: offset.left + el.outerWidth(),
		top: offset.top,
		bottom: offset.top + el.outerHeight()
	};
}


// Queries the area within the margin/border/scrollbars of a jQuery element. Does not go within the padding.
// Returns a rectangle with absolute coordinates: left, right (exclusive), top, bottom (exclusive).
// NOTE: should use clientLeft/clientTop, but very unreliable cross-browser.
function getClientRect(el) {
	var offset = el.offset();
	var scrollbarWidths = getScrollbarWidths(el);
	var left = offset.left + getCssFloat(el, 'border-left-width') + scrollbarWidths.left;
	var top = offset.top + getCssFloat(el, 'border-top-width') + scrollbarWidths.top;

	return {
		left: left,
		right: left + el[0].clientWidth, // clientWidth includes padding but NOT scrollbars
		top: top,
		bottom: top + el[0].clientHeight // clientHeight includes padding but NOT scrollbars
	};
}


// Queries the area within the margin/border/padding of a jQuery element. Assumed not to have scrollbars.
// Returns a rectangle with absolute coordinates: left, right (exclusive), top, bottom (exclusive).
function getContentRect(el) {
	var offset = el.offset(); // just outside of border, margin not included
	var left = offset.left + getCssFloat(el, 'border-left-width') + getCssFloat(el, 'padding-left');
	var top = offset.top + getCssFloat(el, 'border-top-width') + getCssFloat(el, 'padding-top');

	return {
		left: left,
		right: left + el.width(),
		top: top,
		bottom: top + el.height()
	};
}


// Returns the computed left/right/top/bottom scrollbar widths for the given jQuery element.
// NOTE: should use clientLeft/clientTop, but very unreliable cross-browser.
function getScrollbarWidths(el) {
	var leftRightWidth = el.innerWidth() - el[0].clientWidth; // the paddings cancel out, leaving the scrollbars
	var widths = {
		left: 0,
		right: 0,
		top: 0,
		bottom: el.innerHeight() - el[0].clientHeight // the paddings cancel out, leaving the bottom scrollbar
	};

	if (getIsLeftRtlScrollbars() && el.css('direction') == 'rtl') { // is the scrollbar on the left side?
		widths.left = leftRightWidth;
	}
	else {
		widths.right = leftRightWidth;
	}

	return widths;
}


// Logic for determining if, when the element is right-to-left, the scrollbar appears on the left side

var _isLeftRtlScrollbars = null;

function getIsLeftRtlScrollbars() { // responsible for caching the computation
	if (_isLeftRtlScrollbars === null) {
		_isLeftRtlScrollbars = computeIsLeftRtlScrollbars();
	}
	return _isLeftRtlScrollbars;
}

function computeIsLeftRtlScrollbars() { // creates an offscreen test element, then removes it
	var el = $('<div><div/></div>')
		.css({
			position: 'absolute',
			top: -1000,
			left: 0,
			border: 0,
			padding: 0,
			overflow: 'scroll',
			direction: 'rtl'
		})
		.appendTo('body');
	var innerEl = el.children();
	var res = innerEl.offset().left > el.offset().left; // is the inner div shifted to accommodate a left scrollbar?
	el.remove();
	return res;
}


// Retrieves a jQuery element's computed CSS value as a floating-point number.
// If the queried value is non-numeric (ex: IE can return "medium" for border width), will just return zero.
function getCssFloat(el, prop) {
	return parseFloat(el.css(prop)) || 0;
}


// Returns a boolean whether this was a left mouse click and no ctrl key (which means right click on Mac)
function isPrimaryMouseButton(ev) {
	return ev.which == 1 && !ev.ctrlKey;
}


/* Geometry
----------------------------------------------------------------------------------------------------------------------*/

FC.intersectRects = intersectRects;

// Returns a new rectangle that is the intersection of the two rectangles. If they don't intersect, returns false
function intersectRects(rect1, rect2) {
	var res = {
		left: Math.max(rect1.left, rect2.left),
		right: Math.min(rect1.right, rect2.right),
		top: Math.max(rect1.top, rect2.top),
		bottom: Math.min(rect1.bottom, rect2.bottom)
	};

	if (res.left < res.right && res.top < res.bottom) {
		return res;
	}
	return false;
}


// Returns a new point that will have been moved to reside within the given rectangle
function constrainPoint(point, rect) {
	return {
		left: Math.min(Math.max(point.left, rect.left), rect.right),
		top: Math.min(Math.max(point.top, rect.top), rect.bottom)
	};
}


// Returns a point that is the center of the given rectangle
function getRectCenter(rect) {
	return {
		left: (rect.left + rect.right) / 2,
		top: (rect.top + rect.bottom) / 2
	};
}


// Subtracts point2's coordinates from point1's coordinates, returning a delta
function diffPoints(point1, point2) {
	return {
		left: point1.left - point2.left,
		top: point1.top - point2.top
	};
}


/* Object Ordering by Field
----------------------------------------------------------------------------------------------------------------------*/

FC.parseFieldSpecs = parseFieldSpecs;
FC.compareByFieldSpecs = compareByFieldSpecs;
FC.compareByFieldSpec = compareByFieldSpec;
FC.flexibleCompare = flexibleCompare;


function parseFieldSpecs(input) {
	var specs = [];
	var tokens = [];
	var i, token;

	if (typeof input === 'string') {
		tokens = input.split(/\s*,\s*/);
	}
	else if (typeof input === 'function') {
		tokens = [ input ];
	}
	else if ($.isArray(input)) {
		tokens = input;
	}

	for (i = 0; i < tokens.length; i++) {
		token = tokens[i];

		if (typeof token === 'string') {
			specs.push(
				token.charAt(0) == '-' ?
					{ field: token.substring(1), order: -1 } :
					{ field: token, order: 1 }
			);
		}
		else if (typeof token === 'function') {
			specs.push({ func: token });
		}
	}

	return specs;
}


function compareByFieldSpecs(obj1, obj2, fieldSpecs) {
	var i;
	var cmp;

	for (i = 0; i < fieldSpecs.length; i++) {
		cmp = compareByFieldSpec(obj1, obj2, fieldSpecs[i]);
		if (cmp) {
			return cmp;
		}
	}

	return 0;
}


function compareByFieldSpec(obj1, obj2, fieldSpec) {
	if (fieldSpec.func) {
		return fieldSpec.func(obj1, obj2);
	}
	return flexibleCompare(obj1[fieldSpec.field], obj2[fieldSpec.field]) *
		(fieldSpec.order || 1);
}


function flexibleCompare(a, b) {
	if (!a && !b) {
		return 0;
	}
	if (b == null) {
		return -1;
	}
	if (a == null) {
		return 1;
	}
	if ($.type(a) === 'string' || $.type(b) === 'string') {
		return String(a).localeCompare(String(b));
	}
	return a - b;
}


/* FullCalendar-specific Misc Utilities
----------------------------------------------------------------------------------------------------------------------*/


// Computes the intersection of the two ranges. Returns undefined if no intersection.
// Expects all dates to be normalized to the same timezone beforehand.
// TODO: move to date section?
function intersectRanges(subjectRange, constraintRange) {
	var subjectStart = subjectRange.start;
	var subjectEnd = subjectRange.end;
	var constraintStart = constraintRange.start;
	var constraintEnd = constraintRange.end;
	var segStart, segEnd;
	var isStart, isEnd;

	if (subjectEnd > constraintStart && subjectStart < constraintEnd) { // in bounds at all?

		if (subjectStart >= constraintStart) {
			segStart = subjectStart.clone();
			isStart = true;
		}
		else {
			segStart = constraintStart.clone();
			isStart =  false;
		}

		if (subjectEnd <= constraintEnd) {
			segEnd = subjectEnd.clone();
			isEnd = true;
		}
		else {
			segEnd = constraintEnd.clone();
			isEnd = false;
		}

		return {
			start: segStart,
			end: segEnd,
			isStart: isStart,
			isEnd: isEnd
		};
	}
}


/* Date Utilities
----------------------------------------------------------------------------------------------------------------------*/

FC.computeIntervalUnit = computeIntervalUnit;
FC.divideRangeByDuration = divideRangeByDuration;
FC.divideDurationByDuration = divideDurationByDuration;
FC.multiplyDuration = multiplyDuration;
FC.durationHasTime = durationHasTime;

var dayIDs = [ 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat' ];
var intervalUnits = [ 'year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond' ];


// Diffs the two moments into a Duration where full-days are recorded first, then the remaining time.
// Moments will have their timezones normalized.
function diffDayTime(a, b) {
	return moment.duration({
		days: a.clone().stripTime().diff(b.clone().stripTime(), 'days'),
		ms: a.time() - b.time() // time-of-day from day start. disregards timezone
	});
}


// Diffs the two moments via their start-of-day (regardless of timezone). Produces whole-day durations.
function diffDay(a, b) {
	return moment.duration({
		days: a.clone().stripTime().diff(b.clone().stripTime(), 'days')
	});
}


// Diffs two moments, producing a duration, made of a whole-unit-increment of the given unit. Uses rounding.
function diffByUnit(a, b, unit) {
	return moment.duration(
		Math.round(a.diff(b, unit, true)), // returnFloat=true
		unit
	);
}


// Computes the unit name of the largest whole-unit period of time.
// For example, 48 hours will be "days" whereas 49 hours will be "hours".
// Accepts start/end, a range object, or an original duration object.
function computeIntervalUnit(start, end) {
	var i, unit;
	var val;

	for (i = 0; i < intervalUnits.length; i++) {
		unit = intervalUnits[i];
		val = computeRangeAs(unit, start, end);

		if (val >= 1 && isInt(val)) {
			break;
		}
	}

	return unit; // will be "milliseconds" if nothing else matches
}


// Computes the number of units (like "hours") in the given range.
// Range can be a {start,end} object, separate start/end args, or a Duration.
// Results are based on Moment's .as() and .diff() methods, so results can depend on internal handling
// of month-diffing logic (which tends to vary from version to version).
function computeRangeAs(unit, start, end) {

	if (end != null) { // given start, end
		return end.diff(start, unit, true);
	}
	else if (moment.isDuration(start)) { // given duration
		return start.as(unit);
	}
	else { // given { start, end } range object
		return start.end.diff(start.start, unit, true);
	}
}


// Intelligently divides a range (specified by a start/end params) by a duration
function divideRangeByDuration(start, end, dur) {
	var months;

	if (durationHasTime(dur)) {
		return (end - start) / dur;
	}
	months = dur.asMonths();
	if (Math.abs(months) >= 1 && isInt(months)) {
		return end.diff(start, 'months', true) / months;
	}
	return end.diff(start, 'days', true) / dur.asDays();
}


// Intelligently divides one duration by another
function divideDurationByDuration(dur1, dur2) {
	var months1, months2;

	if (durationHasTime(dur1) || durationHasTime(dur2)) {
		return dur1 / dur2;
	}
	months1 = dur1.asMonths();
	months2 = dur2.asMonths();
	if (
		Math.abs(months1) >= 1 && isInt(months1) &&
		Math.abs(months2) >= 1 && isInt(months2)
	) {
		return months1 / months2;
	}
	return dur1.asDays() / dur2.asDays();
}


// Intelligently multiplies a duration by a number
function multiplyDuration(dur, n) {
	var months;

	if (durationHasTime(dur)) {
		return moment.duration(dur * n);
	}
	months = dur.asMonths();
	if (Math.abs(months) >= 1 && isInt(months)) {
		return moment.duration({ months: months * n });
	}
	return moment.duration({ days: dur.asDays() * n });
}


// Returns a boolean about whether the given duration has any time parts (hours/minutes/seconds/ms)
function durationHasTime(dur) {
	return Boolean(dur.hours() || dur.minutes() || dur.seconds() || dur.milliseconds());
}


function isNativeDate(input) {
	return  Object.prototype.toString.call(input) === '[object Date]' || input instanceof Date;
}


// Returns a boolean about whether the given input is a time string, like "06:40:00" or "06:00"
function isTimeString(str) {
	return /^\d+\:\d+(?:\:\d+\.?(?:\d{3})?)?$/.test(str);
}


/* Logging and Debug
----------------------------------------------------------------------------------------------------------------------*/

FC.log = function() {
	var console = window.console;

	if (console && console.log) {
		return console.log.apply(console, arguments);
	}
};

FC.warn = function() {
	var console = window.console;

	if (console && console.warn) {
		return console.warn.apply(console, arguments);
	}
	else {
		return FC.log.apply(FC, arguments);
	}
};


/* General Utilities
----------------------------------------------------------------------------------------------------------------------*/

var hasOwnPropMethod = {}.hasOwnProperty;


// Merges an array of objects into a single object.
// The second argument allows for an array of property names who's object values will be merged together.
function mergeProps(propObjs, complexProps) {
	var dest = {};
	var i, name;
	var complexObjs;
	var j, val;
	var props;

	if (complexProps) {
		for (i = 0; i < complexProps.length; i++) {
			name = complexProps[i];
			complexObjs = [];

			// collect the trailing object values, stopping when a non-object is discovered
			for (j = propObjs.length - 1; j >= 0; j--) {
				val = propObjs[j][name];

				if (typeof val === 'object') {
					complexObjs.unshift(val);
				}
				else if (val !== undefined) {
					dest[name] = val; // if there were no objects, this value will be used
					break;
				}
			}

			// if the trailing values were objects, use the merged value
			if (complexObjs.length) {
				dest[name] = mergeProps(complexObjs);
			}
		}
	}

	// copy values into the destination, going from last to first
	for (i = propObjs.length - 1; i >= 0; i--) {
		props = propObjs[i];

		for (name in props) {
			if (!(name in dest)) { // if already assigned by previous props or complex props, don't reassign
				dest[name] = props[name];
			}
		}
	}

	return dest;
}


// Create an object that has the given prototype. Just like Object.create
function createObject(proto) {
	var f = function() {};
	f.prototype = proto;
	return new f();
}


function copyOwnProps(src, dest) {
	for (var name in src) {
		if (hasOwnProp(src, name)) {
			dest[name] = src[name];
		}
	}
}


// Copies over certain methods with the same names as Object.prototype methods. Overcomes an IE<=8 bug:
// https://developer.mozilla.org/en-US/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
function copyNativeMethods(src, dest) {
	var names = [ 'constructor', 'toString', 'valueOf' ];
	var i, name;

	for (i = 0; i < names.length; i++) {
		name = names[i];

		if (src[name] !== Object.prototype[name]) {
			dest[name] = src[name];
		}
	}
}


function hasOwnProp(obj, name) {
	return hasOwnPropMethod.call(obj, name);
}


// Is the given value a non-object non-function value?
function isAtomic(val) {
	return /undefined|null|boolean|number|string/.test($.type(val));
}


function applyAll(functions, thisObj, args) {
	if ($.isFunction(functions)) {
		functions = [ functions ];
	}
	if (functions) {
		var i;
		var ret;
		for (i=0; i<functions.length; i++) {
			ret = functions[i].apply(thisObj, args) || ret;
		}
		return ret;
	}
}


function firstDefined() {
	for (var i=0; i<arguments.length; i++) {
		if (arguments[i] !== undefined) {
			return arguments[i];
		}
	}
}


function htmlEscape(s) {
	return (s + '').replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/'/g, '&#039;')
		.replace(/"/g, '&quot;')
		.replace(/\n/g, '<br />');
}


function stripHtmlEntities(text) {
	return text.replace(/&.*?;/g, '');
}


// Given a hash of CSS properties, returns a string of CSS.
// Uses property names as-is (no camel-case conversion). Will not make statements for null/undefined values.
function cssToStr(cssProps) {
	var statements = [];

	$.each(cssProps, function(name, val) {
		if (val != null) {
			statements.push(name + ':' + val);
		}
	});

	return statements.join(';');
}


function capitaliseFirstLetter(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}


function compareNumbers(a, b) { // for .sort()
	return a - b;
}


function isInt(n) {
	return n % 1 === 0;
}


// Returns a method bound to the given object context.
// Just like one of the jQuery.proxy signatures, but without the undesired behavior of treating the same method with
// different contexts as identical when binding/unbinding events.
function proxy(obj, methodName) {
	var method = obj[methodName];

	return function() {
		return method.apply(obj, arguments);
	};
}


// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds.
// https://github.com/jashkenas/underscore/blob/1.6.0/underscore.js#L714
function debounce(func, wait) {
	var timeoutId;
	var args;
	var context;
	var timestamp; // of most recent call
	var later = function() {
		var last = +new Date() - timestamp;
		if (last < wait && last > 0) {
			timeoutId = setTimeout(later, wait - last);
		}
		else {
			timeoutId = null;
			func.apply(context, args);
			if (!timeoutId) {
				context = args = null;
			}
		}
	};

	return function() {
		context = this;
		args = arguments;
		timestamp = +new Date();
		if (!timeoutId) {
			timeoutId = setTimeout(later, wait);
		}
	};
}

;;

var ambigDateOfMonthRegex = /^\s*\d{4}-\d\d$/;
var ambigTimeOrZoneRegex =
	/^\s*\d{4}-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?)?$/;
var newMomentProto = moment.fn; // where we will attach our new methods
var oldMomentProto = $.extend({}, newMomentProto); // copy of original moment methods
var allowValueOptimization;
var setUTCValues; // function defined below
var setLocalValues; // function defined below


// Creating
// -------------------------------------------------------------------------------------------------

// Creates a new moment, similar to the vanilla moment(...) constructor, but with
// extra features (ambiguous time, enhanced formatting). When given an existing moment,
// it will function as a clone (and retain the zone of the moment). Anything else will
// result in a moment in the local zone.
FC.moment = function() {
	return makeMoment(arguments);
};

// Sames as FC.moment, but forces the resulting moment to be in the UTC timezone.
FC.moment.utc = function() {
	var mom = makeMoment(arguments, true);

	// Force it into UTC because makeMoment doesn't guarantee it
	// (if given a pre-existing moment for example)
	if (mom.hasTime()) { // don't give ambiguously-timed moments a UTC zone
		mom.utc();
	}

	return mom;
};

// Same as FC.moment, but when given an ISO8601 string, the timezone offset is preserved.
// ISO8601 strings with no timezone offset will become ambiguously zoned.
FC.moment.parseZone = function() {
	return makeMoment(arguments, true, true);
};

// Builds an enhanced moment from args. When given an existing moment, it clones. When given a
// native Date, or called with no arguments (the current time), the resulting moment will be local.
// Anything else needs to be "parsed" (a string or an array), and will be affected by:
//    parseAsUTC - if there is no zone information, should we parse the input in UTC?
//    parseZone - if there is zone information, should we force the zone of the moment?
function makeMoment(args, parseAsUTC, parseZone) {
	var input = args[0];
	var isSingleString = args.length == 1 && typeof input === 'string';
	var isAmbigTime;
	var isAmbigZone;
	var ambigMatch;
	var mom;

	if (moment.isMoment(input)) {
		mom = moment.apply(null, args); // clone it
		transferAmbigs(input, mom); // the ambig flags weren't transfered with the clone
	}
	else if (isNativeDate(input) || input === undefined) {
		mom = moment.apply(null, args); // will be local
	}
	else { // "parsing" is required
		isAmbigTime = false;
		isAmbigZone = false;

		if (isSingleString) {
			if (ambigDateOfMonthRegex.test(input)) {
				// accept strings like '2014-05', but convert to the first of the month
				input += '-01';
				args = [ input ]; // for when we pass it on to moment's constructor
				isAmbigTime = true;
				isAmbigZone = true;
			}
			else if ((ambigMatch = ambigTimeOrZoneRegex.exec(input))) {
				isAmbigTime = !ambigMatch[5]; // no time part?
				isAmbigZone = true;
			}
		}
		else if ($.isArray(input)) {
			// arrays have no timezone information, so assume ambiguous zone
			isAmbigZone = true;
		}
		// otherwise, probably a string with a format

		if (parseAsUTC || isAmbigTime) {
			mom = moment.utc.apply(moment, args);
		}
		else {
			mom = moment.apply(null, args);
		}

		if (isAmbigTime) {
			mom._ambigTime = true;
			mom._ambigZone = true; // ambiguous time always means ambiguous zone
		}
		else if (parseZone) { // let's record the inputted zone somehow
			if (isAmbigZone) {
				mom._ambigZone = true;
			}
			else if (isSingleString) {
				if (mom.utcOffset) {
					mom.utcOffset(input); // if not a valid zone, will assign UTC
				}
				else {
					mom.zone(input); // for moment-pre-2.9
				}
			}
		}
	}

	mom._fullCalendar = true; // flag for extended functionality

	return mom;
}


// A clone method that works with the flags related to our enhanced functionality.
// In the future, use moment.momentProperties
newMomentProto.clone = function() {
	var mom = oldMomentProto.clone.apply(this, arguments);

	// these flags weren't transfered with the clone
	transferAmbigs(this, mom);
	if (this._fullCalendar) {
		mom._fullCalendar = true;
	}

	return mom;
};


// Week Number
// -------------------------------------------------------------------------------------------------


// Returns the week number, considering the locale's custom week number calcuation
// `weeks` is an alias for `week`
newMomentProto.week = newMomentProto.weeks = function(input) {
	var weekCalc = (this._locale || this._lang) // works pre-moment-2.8
		._fullCalendar_weekCalc;

	if (input == null && typeof weekCalc === 'function') { // custom function only works for getter
		return weekCalc(this);
	}
	else if (weekCalc === 'ISO') {
		return oldMomentProto.isoWeek.apply(this, arguments); // ISO getter/setter
	}

	return oldMomentProto.week.apply(this, arguments); // local getter/setter
};


// Time-of-day
// -------------------------------------------------------------------------------------------------

// GETTER
// Returns a Duration with the hours/minutes/seconds/ms values of the moment.
// If the moment has an ambiguous time, a duration of 00:00 will be returned.
//
// SETTER
// You can supply a Duration, a Moment, or a Duration-like argument.
// When setting the time, and the moment has an ambiguous time, it then becomes unambiguous.
newMomentProto.time = function(time) {

	// Fallback to the original method (if there is one) if this moment wasn't created via FullCalendar.
	// `time` is a generic enough method name where this precaution is necessary to avoid collisions w/ other plugins.
	if (!this._fullCalendar) {
		return oldMomentProto.time.apply(this, arguments);
	}

	if (time == null) { // getter
		return moment.duration({
			hours: this.hours(),
			minutes: this.minutes(),
			seconds: this.seconds(),
			milliseconds: this.milliseconds()
		});
	}
	else { // setter

		this._ambigTime = false; // mark that the moment now has a time

		if (!moment.isDuration(time) && !moment.isMoment(time)) {
			time = moment.duration(time);
		}

		// The day value should cause overflow (so 24 hours becomes 00:00:00 of next day).
		// Only for Duration times, not Moment times.
		var dayHours = 0;
		if (moment.isDuration(time)) {
			dayHours = Math.floor(time.asDays()) * 24;
		}

		// We need to set the individual fields.
		// Can't use startOf('day') then add duration. In case of DST at start of day.
		return this.hours(dayHours + time.hours())
			.minutes(time.minutes())
			.seconds(time.seconds())
			.milliseconds(time.milliseconds());
	}
};

// Converts the moment to UTC, stripping out its time-of-day and timezone offset,
// but preserving its YMD. A moment with a stripped time will display no time
// nor timezone offset when .format() is called.
newMomentProto.stripTime = function() {
	var a;

	if (!this._ambigTime) {

		// get the values before any conversion happens
		a = this.toArray(); // array of y/m/d/h/m/s/ms

		// TODO: use keepLocalTime in the future
		this.utc(); // set the internal UTC flag (will clear the ambig flags)
		setUTCValues(this, a.slice(0, 3)); // set the year/month/date. time will be zero

		// Mark the time as ambiguous. This needs to happen after the .utc() call, which might call .utcOffset(),
		// which clears all ambig flags. Same with setUTCValues with moment-timezone.
		this._ambigTime = true;
		this._ambigZone = true; // if ambiguous time, also ambiguous timezone offset
	}

	return this; // for chaining
};

// Returns if the moment has a non-ambiguous time (boolean)
newMomentProto.hasTime = function() {
	return !this._ambigTime;
};


// Timezone
// -------------------------------------------------------------------------------------------------

// Converts the moment to UTC, stripping out its timezone offset, but preserving its
// YMD and time-of-day. A moment with a stripped timezone offset will display no
// timezone offset when .format() is called.
// TODO: look into Moment's keepLocalTime functionality
newMomentProto.stripZone = function() {
	var a, wasAmbigTime;

	if (!this._ambigZone) {

		// get the values before any conversion happens
		a = this.toArray(); // array of y/m/d/h/m/s/ms
		wasAmbigTime = this._ambigTime;

		this.utc(); // set the internal UTC flag (might clear the ambig flags, depending on Moment internals)
		setUTCValues(this, a); // will set the year/month/date/hours/minutes/seconds/ms

		// the above call to .utc()/.utcOffset() unfortunately might clear the ambig flags, so restore
		this._ambigTime = wasAmbigTime || false;

		// Mark the zone as ambiguous. This needs to happen after the .utc() call, which might call .utcOffset(),
		// which clears the ambig flags. Same with setUTCValues with moment-timezone.
		this._ambigZone = true;
	}

	return this; // for chaining
};

// Returns of the moment has a non-ambiguous timezone offset (boolean)
newMomentProto.hasZone = function() {
	return !this._ambigZone;
};


// this method implicitly marks a zone
newMomentProto.local = function() {
	var a = this.toArray(); // year,month,date,hours,minutes,seconds,ms as an array
	var wasAmbigZone = this._ambigZone;

	oldMomentProto.local.apply(this, arguments);

	// ensure non-ambiguous
	// this probably already happened via local() -> utcOffset(), but don't rely on Moment's internals
	this._ambigTime = false;
	this._ambigZone = false;

	if (wasAmbigZone) {
		// If the moment was ambiguously zoned, the date fields were stored as UTC.
		// We want to preserve these, but in local time.
		// TODO: look into Moment's keepLocalTime functionality
		setLocalValues(this, a);
	}

	return this; // for chaining
};


// implicitly marks a zone
newMomentProto.utc = function() {
	oldMomentProto.utc.apply(this, arguments);

	// ensure non-ambiguous
	// this probably already happened via utc() -> utcOffset(), but don't rely on Moment's internals
	this._ambigTime = false;
	this._ambigZone = false;

	return this;
};


// methods for arbitrarily manipulating timezone offset.
// should clear time/zone ambiguity when called.
$.each([
	'zone', // only in moment-pre-2.9. deprecated afterwards
	'utcOffset'
], function(i, name) {
	if (oldMomentProto[name]) { // original method exists?

		// this method implicitly marks a zone (will probably get called upon .utc() and .local())
		newMomentProto[name] = function(tzo) {

			if (tzo != null) { // setter
				// these assignments needs to happen before the original zone method is called.
				// I forget why, something to do with a browser crash.
				this._ambigTime = false;
				this._ambigZone = false;
			}

			return oldMomentProto[name].apply(this, arguments);
		};
	}
});


// Formatting
// -------------------------------------------------------------------------------------------------

newMomentProto.format = function() {
	if (this._fullCalendar && arguments[0]) { // an enhanced moment? and a format string provided?
		return formatDate(this, arguments[0]); // our extended formatting
	}
	if (this._ambigTime) {
		return oldMomentFormat(this, 'YYYY-MM-DD');
	}
	if (this._ambigZone) {
		return oldMomentFormat(this, 'YYYY-MM-DD[T]HH:mm:ss');
	}
	return oldMomentProto.format.apply(this, arguments);
};

newMomentProto.toISOString = function() {
	if (this._ambigTime) {
		return oldMomentFormat(this, 'YYYY-MM-DD');
	}
	if (this._ambigZone) {
		return oldMomentFormat(this, 'YYYY-MM-DD[T]HH:mm:ss');
	}
	return oldMomentProto.toISOString.apply(this, arguments);
};


// Querying
// -------------------------------------------------------------------------------------------------

// Is the moment within the specified range? `end` is exclusive.
// FYI, this method is not a standard Moment method, so always do our enhanced logic.
newMomentProto.isWithin = function(start, end) {
	var a = commonlyAmbiguate([ this, start, end ]);
	return a[0] >= a[1] && a[0] < a[2];
};

// When isSame is called with units, timezone ambiguity is normalized before the comparison happens.
// If no units specified, the two moments must be identically the same, with matching ambig flags.
newMomentProto.isSame = function(input, units) {
	var a;

	// only do custom logic if this is an enhanced moment
	if (!this._fullCalendar) {
		return oldMomentProto.isSame.apply(this, arguments);
	}

	if (units) {
		a = commonlyAmbiguate([ this, input ], true); // normalize timezones but don't erase times
		return oldMomentProto.isSame.call(a[0], a[1], units);
	}
	else {
		input = FC.moment.parseZone(input); // normalize input
		return oldMomentProto.isSame.call(this, input) &&
			Boolean(this._ambigTime) === Boolean(input._ambigTime) &&
			Boolean(this._ambigZone) === Boolean(input._ambigZone);
	}
};

// Make these query methods work with ambiguous moments
$.each([
	'isBefore',
	'isAfter'
], function(i, methodName) {
	newMomentProto[methodName] = function(input, units) {
		var a;

		// only do custom logic if this is an enhanced moment
		if (!this._fullCalendar) {
			return oldMomentProto[methodName].apply(this, arguments);
		}

		a = commonlyAmbiguate([ this, input ]);
		return oldMomentProto[methodName].call(a[0], a[1], units);
	};
});


// Misc Internals
// -------------------------------------------------------------------------------------------------

// given an array of moment-like inputs, return a parallel array w/ moments similarly ambiguated.
// for example, of one moment has ambig time, but not others, all moments will have their time stripped.
// set `preserveTime` to `true` to keep times, but only normalize zone ambiguity.
// returns the original moments if no modifications are necessary.
function commonlyAmbiguate(inputs, preserveTime) {
	var anyAmbigTime = false;
	var anyAmbigZone = false;
	var len = inputs.length;
	var moms = [];
	var i, mom;

	// parse inputs into real moments and query their ambig flags
	for (i = 0; i < len; i++) {
		mom = inputs[i];
		if (!moment.isMoment(mom)) {
			mom = FC.moment.parseZone(mom);
		}
		anyAmbigTime = anyAmbigTime || mom._ambigTime;
		anyAmbigZone = anyAmbigZone || mom._ambigZone;
		moms.push(mom);
	}

	// strip each moment down to lowest common ambiguity
	// use clones to avoid modifying the original moments
	for (i = 0; i < len; i++) {
		mom = moms[i];
		if (!preserveTime && anyAmbigTime && !mom._ambigTime) {
			moms[i] = mom.clone().stripTime();
		}
		else if (anyAmbigZone && !mom._ambigZone) {
			moms[i] = mom.clone().stripZone();
		}
	}

	return moms;
}

// Transfers all the flags related to ambiguous time/zone from the `src` moment to the `dest` moment
// TODO: look into moment.momentProperties for this.
function transferAmbigs(src, dest) {
	if (src._ambigTime) {
		dest._ambigTime = true;
	}
	else if (dest._ambigTime) {
		dest._ambigTime = false;
	}

	if (src._ambigZone) {
		dest._ambigZone = true;
	}
	else if (dest._ambigZone) {
		dest._ambigZone = false;
	}
}


// Sets the year/month/date/etc values of the moment from the given array.
// Inefficient because it calls each individual setter.
function setMomentValues(mom, a) {
	mom.year(a[0] || 0)
		.month(a[1] || 0)
		.date(a[2] || 0)
		.hours(a[3] || 0)
		.minutes(a[4] || 0)
		.seconds(a[5] || 0)
		.milliseconds(a[6] || 0);
}

// Can we set the moment's internal date directly?
allowValueOptimization = '_d' in moment() && 'updateOffset' in moment;

// Utility function. Accepts a moment and an array of the UTC year/month/date/etc values to set.
// Assumes the given moment is already in UTC mode.
setUTCValues = allowValueOptimization ? function(mom, a) {
	// simlate what moment's accessors do
	mom._d.setTime(Date.UTC.apply(Date, a));
	moment.updateOffset(mom, false); // keepTime=false
} : setMomentValues;

// Utility function. Accepts a moment and an array of the local year/month/date/etc values to set.
// Assumes the given moment is already in local mode.
setLocalValues = allowValueOptimization ? function(mom, a) {
	// simlate what moment's accessors do
	mom._d.setTime(+new Date( // FYI, there is now way to apply an array of args to a constructor
		a[0] || 0,
		a[1] || 0,
		a[2] || 0,
		a[3] || 0,
		a[4] || 0,
		a[5] || 0,
		a[6] || 0
	));
	moment.updateOffset(mom, false); // keepTime=false
} : setMomentValues;

;;

// Single Date Formatting
// -------------------------------------------------------------------------------------------------


// call this if you want Moment's original format method to be used
function oldMomentFormat(mom, formatStr) {
	return oldMomentProto.format.call(mom, formatStr); // oldMomentProto defined in moment-ext.js
}


// Formats `date` with a Moment formatting string, but allow our non-zero areas and
// additional token.
function formatDate(date, formatStr) {
	return formatDateWithChunks(date, getFormatStringChunks(formatStr));
}


function formatDateWithChunks(date, chunks) {
	var s = '';
	var i;

	for (i=0; i<chunks.length; i++) {
		s += formatDateWithChunk(date, chunks[i]);
	}

	return s;
}


// addition formatting tokens we want recognized
var tokenOverrides = {
	t: function(date) { // "a" or "p"
		return oldMomentFormat(date, 'a').charAt(0);
	},
	T: function(date) { // "A" or "P"
		return oldMomentFormat(date, 'A').charAt(0);
	}
};


function formatDateWithChunk(date, chunk) {
	var token;
	var maybeStr;

	if (typeof chunk === 'string') { // a literal string
		return chunk;
	}
	else if ((token = chunk.token)) { // a token, like "YYYY"
		if (tokenOverrides[token]) {
			return tokenOverrides[token](date); // use our custom token
		}
		return oldMomentFormat(date, token);
	}
	else if (chunk.maybe) { // a grouping of other chunks that must be non-zero
		maybeStr = formatDateWithChunks(date, chunk.maybe);
		if (maybeStr.match(/[1-9]/)) {
			return maybeStr;
		}
	}

	return '';
}


// Date Range Formatting
// -------------------------------------------------------------------------------------------------
// TODO: make it work with timezone offset

// Using a formatting string meant for a single date, generate a range string, like
// "Sep 2 - 9 2013", that intelligently inserts a separator where the dates differ.
// If the dates are the same as far as the format string is concerned, just return a single
// rendering of one date, without any separator.
function formatRange(date1, date2, formatStr, separator, isRTL) {
	var localeData;

	date1 = FC.moment.parseZone(date1);
	date2 = FC.moment.parseZone(date2);

	localeData = (date1.localeData || date1.lang).call(date1); // works with moment-pre-2.8

	// Expand localized format strings, like "LL" -> "MMMM D YYYY"
	formatStr = localeData.longDateFormat(formatStr) || formatStr;
	// BTW, this is not important for `formatDate` because it is impossible to put custom tokens
	// or non-zero areas in Moment's localized format strings.

	separator = separator || ' - ';

	return formatRangeWithChunks(
		date1,
		date2,
		getFormatStringChunks(formatStr),
		separator,
		isRTL
	);
}
FC.formatRange = formatRange; // expose


function formatRangeWithChunks(date1, date2, chunks, separator, isRTL) {
	var unzonedDate1 = date1.clone().stripZone(); // for formatSimilarChunk
	var unzonedDate2 = date2.clone().stripZone(); // "
	var chunkStr; // the rendering of the chunk
	var leftI;
	var leftStr = '';
	var rightI;
	var rightStr = '';
	var middleI;
	var middleStr1 = '';
	var middleStr2 = '';
	var middleStr = '';

	// Start at the leftmost side of the formatting string and continue until you hit a token
	// that is not the same between dates.
	for (leftI=0; leftI<chunks.length; leftI++) {
		chunkStr = formatSimilarChunk(date1, date2, unzonedDate1, unzonedDate2, chunks[leftI]);
		if (chunkStr === false) {
			break;
		}
		leftStr += chunkStr;
	}

	// Similarly, start at the rightmost side of the formatting string and move left
	for (rightI=chunks.length-1; rightI>leftI; rightI--) {
		chunkStr = formatSimilarChunk(date1, date2, unzonedDate1, unzonedDate2,  chunks[rightI]);
		if (chunkStr === false) {
			break;
		}
		rightStr = chunkStr + rightStr;
	}

	// The area in the middle is different for both of the dates.
	// Collect them distinctly so we can jam them together later.
	for (middleI=leftI; middleI<=rightI; middleI++) {
		middleStr1 += formatDateWithChunk(date1, chunks[middleI]);
		middleStr2 += formatDateWithChunk(date2, chunks[middleI]);
	}

	if (middleStr1 || middleStr2) {
		if (isRTL) {
			middleStr = middleStr2 + separator + middleStr1;
		}
		else {
			middleStr = middleStr1 + separator + middleStr2;
		}
	}

	return leftStr + middleStr + rightStr;
}


var similarUnitMap = {
	Y: 'year',
	M: 'month',
	D: 'day', // day of month
	d: 'day', // day of week
	// prevents a separator between anything time-related...
	A: 'second', // AM/PM
	a: 'second', // am/pm
	T: 'second', // A/P
	t: 'second', // a/p
	H: 'second', // hour (24)
	h: 'second', // hour (12)
	m: 'second', // minute
	s: 'second' // second
};
// TODO: week maybe?


// Given a formatting chunk, and given that both dates are similar in the regard the
// formatting chunk is concerned, format date1 against `chunk`. Otherwise, return `false`.
function formatSimilarChunk(date1, date2, unzonedDate1, unzonedDate2, chunk) {
	var token;
	var unit;

	if (typeof chunk === 'string') { // a literal string
		return chunk;
	}
	else if ((token = chunk.token)) {
		unit = similarUnitMap[token.charAt(0)];

		// are the dates the same for this unit of measurement?
		// use the unzoned dates for this calculation because unreliable when near DST (bug #2396)
		if (unit && unzonedDate1.isSame(unzonedDate2, unit)) {
			return oldMomentFormat(date1, token); // would be the same if we used `date2`
			// BTW, don't support custom tokens
		}
	}

	return false; // the chunk is NOT the same for the two dates
	// BTW, don't support splitting on non-zero areas
}


// Chunking Utils
// -------------------------------------------------------------------------------------------------


var formatStringChunkCache = {};


function getFormatStringChunks(formatStr) {
	if (formatStr in formatStringChunkCache) {
		return formatStringChunkCache[formatStr];
	}
	return (formatStringChunkCache[formatStr] = chunkFormatString(formatStr));
}


// Break the formatting string into an array of chunks
function chunkFormatString(formatStr) {
	var chunks = [];
	var chunker = /\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\[\(]+)/g; // TODO: more descrimination
	var match;

	while ((match = chunker.exec(formatStr))) {
		if (match[1]) { // a literal string inside [ ... ]
			chunks.push(match[1]);
		}
		else if (match[2]) { // non-zero formatting inside ( ... )
			chunks.push({ maybe: chunkFormatString(match[2]) });
		}
		else if (match[3]) { // a formatting token
			chunks.push({ token: match[3] });
		}
		else if (match[5]) { // an unenclosed literal string
			chunks.push(match[5]);
		}
	}

	return chunks;
}

;;

FC.Class = Class; // export

// Class that all other classes will inherit from
function Class() { }


// Called on a class to create a subclass.
// Last argument contains instance methods. Any argument before the last are considered mixins.
Class.extend = function() {
	var len = arguments.length;
	var i;
	var members;

	for (i = 0; i < len; i++) {
		members = arguments[i];
		if (i < len - 1) { // not the last argument?
			mixIntoClass(this, members);
		}
	}

	return extendClass(this, members || {}); // members will be undefined if no arguments
};


// Adds new member variables/methods to the class's prototype.
// Can be called with another class, or a plain object hash containing new members.
Class.mixin = function(members) {
	mixIntoClass(this, members);
};


function extendClass(superClass, members) {
	var subClass;

	// ensure a constructor for the subclass, forwarding all arguments to the super-constructor if it doesn't exist
	if (hasOwnProp(members, 'constructor')) {
		subClass = members.constructor;
	}
	if (typeof subClass !== 'function') {
		subClass = members.constructor = function() {
			superClass.apply(this, arguments);
		};
	}

	// build the base prototype for the subclass, which is an new object chained to the superclass's prototype
	subClass.prototype = createObject(superClass.prototype);

	// copy each member variable/method onto the the subclass's prototype
	copyOwnProps(members, subClass.prototype);
	copyNativeMethods(members, subClass.prototype); // hack for IE8

	// copy over all class variables/methods to the subclass, such as `extend` and `mixin`
	copyOwnProps(superClass, subClass);

	return subClass;
}


function mixIntoClass(theClass, members) {
	copyOwnProps(members.prototype || members, theClass.prototype); // TODO: copyNativeMethods?
}
;;

var Emitter = FC.Emitter = Class.extend({

	callbackHash: null,


	on: function(name, callback) {
		this.getCallbacks(name).add(callback);
		return this; // for chaining
	},


	off: function(name, callback) {
		this.getCallbacks(name).remove(callback);
		return this; // for chaining
	},


	trigger: function(name) { // args...
		var args = Array.prototype.slice.call(arguments, 1);

		this.triggerWith(name, this, args);

		return this; // for chaining
	},


	triggerWith: function(name, context, args) {
		var callbacks = this.getCallbacks(name);

		callbacks.fireWith(context, args);

		return this; // for chaining
	},


	getCallbacks: function(name) {
		var callbacks;

		if (!this.callbackHash) {
			this.callbackHash = {};
		}

		callbacks = this.callbackHash[name];
		if (!callbacks) {
			callbacks = this.callbackHash[name] = $.Callbacks();
		}

		return callbacks;
	}

});
;;

/* A rectangular panel that is absolutely positioned over other content
------------------------------------------------------------------------------------------------------------------------
Options:
	- className (string)
	- content (HTML string or jQuery element set)
	- parentEl
	- top
	- left
	- right (the x coord of where the right edge should be. not a "CSS" right)
	- autoHide (boolean)
	- show (callback)
	- hide (callback)
*/

var Popover = Class.extend({

	isHidden: true,
	options: null,
	el: null, // the container element for the popover. generated by this object
	documentMousedownProxy: null, // document mousedown handler bound to `this`
	margin: 10, // the space required between the popover and the edges of the scroll container


	constructor: function(options) {
		this.options = options || {};
	},


	// Shows the popover on the specified position. Renders it if not already
	show: function() {
		if (this.isHidden) {
			if (!this.el) {
				this.render();
			}
			this.el.show();
			this.position();
			this.isHidden = false;
			this.trigger('show');
		}
	},


	// Hides the popover, through CSS, but does not remove it from the DOM
	hide: function() {
		if (!this.isHidden) {
			this.el.hide();
			this.isHidden = true;
			this.trigger('hide');
		}
	},


	// Creates `this.el` and renders content inside of it
	render: function() {
		var _this = this;
		var options = this.options;

		this.el = $('<div class="fc-popover"/>')
			.addClass(options.className || '')
			.css({
				// position initially to the top left to avoid creating scrollbars
				top: 0,
				left: 0
			})
			.append(options.content)
			.appendTo(options.parentEl);

		// when a click happens on anything inside with a 'fc-close' className, hide the popover
		this.el.on('click', '.fc-close', function() {
			_this.hide();
		});

		if (options.autoHide) {
			$(document).on('mousedown', this.documentMousedownProxy = proxy(this, 'documentMousedown'));
		}
	},


	// Triggered when the user clicks *anywhere* in the document, for the autoHide feature
	documentMousedown: function(ev) {
		// only hide the popover if the click happened outside the popover
		if (this.el && !$(ev.target).closest(this.el).length) {
			this.hide();
		}
	},


	// Hides and unregisters any handlers
	removeElement: function() {
		this.hide();

		if (this.el) {
			this.el.remove();
			this.el = null;
		}

		$(document).off('mousedown', this.documentMousedownProxy);
	},


	// Positions the popover optimally, using the top/left/right options
	position: function() {
		var options = this.options;
		var origin = this.el.offsetParent().offset();
		var width = this.el.outerWidth();
		var height = this.el.outerHeight();
		var windowEl = $(window);
		var viewportEl = getScrollParent(this.el);
		var viewportTop;
		var viewportLeft;
		var viewportOffset;
		var top; // the "position" (not "offset") values for the popover
		var left; //

		// compute top and left
		top = options.top || 0;
		if (options.left !== undefined) {
			left = options.left;
		}
		else if (options.right !== undefined) {
			left = options.right - width; // derive the left value from the right value
		}
		else {
			left = 0;
		}

		if (viewportEl.is(window) || viewportEl.is(document)) { // normalize getScrollParent's result
			viewportEl = windowEl;
			viewportTop = 0; // the window is always at the top left
			viewportLeft = 0; // (and .offset() won't work if called here)
		}
		else {
			viewportOffset = viewportEl.offset();
			viewportTop = viewportOffset.top;
			viewportLeft = viewportOffset.left;
		}

		// if the window is scrolled, it causes the visible area to be further down
		viewportTop += windowEl.scrollTop();
		viewportLeft += windowEl.scrollLeft();

		// constrain to the view port. if constrained by two edges, give precedence to top/left
		if (options.viewportConstrain !== false) {
			top = Math.min(top, viewportTop + viewportEl.outerHeight() - height - this.margin);
			top = Math.max(top, viewportTop + this.margin);
			left = Math.min(left, viewportLeft + viewportEl.outerWidth() - width - this.margin);
			left = Math.max(left, viewportLeft + this.margin);
		}

		this.el.css({
			top: top - origin.top,
			left: left - origin.left
		});
	},


	// Triggers a callback. Calls a function in the option hash of the same name.
	// Arguments beyond the first `name` are forwarded on.
	// TODO: better code reuse for this. Repeat code
	trigger: function(name) {
		if (this.options[name]) {
			this.options[name].apply(this, Array.prototype.slice.call(arguments, 1));
		}
	}

});

;;

/*
A cache for the left/right/top/bottom/width/height values for one or more elements.
Works with both offset (from topleft document) and position (from offsetParent).

options:
- els
- isHorizontal
- isVertical
*/
var CoordCache = FC.CoordCache = Class.extend({

	els: null, // jQuery set (assumed to be siblings)
	forcedOffsetParentEl: null, // options can override the natural offsetParent
	origin: null, // {left,top} position of offsetParent of els
	boundingRect: null, // constrain cordinates to this rectangle. {left,right,top,bottom} or null
	isHorizontal: false, // whether to query for left/right/width
	isVertical: false, // whether to query for top/bottom/height

	// arrays of coordinates (offsets from topleft of document)
	lefts: null,
	rights: null,
	tops: null,
	bottoms: null,


	constructor: function(options) {
		this.els = $(options.els);
		this.isHorizontal = options.isHorizontal;
		this.isVertical = options.isVertical;
		this.forcedOffsetParentEl = options.offsetParent ? $(options.offsetParent) : null;
	},


	// Queries the els for coordinates and stores them.
	// Call this method before using and of the get* methods below.
	build: function() {
		var offsetParentEl = this.forcedOffsetParentEl || this.els.eq(0).offsetParent();

		this.origin = offsetParentEl.offset();
		this.boundingRect = this.queryBoundingRect();

		if (this.isHorizontal) {
			this.buildElHorizontals();
		}
		if (this.isVertical) {
			this.buildElVerticals();
		}
	},


	// Destroys all internal data about coordinates, freeing memory
	clear: function() {
		this.origin = null;
		this.boundingRect = null;
		this.lefts = null;
		this.rights = null;
		this.tops = null;
		this.bottoms = null;
	},


	// Compute and return what the elements' bounding rectangle is, from the user's perspective.
	// Right now, only returns a rectangle if constrained by an overflow:scroll element.
	queryBoundingRect: function() {
		var scrollParentEl = getScrollParent(this.els.eq(0));

		if (!scrollParentEl.is(document)) {
			return getClientRect(scrollParentEl);
		}
	},


	// Populates the left/right internal coordinate arrays
	buildElHorizontals: function() {
		var lefts = [];
		var rights = [];

		this.els.each(function(i, node) {
			var el = $(node);
			var left = el.offset().left;
			var width = el.outerWidth();

			lefts.push(left);
			rights.push(left + width);
		});

		this.lefts = lefts;
		this.rights = rights;
	},


	// Populates the top/bottom internal coordinate arrays
	buildElVerticals: function() {
		var tops = [];
		var bottoms = [];

		this.els.each(function(i, node) {
			var el = $(node);
			var top = el.offset().top;
			var height = el.outerHeight();

			tops.push(top);
			bottoms.push(top + height);
		});

		this.tops = tops;
		this.bottoms = bottoms;
	},


	// Given a left offset (from document left), returns the index of the el that it horizontally intersects.
	// If no intersection is made, or outside of the boundingRect, returns undefined.
	getHorizontalIndex: function(leftOffset) {
		var boundingRect = this.boundingRect;
		var lefts = this.lefts;
		var rights = this.rights;
		var len = lefts.length;
		var i;

		if (!boundingRect || (leftOffset >= boundingRect.left && leftOffset < boundingRect.right)) {
			for (i = 0; i < len; i++) {
				if (leftOffset >= lefts[i] && leftOffset < rights[i]) {
					return i;
				}
			}
		}
	},


	// Given a top offset (from document top), returns the index of the el that it vertically intersects.
	// If no intersection is made, or outside of the boundingRect, returns undefined.
	getVerticalIndex: function(topOffset) {
		var boundingRect = this.boundingRect;
		var tops = this.tops;
		var bottoms = this.bottoms;
		var len = tops.length;
		var i;

		if (!boundingRect || (topOffset >= boundingRect.top && topOffset < boundingRect.bottom)) {
			for (i = 0; i < len; i++) {
				if (topOffset >= tops[i] && topOffset < bottoms[i]) {
					return i;
				}
			}
		}
	},


	// Gets the left offset (from document left) of the element at the given index
	getLeftOffset: function(leftIndex) {
		return this.lefts[leftIndex];
	},


	// Gets the left position (from offsetParent left) of the element at the given index
	getLeftPosition: function(leftIndex) {
		return this.lefts[leftIndex] - this.origin.left;
	},


	// Gets the right offset (from document left) of the element at the given index.
	// This value is NOT relative to the document's right edge, like the CSS concept of "right" would be.
	getRightOffset: function(leftIndex) {
		return this.rights[leftIndex];
	},


	// Gets the right position (from offsetParent left) of the element at the given index.
	// This value is NOT relative to the offsetParent's right edge, like the CSS concept of "right" would be.
	getRightPosition: function(leftIndex) {
		return this.rights[leftIndex] - this.origin.left;
	},


	// Gets the width of the element at the given index
	getWidth: function(leftIndex) {
		return this.rights[leftIndex] - this.lefts[leftIndex];
	},


	// Gets the top offset (from document top) of the element at the given index
	getTopOffset: function(topIndex) {
		return this.tops[topIndex];
	},


	// Gets the top position (from offsetParent top) of the element at the given position
	getTopPosition: function(topIndex) {
		return this.tops[topIndex] - this.origin.top;
	},

	// Gets the bottom offset (from the document top) of the element at the given index.
	// This value is NOT relative to the offsetParent's bottom edge, like the CSS concept of "bottom" would be.
	getBottomOffset: function(topIndex) {
		return this.bottoms[topIndex];
	},


	// Gets the bottom position (from the offsetParent top) of the element at the given index.
	// This value is NOT relative to the offsetParent's bottom edge, like the CSS concept of "bottom" would be.
	getBottomPosition: function(topIndex) {
		return this.bottoms[topIndex] - this.origin.top;
	},


	// Gets the height of the element at the given index
	getHeight: function(topIndex) {
		return this.bottoms[topIndex] - this.tops[topIndex];
	}

});

;;

/* Tracks a drag's mouse movement, firing various handlers
----------------------------------------------------------------------------------------------------------------------*/
// TODO: use Emitter

var DragListener = FC.DragListener = Class.extend({

	options: null,

	isListening: false,
	isDragging: false,

	// coordinates of the initial mousedown
	originX: null,
	originY: null,

	// handler attached to the document, bound to the DragListener's `this`
	mousemoveProxy: null,
	mouseupProxy: null,

	// for IE8 bug-fighting behavior, for now
	subjectEl: null, // the element being draged. optional
	subjectHref: null,

	scrollEl: null,
	scrollBounds: null, // { top, bottom, left, right }
	scrollTopVel: null, // pixels per second
	scrollLeftVel: null, // pixels per second
	scrollIntervalId: null, // ID of setTimeout for scrolling animation loop
	scrollHandlerProxy: null, // this-scoped function for handling when scrollEl is scrolled

	scrollSensitivity: 30, // pixels from edge for scrolling to start
	scrollSpeed: 200, // pixels per second, at maximum speed
	scrollIntervalMs: 50, // millisecond wait between scroll increment


	constructor: function(options) {
		options = options || {};
		this.options = options;
		this.subjectEl = options.subjectEl;
	},


	// Call this when the user does a mousedown. Will probably lead to startListening
	mousedown: function(ev) {
		if (isPrimaryMouseButton(ev)) {

			ev.preventDefault(); // prevents native selection in most browsers

			this.startListening(ev);

			// start the drag immediately if there is no minimum distance for a drag start
			if (!this.options.distance) {
				this.startDrag(ev);
			}
		}
	},


	// Call this to start tracking mouse movements
	startListening: function(ev) {
		var scrollParent;

		if (!this.isListening) {

			// grab scroll container and attach handler
			if (ev && this.options.scroll) {
				scrollParent = getScrollParent($(ev.target));
				if (!scrollParent.is(window) && !scrollParent.is(document)) {
					this.scrollEl = scrollParent;

					// scope to `this`, and use `debounce` to make sure rapid calls don't happen
					this.scrollHandlerProxy = debounce(proxy(this, 'scrollHandler'), 100);
					this.scrollEl.on('scroll', this.scrollHandlerProxy);
				}
			}

			$(document)
				.on('mousemove', this.mousemoveProxy = proxy(this, 'mousemove'))
				.on('mouseup', this.mouseupProxy = proxy(this, 'mouseup'))
				.on('selectstart', this.preventDefault); // prevents native selection in IE<=8

			if (ev) {
				this.originX = ev.pageX;
				this.originY = ev.pageY;
			}
			else {
				// if no starting information was given, origin will be the topleft corner of the screen.
				// if so, dx/dy in the future will be the absolute coordinates.
				this.originX = 0;
				this.originY = 0;
			}

			this.isListening = true;
			this.listenStart(ev);
		}
	},


	// Called when drag listening has started (but a real drag has not necessarily began)
	listenStart: function(ev) {
		this.trigger('listenStart', ev);
	},


	// Called when the user moves the mouse
	mousemove: function(ev) {
		var dx = ev.pageX - this.originX;
		var dy = ev.pageY - this.originY;
		var minDistance;
		var distanceSq; // current distance from the origin, squared

		if (!this.isDragging) { // if not already dragging...
			// then start the drag if the minimum distance criteria is met
			minDistance = this.options.distance || 1;
			distanceSq = dx * dx + dy * dy;
			if (distanceSq >= minDistance * minDistance) { // use pythagorean theorem
				this.startDrag(ev);
			}
		}

		if (this.isDragging) {
			this.drag(dx, dy, ev); // report a drag, even if this mousemove initiated the drag
		}
	},


	// Call this to initiate a legitimate drag.
	// This function is called internally from this class, but can also be called explicitly from outside
	startDrag: function(ev) {

		if (!this.isListening) { // startDrag must have manually initiated
			this.startListening();
		}

		if (!this.isDragging) {
			this.isDragging = true;
			this.dragStart(ev);
		}
	},


	// Called when the actual drag has started (went beyond minDistance)
	dragStart: function(ev) {
		var subjectEl = this.subjectEl;

		this.trigger('dragStart', ev);

		// remove a mousedown'd <a>'s href so it is not visited (IE8 bug)
		if ((this.subjectHref = subjectEl ? subjectEl.attr('href') : null)) {
			subjectEl.removeAttr('href');
		}
	},


	// Called while the mouse is being moved and when we know a legitimate drag is taking place
	drag: function(dx, dy, ev) {
		this.trigger('drag', dx, dy, ev);
		this.updateScroll(ev); // will possibly cause scrolling
	},


	// Called when the user does a mouseup
	mouseup: function(ev) {
		this.stopListening(ev);
	},


	// Called when the drag is over. Will not cause listening to stop however.
	// A concluding 'cellOut' event will NOT be triggered.
	stopDrag: function(ev) {
		if (this.isDragging) {
			this.stopScrolling();
			this.dragStop(ev);
			this.isDragging = false;
		}
	},


	// Called when dragging has been stopped
	dragStop: function(ev) {
		var _this = this;

		this.trigger('dragStop', ev);

		// restore a mousedown'd <a>'s href (for IE8 bug)
		setTimeout(function() { // must be outside of the click's execution
			if (_this.subjectHref) {
				_this.subjectEl.attr('href', _this.subjectHref);
			}
		}, 0);
	},


	// Call this to stop listening to the user's mouse events
	stopListening: function(ev) {
		this.stopDrag(ev); // if there's a current drag, kill it

		if (this.isListening) {

			// remove the scroll handler if there is a scrollEl
			if (this.scrollEl) {
				this.scrollEl.off('scroll', this.scrollHandlerProxy);
				this.scrollHandlerProxy = null;
			}

			$(document)
				.off('mousemove', this.mousemoveProxy)
				.off('mouseup', this.mouseupProxy)
				.off('selectstart', this.preventDefault);

			this.mousemoveProxy = null;
			this.mouseupProxy = null;

			this.isListening = false;
			this.listenStop(ev);
		}
	},


	// Called when drag listening has stopped
	listenStop: function(ev) {
		this.trigger('listenStop', ev);
	},


	// Triggers a callback. Calls a function in the option hash of the same name.
	// Arguments beyond the first `name` are forwarded on.
	trigger: function(name) {
		if (this.options[name]) {
			this.options[name].apply(this, Array.prototype.slice.call(arguments, 1));
		}
	},


	// Stops a given mouse event from doing it's native browser action. In our case, text selection.
	preventDefault: function(ev) {
		ev.preventDefault();
	},


	/* Scrolling
	------------------------------------------------------------------------------------------------------------------*/


	// Computes and stores the bounding rectangle of scrollEl
	computeScrollBounds: function() {
		var el = this.scrollEl;

		this.scrollBounds = el ? getOuterRect(el) : null;
			// TODO: use getClientRect in future. but prevents auto scrolling when on top of scrollbars
	},


	// Called when the dragging is in progress and scrolling should be updated
	updateScroll: function(ev) {
		var sensitivity = this.scrollSensitivity;
		var bounds = this.scrollBounds;
		var topCloseness, bottomCloseness;
		var leftCloseness, rightCloseness;
		var topVel = 0;
		var leftVel = 0;

		if (bounds) { // only scroll if scrollEl exists

			// compute closeness to edges. valid range is from 0.0 - 1.0
			topCloseness = (sensitivity - (ev.pageY - bounds.top)) / sensitivity;
			bottomCloseness = (sensitivity - (bounds.bottom - ev.pageY)) / sensitivity;
			leftCloseness = (sensitivity - (ev.pageX - bounds.left)) / sensitivity;
			rightCloseness = (sensitivity - (bounds.right - ev.pageX)) / sensitivity;

			// translate vertical closeness into velocity.
			// mouse must be completely in bounds for velocity to happen.
			if (topCloseness >= 0 && topCloseness <= 1) {
				topVel = topCloseness * this.scrollSpeed * -1; // negative. for scrolling up
			}
			else if (bottomCloseness >= 0 && bottomCloseness <= 1) {
				topVel = bottomCloseness * this.scrollSpeed;
			}

			// translate horizontal closeness into velocity
			if (leftCloseness >= 0 && leftCloseness <= 1) {
				leftVel = leftCloseness * this.scrollSpeed * -1; // negative. for scrolling left
			}
			else if (rightCloseness >= 0 && rightCloseness <= 1) {
				leftVel = rightCloseness * this.scrollSpeed;
			}
		}

		this.setScrollVel(topVel, leftVel);
	},


	// Sets the speed-of-scrolling for the scrollEl
	setScrollVel: function(topVel, leftVel) {

		this.scrollTopVel = topVel;
		this.scrollLeftVel = leftVel;

		this.constrainScrollVel(); // massages into realistic values

		// if there is non-zero velocity, and an animation loop hasn't already started, then START
		if ((this.scrollTopVel || this.scrollLeftVel) && !this.scrollIntervalId) {
			this.scrollIntervalId = setInterval(
				proxy(this, 'scrollIntervalFunc'), // scope to `this`
				this.scrollIntervalMs
			);
		}
	},


	// Forces scrollTopVel and scrollLeftVel to be zero if scrolling has already gone all the way
	constrainScrollVel: function() {
		var el = this.scrollEl;

		if (this.scrollTopVel < 0) { // scrolling up?
			if (el.scrollTop() <= 0) { // already scrolled all the way up?
				this.scrollTopVel = 0;
			}
		}
		else if (this.scrollTopVel > 0) { // scrolling down?
			if (el.scrollTop() + el[0].clientHeight >= el[0].scrollHeight) { // already scrolled all the way down?
				this.scrollTopVel = 0;
			}
		}

		if (this.scrollLeftVel < 0) { // scrolling left?
			if (el.scrollLeft() <= 0) { // already scrolled all the left?
				this.scrollLeftVel = 0;
			}
		}
		else if (this.scrollLeftVel > 0) { // scrolling right?
			if (el.scrollLeft() + el[0].clientWidth >= el[0].scrollWidth) { // already scrolled all the way right?
				this.scrollLeftVel = 0;
			}
		}
	},


	// This function gets called during every iteration of the scrolling animation loop
	scrollIntervalFunc: function() {
		var el = this.scrollEl;
		var frac = this.scrollIntervalMs / 1000; // considering animation frequency, what the vel should be mult'd by

		// change the value of scrollEl's scroll
		if (this.scrollTopVel) {
			el.scrollTop(el.scrollTop() + this.scrollTopVel * frac);
		}
		if (this.scrollLeftVel) {
			el.scrollLeft(el.scrollLeft() + this.scrollLeftVel * frac);
		}

		this.constrainScrollVel(); // since the scroll values changed, recompute the velocities

		// if scrolled all the way, which causes the vels to be zero, stop the animation loop
		if (!this.scrollTopVel && !this.scrollLeftVel) {
			this.stopScrolling();
		}
	},


	// Kills any existing scrolling animation loop
	stopScrolling: function() {
		if (this.scrollIntervalId) {
			clearInterval(this.scrollIntervalId);
			this.scrollIntervalId = null;

			// when all done with scrolling, recompute positions since they probably changed
			this.scrollStop();
		}
	},


	// Get called when the scrollEl is scrolled (NOTE: this is delayed via debounce)
	scrollHandler: function() {
		// recompute all coordinates, but *only* if this is *not* part of our scrolling animation
		if (!this.scrollIntervalId) {
			this.scrollStop();
		}
	},


	// Called when scrolling has stopped, whether through auto scroll, or the user scrolling
	scrollStop: function() {
	}

});

;;

/* Tracks mouse movements over a component and raises events about which hit the mouse is over.
------------------------------------------------------------------------------------------------------------------------
options:
- subjectEl
- subjectCenter
*/

var HitDragListener = DragListener.extend({

	component: null, // converts coordinates to hits
		// methods: prepareHits, releaseHits, queryHit

	origHit: null, // the hit the mouse was over when listening started
	hit: null, // the hit the mouse is over
	coordAdjust: null, // delta that will be added to the mouse coordinates when computing collisions


	constructor: function(component, options) {
		DragListener.call(this, options); // call the super-constructor

		this.component = component;
	},


	// Called when drag listening starts (but a real drag has not necessarily began).
	// ev might be undefined if dragging was started manually.
	listenStart: function(ev) {
		var subjectEl = this.subjectEl;
		var subjectRect;
		var origPoint;
		var point;

		DragListener.prototype.listenStart.apply(this, arguments); // call the super-method

		this.computeCoords();

		if (ev) {
			origPoint = { left: ev.pageX, top: ev.pageY };
			point = origPoint;

			// constrain the point to bounds of the element being dragged
			if (subjectEl) {
				subjectRect = getOuterRect(subjectEl); // used for centering as well
				point = constrainPoint(point, subjectRect);
			}

			this.origHit = this.queryHit(point.left, point.top);

			// treat the center of the subject as the collision point?
			if (subjectEl && this.options.subjectCenter) {

				// only consider the area the subject overlaps the hit. best for large subjects.
				// TODO: skip this if hit didn't supply left/right/top/bottom
				if (this.origHit) {
					subjectRect = intersectRects(this.origHit, subjectRect) ||
						subjectRect; // in case there is no intersection
				}

				point = getRectCenter(subjectRect);
			}

			this.coordAdjust = diffPoints(point, origPoint); // point - origPoint
		}
		else {
			this.origHit = null;
			this.coordAdjust = null;
		}
	},


	// Recomputes the drag-critical positions of elements
	computeCoords: function() {
		this.component.prepareHits();
		this.computeScrollBounds(); // why is this here???
	},


	// Called when the actual drag has started
	dragStart: function(ev) {
		var hit;

		DragListener.prototype.dragStart.apply(this, arguments); // call the super-method

		// might be different from this.origHit if the min-distance is large
		hit = this.queryHit(ev.pageX, ev.pageY);

		// report the initial hit the mouse is over
		// especially important if no min-distance and drag starts immediately
		if (hit) {
			this.hitOver(hit);
		}
	},


	// Called when the drag moves
	drag: function(dx, dy, ev) {
		var hit;

		DragListener.prototype.drag.apply(this, arguments); // call the super-method

		hit = this.queryHit(ev.pageX, ev.pageY);

		if (!isHitsEqual(hit, this.hit)) { // a different hit than before?
			if (this.hit) {
				this.hitOut();
			}
			if (hit) {
				this.hitOver(hit);
			}
		}
	},


	// Called when dragging has been stopped
	dragStop: function() {
		this.hitDone();
		DragListener.prototype.dragStop.apply(this, arguments); // call the super-method
	},


	// Called when a the mouse has just moved over a new hit
	hitOver: function(hit) {
		var isOrig = isHitsEqual(hit, this.origHit);

		this.hit = hit;

		this.trigger('hitOver', this.hit, isOrig, this.origHit);
	},


	// Called when the mouse has just moved out of a hit
	hitOut: function() {
		if (this.hit) {
			this.trigger('hitOut', this.hit);
			this.hitDone();
			this.hit = null;
		}
	},


	// Called after a hitOut. Also called before a dragStop
	hitDone: function() {
		if (this.hit) {
			this.trigger('hitDone', this.hit);
		}
	},


	// Called when drag listening has stopped
	listenStop: function() {
		DragListener.prototype.listenStop.apply(this, arguments); // call the super-method

		this.origHit = null;
		this.hit = null;

		this.component.releaseHits();
	},


	// Called when scrolling has stopped, whether through auto scroll, or the user scrolling
	scrollStop: function() {
		DragListener.prototype.scrollStop.apply(this, arguments); // call the super-method

		this.computeCoords(); // hits' absolute positions will be in new places. recompute
	},


	// Gets the hit underneath the coordinates for the given mouse event
	queryHit: function(left, top) {

		if (this.coordAdjust) {
			left += this.coordAdjust.left;
			top += this.coordAdjust.top;
		}

		return this.component.queryHit(left, top);
	}

});


// Returns `true` if the hits are identically equal. `false` otherwise. Must be from the same component.
// Two null values will be considered equal, as two "out of the component" states are the same.
function isHitsEqual(hit0, hit1) {

	if (!hit0 && !hit1) {
		return true;
	}

	if (hit0 && hit1) {
		return hit0.component === hit1.component &&
			isHitPropsWithin(hit0, hit1) &&
			isHitPropsWithin(hit1, hit0); // ensures all props are identical
	}

	return false;
}


// Returns true if all of subHit's non-standard properties are within superHit
function isHitPropsWithin(subHit, superHit) {
	for (var propName in subHit) {
		if (!/^(component|left|right|top|bottom)$/.test(propName)) {
			if (subHit[propName] !== superHit[propName]) {
				return false;
			}
		}
	}
	return true;
}

;;

/* Creates a clone of an element and lets it track the mouse as it moves
----------------------------------------------------------------------------------------------------------------------*/

var MouseFollower = Class.extend({

	options: null,

	sourceEl: null, // the element that will be cloned and made to look like it is dragging
	el: null, // the clone of `sourceEl` that will track the mouse
	parentEl: null, // the element that `el` (the clone) will be attached to

	// the initial position of el, relative to the offset parent. made to match the initial offset of sourceEl
	top0: null,
	left0: null,

	// the initial position of the mouse
	mouseY0: null,
	mouseX0: null,

	// the number of pixels the mouse has moved from its initial position
	topDelta: null,
	leftDelta: null,

	mousemoveProxy: null, // document mousemove handler, bound to the MouseFollower's `this`

	isFollowing: false,
	isHidden: false,
	isAnimating: false, // doing the revert animation?

	constructor: function(sourceEl, options) {
		this.options = options = options || {};
		this.sourceEl = sourceEl;
		this.parentEl = options.parentEl ? $(options.parentEl) : sourceEl.parent(); // default to sourceEl's parent
	},


	// Causes the element to start following the mouse
	start: function(ev) {
		if (!this.isFollowing) {
			this.isFollowing = true;

			this.mouseY0 = ev.pageY;
			this.mouseX0 = ev.pageX;
			this.topDelta = 0;
			this.leftDelta = 0;

			if (!this.isHidden) {
				this.updatePosition();
			}

			$(document).on('mousemove', this.mousemoveProxy = proxy(this, 'mousemove'));
		}
	},


	// Causes the element to stop following the mouse. If shouldRevert is true, will animate back to original position.
	// `callback` gets invoked when the animation is complete. If no animation, it is invoked immediately.
	stop: function(shouldRevert, callback) {
		var _this = this;
		var revertDuration = this.options.revertDuration;

		function complete() {
			this.isAnimating = false;
			_this.removeElement();

			this.top0 = this.left0 = null; // reset state for future updatePosition calls

			if (callback) {
				callback();
			}
		}

		if (this.isFollowing && !this.isAnimating) { // disallow more than one stop animation at a time
			this.isFollowing = false;

			$(document).off('mousemove', this.mousemoveProxy);

			if (shouldRevert && revertDuration && !this.isHidden) { // do a revert animation?
				this.isAnimating = true;
				this.el.animate({
					top: this.top0,
					left: this.left0
				}, {
					duration: revertDuration,
					complete: complete
				});
			}
			else {
				complete();
			}
		}
	},


	// Gets the tracking element. Create it if necessary
	getEl: function() {
		var el = this.el;

		if (!el) {
			this.sourceEl.width(); // hack to force IE8 to compute correct bounding box
			el = this.el = this.sourceEl.clone()
				.css({
					position: 'absolute',
					visibility: '', // in case original element was hidden (commonly through hideEvents())
					display: this.isHidden ? 'none' : '', // for when initially hidden
					margin: 0,
					right: 'auto', // erase and set width instead
					bottom: 'auto', // erase and set height instead
					width: this.sourceEl.width(), // explicit height in case there was a 'right' value
					height: this.sourceEl.height(), // explicit width in case there was a 'bottom' value
					opacity: this.options.opacity || '',
					zIndex: this.options.zIndex
				})
				.appendTo(this.parentEl);
		}

		return el;
	},


	// Removes the tracking element if it has already been created
	removeElement: function() {
		if (this.el) {
			this.el.remove();
			this.el = null;
		}
	},


	// Update the CSS position of the tracking element
	updatePosition: function() {
		var sourceOffset;
		var origin;

		this.getEl(); // ensure this.el

		// make sure origin info was computed
		if (this.top0 === null) {
			this.sourceEl.width(); // hack to force IE8 to compute correct bounding box
			sourceOffset = this.sourceEl.offset();
			origin = this.el.offsetParent().offset();
			this.top0 = sourceOffset.top - origin.top;
			this.left0 = sourceOffset.left - origin.left;
		}

		this.el.css({
			top: this.top0 + this.topDelta,
			left: this.left0 + this.leftDelta
		});
	},


	// Gets called when the user moves the mouse
	mousemove: function(ev) {
		this.topDelta = ev.pageY - this.mouseY0;
		this.leftDelta = ev.pageX - this.mouseX0;

		if (!this.isHidden) {
			this.updatePosition();
		}
	},


	// Temporarily makes the tracking element invisible. Can be called before following starts
	hide: function() {
		if (!this.isHidden) {
			this.isHidden = true;
			if (this.el) {
				this.el.hide();
			}
		}
	},


	// Show the tracking element after it has been temporarily hidden
	show: function() {
		if (this.isHidden) {
			this.isHidden = false;
			this.updatePosition();
			this.getEl().show();
		}
	}

});

;;

/* An abstract class comprised of a "grid" of areas that each represent a specific datetime
----------------------------------------------------------------------------------------------------------------------*/

var Grid = FC.Grid = Class.extend({

	view: null, // a View object
	isRTL: null, // shortcut to the view's isRTL option

	start: null,
	end: null,

	el: null, // the containing element
	elsByFill: null, // a hash of jQuery element sets used for rendering each fill. Keyed by fill name.

	externalDragStartProxy: null, // binds the Grid's scope to externalDragStart (in DayGrid.events)

	// derived from options
	eventTimeFormat: null,
	displayEventTime: null,
	displayEventEnd: null,

	minResizeDuration: null, // TODO: hack. set by subclasses. minumum event resize duration

	// if defined, holds the unit identified (ex: "year" or "month") that determines the level of granularity
	// of the date areas. if not defined, assumes to be day and time granularity.
	// TODO: port isTimeScale into same system?
	largeUnit: null,


	constructor: function(view) {
		this.view = view;
		this.isRTL = view.opt('isRTL');

		this.elsByFill = {};
		this.externalDragStartProxy = proxy(this, 'externalDragStart');
	},


	/* Options
	------------------------------------------------------------------------------------------------------------------*/


	// Generates the format string used for event time text, if not explicitly defined by 'timeFormat'
	computeEventTimeFormat: function() {
		return this.view.opt('smallTimeFormat');
	},


	// Determines whether events should have their end times displayed, if not explicitly defined by 'displayEventTime'.
	// Only applies to non-all-day events.
	computeDisplayEventTime: function() {
		return true;
	},


	// Determines whether events should have their end times displayed, if not explicitly defined by 'displayEventEnd'
	computeDisplayEventEnd: function() {
		return true;
	},


	/* Dates
	------------------------------------------------------------------------------------------------------------------*/


	// Tells the grid about what period of time to display.
	// Any date-related internal data should be generated.
	setRange: function(range) {
		this.start = range.start.clone();
		this.end = range.end.clone();

		this.rangeUpdated();
		this.processRangeOptions();
	},


	// Called when internal variables that rely on the range should be updated
	rangeUpdated: function() {
	},


	// Updates values that rely on options and also relate to range
	processRangeOptions: function() {
		var view = this.view;
		var displayEventTime;
		var displayEventEnd;

		this.eventTimeFormat =
			view.opt('eventTimeFormat') ||
			view.opt('timeFormat') || // deprecated
			this.computeEventTimeFormat();

		displayEventTime = view.opt('displayEventTime');
		if (displayEventTime == null) {
			displayEventTime = this.computeDisplayEventTime(); // might be based off of range
		}

		displayEventEnd = view.opt('displayEventEnd');
		if (displayEventEnd == null) {
			displayEventEnd = this.computeDisplayEventEnd(); // might be based off of range
		}

		this.displayEventTime = displayEventTime;
		this.displayEventEnd = displayEventEnd;
	},


	// Converts a span (has unzoned start/end and any other grid-specific location information)
	// into an array of segments (pieces of events whose format is decided by the grid).
	spanToSegs: function(span) {
		// subclasses must implement
	},


	// Diffs the two dates, returning a duration, based on granularity of the grid
	// TODO: port isTimeScale into this system?
	diffDates: function(a, b) {
		if (this.largeUnit) {
			return diffByUnit(a, b, this.largeUnit);
		}
		else {
			return diffDayTime(a, b);
		}
	},


	/* Hit Area
	------------------------------------------------------------------------------------------------------------------*/


	// Called before one or more queryHit calls might happen. Should prepare any cached coordinates for queryHit
	prepareHits: function() {
	},


	// Called when queryHit calls have subsided. Good place to clear any coordinate caches.
	releaseHits: function() {
	},


	// Given coordinates from the topleft of the document, return data about the date-related area underneath.
	// Can return an object with arbitrary properties (although top/right/left/bottom are encouraged).
	// Must have a `grid` property, a reference to this current grid. TODO: avoid this
	// The returned object will be processed by getHitSpan and getHitEl.
	queryHit: function(leftOffset, topOffset) {
	},


	// Given position-level information about a date-related area within the grid,
	// should return an object with at least a start/end date. Can provide other information as well.
	getHitSpan: function(hit) {
	},


	// Given position-level information about a date-related area within the grid,
	// should return a jQuery element that best represents it. passed to dayClick callback.
	getHitEl: function(hit) {
	},


	/* Rendering
	------------------------------------------------------------------------------------------------------------------*/


	// Sets the container element that the grid should render inside of.
	// Does other DOM-related initializations.
	setElement: function(el) {
		var _this = this;

		this.el = el;

		// attach a handler to the grid's root element.
		// jQuery will take care of unregistering them when removeElement gets called.
		el.on('mousedown', function(ev) {
			if (
				!$(ev.target).is('.fc-event-container *, .fc-more') && // not an an event element, or "more.." link
				!$(ev.target).closest('.fc-popover').length // not on a popover (like the "more.." events one)
			) {
				_this.dayMousedown(ev);
			}
		});

		// attach event-element-related handlers. in Grid.events
		// same garbage collection note as above.
		this.bindSegHandlers();

		this.bindGlobalHandlers();
	},


	// Removes the grid's container element from the DOM. Undoes any other DOM-related attachments.
	// DOES NOT remove any content beforehand (doesn't clear events or call unrenderDates), unlike View
	removeElement: function() {
		this.unbindGlobalHandlers();

		this.el.remove();

		// NOTE: we don't null-out this.el for the same reasons we don't do it within View::removeElement
	},


	// Renders the basic structure of grid view before any content is rendered
	renderSkeleton: function() {
		// subclasses should implement
	},


	// Renders the grid's date-related content (like areas that represent days/times).
	// Assumes setRange has already been called and the skeleton has already been rendered.
	renderDates: function() {
		// subclasses should implement
	},


	// Unrenders the grid's date-related content
	unrenderDates: function() {
		// subclasses should implement
	},


	/* Handlers
	------------------------------------------------------------------------------------------------------------------*/


	// Binds DOM handlers to elements that reside outside the grid, such as the document
	bindGlobalHandlers: function() {
		$(document).on('dragstart sortstart', this.externalDragStartProxy); // jqui
	},


	// Unbinds DOM handlers from elements that reside outside the grid
	unbindGlobalHandlers: function() {
		$(document).off('dragstart sortstart', this.externalDragStartProxy); // jqui
	},


	// Process a mousedown on an element that represents a day. For day clicking and selecting.
	dayMousedown: function(ev) {
		var _this = this;
		var view = this.view;
		var isSelectable = view.opt('selectable');
		var dayClickHit; // null if invalid dayClick
		var selectionSpan; // null if invalid selection

		// this listener tracks a mousedown on a day element, and a subsequent drag.
		// if the drag ends on the same day, it is a 'dayClick'.
		// if 'selectable' is enabled, this listener also detects selections.
		var dragListener = new HitDragListener(this, {
			//distance: 5, // needs more work if we want dayClick to fire correctly
			scroll: view.opt('dragScroll'),
			dragStart: function() {
				view.unselect(); // since we could be rendering a new selection, we want to clear any old one
			},
			hitOver: function(hit, isOrig, origHit) {
				if (origHit) { // click needs to have started on a hit
					dayClickHit = isOrig ? hit : null; // single-hit selection is a day click
					if (isSelectable) {
						selectionSpan = _this.computeSelection(
							_this.getHitSpan(origHit),
							_this.getHitSpan(hit)
						);
						if (selectionSpan) {
							_this.renderSelection(selectionSpan);
						}
						else if (selectionSpan === false) {
							disableCursor();
						}
					}
				}
			},
			hitOut: function() {
				dayClickHit = null;
				selectionSpan = null;
				_this.unrenderSelection();
				enableCursor();
			},
			listenStop: function(ev) {
				if (dayClickHit) {
					view.triggerDayClick(
						_this.getHitSpan(dayClickHit),
						_this.getHitEl(dayClickHit),
						ev
					);
				}
				if (selectionSpan) {
					// the selection will already have been rendered. just report it
					view.reportSelection(selectionSpan, ev);
				}
				enableCursor();
			}
		});

		dragListener.mousedown(ev); // start listening, which will eventually initiate a dragStart
	},


	/* Event Helper
	------------------------------------------------------------------------------------------------------------------*/
	// TODO: should probably move this to Grid.events, like we did event dragging / resizing


	// Renders a mock event at the given event location, which contains zoned start/end properties.
	renderEventLocationHelper: function(eventLocation, sourceSeg) {
		var fakeEvent = this.fabricateHelperEvent(eventLocation, sourceSeg);

		this.renderHelper(fakeEvent, sourceSeg); // do the actual rendering
	},


	// Builds a fake event given zoned event date properties and a segment is should be inspired from.
	// The range's end can be null, in which case the mock event that is rendered will have a null end time.
	// `sourceSeg` is the internal segment object involved in the drag. If null, something external is dragging.
	fabricateHelperEvent: function(eventLocation, sourceSeg) {
		var fakeEvent = sourceSeg ? createObject(sourceSeg.event) : {}; // mask the original event object if possible

		fakeEvent.start = eventLocation.start.clone();
		fakeEvent.end = eventLocation.end ? eventLocation.end.clone() : null;
		fakeEvent.allDay = null; // force it to be freshly computed by normalizeEventDates
		this.view.calendar.normalizeEventDates(fakeEvent);

		// this extra className will be useful for differentiating real events from mock events in CSS
		fakeEvent.className = (fakeEvent.className || []).concat('fc-helper');

		// if something external is being dragged in, don't render a resizer
		if (!sourceSeg) {
			fakeEvent.editable = false;
		}

		return fakeEvent;
	},


	// Renders a mock event. Given zoned event date properties.
	renderHelper: function(eventLocation, sourceSeg) {
		// subclasses must implement
	},


	// Unrenders a mock event
	unrenderHelper: function() {
		// subclasses must implement
	},


	/* Selection
	------------------------------------------------------------------------------------------------------------------*/


	// Renders a visual indication of a selection. Will highlight by default but can be overridden by subclasses.
	// Given a span (unzoned start/end and other misc data)
	renderSelection: function(span) {
		this.renderHighlight(span);
	},


	// Unrenders any visual indications of a selection. Will unrender a highlight by default.
	unrenderSelection: function() {
		this.unrenderHighlight();
	},


	// Given the first and last date-spans of a selection, returns another date-span object.
	// Subclasses can override and provide additional data in the span object. Will be passed to renderSelection().
	// Will return false if the selection is invalid and this should be indicated to the user.
	// Will return null/undefined if a selection invalid but no error should be reported.
	computeSelection: function(span0, span1) {
		var span = this.computeSelectionSpan(span0, span1);

		if (span && !this.view.calendar.isSelectionSpanAllowed(span)) {
			return false;
		}

		return span;
	},


	// Given two spans, must return the combination of the two.
	// TODO: do this separation of concerns (combining VS validation) for event dnd/resize too.
	computeSelectionSpan: function(span0, span1) {
		var dates = [ span0.start, span0.end, span1.start, span1.end ];

		dates.sort(compareNumbers); // sorts chronologically. works with Moments

		return { start: dates[0].clone(), end: dates[3].clone() };
	},


	/* Highlight
	------------------------------------------------------------------------------------------------------------------*/


	// Renders an emphasis on the given date range. Given a span (unzoned start/end and other misc data)
	renderHighlight: function(span) {
		this.renderFill('highlight', this.spanToSegs(span));
	},


	// Unrenders the emphasis on a date range
	unrenderHighlight: function() {
		this.unrenderFill('highlight');
	},


	// Generates an array of classNames for rendering the highlight. Used by the fill system.
	highlightSegClasses: function() {
		return [ 'fc-highlight' ];
	},


	/* Fill System (highlight, background events, business hours)
	------------------------------------------------------------------------------------------------------------------*/


	// Renders a set of rectangles over the given segments of time.
	// MUST RETURN a subset of segs, the segs that were actually rendered.
	// Responsible for populating this.elsByFill. TODO: better API for expressing this requirement
	renderFill: function(type, segs) {
		// subclasses must implement
	},


	// Unrenders a specific type of fill that is currently rendered on the grid
	unrenderFill: function(type) {
		var el = this.elsByFill[type];

		if (el) {
			el.remove();
			delete this.elsByFill[type];
		}
	},


	// Renders and assigns an `el` property for each fill segment. Generic enough to work with different types.
	// Only returns segments that successfully rendered.
	// To be harnessed by renderFill (implemented by subclasses).
	// Analagous to renderFgSegEls.
	renderFillSegEls: function(type, segs) {
		var _this = this;
		var segElMethod = this[type + 'SegEl'];
		var html = '';
		var renderedSegs = [];
		var i;

		if (segs.length) {

			// build a large concatenation of segment HTML
			for (i = 0; i < segs.length; i++) {
				html += this.fillSegHtml(type, segs[i]);
			}

			// Grab individual elements from the combined HTML string. Use each as the default rendering.
			// Then, compute the 'el' for each segment.
			$(html).each(function(i, node) {
				var seg = segs[i];
				var el = $(node);

				// allow custom filter methods per-type
				if (segElMethod) {
					el = segElMethod.call(_this, seg, el);
				}

				if (el) { // custom filters did not cancel the render
					el = $(el); // allow custom filter to return raw DOM node

					// correct element type? (would be bad if a non-TD were inserted into a table for example)
					if (el.is(_this.fillSegTag)) {
						seg.el = el;
						renderedSegs.push(seg);
					}
				}
			});
		}

		return renderedSegs;
	},


	fillSegTag: 'div', // subclasses can override


	// Builds the HTML needed for one fill segment. Generic enought o work with different types.
	fillSegHtml: function(type, seg) {

		// custom hooks per-type
		var classesMethod = this[type + 'SegClasses'];
		var cssMethod = this[type + 'SegCss'];

		var classes = classesMethod ? classesMethod.call(this, seg) : [];
		var css = cssToStr(cssMethod ? cssMethod.call(this, seg) : {});

		return '<' + this.fillSegTag +
			(classes.length ? ' class="' + classes.join(' ') + '"' : '') +
			(css ? ' style="' + css + '"' : '') +
			' />';
	},



	/* Generic rendering utilities for subclasses
	------------------------------------------------------------------------------------------------------------------*/


	// Computes HTML classNames for a single-day element
	getDayClasses: function(date) {
		var view = this.view;
		var today = view.calendar.getNow().stripTime();
		var classes = [ 'fc-' + dayIDs[date.day()] ];

		if (
			view.intervalDuration.as('months') == 1 &&
			date.month() != view.intervalStart.month()
		) {
			classes.push('fc-other-month');
		}

		if (date.isSame(today, 'day')) {
			classes.push(
				'fc-today',
				view.highlightStateClass
			);
		}
		else if (date < today) {
			classes.push('fc-past');
		}
		else {
			classes.push('fc-future');
		}

		return classes;
	}

});

;;

/* Event-rendering and event-interaction methods for the abstract Grid class
----------------------------------------------------------------------------------------------------------------------*/

Grid.mixin({

	mousedOverSeg: null, // the segment object the user's mouse is over. null if over nothing
	isDraggingSeg: false, // is a segment being dragged? boolean
	isResizingSeg: false, // is a segment being resized? boolean
	isDraggingExternal: false, // jqui-dragging an external element? boolean
	segs: null, // the event segments currently rendered in the grid


	// Renders the given events onto the grid
	renderEvents: function(events) {
		var bgEvents = [];
		var fgEvents = [];
		var i;

		for (i = 0; i < events.length; i++) {
			(isBgEvent(events[i]) ? bgEvents : fgEvents).push(events[i]);
		}

		this.segs = [].concat( // record all segs
			this.renderBgEvents(bgEvents),
			this.renderFgEvents(fgEvents)
		);
	},


	renderBgEvents: function(events) {
		var segs = this.eventsToSegs(events);

		// renderBgSegs might return a subset of segs, segs that were actually rendered
		return this.renderBgSegs(segs) || segs;
	},


	renderFgEvents: function(events) {
		var segs = this.eventsToSegs(events);

		// renderFgSegs might return a subset of segs, segs that were actually rendered
		return this.renderFgSegs(segs) || segs;
	},


	// Unrenders all events currently rendered on the grid
	unrenderEvents: function() {
		this.triggerSegMouseout(); // trigger an eventMouseout if user's mouse is over an event

		this.unrenderFgSegs();
		this.unrenderBgSegs();

		this.segs = null;
	},


	// Retrieves all rendered segment objects currentlyalendar v2on the grid
	getEventSegs: function() {
		returalenis.segs || [];
	},


	/* Foreground S5.0
 * Rendaring
	-md) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		m*/eof d/ && defs fne === 'fuec) 22.5.0
 *s ontolendar.io. Mahttpctiona subset of2.5.s that werealendar v.
	lendarFg015 Adam Shaw
 y(jQ*/

(f// {
	classes must imple0
 *(typeof d/ UnlendarFullCaicense: http://fullctory(requiuery'), 
	u	internn($, moment) {

;ar FC = $.fullCalendar = {
	version: "2.5.0",rts = faand assigne.ca `el` propertycVie eachactory(require('jquery'),.5.0",On httpctiosquery'), rery, successful http://fulhis; /A utilitywill retullCalendaay use)(function($, Elmoment) {

;;

v, disableResizing*/

(fvar view =n(factnt =;r elemehtml = '';
		var lendar v015  =	if (telemei;

		if ;;

v.length) { // don't buildnts,empty calenstfine.
	C = $ (if an large concatenahaw
ctorre('jquery'), HTML// tposs(i = 0; i <ry(jQting ca; i++*/

(f		calen+$(_elemf($, Html;;

v[i]lement involved
		dar'	} // the Grab individual eversios fromlendacombined	// agleRes;. Usesible a wile defaultnt.datas);
// the Then,pplypute{
			'el' possible res = th An el might be null if{
			re('j&& def callbackat this fcVal(i, _		$(cale).ible(am Shaw
 i, node= 'strinlemeseg =ry(jQ[indar't.remoeendant =.resolve(c) 2E && $.re('j, $(				e) get t the el= 'strin	el.data('fc-seg',oveD);dar used by handlers (!calw calendaelalendafunctio('full.push;;

option	}tionsoptios])) 	}
	elsnt, options) (typeof d/ Generate {
			dar, poss
					res = singleResctora method call
	var res = th				wice
element) { // ()
	calendar oment) {

;;

lement involved
		var e= $.fullCalendshould {
	version: "2.5.0* Back=== 'function' && define.amd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		module.exports = faendariven estry(require('jquery'), require('moment.exportthis fe {
		factor
			y(jQuery, momenactuais jQuery objeclendarB($, moment) {

;;

var FC unction(fact

$.fn.ill('bg(c) 2't inisopti "2.5.0",
	internalApiV].appcense: http://fullpecified for the calendar{};


$.fnOption-Hashes int*/

(f(fact;


$.fn.ormat.
functisageOverridese.slice.cinput.views || {} lendar[,tions s
					res = singleRes; Callat are
			fill system.
	.
funct { //hould be combinese if (!unction(fact}
			}
		}
		// a new calendar eltializwif (filten rerough') { // for ndar.render();
		}
	}an arrayctorllCalNam
	})ons =e twiurn res;
};


var complexOptionpecified for the, massname, val) {
		if (name != 'views') {
ClCalenoment) {

;;

	var elemere('jqta('falendadar'); /sourcelendname, = null|| {} get 	}
	els[  // bg
				' ]. of th(tion
				/xclude du,tion = nultion-Hash  {
	if
		sageOverrides$/i.test(na semicolon-sepa		}
d CSSgleRes;ation options. might be given as objects
				$.inArray(name, complexOptions) == -1 // complexrecoODO:e ofsolidate with  * (c) 20kinCss?ex options arsallowed to be View-Optionnt = $(_element);
		var -Hashes
			) {
				subObj = null;

				// iterate through the pr'stri'pecified f-is tr':tion

				/pecified fChe v ||ue in the `the v				}
		
				$.views` object
					}
		
				$.e { // a non-}
			opt('
				'
];


// ect
	')j) {
							subObj = {}						salensubName, subVal) {

			me) && // exclude duration options. mightr complexObusiness hours overlayn(name, val) {
		if (name != 'vnon-VieHOptis aren't allowed to be View-Op the propertinons
					o',perties of this (typeof defH		calendamd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		module.expoAttachess[subN-lendar[-relerty 			calenatio].applntaine);
	ersio.callleverage bubbline.abin'fulmal optiAdam Shaw
 */

(fleme_(fac $(_eledar'); /nt = $(_element);

		$ndar otion'strinmouseenter		// could the vav if (!calFirst.triggerSegMificn-Ha---------nt.datavalueecificleaveUtilities
---------------------------------------ut----------------------clickUtilities
-----------------	}
	els}
			------- subVal;dths',n(fact ini				$.isPvtializcaendaction` must`atiocancel-----------------downUtilities
-----------------the $(ev.tvalut).is('.fc-rolvee		su&&borderis(c) 2volvet inew calenda) if (!cal-------segvolvee-----ollb--------r in margin beyond thatstar;
FCfunctio-------ta('fualensedest(mpensateScroDraggwEls, scrollbarWidths) {
	if (scroeft idths.left) {
		r
			'margin-lea('fulvalueam Shaw
 nsh vdam S= 'strin// a.deboC.htm			cale;
FC.htmlEscape = htmlEscape;
o whalistenns. mre cals (except `vs viaStr = cssTo {
	if (sel.		'margin thate = delEscape = > *'in-righaw
 -----------removeData$((fac)dar) { // don'tializg	sin.5.0
 * ar) . putC.htreice
View::lendar(c) 2sation
rollnsatehe dths.right - sdestroyre is not a drag/idth': in // gresndar = the exin co!------iseft -in($, n disableCursvolved
	S View-Opr, create bam S.he dight't ini the left
`(fac`ject(vbt methres all borde			'border-rioptions]on(subName, subUpovers iDOM nangleverrcall-------st = isInt;posswhenany)
s (except `vent e scroon-Ha
	-------------------Utilities
--------------crol!(facte scroOv-----allowedt, all elements thes
			alendy View-Opts/margins on r---------'t ini.el[0]er to match the lalendoveClass('fc-not-allowed');
}


// Given a total available height to fill, have `els` (essenue, complenl loions sno arguorder, thewhich ca: sctject(vcificor-righh': '',
	ery, mas previouslys` (essentia.lly child rows) exutUtilities
--------------evl;

	ate thrdar ifailable heighs, make a mockels, ato filget the t, all elements that are veData('fate t, all elements thive inaccurate floatingons, overrides = {e scro-n-Hah': '',
are shorter than the reco== 'nded height are expanded uniformly,ution maidering
// any other els that are al* (c) 2 or() {
	ons as-is
			}
		}
	});

	return overrides;
}

;;

// exports
FC.intersectRanges = intersectRanges;
FC.applyAll = applyAll;
Fname, vheighableuser do
				e scrollblcalt to fil,n distroptionleadatio all {
	ame)) ();
	ic en	!/(tto workrides.any typectorGtor, ms.right) {
		rowUtilities
--------------liseFirstLetter = capitaliseFirstLetter;

ir natcalendar			}
			w the rees.views[enda.floores.views[subName] = {};
						}
	dropLoc singive izohod,o filloverr// for ie/ Makt by clon	undiableorigid');htmlEscaery, mht(elsvrrides.ablecificre belocificFolloweecomnew -----Offset2 ew call,subValpanse:
			}
			elvalueopacityouterHeubObj allOe);

	')valuerC.cstDur sing	if (naturalOffsR {
			flexElsnOffsetzIndex: 2dar s.eaabt = ablethatnt =alenizatiorecorackls` (esset =0
 * Dor(aable*nt ='s* coordinverrmap. Afsets = []; //// Gi a sp{ // etweenhis.eompon/ the the mh(func}
			ghts in aagLcroll2 : minOfHileft Offset;
llbarOffset dist was: 5value
crol.outerHeturalOffsSly conOffsetsuocs &
			ight(tro non-mC DOM Uttru valueScrollSeft-Adam Shaw
 ----------? minOffset2 .hide(tializobjectshow until we knowo avoent a restoural usedHeight;
		minOleft-ght ptionsvalueeight		availableHeight -= used-----------------*/


// Given thedar ensuegacels, availcalendamanipu.isInto fillhas bhe sreportedction uncoms.right minOEls.css({
			'b}
			ffse(c) 2(ollbar
	// ffseullCare('jquery'), . ou1 ? minOffset2 :nOffstpoinntiallableHeighitentsAdam Shaw
 hit, isOrig,ctionHit*/

: scrollleft-n-exhit ccons'beableced (Daystriblimitccuma
functio.hr newHed');
		var le).
	/hi			suons])) {nTextinceleHeare queryng a he = $(elHeigh,ar flexis nbelog a vi/ fler.io/
eight single fi =eFirst.e firstths.lefopalend/padding
ight( occu.getHitSpan(
		var n------ nat/ Undoes distrubuteHeithe toring 
	// aing ization
		eld things
			$&&!w the resateScroteHed heied( uncompc) 2ToteHeid things
			) thelbarWidths) {ment inCursor(
			'mard things
			$(e for non-ffset < minitionvalindable lngle fi, haghts.puis.each(ubObj)  celis= cagleRgle fibuteHeight(els) {
	els.h	}
			}
ndareft  <td> cells, t init margin/pHeight;
		minOffset1 = Maestroy'QUISITE: xElslreadion(n-exp dimeno fill"helper",inOffsvar owe up wgin-let': s:inline
function matcor(at1 = Maoan ewiseh.
// PRERE').eac fffset= els.leng (no snae). m; // sfset < crolghts[icell with dth and set the widdar needt;
FC
// Pet =dt - ration ocells to be der-right-width'natuor in certainlendar he d: inectorlse {
			//t;
FCa diffegain  - (ORe of wi to afullCadth = i === fl;


$.fn innetialize	intern whatC.csldRedds.eaiendar);
eft 		minOffset2 = Math.).outerWidor(avinribute) { // movlexOpontainer element innnerWidth++; // somei];
		var natDon------------lendar name, vaf &&
aelemOu// TuWidth);ot allSt stay oene largest naturalleHeight - mopailableHeight -= used Math ) {
		 anim singlif	$(fjectchanged.maxInEls.he destroheighfinish - nwhean ec-scroller'oristr; // sOffset2 = Math.fop(!r element w/ dam Shaw
 */

(f into a scroller if itsten off-by-f ths.length - 1 ------------el) {
		vopEls.css({
	 area
func<td> cells, fidths) {
}
			}
eachHeight);
	 takes r element w/ d(fact valuUnxHeialOfs({
			'border-rivailableHeigute) {
	tainerEl.heig -= usedHeight;
		minOht) {1 ? mier-rineScrollerEls now a san evedRed vertical spbailableural ner thleft-(functy').ight())uralOffset;
ll elemlefthe left
left-eScrollings up
	vanOffsd theform.
Heights tPotentiaron: "2.5.0",name, vaidth);ethod call

		t (non-exleft-suteHeight minOffset1 * (f-------------bleCursor() {
	$('b=dRediontaheight are expanded unifntentRectath.floor(availableHeight -, {}1 ? milasteight.
fuxInnjqui dummy = getOuterRect;
F into ientRect = getClientRect;op.getContentRtainerEl.heigntRect;
FC.getScrollbarWidths = ge mustollbarWidths;


// borrowed from hops://github.com/jquery/jquery-ui/blob/1.11.0/ui/core.js#L51
function getScroGs`)
	$.easpaments,o avoid----began,// Giv.css('olow-x')an thble)ed,ded?cle elen optinOfass (tleft-/end/allDayme)) valuelable ok
functi. Ss.each(functio elerOffseFC.vit addihaw
alflow oscillation optionare objeceft ject by  mushat thisedocumenell to tt(nameinlls to be .
	ght(newHeight);
crollParent RectteHe, endsive).
 the their natw the recomy View-Optd height (expandOuterRectle).xclusiveh.floo);

	return Endlendfunctileft,
		right: eltaights in a single first pass (to avoid reflow oscillatio/ TakeentRect.hasTime() ===: offsetries the ant that
		tor offsetrWidDoord}


/Endand entRectse;
}

he
// cnullC-dayurn positioilse timrentreaeriesHeigtion agge
FC.getOWidth;
}
tangvalueft-wuaranteuerieft .call(djr = gth ? $(e accuratetangent i		elsnt) :[0].owo hadflexElsHes the 
		tolay:inlinnnerWidth++; //argin/p: off:

				// Querels.e(ght
functnd:el) {
	vaistr	// a ndgth - 1,nObject(vtextn ambig downe off[0].ow: {
			dar possnormalizwHeigh theent inulatr wicrollbar(el, 'border-left-wakes an elemen('body').the mthe
		if usedHoff exisffsetcumente Vievar innerWunction getClientRect(el) {
	var offset = el.offset();
	var lientT: sh?/ clientWi= el.off :he witoring et.left lientTop, but// keepsolu);

	amgth h') + scs])) {nnerWidth++;ffset =addross-br + sc/ Takes an elementWiowser.
function getCudes s padding but N-----causvar innerths(elswitchn-extionsg.
/<->ctangl,-------nIcons'bsubO the
FC.htmn === 'id re).eq(0);

: shclear(functunction getClientRectel) {
	ithin th el.offset();	var t NOT	// asdollbars.
//dinates: lellbars
		!ithin the margin/i];
	Calendar', calen a single firat are alreaefault)possapply bottet < miFC.getjQe chs th
	eft +eft et < miailableHeighlvar FC lemeue);

	r offset = elturalOffset < minO get the );
	var !the wint thatelsndar object data
					element.// Dbject{
		border-(nOffs the n IEval) &&),ddClop + elold, mshiss (tway remoturnIft +8, acch > mahtmlEscanOffsmentppea that an ev'litial) &&p + el				.style.);
	var toue);

	t beca minOffset1 * (elsxowed');EtmlEscath - 1)); // for last element *FLOORING NOTE*
	var flexEls = []; // elements that are allowed to expand. array of DOM nodes
	var flexOffsets = [] 'border-UI)
			)flexnitierty anywn even[]; //DOM
	ehould untentRect = getConteery-uintry exists
							overrides.views[ importanaccept get the ffset.top + oppt in'/bor
			flateScroll estroi funtffseti reqgetCssin-ri(ui ? ui.item but NOsubO  margin beo within Tes	var mi--------inathtmlEscapCalenda rectanA[0].c ----ctor> coal) &&
am Shaw
; // recFYIack 				res = is "*" (matbouncallutsidl[0].c			}
			 the padd side?hrougst, the.isF'margin-l[0].c) ?el[0].curns tdering
se ied-oyondwhen thnt that efault, alrsor() {
	should uncel ouistr getCouble----------the fir v2twic.clienbarWidScrollToshould u inneelemenght: nt.data('fuls that are alreientWidth; // the paddings cat;
FC.h absolus not accber, nitor fcViedable). m
contain responsible fFloat(el, 'pacaching ttheir natural height

	// finmeollbageleft -edElMetalse 
	// axtra		'boxHeiutlow-x')
	opctiocludctiopossiblClientRethatreatgth - 1  a single first pa=== 'd absolrguma neen uneturn (thith);
	ied.
	Scrolllementl')}
		else {
			// this elemover-assoct, leapixeCalegionarWi naturalOffset;
		}
	});

	// readjust he mouarginute) {
		availableHeigxEls.length - ft side

var _isLe getScrollb
		var naturalHeight = flexHowser.
function getCliel).height(newHsponsible;
		}
	})all els to their natural heigh-----ffset) { // we check this again because redistribution might have change	rs()undistri


// Takes an element that ml).heisingle inner element w/ left
//fsets iththen			/gs agamets[i];
El) {
		var idths(s: lefthileCurso the largest natural n one line. insurance

	els.widhanged things
			$(e sometimeop: -1
			left: 0,
ction uncomone :(
		return trueler(containerEl, height) {
	containerEl.heigxEls.length - ction isPrimaryMouseButton(ev) {
	re return "medium" for bor	// aReturns tion === 'pace ells to || 0;
}
l).height have beees;
}


// Rrs()and turns it bacr caching the computatiler(containerEl) {
	containerEl.he.offset().left; // is the i{
			var -------------------------fset le for---------------------- immedt, llerflow-y') + parenaccouation o--------upw/ driesmisclement,ction: 'rti === els#L51
f----(, top, boshoultext plain Docs &ght
//at this f {
	nt.length ? $(e			dit || document) var mincons'ress = tions].aphypel, ticngth)op.ntentoptions === ', massages a0;

	elute',
			top: -1000,
es: left, ri----ght (excluses;
}


// crollParent ive).rs()uterRect(el) {
	var offset = el.offset();

	returction getClientRecel) {
	ollbarWideft + theass en mourns fed CSS vmle el apass (to avoi------overgetCsnction gcumulaied.
	if-------------padding.
/n moveries-------'sed toementspecifileavt (excht: l|| 0;crolrs()urns f then dislientHeight includee margin/border/sientHeight includetang the given rectlCalendar' of the gry unrel) {
	return {
		leftom:  witentHeight include el.offthin (rect.top + re / 2,
		top: eight('');
}
hould u Given `els` a jQuery set of <td> cells, finr element w/ dthe gllbarPropsr appearnd righ for nonborder, margin not included
	var* (eleft  && define (tlScbot(time|de.call(ntestwed');lendar[o).amd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		module.exports = fawant a cell to taketaineturn posossi--------------- beieldoordinaame)) ` Subtracts p`mlEscapes(res.left < regth ? $(el[0].owocument ok
functioct2.bo
// P(point.topght &&// aop < res.bott`seg`.rig {
	llowed');
5.0
 * Docs &ding: iflex= compareByF Ipoin(non-expa.compareByFieldSp,	var i, to< res.bottAdRedthtangle with absolute coordibottometho) {
: if yout tha
}


// Returnrts View-LeftRtlScrollbar element w/ displr FC = $.fullCalendar = {
	version: "2.5.0",
	internalAldSpecs = compareByFieldSpecs;
FC.compareByFieldSpec = compareBy{};


$.fnLeftRtlScrollba.length; i++) {
		token = tokens[i];

		if * volved
	; // for last element *FLOORING NOTE*
	var flexEls = []; // elements that are allowed to expand. array of DOM nodes
	var flexOffsets = []; // amount of vertical space it take': iffuncts up
	var flexHeights  cmp; // actual css height
	var usedHeight = 0;

	undistributeHellbarWidths.lefcrollParent = el.peigh not gtheir natural height

	// find elements that are below the recommended height (expandable).
	// important to query for heights inllbarset.lescrollbarWidths = getScroll= element.barWingle first pass (to avoid reflow oscill.a rectaiflse;
}


field]ath.max	}
		else {
			// this element sr.ioches past recommenpendTo('body');
	var innerEl = el.children();
	var rended height to only consider the height available to non-maxed-out roDoes not ffset1 * (flexEls.length - 1)); // *FLOORING NOTE*
	}

	// assign heights to all expandable elements
	$(flexEls).each(function(i, el)llbarW	var minOffset = i 		var naturalHeight = flexHeights[i];
		var newHendar');
		var teHemove();
	strubuteHeight, resalendar');h// Computes the intersecti lef-------field], obj2[f = cmp;
		 ?------------ght(newHeighrRectllbarWight, resive).es. Reton getOutlue innormalized to the sEndimezone beforehand.
// TODO: move t-----------field], obj2[fder first, theight('');
}


// Given `els`, a jQuery set of var subjectStaron getOunt that mi the largest natural wion.
// Expects ale widths orgin-lefimesore scro? ({
				r(avnt ofbottousedHeighttangass s?; // sft': scrolfield], obj2[fffset =isSameclientTath.mao haStart && subjecdes  < constrainEnd= constraintraintEnd = constraintRange.end;
	nnerWidth;
var subjectStart = subj== flexEls.length - 1 der width), will jeScroll(roeone();
			isStat initioolean whether this was a left mouseth(maxInnerWidth);

	return maxInnerWidth;
}


// Turns a container element intraintEnd = constraintRangause it takes weird zooming dim Retutoken;r complexOtoent isfunction(i, elion undis


/* Geometrytart.clone()t = i === fl	unsetScroller(containler(containerEl, height) {
	containerEl.height(height)-----------------return false;
}


.clone();
			isStart bottlls to ft, eldSpecsputeto be nght have been a clone() takes ;
			isStart =  k into a normal element.
funcputation
	----------------------------------------------------------------------------*/

FC.getOuterRect = getOuterRect;
FC.getClientRect = getSpecs.lect;
FC.getCo-----------crollParent = el.parents().filtss('fc-not- getScrollbarWidths;


// borrowed -----------s://github.com/jquery/jquery-ui/blob/1.11.0/ui/core.js#L51
function getScrollParent(el) {
	var positio'sun', 'mon'positio----------u', 'fri', 'sat' ];
var intervalUnits = [ 'ye{
			var parent = $(this);
			ret----------s://github.com/jquery/jquery-ui/blob/1.11.0/ui/core.js#L51
function getScroages anyinOf		dirinfel, ects et.leturn pospeof inp) {
		field]d	};

	th tfset ht (exclusive)ame timezonp, bottom (exclusive).
function getOuterReunction(factght(newHeighclone()'fset 't ixclusive).
function getOuough all optio 'days'),
		ms: a.time() - b.time() // time-of-day from day start. disrendht (exclusive)ntersectRffs the two moments via their start-of-day (regardless of timezone). Produendhole-day durations.
function diffDay(a, b) {
	return ass (tcompu a.time() - b.time() // time-of-day from day start. disregard/ Tu).strto itypei, toeiollHeuces wh
FC.cremeht (exclusive)')
	});
}


// Dieturole-day durations.
function terRect(el) {
	var offset = el.offset();

	retucrollbars of a jQuery ft + el[eturng
/xclusive.
// AieldSpec.field], obj2[fieldSpec.field]) *
		(fieldSpec.ays" wherres =	flexElsMath.max (if ation(i, eparseFier usedHtion,), top, bo0;

	eunit, tom)
.strnd = constraintEndnt, rect) {
var offset = el.offset()	var scrollbarWidths = getScrollbth;
	bars
		top: top,
		min(Math.max(po padding.
// Returns a rectangle with abs----m day stC.gett is tive).
// NOTE: should use clientLaintStart && subjecop, but very unreliable cross-browser.
nits (like "hours") inngles. If thollbarWidths.left;
	var top =var subjectStarnt1.top - peld], obj2[f.
// Athin the mar 'absft + gcrollt,
	nit, ossindath.max(poeldSpecs(inashe firentothino sma getfi(excs'),
reasoer(coery unrel b.tienter of !Start && subjectStart <Bidth)tStart && subjec
}

newHeighuteIntervalUnit =-----t, allinclone(// given ||bottgEnd;
	ack-----clientTop, butto be nollbarWiduteInteA0].owths.le/ given  date sDuration(start)) thedgiven durationtRangeit is

	u==
		unit
		return {n', 'm);

	Rectto be Start && subjectStar = in bounds at all?

 coordinsub0,
	t(uteIntervalUnit+ getCssFloloat(el.cs		return starend.diff(start.start, un}


//Start && subjectStart coordinates range (specified by a stndar', calendaeld], obj2[fiugh all option overridSpecs = compareByFieldSpecs;
ay from day s [];
	vrscro`e if ; // c-not: Math.m		usedHent) : var i, token;tion(i, epeof input === inv	}
	d scrollbut.srts View-s the unit name of the& isIokens.length; i++) {
		token = tokens[i];

		if (typeof token === 'string') {
			specs.push(h.abs(months) >=t,
			isEnd: isEnd
Adam Shaw
 */

(forder: -1 } :
					{ field: token, order:by Fieldt = ions as-is
			}
		}
	});

	return overrides;
}

;;

// exports
FC.intersectRanges = intersectRanges;
FC.applyAll = applyAll;
FC first methtex= 'strillbars.
//displayop, rect. i;
	var {
		token 1 && isIntar toke {
	s.leng	return tself];
	 so}
	e fromscro-likrderight exHei11.0 `t.end`turn dI method  clie{ // ment indntellok
functio if noelse manOffs	}
	else blank args);
tion mulis n a point , b.tmatStt = fle		res = 
FC.htmuery simeF}
	moom scrol(rect1pandaturn mset. = dur.asMonths();
	t(months);
	}
	rm scrol./
 * (c) 2ath.Texhu', 'fri', // Inte	}
	monthlemenonths))newHeigcrol	}
	months=idth') + getC// Returns  dividif (Math.abs(mo / 2,
		top: t(months))  a boolean aborts (hours/mars of ation({ months / 2,
		top: n durationHasTimerectanglltipltRectCenter(rect) {
	ree parts (hours/ dur.minu
}


// Quea legacy View-Opt	}
	moRscroration({ days: dued by a start/endunction isNar.minutes() 	}
	mo
// ReturnationHasTime(dur)) {
	r = ear.render();
	ic default)tlScg);
		}urn stardar, xclude durab.time() // time-of-s2;
	}
	re/
 * s aren't allowed to be Veigheft - 1
	eighll(rowElsiew-Option-Hashes
			) {
				subObjllCalend= [bVal;rowEls) 'value
eg
		iates tperti	unit
	: {
				t------------------set.------reme-----------


// 	s possible View-Option-Hash value
				// iterath inclu
				$.each(val, :nction(su);
}


turn /^\d+\use clillCalen;
			eug
-ut.spngs cals thatdth;
		(?:\:\d+\.?(?:\og) {
		return con	retulog.apply(coday (regarllCalended
	var left = offset.lhe given inre('jqukin
FC.isInttargct.
functionviews[subName])left: 0,
		rif time.
// Font = $(_element);
		var  = null;

				// iterate thro1, obj2);
	ect
		;

				/subObuments);
	}
};--------		if (!subObes
-----ophaw
--------bName] = subVal; // ace][name] = subVal; // record the value in the `views` object
					}
					elproperty
						if (!tion-Hash property
						if (ect
					}
						subObj = {};
						}
						subObj[su----------- (val'border the value in the `vl be 

// Merges an array of objects into a ction mergeProps(psecond argument allows for an arrayction mergames who's object values wsubOblue in the `nt(mproperty
						if (!; i < complexProp				subObj = {}turn; // accumulate these* Con{
		arn) {
		s ->') { //scro trailing Compt values,egions as-is
			}
		}
	});

	return overrides;
}

;;

// exports
FC.intersectRanges = intersectRanges;
FC.applyAll = applyAll;
F$/i.test(name) && // euery'), r|| documions s 0;
v><div/>
 = funTo015 Adam Shaw
 tart-of-day (regardlessct theval !=([) {
		r, a rName, subVal) {

								}
		retu(always unass () ele= 0;

ift(val);
 i;
	varMath.ment.dDt ofis ndot = 0i	// colleto ve	// se-pecified for thees wuery set of= undefined) {
					deementobjec the given duo{
	retbj1[fieldS-------ans	}
	


// Givration({th - 1 ? mic		// c
		to.getn movein-platlScrput) === '[o objects, th			// c values for lapecs;
Focs & Liquirbjs[i];

		for (na.5.0
 * Docs & put === custom, 'moSlicening`nctioavailableet.lerbitrarily slic, 'mups.length) ere objject, top, bottoml be 			if (subOom)
n-exp && h) {
			/ if thAdam Shaw
 all}


//t iniy previou}
	}

	return 0;
}


function eate aByIctio=== p}


//teObs the giveieldSpec.y(jQualenda
/* FullCan createObcause IE isidrom lasvar FC mplexObjs)lCalendar''); // get thod call
		if (t.length options === 'strinps(src;
			e, a jQuery se	// copy vaullC,
			'ms])) {
		
			if (complexObjs.lengt (defauzeut, le {
		irsen remov now d' || 	.aputsid(consoI			if B
funct		}
	}
}0]= constraps(src, d.offset	// c objesrationtion-----hod call
		if (t {
			d options === 'strin-------he givene
	}); the_DontEisFun://develon prototype. Jon massagedivideDurativar sel, 'for (na_DontEoString.call(inibute#JScript_DontEnum_Bug
function copyNativeMethods(src, dest) {
	var names = [ 'cosFunuctor', 'toString', 'valueOf' ];
	onByDurnd righ masendar.render();
		}
	});
	;
				}
		bottom: Math.mme() // tputed leto occupy) {
				d obje= undefined) {
					dest[name = intervalUnits[i];
		val = co.leRepZ = computeRangeffset = el.offset(rWidths = getScrollined|null|bocumulate these uns = {
 trailing ed
			opMethod.call(obj,ompenollHerect2.lef) absolute ctype m
// In[name rean;

	omplexObjs.(

			// ifprototype. JftRightWijQuera point ).call(pp: shoul {
	`out`}


// Cr// SIDE EFFECT:inOffseu}


/ift(val);
&& isIn * n ds(src, dest) { moment.duration({ takes uctor', 'toStroutime.
// Fo(obj, n'); // get into the destination, going from last to first
	f		startobjeci = propOm_at
	f.proor (i=0; i<fu? (s + '').rep
	var ft, (factopan if the;')
		um_athod call
		if (typeof options === 'striinto the destinationeg&& $.isFuning from last t(truut;
			elem
}


ls that are alrees = {
	n htmlisFunction(functio) 'string', thenght),com, ren mov1 && iarWidt = 0e = degleRdiffding area of aurns the destination, g() {
	for (var i=0; i<a.length; i++) {
		to// a{
	version: "2.5.0",es = {
	peof input ===,hash of CSS pst ellow oscill, baessenffend.disre= null	retutom)
name, c
		.replace(/"/g,crollParent = eln move{
		return  to match--------\n/g to match-----MS = +min(Math.mhods,{
				is n {
	b == margnt(el) mak, 'mo('ove;
				}ame + ':' +  duratio
		}
min(Mom: -charAteft,
		rar.renderProduc
				inOf) && // en htmlme in prar minOffsc elemcursor etang NOTr .sor, val) {
	ions s {
			disObj, args) || ret;
		}
		return ret;
	) && /seconif ({
		th tcompuredth;
c	retucs/ECMAScrip moment.durationdding-left'nt = $(_element);
		var nt ={
		left}


/*d, dur) {
	vetimes noeedeolue element =set.leterHeielligentlyhe same method with
// 
			if AScripCalendar'); /it, truedesired bhods,ute coor		usedHistribut== '[ob start.endthod = ods toscroments[i]')
		.rMath.maxps(src,me meght),
: Ma be . requtIsLetlScvar 		dirwal capialgorithmhasO{
			dsort(e asarevents.	.replace(/>/g, '&gt;'ntEnum_Bug
function copyNObjs);
		var nameo within ad(0);

	retu		usn a C.getClok
functio(at an event anymes an IEr.minutes() >oxy(obaintEnd)ked, w milliseco shon a (skip CSS var lelogic; // suding events.;
			entRect(el) {
	of trset();
	var r.minutes()() {
	$('body't, rect)  it stopextsr consolelled for
// N millisecon into  {
	1.11.s://github.com/jashkenas/uthe e= fun< differeerscore.js#L714
function debounce(func, wait) {
	var timeotId;
	var args;
	var contxt;
	var timestampop: Mdiffere('fullCalendar', calentId;
	var arg) + str.se in(c) 2015 Adam Shaw
 ;

var FC ypeofe invproxyn();
	v'.js#L71(c) 2015 1,
			ar.renderA cmpunctions.ltlScr
	remi
		re distruery'), rnIcons'xOffsnt a ceprit coyht (exmp = +new Da
		context = t1rgume2*/

(function4}-\':' + val);
		-\d$/;':' + val);
		start,earlil) {
	vas goct.pror than {4}-(?:	return str\s*\dZoneReg	return strstart,tie? tion)|(W\d\d-\d)|(\d\d\d))((T| )(\d\urs") in\d(\.\d+)?)?urs") inar newMomener-rdding.
// Retsct.prot(boole'ovec a nto 0/1utsid.js#L71ByFieldSpecs{4}-\alendar ((T| )(\d\= dividterHei
		rO be thods diff

onByD
/*ft = ofctiomd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		mo		module.nctions.les// https://de		return op, recrsoluf			$.inArrayOR certain methods wi
lement.data, 'm{ // s the uent(...opy values, calendar);
...) d } pecified f' oldures (ambiguous
			if (complexObj';
}--------------8 bug:
// https://deime.
nd righonstructor, but with
// ng). When given an existing moment,
// itain the zone of the momene (and ret.proDefcale(straintE iterate th) will j-----ch(css(argument)// result in a m(proto) {
	var nction copyction createObjecties
n methopush(na
name in src) {
		if (hasOwnProp(src, nametements.push(ullCaleno;
	return [ch(css_id] old
	// Force it into UTC alen));
			ection diff
e (and ren createObng mom!timeoutId) {
			timeoutId = setTimeout(non-cs/ECMed "es to "e exexHeigh) het = W\d\d$)|----------oked, will noscore/1')
		.r;
var put) === '[o1blob/1.-;

// S
	return st\d\d$)|(ps(src,d)|(\d\d\oment: should u-or() {
	-e clientLatar setLocalValues; // function defined below


// Creating
// --------------------------------------------------------------me(), a fut()
	// a5		'bo-*hashributh.me twice
FullC the recould use ottoprefix.nt for absolof ''o the we chenhanced momes alds anent) :  it clones. fcWhen given a
// native Date, or carowEls) .
FCdar) AttrPng mondar = ue, es = {
	border-l) {
		var mioptionreh-diEscapcoordinat args. When givideRanges any l;
	Id =t1, relementstructureue, tion options. ms.lengOt === v>')
tWidt!timedction( `left - poin`e.
FC.(conta
		vabjs. [ input ]a leftre('jquect(el) {
>')
	d.sult in a momcreates an offscrmoment ting mo = ill be local.
//  timezoeft - poin('fc-sing area otlSc inputy a duramizatiis nFC.isIntts =ate/bountimezoiven rect: 'abso duratiotimezory unrel timezostickomencroling mo----sUTC, p+= '-'; }) {
			 poinlendadar) {ment.isM j = {}	subOtraintRar momeft - point By defaut, e		for (n
		mom d } me in  objlog = fun
		mom =$.compnd({}e.
FC.m pointhods,-point od wither/paddinghich gently muate, 1var mrue.atchightmeans s ];
	 input it transfered withties
- last = pluckgth; ial-ibut(a, b,tringect.
function iven recta;

				 poinrCase() +timeoutId Zone =idth') + ar isAmbig = false;

		iboun; } 'abs}

	re'boun'i) {weh.min version = false;

		ie;
	var amb	tch;
 = false;

		if h;
	vr/scret == 1 &;

		if (isSing'-01';
				args = put))t ]; // for when we p to the firs'-01';
				args = [ put += givssFle destrocan dendals.eanhanced mocument || dible 		usedHAmbigTime = false;
		ileString) {
			if (ambigDateOfMonthRegmoment.apply(nullrange o(inpu
				isAmbigTime = !ambigMatch[5]; // no time part?
			pt stigZo
				// accept strings likee par/ given sif (ambigD'2014-05', bmoment.apply(nullassume abigZone = truof thif (ambigDatof the no time part?
				iEls igZonbigZomasssToS{
		vcorr=== ementt, e.getteOfMonthReoment, argwidth') ? mo		tokassume atring) {
	g but NO;
 '2014-05', assume amse {
			mom = moment.apply.top + rec);
		}

	th a forBtProtoobably	.repunction args[0];
	vlUnits[ poinccepts ath.var timath.,igTime) {:igTime) {ccepths oth a f}ng mom;ing *
Aht: lmpar / dur2;
panda	dirFC.isInt}
	elsng, lik;
}

;;
e as occumonth-i {
	va	flexo1 ? menteighofsumedcolumns.
Prens a sitereplmbers(a,
	var mmixiff(stollbars = compa *stri*
*/
lemeDayTt inMixi5', FC.se {
					mom.zowHeibreakOnWeekx = mustd CSS Icons'f the tends toow = ambigTiweek?
	dayQuerytion getConwholeng.
/Math.min(rible 					m. lef copyrptiog forIatiotended functipossible g.
/tionsr timeut); /ffleft-daysPerRowbut NOT srowCntbut NOT scolse moment.momenHeadabs(mobut NOT r.sliceoble el-allowed');varit inoment ftlScr_fulhods. Overc			moZone) {
	
	) {
		se {
			 proxy;
FC.capitalisent = $(_element);
		var ne.apion durof treating thferAmbigsorkse par-1_fullCalendar) witCalendar'); /for extetrue;
	}

	retur// In t_fullCal = funaQueryement use um_atwhile (ne.aAs(unit, s] = vaf (endlob/1ooplated to our enhancee;
	s.lengtHeight //isHiddenDay-----rowser.
fuworks wit;
			eendar) {
+ 0.5(isNativrk 'strinr "0rk the smatio = 0; toString.call(inendar) {++ 'valu the locale's custom weese;
		}for extee's custt$.eal.off+ getCssFloeekCas pa1, 'k Nuvar consoleurn Boolet-pre-2.9
		en't tro firuingle			movailablrZoneRy-of-/ fl or eament i--------mbigor exte[0].day		};
	}hod ck Number
/ = 1;ek Number
/ <ion') { /_Bug
funck Number
/=== 'strine parn') { //k Number
/custom  a s--------nt that mt-pre 'valueOf' ];
	v------ = Math.ceil== 'ISO')_Bug
fu /
	}
	else ipply(consadding of / ISO getom._fty.
// In tction') { /_Bug
fun{ // "pars of urn mom;
}--------ues into alendar = tru the local------------ getter/setteumber
// --th), w ISO get--------		h
	var suhese flags weCose p--) {
		props firste.call(argumput .applntPr // for a riesa Durashken------- b) { /props oe firststart. di/ these flags weh th a `views` hash
	var s momention dure firstCmomens._fulu can suMomentProt top = offset.top ;

	ifabs(mos); // Duration, a MoMomentProte hours/minuteDtId = seew-Owpand{
					mol DOM Uthe zone oscrollbtt inht (exclu MomenAdam Shaw
 */

(function(fact-------------rs/minutes/seconds thevar lubute)-tanglem = mo.unshift(val);
c likegetCe0].oinpuoment.duraowthe lue be a legacy Vie= 'ISO') tart, end
s a generdar) {thod name / lo]f (this._fus one) if this moment wasn't created viaject cobjeclendar.
	// `time` is a genbject non-functihod name where proxy(obj, ary to avoid cte null) { /es
------


//int2's coordinates_lang) // wo?
function (),
		var time.hou:.hourulate these u) {
	rettion(umberfset) {
	ells, chrono	var orm.,	};

	if (t.prot		usedHr.io (0-s) {
) is a generdar) { enough method name where this pdar * method (if ther +n moment.dod collisiohours: conds: this.millisecondspadd	});
	}
	else { // setter

		this._ambigTime =
	elme =*mbigsInt(n)ow* is a )) {
			ti enough metame whereurn BooleisRTL2.left,
		top:u can supply- 1 -nameeek.apply(this, arg= windoif (momentatements for nulwith a/    parth t{ // setquirhours-ir) {
erflow (so 24 hours  false; // ment.durarZoneReg lea ork the s
	els (beca{
		ofinOf numbes)me.asDays(a flos.len-poiin babsolrk the stionalreturn Ifnds.
// httpTime = fonalT at start onegativconds()
ment.duramp;
		if (last s(time.minutes())dayHourslbar.join(1.11.idual fonalhis; // whauseding = *oment*eturn end.
	els. Wapplis n val;
FC.cocluseconom: Math.min(rof-day is ationt now has a time

	, con/ getter
alendar = tru---------------_fullCalendOnds())----tef a j------econds(inutes(),
		c === 'ormat()< 02.left,
		top: the local[0] = 0eek.apply(thi = function() >------------ting calen a;

	if (!this._ambigany conversion ha = 0] +) {

		// get tens
		a = this.toArray(); ormat(ndar'ffset1 * (elOambiguonths1 = dur1.asMonths();
	months2 = dur2.asMonths();
	if (
		Math.abs(months1) >= 1 && isInt(months1) &&
		Math.abs(months2) >= 1 &rt o		res = ;

	if hea	}
	}

mascrolleting aif `colabs(motypeofot expreas: ht//    p(time) {

	/MomentProto.HasTime(dur1) || dif(mom.uthsecon scrpeofod no vet an eveL714a lo = fa;

	if (urati themuut(lpacxclusfc-scroe).
/== nullonds()
ezonhs(el)iUTC }


 like urn Boole----

/> 1, and the moment> 1	var a;

	if (!'ddd'hods,"Sat"ut) || gTimdestprom ay
		eo thisll be usne.apeting aWON'T.time = itlsInt(m// get the vezone offset
	}ent times.
		var darn widths;
the Monththe timeor chaini 12/10ng
};

// Rs a non-ay moment has a non-ambiguous ttrue;probablops oean)
newMomentProto.hreturn this; //  for chainiurdayng
};

ypeof defy pr}
			);
		}
		else if (typeof token === 'function') {
			specs.push({ func: token });
		}
	}

	return specs;
}


function compary presgn
	oor(tioto.timops) {ll/undefiffsetvn a
s. S-dar ie met	if  & Lurat
	ions) objeByn theoment.durationll display no getter/semethod (if there itter
i, nam objec offset = el./seconDay{
	return  (isNativeDaonality

	// Inte		ifis (ambinex----Threshol	conplexObjs)F.protrn moment.ent with a s(this._ambigtEnd) {ive invar  but t.protneed of y/m/d/h/mL
	}
		wasAmbigTime = this._ambigTime;

xts as iden divides a_lang) // s.utc(); // set 1.11.ternal UTC f
	f.prototy---------ate/hours/m/s/ms,ame migh.utc(); // set ull need tto.time.aprrides ame the year/mnds/ms
seg// the above call to .utc()/.utcOffset(vailableeplace(/dar l
		idar <fic-Opt------lse;e called aconds/m// GET t it------------iguomight cguous. Th+etter
		retue) {
s over ceocalTim0:00" or "0onds())to.timi === elsrow'= 0; ght cleagetter/smaxscore/nds/ms

		/s/ms/\n/g,the amblues withigoing fmighs

		// tdirection'destouratiin-ks` is an alias forsetUTCValues witetterght cleas.utc();urns of tisLeftR== 'fue, wixConver_ambigZone = true;
floo natu// forset (boolean)
nendentProto.haistriguous/ ReturnsetUTCVal<n (s // fo------of mUTCValu the ocalTim, ari === els) unfortunato be ypeof;
	var conter theme w Make the (el, 'bor can dependftunatellc === 'Rowt now has setUTCVal-seconds/msis._am1.11ne;

	oldMomentPmightocal.apply(tnd;
	var ar = ompueftRcts(rntea totght),
ableHeight,
	ifth ? $(e area
f------mentProto.lig fment-timezobut don'E,
		igZone = s internmigh() {
	$('body').nsole = wind(obj, name) {
	ret when .format() is called.
// TODO: look into ull ours beepLocalTime funcame)) {
				-poinmom.uDRYoArrayonality
newMome undehoht +onality
newMleft +roto.stripZone = function() {
	var a, wasAmbigTime;

	if (!this._ambigZone) {

		// get the values before any conversion happens
		a = this.toArray(); // array of y/m/d/h/m/s/ms
		wasAmbigTime = this._ambigTime;

		this.utc(); // set the internal UTC flag (might clear the ambig flags, depending on Moment internals)
		setUTCValues(this, a); // will set the year/month/date/hours/minutes/seconds/ms

		// the above call to .utc()/.utcOffset() unfortunately miion() {};
	f clear the ambig flags, so restore
		this._ambigTime = wasAmbigTime || false;

		// Mark the zone as ambiguous. This needs to happen after the .utc() call, which might call .utcOhod call
e.
		thi	if (xists// the === 'sall the
/t(),
		// which clears the ambig flags. Same with  setUTCValues with moment-timezon the comigZone = true;
	}

	return thi theight).add
};

// Returns of the moment hhas a non-ambiguous timezone offset (boolean)
newMomentProto.hasZone = functtion() {
	return !this._ambigZone;
};


// this method implicitly marks a 
functiowMomentProto.local = function() {
	var a = this.toArray(); // year,month,datte,hours,minutes,sseconds,ms as an  array
	var wasAmbigZone = this._ammbigZone;

	oldMomentProto.local.apply(this,  arguments);

	// ensure non-ambiguous
	// tthis probably already happened via local() -> utcOffset(), but doon't rely on Moment's internals
	this._aambigTime = false;
	this._ambigZonnsetScrovideDuratio	if (wasAmbigZone) {
		//* Momeer && define.amd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		module.eZone) Momees should be cofered with the clone
	transfte;
}


// R +es wi<divdow.co="nctiow ' + contewidstrugTimeren'tnull">ewMomen	'<ctionime) {
			retme aoldMomentF-------
	}
	retuTrdar &)dMomentFor/mat(this, 'YYYe) {urn oldMomen'</div>Returns a ');
	}
	ifIntrorn oldMomentProto.for-Specific-Options ;
	}
	retenticalne =			$.d vition icMM-DD[T]HH:mm:ss') (thisAdam Shaw
 */

(functionnewMomentPtrime) {
		es, not Mom--------th), will jss');
	}
	retn/bo) {
		-------------

tion gensthis._ambigZo---------------------------

// Is the m----'oment we) {rYY-MM-DD[T]HH:mm:ss')ied range? `e proxy;
FC.capitalisecalem;
};


// Weecol,n-amb.replace(/cohe i0;(sta

		// M offsemonly=== 'strigs(this, momnt.duration(0		hours: tng') ours,mithin the specified rangdar &, consCalendar', calena[2];
join('hrough all n isSame is called wittripped time wi nametalito.format.apply(this, arguments);
};

newMomentPtho.toISOStriull me as a function() {
	if (this._ambig fc- fun theDy();calltom h/m/'"---------ts specuous ? 'its spec=r a;its spec
	var andard Momen	'ime) {
		caleEscapeweekCaate]' |a Duration-like armoment we) {
YY-MM-DD[T]ons'
];


// M {
		return oldMomentFormat(this, 'YYYY-MM-DD');
	}
	if (this._ambigZone) {
		return oldMomentFormat(this, 'YYYY-MM-DD[T]HH:mm:ss');
	}
	Bg-----------------row----------------------------------------------------------------Bg// Is the 
	}
oment within the spBgrange? `en
	}
	 is exclusive.
// FYI, this mett
		return oldMoandard Moment method, so always dot
		return 1], units);
	}
	else {
		inString.apply(this, arguments);
};


// Querying
// ----------ll(this, in1], units);
	}
	elseo.isWithin = function(start, end) {
	var a = commonlyAmbiguate([ this, start, end ]);
	return a[0] >= a[1{
			hours: t a[2];
};

// When isSall(thi with units, timezone ambiguity is normalized before theenhanced mtripped time will displayd elements that are belowogging anwasAmbigTiyren't ah unitmentsg) {
		runshiftn consay',nction() {
	Contn rowasot
// b--------<tordioISOShis i) {
		rs norm rd Mvar a;

	/'lds ant, uIntern {
		return 'YYYY-MM-DD----------dths(elne.ap if  else mawbjectmbiguoversio	'></tds, arguments);lean ab non-object is discovered
			for (j = propObjs.length - 1; j >= 0; j--) {
				val = propObjs[j][name];

				if (typeof val === 'object' {
		widths.dar, i
	}
g, likeyistss thammonlyAmbi
	}

	m


// Qufore the;
	}
	return oldMomentProypeof def	}
	months1 = dur1.asMonths();
	months2 = dur2.asMonths();
	if (
		Math.abs(months1) >= 1 && isInt(months1) &&
		Math.abs(months2)AppOf('dendarean abo"rippe"the m"ouyAmbidar, uire('mo// `time` + time.ippedmoto);};

/eftmo Convert = []; //w the recis LTR.eq(0);

od th i, mom;

	// pRTL. Vice-		ifons =; i+ro= 'vookendrangename of the rE // getter
rippedar iguate([g.apply(this, argu	if (cons
	}
	retconds() || s, not Moment tim	ts[i{
		clonparseZone(type.toString.call(innyAmbpf weme || mom._ambigTime;
ng o

(Matw
			iimeof (isSingould eof token  // mofersion hap b) { /rure =orizEscally.cordrse i tokeeturns iftcOf, flag> mas. S.r setLocalValues; // function defined below


// Creating
// --------------------------------------------------------------		else stri.zone(inplone().stribhe clonse {
					mom	var
	gZone =Vi<div>		}
			}
		}
	}

	mif you wadar = trday/s. SagZone =ace(t eleoutthis contewant to presllowed') lenttomCpastP outng: 0d CSS truoffset, clolength =	lef with|| docum1.11.ng =		usedH past recomr.io/re, u// loon getCon	factorfpoinng =lendar[o
	guountProperties for thisonality

	lendar[opleStrinlength =ame w			$.inArra
	
}


/ntProperties for thisours sk-01'o	if ndar[optnd re segStartels.l.find('> *').eacht.mome to aCeboumoment.momente = true;
	}
	els;
}


// Given opttcOffries;

	if (one, ].applydoes d's its o.el`s up
	va
	}

	merWidth gn Ualues oeturn isRig to tId = ss
	//ollHeken;

eRes = catcOffnIcons',gn
// httplEsc---------gn UT		ifta

	ieptio, massagOf('dcalendatretche momentgumen use .eigh			.muone = diviom);
	}

	/
	}

	m------------// I-suffici	tokens = inpextendw f();
}

rray.
(this, arguments);
		}

		a = comm----

//  also ambigunction(stapply a Durati[ thi
		var calendar = element/minutes/s) {
	sAmbigTime || false;

	ark the zone as ambig') {
			if ((a[5] ||Mome, input):\d+(ds(a[ply(consuncompencalee Cale !== undefomentP;
			}
		l.ich d that.owapply(iguatembigs(ven moment is alreadyhodN// Assumes the (dest._am: minOf (dest._amar cone
		mumes the githis.isV/ cocalldRedinction r a Duration(mom, a) {
	// simlate what moment's accesetUTCV.ions)1] &iguate([ thed CSS as Object.prot this._isHiguity
	/ime(Date.UTC.

// R-------Zone/ for turati ambiguou "06:00"
funin moment;

// Utility function. Accepts 	var a = commonlyAmbe([ this, start, ende = cos/marginomentFo local ye------		t NOT scrol {
		var a;

		// only do / simlate what momeE UTC ye other pcan retion
	if (_isL{ field: | 0)
		.millise
FC.getScroreet =SegPop-----		return oldMomen
					overri proxy;
FC.capitalisend({},  offset = el.offset(n a[,
		a[2] || 0}


//( momainObjenaliDay=e(Date. year/month] = val; // if thenction / Assumes tbj;

	// ite
					overriion mas, 'es of th(subName, subVal) {

		);
	
	return ill be usTC ye distrxEls.rotoery, mrap-----t inturn durowi, token;ng =ds(time.san array of the  enough method nconds(a[6] || 0);
}

// Can we set the moLogging andperti in name] s. SName].call(a[0], a[1], uni/ tronsole, ards(a[6] ||;

FC.warn = functiay.
var console = windnewMomentProto.toISOSternals
// ---------------ime) {
		reroto.toISOStribgn-zero are	return oldMomentFto.isSame.call (this.ut) &&
			BdMomentFormat(thiis, 'YYYYero areas and
// additiunction-ambigTimal token.
function formatDate
		any!mom._ambigZonoment.istFormat(this, 'YYYY-te(date, formNds()
Str) {
	return formone) {
		retu date s		'----i]);
_ambigZone) {teWithChunks(date, getFormas, 'YYYY-MM-DD[T]inpuone(th; i+units) {
		a = commonlyAmbiguate([ this, input ], true); // normalize timezones but don't erase times
		return oldMomentProto.isSame.call(th; i++) {
	1], units);
	}
	else {
		input = FC.moment.parseZone(input); // normalize inputh; i+		return oldMomentProto.isSame.cath; i+(this, input) &&
			Boolean(this._ambigTime) =, chunk) {
	var tokeandard Moment method, so always do, chunk) {
	var== Boolean(input._ambigZone);
	}
};

// Make thesechunk.token)) { // ats
$.each([
	'isBefore',
	'isAfter'
], function(i, methodName) {
	newMomentProto[methodName] = function(input, units) {
		var a;

		// only do custom logic if this is an es[token]( with units, timezone ambiguity is normalized befoder();
		}
	});
	
	return res;<td> end.diff"nds()
"t MomscrollbapTime(.montction_ambigTimame)) {econds()
	ng =true;t, leth')  sett=true
ambigZone = le h;
		}
	}

	lues le with-----eStr = formatDateWittripped time will displayow.consoly default, al}
			dayth; i+ambigZonal = fusetUTCValues -----------------cts, mbigZone =eturn this; <td/>for ch// for m._fully)
		varmbigTxHeightnd({}, :atioformaonlyAmbiguate([ this, input ]);
		reurn oldMomentProto[method-nds()
-------------*ally the sa/ Misc Internals
// -------------------------------------------ur non-zero aret, unitting .apply(thmoment-like inp// set the internal UTC flag (will clear the ambig flags)
		setUTCValues(this, a.slice(0, 3)); // set the year/month/date. time will be zero

		// MarktiplyDuratambiguous. This needs tbounappen after the .utc() call, which might chours() |cOffset(),
		// which curn !this._ambigTime;
n cssSic (ath.abs(mo
// ---ate, "6p"----"6:30p"ours/minutes/seconds/		// Mark`ationHasTime(du`h absolu
				iter the .utc(ltall, which might cDtionHasTime(duAdam Shaw
 */

(function(facty?
allowor ge fune'llr;
	/le
		v [];
s) {t/right/tot, leflagft = ypeof defy an rn oldMomentFormat(this, 'YYYY-MM-DD');
	}
	if (this._ambigZone) {
		return oldMomentFormat(this, 'YYYY-MM-DD[T]HH:mm:ss');scrofc-nots localized formaturns a Duration wite hours/minuteet when .fift(val);
	 ($.isFunction(functionurati{
		functions = rops) {
			if (!(n}; // the (/</g, '&lll have been mo+) {
		if (arghis, mom)nality
newMome(); //uments[i]r theet' in momall
		if (typeof options === 'striveData('fullCalend		}
		anyAmbigTime = a----	varC = coe) && !moment.is= 0;
	1 = 'rguments);

	/unction(t.od th	var middleStr2 = '';
	var middlbigZone;

	oldMotype.toString.call(in1 = '';
	var mng string and continue unt at the leftmosiddleStr = '';

	// Starded formatting
	}
	if (this._ambiit Same !ons as-is
			}
		}
	});

	return overrides;
}

;;

// exports
FC.intersectRanges = intersectRanges;
FC.applyAll = applyAllanyAareHit//
// SETTER
// You can supe = true;. (if t, or a Durction(mom, a)ide of the formatting string andlateds[ also ambigu/d/h/m middleelated to ambiguou ? mintrue)d beforeby a
	// Similarly, start at the rightmost sidinat the formatting string anunks[rightypeof we chHiet(),
		// w	varormat(, topormat(ime.
// Forvar middlee rightmost sistruiguity
	/this._tr = chunkieldSpec.fvar a, wasting string anget._d.setTthis._r + rightSUsing a f// Cse {
			&&	// Twidth') + getCunction(facts a genHit/ only do custng out itstrubuteHecommodate a left scrghtI; middleI++) {
{
	retturnTC yeall el= moment.dustrubu
			// could ks[middleI]);
		middleStr2 +ElmatDateWithChunk(date2, chu;

	urs arChunk(date1, date2, unzonedDate1, unzonedDate2, chunks[leftI]);
		if (chunkStr === false) {
			break;
		}
		leftStr += chun
	}
	elput); o 24 hothe ti token;	var i, mo

	ifme.agardlViewset) te chunks) {
		m enough method name where this p ambiguonds,ms rops) 				OT scr the year's accd CSSs no(reca.titurecolyates d		varse); // in the middle isLr = chunk Duraffset)ptiod', // AM/PM
	a: 'secondRptio/ am/pm
	T: 'sec timelect them distinctly sT + right
	ret
	// s.lengur (24)
	h: 'second', //Blatedur (12)
	m:cumulate thesddleStr2) enough method name where this precau keepTimeq.
	foime) &&y?
allos is 
			middleStrs.length - Vt a ciz/ will  + separator + middleStr1;
		}
		else {
			middleStr = middleStr1 + separator + middleStr2;
		}
	}

	return leftStr + midant to ightsoDate RanallowValuimiln givetallscrodi; // fo Range 1.rig= true;
FC.compareByFieldSpecs = compareByFieldSpecs;
FC.compareByFieldSpec = compareByFieldSp= 1 &FC.flexibl if Method.calllUnits.lordeer bou)ens = input;
	}

	for (milarUnitMap[okens.lenast = +	breakif you wahighlptionundarneanctiithin the spefor thisfPoints(point1, pomilarUnitMap[lizatiohe
// ce/ TODO: lions].ap[0].e inputs i----an{
		fum);
	}

	/ng') {
		tokens me.ad dates }


// ion undfunction dis.flooralc seshen nearl)sion happen'&#039;'), true) / dingle fiH).eacit of measurement?
	nded heighwidth') + getCss
		any if (dest // setunction(Scro 'absoould be$(flexEls).ndar v
		this.utc()",
	internalAnynths = dur.asMonths();
 h elearn) {
				{ field: token.substring(1), 

/* Geometryliable wheTC.apply(D--------- falseegard the
// formatclone( chunk is concerned, format date1 against `chunk`. Otherwise, return `false`.
function formatSimilarChunk(date1, date2, unzonedDate1,) / dur;
	}
	months = dur.asMonths();
	if (Math.abs(months)s', true) / dur.asDays();
}


t of measurement?
		// because unreliable when near DST (bug #2396)
		if (unit  because unre	}
	}

	return false; // the chunk is NOT er
function divideDurationByDuration(dur1, dur2) {
	var months1,months2;

	if (durationHasTime(dur1) |----------------


var formatStringChunkCache = {};


function getFache =-----------------------------------------------------------------------------*/

FC.parseFieldSpecs = parseFieldSpecs;
FC.compareByFieligZon*').eachf(start, '= nulSr i, token;),
		right:

	if (typeof input ===. Itvar tokens = []ChunkCache =rmatting string  momtch[3])ntProto.isW).eacNods.
function proxunkStr; //  if (val !=opy values e momenSno zo Using(match[5]);
 objects whose  massa 'absargumenesult
		s2;
	rgumentes any legacy optiy(jQuery, moment);
	}
}dleI;;

FC.Clss; // export
SegRowss that ath.max(n if n ambiinOf {
		retbigTimeone, f (!i) tion: 'rtunatelumes the gindar object datTC yerowing
 copyOwnPropmentin-ri = functe) {
	vaready in) {
	fors. Any alen = aas and
// additial str);
}


funceturn />, 'YYYYainObject(vgn Ubsolud...
poster b(functr members;

Top .utcOffs't usem/jashkerue) / months;
	}ng-ptidths.r

/*ot the l. Oh();
		if scroltion gTime = tr

/*FC.cfunctthe en unenclleI=ments
};
ateWse;
	t	}
	else		nt?
			mixI---------new el.ot the l().txInt until you hit a tokhods to the car le is alreadymatStr));
}


fu tbody')type.
// Can be called righbers;

	f.css('turn mot?
			mixI // FY is alr;
}

accum;
};igTime ass to cre[rrn ombersE
// Assmomentlass(supbers) {
	m customl string
	;
			elbers;

	felopme-of;

// Singl if (destin-rir for the st all o && /->'border-left- Utils
// ------------------------------------igZonould be the sangChunkCache =t(),
		// which c		}
		any/ BTW, don, '&#039;') if (destnstruct		};
	}ts to the super-c point1.totypeof defirue;arChun ( for thisops)mplexObjs.lengt,/ non-View-Opti------------------------------------------------------------------------------*/

FC.parseFieldSpecs = parseFieldSpecs;
FC.	if SegTftRt'tmentlues

// Que {
		widths.t----0].cll option overri	factoromena		}
ion-HaDate1 = dateery'), reet) {return / what this function will return (this jQuery objece Date Forname of the larges-----xclude dull display				lCalendar'); //r leftIvar members;

	fass = Class; // export

e);

	ose y over allt all other esarsele thaesult
		urnsthis futurn (this jQuery obr allI;
	var leftStr = '';
	var rightI;
	var rightStr = '';
	var mmbers;

	for ic-Options formg ofy over al class varia function(dered miqract aria
	// ensure a constructoods tubclass, forwarding all a-day
// -elsmentll.
// Ain-riods ton hasOwnProp(obj, name) {
	return hasOwnPrdar, hing tii = 0nnt Momptionsill. true);
------ will inhght),
t);
	}
})(functionhods?
E8

	// copy over al class variables/methy?
allowValueOptimization = ffset(leftI=0; l';
	vas: this.hou(leftI=0; the leftmm/s/ms
 `extend` and `mis.trits[ireturn oldval, =class vari, andype.toLet2 Casr = fs = bers;

	for (iomentProto.toISOStriternals
/// fo+ ');
}


function forreturn o<trentsentFormat(this, 'YYYY').remoone =ftI=ers) {
	mi


funcrned, juimeoutId 	var>
	var a;
nyAmbigTime gle
//gic if this ,


	getC----/;
		e-of-day
yAmbigTime --------el.nhansettie1.c's(),
	var-cks;

		iODO:her later.		callb
setLocabacks: function(name) {
		var callbac onltI>lef		call------his.callbackHahtI--); i++) {
	uts[i]n hasOwnProp(gerWith(nametion defs.push({ mon-
	if (src.= true;
			}// Date Ranclass r setLocalValues; // function defined below


// Creating
// --------------------------------------------------------------aturalHem	mom(t cuass to creroperties falues for lame in p,
functray eady h.time() - , thene().s'factory(require('jolutely po2.5.0",
	internalApiVnd({}, icense: http://fullcalendar.io/
t,
			isEnd:  array of args to a constructor
		a[0] ||  paramurn max}

	mom...	else is p	a[0] 
		stribprotohainiide (boolean)
me forn();
	vight.
funfunction getCallbu {
	}
	elsoment.duration!
 * FullCalendar v2.5.0
 * Docs & License: http://fullcalendar.io/
 * (c) 2015 Adam Shaw
 */

(functiontrue,
	options: * (c) 2015 urns the m)eft-wturnbleHeight,options].apopover. genera		 possibl

		risHiddefullC{
	ifthods, so: shos of the scroll contalass.ex."	isHidden:h all option over options specified for the calendar's constructorts View-Option-Hashes into the Vi&& unzobjecten); //tangleuild the base prot() - el0].owfullCal$.greeturnscause IE ise View-OpsOwnProp(obw methods
varall argumen// the space required tput. ensureurns the mouel.show();function gthe popover. generated by thiscified position.ctory(require('jquery'), require('momen(function($, moment) {

;;

var FC ;
}

;;

FC.Class =param you wnlass;
}ime sult
			},


	/es any legacy options into. into a non-legacy form.
// Conves = Class; // export

// Class that ents)ss to create a subss to create a subclass.
// Last argument coet = functl` an	- lefFormatting
// --re considered mixins.
Class.ethod= function()  argumentsbject hash containing new me>
// ca'	callbackmozillrClass, meirs) {
	vaHidd all argumen(wasAmbigZon-------

/es;

// Ut function() {
		var _this = this;
 "2.5.0",
	internalApiVersion: 1
};
var fcViews = FC.|| {} }; // the output. .fullCalendar = functio;
}

;;

FC.Cliv class="fc-popove{
	if (t
		if (options------------perClass,  plain

FC.Cln(op()ge can beoxy = prs) {
	vatructor = fun
		this.ge="fc-popover"
		}

	 Utils
//  on the  the traili----&& // Queryiat()<mbers>e = false;nths2)
	) {
		rons = put ==
			.css({
				// position , massages any me) && // entMousedowme in pr-timeoin('latedallb`bclass.
// L`)eturn PRECONDITION:el` and r0
 * 
	}
 the momen';

	s.lendar v2/ms values ofass;
/ hack f.
// La= true;
			this.trigger('hide');
				chunks.push(ma/ Laate/hours/mins = Cl/ Laiguate([ (pro.
// Last argueft-wiou/* Ge, wis leavor tlation).itHide f
			.cssctory(j0
 * .off(in a nmbigTime || false;

	
			thi_Bug
funczone as ambiguoy = proxy			ent within the sp.
// Lextend
			thiemberher plCalendar', calend;;

FC.Clascks *anywhB(if -----------tion options. might be give--------b.time(it calls eavailableHperties should be combined
	'header',
	'buttonxists
							overrides.views[subName] = {};
						}
	turn /^\d+\nt conteidths.left - 1
		bj1[fieldSpec. arguments)From{
		left!ment involved
	leI=lientTop, but v---------------- compensateScroll(rowElstion" (not;
		var top; // the "positionset.leoffset") values for the popover
		var left; /liseconompute top and left
		topre(obj1[fieldSpec.onlyAmbiguate([ ths aren't a {
	return /^\d+\:\d+(?:\:\d+\tion" (not||;
		if (options.lefion() {};
Name])n ths/ iften();
 between tName])t;
		va chunk
	vbount.isMomr = elemenbounturnalize getStl { //return oldMomentProto[method-r.io--------pertih-------gument co/ whaationHarectangleument, bounc 1);entFostart.end, 'moailableHeubtract cmp;
		}
	}

	tScrollPiguate([ th);
	}
	returnt;
		var to 'funcScrollPTime = an)) { // nor<e1.cl.toISOStritTopn-zerguitylendar)et();
			v+ '</e1.cYY-MMh; leftI++)result
		 startportOffset.top;
			tliewporis excLeft = view(i = 0;
newM||dard port&nbsp;-----eparathe unzow(momnameli.each(, a) {ting to;
		}

		/;
	};
});


a Misc Internals
// ----------------------	}
	elseurloment.is' hrefng str be further down
ur= $.Calk(date, cnks[i]); &&
			Bo}

		if  precedenwidthallback

		if wportConstrain !== false) {
(!this._fuStringChunks(formatStr)al token.
f-------------matDate(ndow is sme =porttTop = vi:'fc-scroa nTC, outeeturn  tok the  this.mar) { // 	left = Madow is s  //s[i]);
ent
	if (ate, getFormat, arguments)tion" (not precedeProto.toISOStrincmp;

= fuleft-width': " /nk(date, cn !== false) {
		
		if (options.left}

		this.el.css({
			top: top - oend.top,
			left: left - origin.left
		'</as we want retmlEntitiesow #--------
					complexObjs.emovscrollbedDatxtend n); // weature
	documen
	};ng new mem;

	eComparend thptions || {}
		tthis f// if nuratio bungTimeOllowed');ement, then		end: snts is tf moed' || ! given NOTEDatedointentPwen a n {
		var opt enough method n

/*
A igger: function(name) { // args...
		vaegLd ifis.el = n (if Sents.
WoperCldoes not .off('mousesub-this.dallbed if			this.ed ifSO getter/sh mo\d\d$/ts.
Woting cal
	// assign hn by a nortLed if noe getbersor (i =Cachehis.call year/mMatr, par[]atStr;ookupable heout(later, waL714s and unrmouseto be e = F+// T
	elsre belowellll, // jQuery set (assumed emovStr;e = false;		usedHnull, // oml, //setParenon rangll, // jQuery set (assumed rigin: null, /tion( as Obpoin .forl be usMap = subclass, e = F	calenddateOffsete, this,isHorizoj, such as `extdument copion() {
	
		varn add tions].app unforttr;
}

(to h`)dth `		call`the ctions.l
		varangeUilabh[name]bClass -------nlyAmb of coordinatarray the au	sinadest._ame(unzone = FxHeighttom)
he `s()) *tcOfin(Mdth();
		if om._fullCf arriguous t		te().(tParent of els[ileftI;		this[colCalenda		}
	


// Que	tdkHash s[i]);
'oms: numom, a)  = $seInt(s.isHori
		this.iop +=1,	}

	+ 1!== fal 'valueOf' 		var innerWi {
		Classhat gStart =t {
		mbigtft = 0e.end;
	verride th[i]this.: co		var		his.els = $(optiels for coordinat, sta
		// if the whod call
		if (tnt).

op implicingle ousedow				!/(temovom offset	op,bottomftI=0;ts.
WollCalenda = commks: fu ? $(optrons.of rightSll, //tion: his.	// pnt of els
		this.origintParent of els
		this.ori;
	var nt).

optoptions =1here iFloa
	vaTCValues  heiy for	var of.	.mit		//agparedgesi. A of docottom			}
				var';
}
oment0,
	bigTity css}
		icrolop,bottomuse clichod cj commojget* metover, optionsjelow.
	build: function() subClass.llerd if no ightStr ta about [jeing ca		ight

	// arrays1 = '';
	vase;
}


/o fim._fullClEscape = cordin valr(a[0 (mom.u					momions = optioo fill, have p + elent ? $(optifset.top;
	Els) {
	rowEls.llbac
	// ensullbacgStart =ubtract '';
	var!arguments, 1);nt that mins.isVert {};
		}

 at the leftm middle';
	var+ 1
			'margin-left': s.
	bu rectang thee tiet() won'tinates and stores them.
	// Call thisectStarttes (offsets 	// Right now, only retuQueries the els for coordinattParent();
them.
	// Cmmended his method beis.els.eq(arent) : null;
	},


	//on(memight

	// arrays	if (!cumentsnerEl	var want Mofunction(eturn callbacksC.Emittbersent) : nu [];

formatting
	ounding".el.offseng
}seconds,ms) {
	var Moment's ;

		this Giv	this
	// pnt of els:override th--------terWidthush(left)--------ts.
Woime = m off--------snds,men a nmulate these uSt
		el of ld wunzonedDate2 = d--------ues wllforeungle	};
}


/ter code reuset) and psition (fr// co< rehis.bui1));
		}
	}

});

;; {
	c	 both offset (= true;
			this.trigger('om offo the subclass, such as `exjument coisObomenttext.
{
		/= false;uraticercape crild:ia momethe
	// Hast = +re sc;
			v) {
	oerve// Setstright}

		r function() {s;

		th

		/var leftStr = '';
	var rightI;
	var rightStr = '';
	va this.qu----				!/(tom offccepts ------=== elstop i, ,(input == nct = getC = propcoll}

/// for form}; // the ys all internal data ab coordinates, fr return "!isshow()C no srent = elunding[joper.mozilly(this, arguments); /;
	vj` ght ray  have thstIsLesub';
}

rnal Uoken
	/ nul=r top =
		this.riginOfs: nullor thiff: funct			ret = fu() {
		var 	},


n(le becaingRect || guarantee ilement.d last = 
		}
	subClass.verf-to


/ht. funyl noors(momife inputs intoRTa meutside of the boundingRect, returns undefingRect |be invoked, wetHorizontion()formatting
	ingRecunctions, thisObj, ights;
	},


	// Populate	}
	elseforwarded on position,documery ele			this.hidevar eftsull;
		}

		= true;
			this.trigger('
			this.eendar'); // get hod call
		if (t	// Mark the ;
	var rightSng th		this.origi using and of the get;
	var rightI;
	var rightSis.op);
}


ed w]br />');
}


functioEl);

		// wh			thistion definll be zero
ent becauw	var i;
		 logis.
nef no inuse cy top/bm internal coordinate arraysoment?
func	getHorizontalIndex: fu{
		f	// Destrclass, len; i++oment.utc = functionlen; i++)_Bug
function copylen; i++e gien; i++) being ccrolt(truen; i++overflow:(!scrollParentE		var lts the lethe leftm> Array.protot.calnt times.
		vaScrollbone;
	C.moment 
			vaoment for example)
	if (mom.hasTime())r similarUnit the s	mom.utc();
	}

turn i;
		(a, be.
FC.momentaoverflow:- by.prototyp}el that iM true;
FC.isI heiight)length =nds()
	nd({}, n-----= inpuke
/-----ate Ranr setLocalValues; // function defined below


// Creating
// -------------------------------------------------------------);
		}
	}emove it El =) {
		bar o, th= 'fuitimeValues Views = FC.viestions:
	- className sr
		a[0] roperties fptio		a[0] 
		thidingRe			viewpion(na
// gstorefts: nu.urn reheigh thevbigZon
	(options) {- content (HTML string .5.0
 * Docs & L'rtl') {  function(rightsright position (from offeftInructor
		a[0] eof subClass !== 'function function(bClass = mem function(chCellWidths(nright - nHasTimremov function(var cte2,e clienunking Utils
//Lght)liseconds()
		})"ingRec" (functionn't hts ned) ay-----	for (ns)s related y);
	},elds.
		// Can`var r},


Days() / + getC(objectight);
	};nds()
	var mreat(the zone ofration t(thight)section is madethis.rightll display (options.autoHide) {
			$(document).on('mousn a clname).on('mous;
		}},


et' in moment;

// Utility fy = proxe top/left/right opttStringom docum
	retven { star!the element at tter thtopIndex]angles. If they droto.hasTim mom);this.rightbig flconcernecall(inption: function(this.right called with another ,

	// Gets the  Duration, aRtion: functit at thnate arrater.
	fon: functio!ntPrmustTime = anars() element ats

		/he elementm._ambigZone; one) if this moment nds()
		})de) {
	t `namtrue;accomooverridesthengoalse ot
}

/

	/b= 'ff alreadm intu want Momrigh

//  = leiompare tValues(mom, a) {
	Y: 'year',
	Mt;

	ncel thist(this.s if you want Moment's ori at the given index.([
	'isBefore',
	'isAftear len =ter = Class.ext at tex) {
		lEscapees f".
fu '';
}div).on('mousHof theplain ob, a) {*/

var{
					, a) 
		// T+ th this, a.autoHide) {
			$(dembers) {
	va.childrens._fullCali,is, argtop;
	}, {
		ret' inctions.letunk)nkCacht))s avont atfunction()  functiotions:
- els functior ins[topIndex.outn this.b(this._ last = exOfa----hts: nul----
var else eries 

/*heighw+ rimpenstionone =},


	urns undefined.
	getconstreplace(/'/g, '&#03;

		r------eq(int(ate2,, unin conttom e Foreturn {
	givene) / mont}


/(ollbates= this.he eloms: nus>1;
		vt()
	ash)  drag's mouseect2.bottction(fidthption/ {left,valu Converclusive)so indtea new---- functlloordiurn 
				// p
	// Computeis.tops[topl || thiis; // fo> td > :t.pro-nt at'endar o		return this.bo the given ne = ape.
// Can be = Ms.tops[t>dex) {
		r

function isNahould; leftI++) {
		ch{
		re
		}
	}

	m thettom 
---- funn.left;
	},


	// Ge= inpu // metur// SetsmaximumtomOffset: function CSS cs & Llass."Leftkthat nern (arthisObjs if you want Moment's oriurn this.rights[xEls.nds()
	over othcrollEl:(); // set)tomOffset: functionn `els(from docum enough method nthe element at the gFirstLetter = capitantMousedownP Gets the height of Scrollbaroreing
			chunt doesn't widt { top<a>p, bottnds:riginDOMhods t;
	}

	// The0 to firl #or sect.right))		maare // setter

		ODO:, node) {	calescrollEl is s.5.0
 * Docs & Lordinat1.11.0fsetortLevar rwithisArralling to stars can override thing on tion o (b--*/econdteigh(topOf)tainer erigin to be "parsedlIntervalunately miO: use ing
	ond, at maximuter (i don't case us handlers
-;

		if (!itivity: 30, // pixelss, such as `extegsBel) {
		r
	},


	// Populover
		ifbutiw, 'month parse  unforther tHeight: otar sec to startLv)) {tomOffset: subClass.tion(ev) {
		ifs an TODO: loopOffsvar i,s.tops = or null
	

			ev.prevenistening
	mousedo that ittion(e i < lnime.ap;
}


// A  (onds())ur enh Dat, newMom	optionhether to/bott: nu{

	els: nulhandling scrollEl is scrolled
iginn add ar minOffs		}
	-i	timeo (isPrimaryM will guous t	var toon for hanTd,r hanWrap	var sLin
	varass(tousedos to		!/(ti		varvar rin add  wheength // { top, bottondex.fts.leng b(topbottom/height

	// arrays of coordft dot ofame(uPrimaryMouseB query for top/tes (offsets from topleft oflead to sputes the in = mt) {
	od nameor scrolling n return "lead to ssion happens
	 and reQueries thetopIndex] -/d/hthis.isHori	arent;

/en-US/do for trtDrt;

nt)) {
				lead to sgStart =ar scrolor (i = 0;rectangle isarent;

.offsetPadollHandler')crolxy = debouncthe subclasllEl.on(ing all ,


	// Qmethod before usin	}
	},


dex] -&&[topIndex] -p position tPosorizontal
- isw.
	buis())acy form.
 element ttom + thiParentEl = teProxy = proxy(thisuse `debounce` trigin = offsetPoxy(this, 'mont


	constener 	this.subjecoxy(this, 'mohe element at the me=falsthe element the edgs handlers
ar height;
	}
};

/tom s);
};add-*/
// TODO: use Em bet*/

varnOffsar height whe edg rec
	vety: -ods to = le.utcOffseld: functlear: function() rvalMs: 50, // millisecoar name in src) {
		ta about coordinat === 'strinigin = null;
		tlCalendangRect = null;
		this.lefts =r isSinrn (ight/width
	ids.
// httpime = wasAmtter
		en beco *all*prevents native select		this.topns on adDatewsers
			}

		

			ev.p, dest) {
	v)) {

			ev.pr attache(0));

		if (!scrollParentEl.is(docuw) && !scrolParent.is(document)) {
					this.scrollEl = n)
	listenStabr />');
}erProxy = debn(ev) {
		this.+ta('furent;

					n(ev) {
		eek = nennerWidth;
v)) {

			ev.plendar ob----ts);
	};reength bottom 
	// P// for		if (m----/ { top, bot+ this.to `this`, and use `debounce` toperspectiven scroocal() -> utcO again (options)nt te1.cl coo.isVertical;
		this.fStart =startDrag(evprototype n() {
	point m the ohe user doinimum distance ableHeight, s.tops =. true; //no minimum distae(s) s._amball internal da
		var dx = eect, returns undefiebouncTd return what the ele han were rectansVertical;
		ance) {
		var consw) && !scrol)
	listenStathis.s.isDraggid callsdon't happen
					ths[i]);
	eek
	// eStr1 = '';
	var+ j
	// This[l, prs possiblandlerProxto firCalc, pras	},


	/tooeft = Ma	},


	// Cae(proxy(this, 'scrollHandler'), 100);
				ragginghis.scrollEl.on('scroll'istance || 1;rollHandleTdxy);
				}l', this.scrollHandle			this.starthe left/rithin		// if no starting  into($is crtDrag(evlues(thunctioion(i, e Callnds: null,dx + dy * dyndar = 	this.subjec
};

//		this.stardinate arrays
	buildElHoriz : setMoment function() {
		var {
		this.mentMoused hanuper-con handlingjectEl nimumsy caltoms[.isI).lefmentMousedO: use uper-con	this.subjec	// remove a mousedown'd <a>'s dayHours = Mring vTODO: rollBounds: PopoverbottcrollembigZone  = false;
	}
moment
	// Ight }
	scrollTot `namds(time.sthe elemen bottom edge, like the CSS xy: null, // this-scoped functi later.
	ftrigger('dragS, 'documentMoused('dragStructor = funcx, dy, ev) {
		thperClass.applction(dx, dy, ev)is not vis, 'documentMousedis not vis--------*/
// TODO: use Emi's href so it is not visiteClass.apply(this, ype.slice.cad

	sl) {
		var mior an arrcalled exo fill, have `[leftIthe r

	// Csp= thrtLe[left.deboes fidthsright - 1ings li// hack fn
					t enough method name(funcdenom/width/heighFirstLetter = capitaliseFirstLetter;


/*e,
	isD(i =in to thedx, dy,llbactructnt(m function()getn
					tet = this.isDrating cal;
		vtructon('idths{
		'margin-left': '',ft = oick// set------------------},


owEls he two ranggs(thislParent.is(do
		// only do custon for hanlen = ar andstore a mousy

		rlParent.is(do(+new Date( 
		setTimeadocumerollParent.is(document)) {
		 // setter
rescop local() -> ued via lhe e	if (isPe/etc ht),
		tSpec.fieons)dAhis.subjectHrefs to stshow();s th toprt, enon
			if (_s to stoeek nuistening to the user's mousethis.isDra
	stopLise;
		var d mom);
		this.triggd } Index) {n.top;
	}	if (thingle with absoles to a indtomic-------(ev) {
		this.trigger('drs/margins on rv);

		// r,opertieonstraintric eno uns.scrollH		var		thioxy);
		out(fuDatet(fuoxy);
		this.le to stop listeoxy);
		this.isDraocument)
	(ev) {
		tis.isDrion;
FC.divid return "if (this.isListenisHidde			// remorEl); /hfts =		a[0] |t)) {
				null;
	cument)
				.offntEl = options.offkill it

		if (this.isListenleRes; object

			ewto theen off-by-ollbarWidzoomTo no unit		this.trient.data('fullCal? subjectEl.attr(this eturn this.rationHat edge should		}
		}howeve
	entDefault);

function(ev) {
		if (/ Call tlass);
their natural height

	// find elements that are belode
	startDr/ Call t.= $(el*/

varaybeS'YYY-----> ma the CSaybeSa>utton(ev)pEmetimeull;
Returns  Uti/></dixtendClass(thi past recomof------------- Using a f also ambiguor =bClass =ionsnt contexmetimereturn 	var minn(ev) {
	m = sort(ny e in+= winTimems

		// TODO: usStops a pt of "bottom" would be.ndex) ligtoArray(opne = this.his.m ambiguoit = invar callb------ dy, selectst
	// prction-------------efault);

], a[1]his.scrollHandl: 'sec= $(el).ouis.getC', // hour ions.s the Can be (val utoHidnputedis(mom,  []; // amoun dra2;
	seg the(functidoing it's ) {
	iew (i Cluesrais.push(el);
	n(ev) {h': 	var el = thinOffsetffset(),
		// which cmove k-------rytly muctangle on(ev) {
icalled eunction(i, el)ition: fIndex] - this		};
	}
ts auto scrollinnstraintRangel).hei(options) {
nd.clone();
min(Math.maxthen becombiguity
	/s, Array.pr	});// W// am._ambig
	startnitial  most br Calls) {void 	var detBofulInd	});		}
		anyAmbigTime = ice.calelemenname` acrol/ Computesone m+, bottomClodragWidthmatRa= sepa+1rnal coe broours 	var dms

		// TODO: usar topClone ms, bottomCloseness;
		vare) {geX;-	var topVel = 0;
		var leftVe});

		th},


	// Callew	return e the d	this.s auto scrollingf the earent().offset();
		va null,y: 3------- // {left squaredisHidden:-----------------------function(ev) {
		if (the option hasnt = $(_element);
		var isTheurn trn widths;t - (d({

	els:		viewrn moment.duration({
			hour	return mbigTime;
};
		a[0]  || form			left = ormattion(name, context, args) g ambig flags.
newMomentProto.isSame n-zero areasrtOffset.top;
	(top ft =(top, vity - (e? 'ui-icon n.
			iboundsthon(e-------			iftopClos-xment
	if (">ollLeft( must be completely in b visible area tullCalendar).margath.max(lef = topClosenessringChunks(forminatllbaat(this, 'YYYYwMomentProto.toISOStriache  function() {
	matStr); // o non-zero areas and
// additiments' bounding nts[i];
fireWith(context, argsde of t], aape = ted ction is alreadyEls) {
	rowEls.d({

	els:/ get 


	// Creasses will  1); ompensatee,
	isDraggfrom of bottom= Class; // export

// Class tha: nufset(momment involved
	; // keee dragging is in pr(obj, .bottoms = bottoms;
	},


	// Given a l// the rration.if so, dx/dy in n(ev) {
zontal));
ction.moment  past recomname !,	.mivOffse hturns) {
 = oft docigRectouldR functds = []-n-// Re, then distriere stoc/ foame( top) of r;
	}

	// 		};
	}.tops;
		lefuser moves the		middleStr1 += fithin thdate1, da FC.momrain >= 0 && angle is, f	.appom the nsole = windoClosenunctions, thisObj,ull;
	},
top', ev);forwarded on.
	//  or jQueryument)
TARTmrnal coord rectanglft = he user's mousloop each DOM elemor ext{
			if (! (if any) options.s: segEnd,
			isStListenin || 0,
		$.ma.position();
			this.isHidden = false;
			tall argumenplay no{
		lefterval(
f (this._fullCalendset.lend scrol	minutes: this.minutes(),pVel and ambigZons: this.snd scrols(),
		olling (Math.maxl) && !th
		if ((this);
	assign reassigIndex) {}
			else if (ral; // if thelog = funf('mout's keepLocalTime fu,
		'margin- a zone (AScript_Dontnterv objets conte//   dfts.l inia = this.tunction isNa, pr? rnally consoisNatir = rns the index of the made, or oy').rem * thifset 			}
		}
	opVel, leate an objets.
	// I, top, botoneftVel = his.tops = tops;
		thhasOwnProp(obj, name) {
	return hasOwnPrnt(months2)
	) {
		rhandleraDragging) { iews`)
	$.eands()
		})		if ((iver. Will noybe?
hen dragging
		.millisenumding-left');rgument.
// When secrollEl.ofturnat(el, 'bor it

		llLefstening) {

			// relick happt if ( (moment.isDuration(time)'+portnumth - thiso.clictEl ? subjectElthis function wp', ev);
= inputs.lment.duraber
fuhe CSd
	sc(dur * n);
 content------t?
				var el = etMomenerWidvar Cvelrs || {}); s content this.r. A moms(documeom - ev.pageY)) / sensn gets ca outside of tll, // jQ Gets the height of tvalMs / 1strainScvar righc = this.sls);l ||  year/month/date/hourleftI;
	-------s handl
			rightssion happens
	veData('f, and use `dto make surthe exiis(window) &;
			element.daa('funull, hod bformatting
	}
	if (tr panel that imom);
	}

	// strip each f (!this;
		this.bols: function(bouncslot-----------------------------------------------------------------------------------------------------------------------
Optction(classlse {
			there i				// s, membert, le------------.prototy] = moath.lone().strhis.scrollL		}
		else if (anyAmbigZone && onst	flexEls.pon getConassume amscrol"onst"
	};ndedin== 'is.co5.0
 * DnIndex] - tame]unk isry eleeft datenapKills any existing granula ambillisecontlScro(non-expand		widt
	// ) {
// ISlo moment.mominif (paon getCon durationut === 'strideno !scrollt.proting leftollinFields 00:00:ft = maxone with scrolling, recompute positions since tht,
// but ing left: shonged
			this.scrollStolabehappen h the flags reguous. This neeouse ratiorun
		rettion function(axise)
	scrIl > v a mexisting scrolling ans unofoll ed vbel2)
	) {
		return mont-------lowasAcoigs(src, dest) n add 	this.options = 		vicrolue;
	}
	elseslatntProperties far heightoordinatbiguity
	//  acrosalApiVearily be if (des();
		}
	},


	_ambigTime = fals;
	}

	if (src._ambigZone) {
		dest._ambiAM/PM
	a: 'sebut NOT swhet (dest._ambigZone) is
					overrt left) of nt'salueso zooke the CSS conceptstribl, // the container element forcontainer

-----------dges. valthis.li// set  - (ev.pageY -nction() {
	s del // mmousenth/date/etc values of the moment from the given year(a[0] || 0)
		.month(a[.date(a[2] || 0)
		.hours(a[3] || 0)
		.minutes(a[4] || 0)
		.seconds(a[5] || 0)
		.millise.exec(formaues to s------------the moC.apply(DateTCValues = allowValueOptimizatioseness hetherven moment is alreadydelt/ Crzation ? funate, a));
	moment.updateOffset(mom, false); // he modo
	mom Accepts a moment and all, // delton(mom, a) {
	// simlate what moment's accedelta tdo
	mom._d.setTime(Date.UTC.a
		a[1] || 0,
		a[2] || 0,
		a[3] || 0,
		a[4] || 0,
		a[5] || 0,
		a[6] || 0
	));
	moment.updateagListener----------------: copyNativeMethodmatting
// -------
} : setMomentValues;

;;------------------------nction() {
	basicndar, a. Any arunshift(v			this.isH-------------------------------------- and
// additional token.
return oldMomentF(date, formatStr) {
edOff		retu=0n oldMomentFormat(this, 'YYYYwMomentProto.toISOStrithe muments); // call the super-method

		tSlaocumthis._ambigZoMomentFormat(this, 'YYYY-MM-DD[T]der();
		}
	});
	
	return res;pdated
	upd"v.paget common  wight-
		i. H--------- if this.orthis. DyAmbiing abig ensitivittrain the ren't transfered with the clone
	transferAmbi------00; // t Momation = '_d' in moment() is.sMonthRem = moment.apply+ end
		right) tion(esmation lall( padding tlScrflexElsListenin	// K endif (i < len 0] || 0)
		.mot.prot	if (----wes as Ocues w then

	//ing';s.queryL!thie		varf (_txie? `eeight) {Ced' || !HitDragLisll result
s.sce of scrothe centegetVertp();
		.scrollTenter) his, mom);
	if (this.ct.lefthe cent but NO subject all ptioeRes  end.diffBy duratios.origHit= divideRis *not* palization/ TODO:  start,gle
// rendefc-terin;
			vittomCloseness * this.scrollSpeed;ttomClosen/ TOSidthlocamatRan.max(top, vectRect) |+ this.me compwportags relxtend = mright		.off(negative. for		subjec	return oldMo
	scrollHanomentProtup
			}
			edate, chnks[i]);
oint to bounmomenustom lo +tRectCentig fla		}
		else {------'isDragging inor"------.max(top, v!--------oint = ge moment
	if Center(subjectomCloseness * this.scrollSpeed; && botto	});
	e???
	},


	// Called when" meth"ffsetPahe centthis.nstruct/ Kills ans, timezone ambiguitytor, isRTL) {
	var localeData;

	date1 = FC.moment.parseZone(date1);
	date2 = FC.moment.parseZone(date2);

	localeData = (date1.localeData || daP = os= oldthod ambiguomouseSingleStrinmost ringocs &Str;ubjectEl
- sren't transfered with the clone
	transferAmbiguments); //ev.pageX - boguments); //d({

	els:  {
			clear;
		}
	},


	/ {
			clearleftClosenenpuon(tophitOver(hit);
	m = moment.apply(uments); // callg moves
	drag: g moves
	dragmom = moment.apply( {
			clear}
	eis, argument !== undefhitOver(hit);
	geY);

		if (!oseness  call the super-method

		different hitl;

			/s.hit)) { // a  /re?
			if (thi[topIndex]assign heAsUTC theeturns i?dges. val		return end.diff(ore?
			if (thime/zone  Called whencenter of the subject arn widths;) {
		tgeX)) /this.origHithis.hitDone();
		DragListener.();
		geX))

// Reptions ='scrollIn this.
----ath.eft h': t(th a jQuero,in w) {
		ret i, mis.scrol encume(	.milliseche o-------ved o;

		;
		}
	},


	// Csubje || forma= this.ermiAor t(;

		econds() , this.is.hi[is.hiy of y/m/d/hme-of-day
// -
	scrollHan startis.hit			}
	rn widths;/ TOthe time, anning
precoorst arg}
	},


	/rmatStr) || formatStrSets theion outeIntessibl, this.origHit);

		this.h*not* pa: null, // rsection
				t, isOri {
			m = moment.apply'hitOvements Duration, ahit = null;
	his, arguments); rs/minutes/seconds/m res me()c a the bigTiis.hit = null;
	 to the ohit = null;
	
		context =uments); // ;
		if (!mquency, wsection
							this.hitO// Isubjeeight) { sedown
	) {
	oordstgZon(!thisel > fters over.om)
lInteall ambig flagonstr- {
	Listeurns undefinAGENDA_STOCK_SUB_DURAth) Sy of y/m/d/	if >l
		if--Offset < Called after am = moment.applyt.releaseHits();
	},


	//


functListeStop.appl hasubjectRect; // in case tped, whether ,hit)) { // a  but NOT s						: function() { // : function() {n() {
	ret		}
	},

istener.prototyp; leftI++) {
		chpe.drag.apply(this, arguments)ments);
};


.	els.eot important for `formatDate` 1); // works with moment-pre-2.8

	// Expand localized format strings, like "LL" -> "MMMM D YYYY"
	formatStr = localeData.longDateFornoMeridiemStr) || formatStr;
	// B:30"		maxAM/PM)ot important for `formatDate` because it is impossible to put custom tokens
	// or non-zero areas in Moment's localized format stringsScroll= formatSimilarChunk(date1, date2, unzonedDate1, unzonedDate2, chunks[leftI]);
		if (chunkStr === false) {
			break;
		}
		leftStr += chunkStr;
	}

	// Similarly, start at the rightmost side of the format.call(this, opide of the arChunk(date1, date2, unzonedDate1, unzonedDate2,  chunks[rightI);
		}
	}objects >=  .call(this, optopVel, lwunc:ithCh		thset()', thi
	ret sta {
			break;
		}
		rightStr = chunkStr + rightStr;
	}

	
				this.hitOuit) {
				this.hi directly?
an(mom, a) {
inates when comput			this.hiall(this, optiont === hit1.compone} or null
	ar) {
		AM/PM
	a: 'second different for both of the dates.
	if (ar) {
		= hit1.componeny so we can jam them together later.est(propNr (middleI=) {
				rewidth') + getCame]) {
 the cln false;
			}
		} hour (12)) {
				ron
			ame]) {
 {
		retu moves
-----------'s mous-------------------d-of
		/=r di+ rightby ause as)	if ---------ets th day.
	 returnnds()
	rk the s0animasetPaffsetPcalSnapar) {
		eturn !this--------*it
function ild be.
	ge hit #ction(offssAmbigZone =Foll
	var meme element t) {
				reand made to lo +, // the elemen----------nap as it mov the+	thi/ the elementif (hide to lootracollower = // the eleme/ secothat `el` (thee clone) will bescroe attached to

	// the initial Hidden = faundefipreventsar) {oxy);
leme: `sourceEllbar wiarator between anything time-related...
	A: 'ssecond'AM/PM
	a: 'second', // am/pm
	T------oxy);
ond', /
	t: 'second', // a/p
	H: 'secone has moved  timelement oxy);
ond', //n of el, rtside of bomatDateWithChunk(date1, chunks[middleter
		return moment.duration(0ithChunk(daords();

		ie getScr element at thehe e the turnlemee;
			t maxI>= minDnaputc()/: this.houve();
 (rect.lefst ft;

	hours(),
			minutes: thierent hit than be(),
			seconds: this.seconds(),
			milliseconds:nks[middleI]);
	}

	if (middleStr1 || minction----sRTL) {
			middleStr	date2,
		getFormatStringChunks(formatStr),
		separator,
		isRTL
	);
}
FC.formatRange = formatRange; // expose


function formatRangeWithChunks(date1, date2, chunks, separator, isRTL) {
	vae first `namnds()
		})endar.ioery  an arr0;

	e"cons"T at start obouncepageX, ev.art. disregard && ft = : false, // doi
		context =e elemen*/

(functionm = moment.applytion() {
		thMoment( hit than befand ma---------TL) {
	var unzonedDate1 = date1.clone().stripZone(); // for formatSimilarChunk
	var unzonedDate2 = date2.clone().stripZone(); // "
	var chunkStr; // the renderin top =f this moct, returns undefined.
	geypeof options === 'striiddleI;
	var middleStr1 =	.app// The areaStr2 = '';
	var midd	.appendar) {ue until you hit a token, callback)
		var revertDuration = tformatting
	}
	if (this._n the animation ient's keepLocalTime functiy

		// change the valullCalendar) {ll; // reseer) {trainScrollVel:his.scrollendar) {
		0;
	}
ar) {
getVert to happen lendar) {tart, end ]ure ur middleStrISO') {
	ar) {lugins.
	i[topIndex]bet &&
APIigPointi// if rollVel: funsive), top, btVel to be zer, optiothe collisio!timeoutId) false;

			$(document).offrigHit)tside of lTopVelcrollTopVel = 0;
			}
		}
		else if (-----true; //var lef (subje.scrollTop() + this.screvertDur---------// Start atrollTopVel * frac);
formatting
	}
	if (this._ambt) {
 recoe2,
		getFormatStringChunks(formatStr),
		separator,
		isRTL
	);
}
FC.formatRange = formatRange; // expose


function formaa DuraSationHasTime(d argumea single- b;intere redognize
	construnt === hit1.component &&
			ionsole, argumeex] - thirns a DuraSeg._d.setT might 	if (_isLeftRthis moment this, Array.prery ing
	el: ns.el &


	geX;
			this.teX;
			t.scrolll: fu!timeber
fuOfDnimati`s probablr complex pitivn-expasn'tlIntes NOT null,
>')
 midna) {
	m get the t if ens.
// If no uniity: '', // inof-day (regardless of timrue if { // m = moment.applyte1, datebacks = '', // inn /undefined|nust outsids.callbunding box
			el = this.el = this.sourceEl.clone()
				.css({
					position: 'absolute',bounce
	var isAmt(thturns true if name of the Hit) {
		cy, wht
			structor

	s.originY;
{
		if (!/.cssToS----isAn-o avoidollisio  (thisqual(hit, thi Class.extend	return this.of #// theo{
		d


fuopName]) {
				rropName]) {
Rethe derhod
	},
e first  of day.
		returnllLeftVel: s unambigthe mothe zone o current of t		!/(ed overame(u0o.hast(); // prhe moels per sec);
		}

l = thif (ev from alue
		/.apply(t

	// Cal0) { /ths) >= mouse there wasns:
- els0ly(te the CSS s); //tracking el= true;
	}

ld th tracking elemeast = +
			}
		}
need teX;
			furthoord, falthe clond
	removeElement: fuion() {*t,
// but* momelen-f ori) {
				retueturn !this.tracking element
	uptop0 === null	}

dth(); //or snl exceOffset;s unas._aetEl()&
				!/(tptionth(); //  thi (remove.0-1.0)s probabl
}


funlIntouter bed overnaturalOf1.0jQuer	updatePosit.hour-------ening et = tstra(this.is.parent---------.cssToS*/

vae({
			
(function(factomoves
--------------Ppe.
// C----------or velnt === hit1.componen--------------------// the is.parentEl* Object Orformatting chunk is concerned, format date1 against `chunk`. Otherwise, return `false`.
function formatSimilarChunk(date1, date2, unzonedDate1,) / dur;
	}
	months = dur.asMonths();
	if (Math.abs(oordinat element  a point t, forst(this.A scroll handler ev.tl va`top: -100ould w2]) });
		}
		else iro areas
}


// Chkens = input;
	}

	for (t of measurement?
		// usollTop() +ngle date, geloattype me.time() - b.tiant i	thise for thisould be the sam = [];
	var chunker = /\[([^\]]*)\]|\(([^\)]*)\)|(LTS|the same for the two dates
	// BTW, dn't support splitting oy(null, follownon-zero areas
}


// Chunkingpadding of a jth();
		if e).
/ned dates for thiser it has been on chunkFormatString(formatStr) {
	var chunks hat are alrea-----------------------------------n();
		}
	},


	// Te---------------------------------------------che = {};
(formatStr))) {
		if (match[

function getFormatStringChunks(formatStr) {
	if (formatStr in formatStringChunkCache) {
		return formatStringChunkCache[formatStr];
	}
	return (formatStringChunkCache[formatStr] = chunkFormatString(formatStr));
}


// Break the formatting string into an array of chunks
functichunker = /\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\---------------------------------------n
	var match;

	while ((match = chunker.exec(formatStr))) {ral string inside [ ... ]
			chunks.push(match[1]);
		}
		else if (match[2]) { // non-zero formatting inside ( ... )
			chunks.push({ maybe: chunkFormatString(match[2]) });
		}
		else if (match[3]) { // a fue) / months;
	}
	returnft, retions === 'd(/\s*,\s*/);
	thies the saelse if (match[5]) { // an unenclosed liter(match[5]);
		}
	}

	return chunks;
}
;
}

getHeight:s, such as `extn uned `mixin`
	copyOwnProps(su// Class that all other classes will inherit from
function Class() { }


// Called on a clstructoate a subclass.
/rator,t argument coTument) dx *ableHeight, shoulncel dinate arraysbe tments
};

t (a + el[0].clivar leftStr = '';
	var rightI;
	var rightStr = '';
	var middlments
};


// Adds new // Th=tI=0; ame wherevar i, n

		reass's protoen dates.
te2`ssar conteecond'this.vieixIntollinnOffsetd from itt: function() ght))return th'margin-{
		rew.opt('smallTim

	// Determt');
	},


	// DeFormaines whether events shoeFormatigZone = false;

	if = members.conor (i = 0; i < len; i++) {
		members lse;
		}
nt) : nutructors);
};nt) : To BTW, donDragStart (in DayGrid.even members.constructor;
	}
	if (typeof subClass !== 'function') {
		sbClass = members.contructor = function() {
			sperClass.apply(this, arStervalmousemove: function(ev) {
		this.topDelta = ev.pageY - this.mouseY0;
		this.leftDelta = ev.pageX - this.mouseX0;

		if (!this.isHidden) {
			this.updatePositioIntervalbers 

// Qu have their t---------ctiool be tre objectes for thisstrainPoinid about.stripZone(); // "
	vuments, 1 (this.hit)	widtd: nulcancel oubottom scrolld before following sould be the ollbars.
// R= this;;
	var i, namllingce--

e listemeasurementn en------ffset(), -----------gooits.thiser it has been temporarily hidden
	f this moase, text selecf areas that each rengeUpdated:  Utils
// ------------------------------------rid aboutoHide (boold be generated.
	se----------------*/

var Grid = FC.Grid = Class.extend({

	view: nulguments);
		};
	}

	// build the base prototype for the subclass, which is an new object chained to the superclass's prototype
	subClass.prototype = createObject(superClass.prototye subclass's prototype
	copyOwnProps(members, olling: funcype);
	copyNativeMethods(members, subClass.prototype); // hack for IE8

	// copy over all class variables/methnon-z/ Givs.triggerWith(name, this, argction(start)
	listwhether toll) {
			dis= 0 && ll) {
			duture updatePosar leftI;
	the existing calenfsetPareging was started maClass, subClass);

	return subClass;
}


function mixIntoClass(theClass, members) {
	cis non-z that willull;
		}h the(document).off('mousee el that itcall(argumenctan'}


function();
	

		return this; // for chaining
	},


	triggype); // TODO: c(name,, context, args) {
		var callbacks = this.getCallbackks(name);

		callbacks.fireWiith(context,from ou-------eturn this; // for chainineady in local mode.
sart/end}
		}

		alues = allow)
	listion;

/endthis.isHoris.co ? $(options.on() {
		reen = falseCreates en stopped
	his.scroplayEventEnor (i = 0; i < len; i{
		var callbacks  bounding rectangle i		rednstructoowing && !this.is a[0] >= a[1] && a[0ords();

	heorem
				all
		if (this.largeUnit)nction copyNatlTopVelhis.lar= 0;
			}	else {
			rend(options.comat'
	computeEventTim // hour (24)			display: ths, freconds(erval(
	oxy);
		emoveProxy-hed coordinates for querernalerval(
		('hitOu not the l		this.g && !$(edretur[0]); /citly from outsrder-right-w custom toeturn callbacks;
	}

})tc values	// ensure a constructois.getCallbacks(name).aggerWith(name,is.scrollLeftVel) {
			el.scrollLes absolutely positioned over othhis.scrolnt
------------------------------------------------------------------------------------------------------------------------
Optihis.scro className :' + vbers;

	frt of our s if n add r/montls) {
	rowEls.ates the playEve - 1) { // not the lasores all border) {
		dest._ambigZo	if (!this.isHidden) {
			this.el.hide();
			this.isHidden = true;
			this.triggiew;
		this.isRTL = view.opt('isRTL') content inside of it
	render: function() {
		var _this = this;/etc valuesd(options.ccrollTop()t will be or (i = 0; i < len; imatStr));
}


funlse;
		}splayEventStart');
	},


	/* Optios.callback;

		// when a click happens on anything inside with a 'fc-close' className, hide the popover
		this.el.on('click', '.fc-close', function() {
			_this.hide();
	the optionuments, 1n-level informabClass = memn-level informatructor = function(n-level informatioening(ev);
	},


	// Called whit from
fuis.scrurn o  (i od place tod getHpover if the click happen
			this.optSingleStrin't;
			v'// Do'art
	data should


	/*= true;
			this.trigger('xternalDraClassame);

		callbacks.l,


	cons-------tructo; // for chaiayEventEnd');
		if (ds, such as `exisplayEventEnd = thiplayEventEnd(object/end and any other grid-specific location information)
	// into an array of segments (pieceating: false, compute cor(document)

		returall(argums.el/ && !$) {
	var a = commonlyAmb into this system?
	diff
	build: funum distance ositions	// preunction(a, b) {
		if (thns:
- ngth			/t) {
attach opover').lengtpdated
	updateScroll:s, zutc()/'	// intrey;
		v a forner of tlse {
			return diffDayTime(a, bments' bounding recting callednot on null,
	end(targnds: ns
	formom = = 0 && ar name in src) {
		--------------------*/


	/Called before one or m'
	computeEveMethods(srcefaul the lewpoispla// setter
 handliing: faed dhor eld foin to t// foarent
-----mbiguicals // subtract  && !$( middlentD< 3	var a;
.callbackH		this.isDractionrestore his.moue queryHit calls mi, from the uction()it calls miUnit) {
			return(playEventEnts, timezon

		return callbacks;
	}

});
;;

/structor: tions, thisObj, ar
	},


	// Populaon();
	;
};

/------------Map = {
{
			staruildwardt) {
OM. Uforelated cons.el` avar tops = [Alsrom  waited position. = lefb
	retu!
	dlers. in Gris.els.each(function(i, node) {
quency, what  mult'd b] !== undefhis.tops = tops;
		tch mey scrowidtuterHeight();

t < righ =(this,. in Grfset (fs;
		thisturns tF(like . in GridingRecceEl.widthnction0he bottoveloper.mhe absolute coordinates.
0_Bug
function copyNa: false, in GrPrentureunction0crollStopction(},


	/* Handlers
	-----------------------ating: false, in Grt) {
-----------, tim0cept of "bottom" would  if hit dng st(like areas  when ta sinelated conouse mov	return eg the -----cument 
		retud
	removeElem1= inparse inputs intolling to stard func
	bindGlobalHandlem---
todth ftbigZofunctisuch as the docuOM handleght))he eia oricent ele flags
	for ( handli inputs intoght))t.rirs f		vis---------g: functot defined-of-scrol"series"s up
	varoto); onsecug
	elel = 0;
			}
dinate arrh-difne i = Clho'Spand/ Re (inight,
		lablptiodg------exElsturn
			 // '
];elat--------i, token;ent: funclements ents nathsedownring ime = funements
	st // // intown: function(et) {
i, token;ndex of esent, Array.protoObject.protg: funct--------ew.ops a 'right Binds DOM hae, val) {
		if (vn: function(ev) {
		vner tracks a mout) {
function()h as thunction(a,ch as thentEnd = thi/ get the exich as the docue tethis.sc) {
s.dayis norWidth p offsethe given phe drag end	this.displayEvrnal handlorizontal)h as th// Populateigin, squaredthe zoneuttthis ntals();
e any coord it is a 'dayClickptions.toString.caleight = macti foroordhat repr|(\d\d\d)) function(renderDates: funhe drag endike View
	rigin, squareleft
	elated contrue; //arguments,ll,
	rightndGlobalHandlelick
	ll;
			/ew.opt(-dragScrollnew HitDragLisp + el----*/


	// Binds DOM hanhe drag endonstruc: function(ev) {
		v madn a day element, and a(doesn't c want dayClick ick needs to hindGlobalHandlThis value h(maxIf hit didn'ndGlobalHandlers._ambigT rendering .a = this.n; // null efts;
		ndGlobalHandle/ if the draged con-) {
			_this.getHitSpan( a day element, and a /			thvailortLey. ForbigTim.getHitS
			started on a hit
					daasses x: thif so, dx/dy in electio= this.ev) {
ce we could btion note anative, this.DO: look into  // {left,tssfunctionvar maht) { //w HitDragListar name in=		if< also detects sele-----------------*/


	// Binds DOM hanick needs too eleme					);
						ifcept of "bottom" wouldRenctioiod of targ a popover					}
				}
ll result
				}
nY: null,ce(1------ into acwindo to // h/// Cr.
	// A null,
	strion-View-Optioy(jQueoo momespeee).
/look inions[Maya[4]Iconsject Elemr: fu IE8 to compute cos.hide();
		});

		ifthis.subje "right" {
		thistor: functiondefined if draggi		this.ments[i] !== undefv.target).closest('. events	.replace(/>/g, '&gt;' events------------------- eventsn animputeE
	// Called  call unr._d.setTewpovent Helpes;
		var ori: functionFckHit),
						_t.scrollTopVthe firste.call(argumenth thenc, vity.getHct.
functionv.target).closest('= true;
			this.trigger('ar leftI;
	var leftStr = '';
	var rightI;
	var rightStr = '';
	var m/ NOTE: element at thetes for queryHit
	pqueryHit
constrainve();

	tains zoned start/end propernal
	renderEventL);
	},


	// Called ----------------------"06:40:00" or "0		res = singleRest();
		var windowEl = $(window);
		var viewportEl = getScrollParent(this.el);
		var viewportTop;
		var viewportLeft;
		var viewportOffset;
		var top; // the "position" (not "offset") values for eft; //

		// compute top and left
		top = options.top || 0;
		if (options.left !== undefined) {
			l
		}
		else if (options.right !== undefined) {
			left = options.right - width; // derive the left value from the right value
		}
		else {
			left = 0;
		}

		if (viewportEl.is(window) || viewportEl.is(document)) ollParent's this
	returnisNatiom.uverbnds a 'bont(m.ers: funcprturnwidthsheeft-Follower'siginal event 
		this._-------ible

		eturn oldMomentProto[metventiewportTop = 0; //vthe window iscrollbarWidMdest// givenortEl.is) {
				this}


// Is the give/ Calall ambig flagday..}
		if ( {
		lat the tventLocat thaes should implsubja = alse;ction() {.cale // recor rect2.boputed be tvents())-vents())nd to cons'-----dumbul for d || {}); //ventDatestDragLisnt(moouse mov*we could *e all c(ate, 6pmom mock evl;
	ents fro10ammes an IE------------||he interna	viewportTop		else {
			viewportOffset = lement.date original eSeg) {
			fakeEvent.editable, 'LTrestore oment, ar		return fakeEvent;
	},


	// Rendon get offsetCloseneonths))= offsions will	complendar_weeas in isecon, namessName || []).conca i;
	vaper');
re)
		}
		else {
			viewportOffset = viewportEl.e;
		}

		return fakeEvent;
	},


	//= 1 && ers a mockevent. Given zoned event date properti= 1 && tenderHelper: function(eventLocations `date` withain to the view port. if constrained by twoedges, give preceence to top/left
		if (options.viewportConstranks[i]),
			le		top = Math.mi(top, viewportTop + viewportEl.oun by subclasseight - this.margin);
			top = Math.max(top, vi Given z{
			this.roto.toISOStri		vieformatDate-------rceElo top/left
		if (event. Given rained by two al indicathiso top/left
		if (e original e a highlight by d	for (i=0; is.origHit =Left = viewportOffset.left;
		}
al positions = { lments
	computeCoords: funn of a s		viewt(span);
	},


	// Unrendeed * -1; // nenegative. for object.
	/cal positionsection, returns another date-spleft, viewportLrt.apply(this, argution(ev) {/*pIndex]wght(					


	// SportLeft + this.margin);
		}

		this.el.css({
			top: top - origin.top,
			left: left - origin.left
		}r + rtLeft + this.margiggers a callback. Calls a function in the option hash of the same name.
	// Arguments beyond the/i.test(name
			this.opt.warn.apply(co/parseFielsedown: functionlnt ts) {
	ethod call

		
	}
	return d >= 0 &sfor (i = 0;ment from tmbigZone ding area ofn)) {
			return false;
		}

// Retu code
	tr
	},


	//> contaunction firunrenderDates)llowed to be View-Optionen renhat lproxyon(range) {
		thloewportan: fununregisterorigHit),
							_thday click
				ve subsione mndler
		LTR;

	reosenesndler
		big ff day.
		returubsequent drag,
							_this.getHitSpaan1.end ]eNumbers); // rt(compar;

		dates.sosorts chronologically. worSingis.el = nu----------------------initializ edge_this.getH(\d\d\d)cy, whfevent amn als/ theturn= _thone mlect
	};fdes od place totDefauy. Fo).on('moer = Clas---------------------osenes----*/


	// Renders an emphasis on ange
		}ionSpan: funalendar_we = nult.clay. Fo subjeobjectg.pusyn debull, // pixselectio past recom(			o/ TODO:Hit),
						ck to for1 buildelated con+ mous
						if (s	unrenderHigh},

2s coordinates,s, not Moment tim) { // 0;
	return { star'second',rs tay click
					if}

});

;;

/*) { // dering the highlis for renn array of classNamection-----.lOffse= Array.pouldseness;
irst
	foremovek thaart',k thatturn [ 'f) { // one m* 100peed% = eln [ 'f for ren for rhours)
	-----derHighlight: functis the int: func--------alendar_wed fopbiguouths();
	iecti		topa| [])w HitDhts ft
			view all pr element idth': 1s 			i---------h-1; r	var hitents sh', /0 && 

	//  a/p
' >= 10erFian1.e10
	scroguesstcrolyClick
					i day. Fo---------------.
	//		if (span && !this.view.calendar.isSelectionSpanAl []).conc	_this.getHitSpan(dayClprocess span;
	},


idation) for -----------= subObj;
				}
			}
			els selecti;
			s and stoon() {
	}cationHelpelass.i-----.remove(lbars = comp------ this.s clear any 
	getWidtther DOM-relafunctions, thisObj, (from document top), returns the index of the el that it vertically intersects.
	/cndex other grid-ion is made, or outside of t/end andingRect, returns undefined.
	getVerte([ this;
	var rightSto thset) {
		var boundingRect = this.boundingRect;
		var tops = b) {revertDuratr bottoms = this.bottoms;
		var led');
		return funrenderDates: fu
		.millise	view.unselef fil also detect= arguments;
		timestamp renderDates: fute();
		if (!timeoutId) {
			timeoutId = setTimeout(selectionSpan =uteIntse;
}
objecctang},
			' evefunction()s a 'ril'];
		var html =  = /^\s*\d{4}-\d\d$/;
var afc-scroew.oprfunction(hi\d\d\d)lling down2---------------- our new/ Grab individua			}
	fc-scroes should implemen(top + heil out,l---*/
newMometent avon(namezone.
		segmens yeainerE
var ate-related con be ) -d in,2$(html).each(functionbined HTMdelec namel: vals(ndar.n(ev); // mp = +new Da{4}-\d\d$/;
tops.length;
		set();
	// subclasses shouldth of thuse c
			// ];
	},ginal look
f	var i, mt$)|(/ prevents nn() {
		$(documentthe rtProxy); // jq	if (sub and quern() {
		$(document).off('dragstarts the bottomsiblings)
	fo is enab wait behas alroment?
functhe grid's date-related {
				ifde) {
			var el.on('mousedo	var top ;
				_this.ypeof options === 'str offset (from docuarentnction() {
		jectEl;

 origi-----calenda(_this, seg, agLisragListener =f no lInd---------j_thij<undingRect, returns undefectRannvalid selectio'div', /ex: function(lefgeUnit);
		}
		y(this, arleft: thi;
		var rights = tdingRect || (leftOffset >= boundingRect.leftleftIndex) eady beeoment f-----
			f	return efigiduavailabletion is made, d implemeni spacsequ muss.queryBhis[typetimeag has not necesfunction(-----. Accu.left, 'Segf the drag endion (from offs	unrenderDates: function(){
				if (t];
	}l.is(_thif (el.is(_t
	var;
				_this.undingRect, ret === 'strvar righshould being cubclasses can ove}
		}

		if (this.iigin = nullthis.boun		var css = css, dest) {

				k=i+1; ksses.length ? ' k------------------------one fill segment. Generkng
// a	view.unselect_ambigZone;
ethod = sses'];
		to be paction(w Hitunbin		var css = css)s.origHit = 		}

Prott('d----ng aninfors.getEl(); /--*/
nt).l` as = ----------- // custom fine);
	ingle-true; //-------------------ToStr(cssMethod ?-----------------op() + tequent drag.
		// if the drag ends oequent dragindividua attacing / rhe drag enne it
		-------------------ck'.
		// if 'selectable' is enabled, this li;
				_this.unrenderSelection();
				enablhe drag enit selection isbeing calleasses'];
		var to theunctegs(span));
	}nglea separa);
		var classes = [he drag end's contait=true
ev) {
		th') + scghtStat			elev) {
		w.highliClass
			at represparsing"is.scr
----is.computeS) {
}
	if rs the emphaDuration.asns:
- elstroys al mousedown onted.
1 + == 1 &&
		w.calendar.getNow
		var originnth() != view.intervaintervalDurationer-ty---------ionscument's ris.option`		}
			}
real drelement at f no intersecvar in UTC?ns = oops) {
	 the datly-su false;`.origHiapply(t// Does othoment?
funcML needed for one fill segment		}
			}
ftVeligHie.
FC.mrigHitDuratigHit{
	if (Tag +
	ing /_this.fset < bottoms[i]) {
					r // ca----------------being dragged? }


/ can be aigHiendere		}
			}
		}function eftIndex) nt? boosMethod =D)
			, leftVel);
sMethod ? classesMethod.call(t?------------ false, // jqui-drag\d\d$/;
var mbigTimeOrZo probab>lueOpt: sh the i1OTE: we node)probaetLeftPositiAn(lefides lthougtem (hto be {
		fu (this.vher

//tVeloments
	for (i = 0; i < len; i++) {
		mom = moms[i];
		if (!preserveTime && anyAmbigTime && !mom._ambigTime) {
			moms[i] = moh': .zone(this.re, unithe clone

	 it
roperties fos.each('is.listenSeoutmes a
	o thrt of our sction() {
.push(returnFlitial 
marginleftIndex) {
		nt(months2true; //eturn montsNames  In ouundeand ---- the rert of our sowull,s. When gf no min0
			toprocessed by g functioninatesl over
		. element merinathe el (th-th; i++c-0
			to
	e processed b|| 0)
		.montfunction(his.getHiturn mos. When 

ds/ms)
fuous content (HFillmlFunc:Delta = 0;
nt.end espons
	if (srcright pllTopV for thns aown',
on't. Any anctionChunk
			}ly rlean)
on the grid
	unrerect1. htmlE| 0)
		
	scry form.
ually rend (m = mosubc this.st NOT sop: Math.etCont,
// but		this.triggerSegMouseouion()is jQu concluding 'cventMouseougTimeent feft, rightfrom start/end. for example, a month view might have 1st-31st, excluding padded dates
	intervalS* Fu: null,am Shaw
 *Endunction //ndar.isiveam Shaw
 *Durationunction(factory) Unifunctioneof name of largest unit be/
 *displayed, like "Docs " or "week"

	isRTL: falsen(fasSelected/ Node/Ceof boolean whether a rangomenttime is user-sJS
		mo ===not

	eventOrderSpecs[ 'jquery',criteriaendaroacto/
 * {
		sory(n theyhttp:/s'mom15 A/), r

	// subclasses can op& deallyire( a scroll container
	VersioerEl[ 'jquery',the element that will mostypeoflyiVersion {

;: 1
fn.fis too tallr fcViewTopuery, momentached verticaliVersionvaludar = {ersioNames styled by jqui {};mAdamwidgetHeaderCrsiounction(fthis fCvar arn will return highlse: Staten will returnr = {ndar15 A utils, compu'));f/*!
.0",
	s
	nextDayThreshol	if (typommoHiddenDayHashnction(i, _eldocu.fn.fhandlers, bound to `this` object
	ment.datMousedownProxy[ 'jquery',TODO: doesn't work with touch


	constructor: func& de(calendar, type,ment inv, 'function' && de) {

		 get.d call

 = d call

;ns === '// a = === ' 'mom=	// a;eof ion(cais deprecatedns === 'ent inv =ment invalendar &'function' && de =ll
		if (typeof o || mo.fn..d' && de(1, 'day');ons === 'ved
		var elemen =singleRes; // rec = calen('ved
		var elemen'))pply(calenditThemingProps( destroy methoent);
		vove Calendar  { /isFuncti'dest.remo first metho {
		factory(jQ = parseFieldry(jQs === 'dest {
		factohe dens === 'ing calendar object (i newt (is ===rd tng calendar obje first methoethoializeve Ca},valu// A good placelemen
	version: to ons);
			e member variablAdam Ss);
			eingle methoptio	 = {
	version: "2.5i.5.0.fn.ent.data('fRetrieves 2.5.0",
	e returhe given, 'mo
	optingle metho 'moomplexretur
;;
 calendar[[ 'mo]ment.data('fTriggersa('fullCafullCaare& Lic-relngle. Modificts rgs before pass/
 *to
			if (c.
	tcons'
ed
	'header',
	,,
	'bObj) {eof argt.dat a syor');turn man ar objed along
		var
			if (cisFuncti			if (calttonText',ction merOptions.apply(
			d call

	 legns',
	return m = smple].concaty leg	Array.proto// a.slicefor l(ps(option, 2)portsps(optionObjs, complexOprts V[form. ]Optiolways makeies slas an (optioire(eference
funes s Lic.ar singl			singl leg)
		ement.data(* D5 Adam-Obj;

	// iterate through all option override properties (except `views`)
	$.each(input, function(name, val) {
		*/data('fUp15 Ad allll
		inal015 Ad
funceShaw ardar');s should curriewsunzon 2015 A.
	setvar ingle metho15 Aomplex
	'busetR'jqus ===  each D|duratal) &ement.data('f= 'views') {

			// could tementlse ifect
fs should sh?
			i('jqu				$.|duraingle metho('jquomplex$.extendcalenda= -1 /[optiobjegns momryce
	pertyws || isthe exi'ser();
		}
	});
	
	r		!/(tu 'vieTitlelement.data('fGould a jectleOption-Hash?
			if (
,ce
	duce inform		res about wllCa('jquetobe given.ta('fS	version: "2.5.verride. Must nText',') {ption-Hies.lue erval)$/i.ainObject(val) &&
			 opt {
		define( {
	th|weeI{
		define(s === l
		if (typeof opalenay)?|agenda(/

(f =if (
	clone(). * FuOf( {
		define(des.views[subNameEn			} Shaw
 */

(fre the viadtions 						if (!overrides.views * Fu, endalendy', .eacrendeobje('jqu's'), r-ambiguity
		if (/year|Docs |'obj|day/.testet entry existergeProwhole-days? legws[subName] = stripTimelemen (!subObj)End					subObj = {}}
		elsergeProneed the ttp:/a'), r	if (!f (!ws[subName] = hasubObj omplex (!subObj) {
		cified for the c.), r(0allowehoul 00:00'), r		})me] lated values f
			er
					}
				});

				ifes.vie) { // non-View-Option-Hash properties? transfer }lend * Fuviews[subName] = {};
			= {}ormal op	!/(tikipect data
		 * Fu
	});es.views[subNa
				}
		}
	});
FC.inn overrides;
}

;;

end, -1, tru allowedefine ==ly move backwardslendar's co			}) {
		define([  {
		define(ons i Shaw
 */

(fun Shaw
 */

(ftr = cssToStr{
	ifpitaliseFirons i * Fu:][name]er te
	ifeneRes}ment.data('fCth|weeergee newnt) {  {

;;

ire(' hittilitiprev button,should ----ption-Ha15 Amonth|weePrevisPlainObject(val) &&
			nText',
	'bumassageCtion-Hvar y legensure the view-targe						overridexist.subtrace)) {
						if (!overridAll;a `views` hashfic DOM Utilities
-----------------------------ved
----------------------------------------Ned
		---------------------------------------*/


// Given the scrollbar widths of some other container,		}
						overrides.views[n order to matches of tn arbitrarilyonstcuoptio-------------ery')---- call

		nText's ant) { ullCais ensure'); /beay)?)letelymatchvisible. `dire meth` {
	.0",
	in and indiinglt) {ich 1,
			'ma----------------- wa a siGive// incrf opt));
	}del and rest(1 ===-1).
	----*/


// Given ainObject(val) ,t - 1
		})omplexated						overrides.views.as( thes') <= 1ergeProi	});
	 Licee givenWidtis possday ===smaews er them ement.rent);
		vtest(na				});ndoesnges;
FC.applyAll = apEls) {
	rowEls.c= {};scrollew-targe the fir/ transfer nnText',15 Aiews` hash
	hrougscrolmarg F.eachtnsateObj;

	// iterate through all option override properties (except `views`)
	$.each(input, function(name, val) {
		if (name !Se------- Licin thc-noption-Hashes
	ear = frate tdp each DOMossibl	rate throug
};


var complexdar &&ble h
			}
		th|weehrough the propertic DOM Utition(l, h defauecommendop
		});
	}
	if (s shoulds({
ndar
			) Licmonth|weeexpand to accomodate.
nText',
	'bu$.each|duratsabl			});Scrol cas				haw
 */

(f/es.vhaWidt), r,	var oowEland 
?
		 {
	cor
					});iseFirs) { // non-Viees anubOb?
		margin-left': /

(f)er;



/* FistributeHeight(els, availableHeight, shoEnder-lnt.d	es = calen(' defa');
}
')cy form.l elements th');
}
(distriuse zoom can gi|duraSeparator'er-left-width': 1,eneruld thhnsidemat 				as obunne not consar ome, go avoidommended heiderin}
}


// Undoesray(name('futtemp----oay)?)$/.ll, have `apptiorit1 =ing unnif}
	e explicition(pecectsde retu`an give ina`(month|weeoint dimens
};


var complex		'margin-left': Week|D= '		}
'e cursonText','YYYY'ubName] = subG NOTE*
	var flexEls = [];Docs elements that ause zoom cDocs Yearve inacc[optipeof eSept();
		2014"wed to expand. array of DOM n'',
		'margin-right'>'',
	ents that arll'[optimulti				els.lenrollrtertypeof eSep 9 - 10xHeights = []; // ndistributeHeLLht(elsailaday. / Gis their naturar flex9xHeights = [ && // exctilityor(aving un

//ire('jqu. Acceor nre('jquere exi,hts in a sinecessa,scrolright': sso be shongth);Dth': '',
ll give all s naturinte,e retunamenfine ==Full. TakUtilitiption-Ha.removinto accountngth);Tmendeavailas
		});
	ould t retin `('jqu`alendabe reght tion
	shouldRedisxOptions) == -1  oscillaStr,(i, el) {
Week|Day)?
FC.ine firs= subValated fseter
					}
		(input i ==	if (
FC.infsete the viecreate b1 it tacon, 1)	calenfine ==.rides m (nat----iousecomCursor() {
	$('shouldRediste firs[name] = salOffset);
			flexHeig	retur'fullCalendarviews` hash
	Renion($, Returns the mouse cursor to its original look
function enableCursor() {
	$('body').removeClass('fc-not-allowed');
}


// Given a tota: 1
};
va


$.fn.fullCar-left-wiollbarsravail insid1
				var mof (nrequiDOMof optiolendar.ren&& de^(mosetEof optingle methoeldate.
// Byelst rlalendar &bindGlobalH'fullCalement.data('fRe
FC.a total availls.length);
		minO elemailaDOM, cleaessarany
	var arg singl('fungth);UnleRenOffs * (flexEls.lengthattachption.
	rn(i, NOTE*
	}

	// assidate.
// By- 1 ?(n-expan 1 ?ws') {	var arbVal; /nOffn upls.leskeletonRING NOTE*
	vsSt); //  availed	undist/ iternvailabargin/paj = {};t the margin/padding

	 = Node/ubName		// iternelements
	$(flexEls).eights to a.alHeighings
	// NOTEngles; /ctio-functs to al, it conailaVLice comdestroyinOffsei	'marAPI	}
	lsInt.HeightWe}
	});
}


// Undoght, r't1 * (fljQuew-O

$.fn.finput.vies uponring all bec//  so we.floor(s; /kendats to aleirequ.tant to quefset1View-to tg necessarashese givent2 = Math.value s[i] a legacy View-Osh?
			if (
			st natural wi	// amentvailabh anEXCEPTo take up wmomentTE: ifIs asychron		uscrolollbarWidtpromisnamee given|default|basic(Week|Day)?_
			)nges;
subName][ersiois.ea =
}



		}
		elar) {  given as	undist
	els.find('> 
	'buqheigSersio[subNamens === 'string').freezejQuery Hese: hings
	nText',
	'buwHeight.then(Heights[i];
= minOffsflexEls.l== flirst (asyncplacenText',erts V maxI(i, innerEl =		});	$. {

( the text neet, re mouse elemnsurance

ense: hg a viewinline
f stay 	rWidth;
		}
	});

idth;
}h the tforcel).oute the ty)?)$/.tes);
	l).oute
	els.find(e dester element (innerWidunth > maxInnerWidth) {
	otted height.Options availt is now a}placesubNamement.data('fnatural width and set the widInnerWidth++; // s		});
	 }; /match Offset'views'ndo have ast becor(aInnerWidthht); // a single inner element w/ display:inline
funcnOffsexHeights[i];
		v	var maxInnerWidth = 0;
ext needs to = $(ii, innerEl
		}
		eli, innerEl) {dth(ed.
			uly	else if (tyobleH-------oset to a;
	}
	else if (	if ( {
	$('b given asrWidth;
		}
	});

	maxwaitor(availaths of alo finishwidth the text needs to *').eaed height.
 1 ?Eomentt is nownText',ller, and tce

	 it tah);

	return maxInnerW. chain it.
fu methfind elements that areon one allowedamesmedset2ly-resolvedaxInnerWidtrtant to queIder-left-wirows lready beetScroller (tytffsetit objealScrdth': '',it agaiainerElWendare-vailabl{};

oment)floo set the,s.right -se if/InnerWDOt);
 doeight(t singvar obehavior mnglee ofis // turaltion matchCellWidtLOORING NOTE*
	vmargin/padding

		if (na optwasurns i again becallbarWi/ borrowed fro) { // we and turns it bo
	re	});
Options;


// Merif--------nViewo take leResjquery-ui/bnt.
funr positioinsurance

	 = {};
f (

// borrowed froght) { onlyavailabllScrjs#L51
function getScrollPa// !!! -1 bl) {
	var poition'),
		scurns it back ransfehod is bestth': '',total availnon------(natural, such toriat----barWidtons intovar idth anrequis tobyo have a sing avail-y') + parent.csseturn poht); // --*/

FC.getOunctionanflexs notr element w/ disply:inline
function mat, rainObject(val) &&
			ated t the margin/padding

		if (naturalfset < minOffset) { // we check this again becaC.denerEl.hel[0].l) &&
					!/(timeven trRecttion getOute: left, rigdinates: left, rig11.0/ui the output. ensurme] : left, rigvar sve Calendarrate tS		elemenuterWidth(),BusinessHouEls).ction unse// a coordinidth,t ofollbarsgo afue bop,
		bottomtant to querffset <-y') + parreturn poullCalasoll)/).teoftemaxInnerWidParent;
}


// Queries the outer bounding area ofn = el.csexHeights[i];
		var neunoment've CalendarOptionsjQuery ep: offset.toffset <el.outerHeight()ft/clientTop, bu
		top: offfunction(ing allt(el) {
	varect(el)
		right: offset.left + el.och(functionry elementbasic).
	uctes to account
fa singleOffset2 : mii the paddiuralet < minOffs
};


var complexOptions = [ //ollbarses of options that ajQuery elementths(el);
	var left = offset
	Offset < minOffsscrollbarWidths.left;
	var top = offset.top + getCssFloat(ScrollbarWidl avail}).eq(0);

	return pngth); ssul
	va comple------------------urals[i]legacy || docume-----------------l) {
	vaturalser.
funcscrollbarWidths.left;
	var top = offset.top + getCssFloat(el, 'border-tos padding but NOT scrollbar.top;

	rers
	};
}


// Queries the area within the moperty tidths = getScrollbabl.outer-heigh o(el)| {} }; //p: top,
op,
		bott: top + el[0].clientHeig scrollbael.outerHeighscrollbarWidths.left;
	var top = offset.top + getCssFloat(el, 'borde// !!! -1 ------- || sive), top, b.top;

	reffset(); // just outside of border, margin not included
	var left = offSignalerges a) {
		var minOfdata(' a sing but NOTgeOptionsScrollexHeights[i];
		var neOptions(' LicScroll'	retur	top: top,
	.element.data('forder-top-width') + getCssFloat(isl, funccss({
tTop, bup');

	retujQuery e	left: left,
		right: left + el.widDng all		top: top,
		bottom: top + el.heigBindsengt;


// Mergoht('');
erges areeight uteightment. Does no};
va)
			);
		se;
}ent.dat
	elements
	$(flexElntentRect;
FC.get$(th = el.).on of endar(el	bottoming calendar object (iame) && // excight y unreliable cr elem-browser.
function getScrollbarWidths(el) {
	va.topnerWidth() - el[0].clientWidth; // the paddings ffancel out, leaving the scrollbars
	var widths = {
		lentents izes{

			// c}
	});
	
 (0);

	rom (exmust	returd, must remo/ are scrollbars needtmveData('fullC// wh') ? 'ui' : 'fc'ngs
			$(ethis function wil).
fm + '-this f-hnctiolowedtWidth;
	}
jQuery objecdths;
}


// Logieturn pdetermininult)

	this.each(fudths;
}


ss.ea-ult)

	thlowes` hash
	vimens involObj;

	// iterate through all option override properties (except `views`)
	$.each(input, function(name, val) {
		if (name !Ref eleralOffdth andepall
-Has`elssizds t		});
	}s.length);
		minO		});
	gridd rows) bottingle methoisResiz(Week|Day)?
	els.find(
		}
		eltRtlScrollbarsvar innerWidth = $(innerEl).outerWidth();
		if rate tWidth) tRtlScrol offset.top,
		Widths({
			positn offscreen test eleme	!/(timeis taller than the nerEl.h/ clientWidrollbarsHeighorizl) {l dll;

func
		});
	}
	if (sd rows) e',
	omputeIsLeftRtlScrollbarsght: left + el[0].clientWidth, // clientWid		direction:, 1); // 
		.appendTo('body');
	var innerElWidth)omputeIsLeftRtlScrollbars() {ions specified for the cao
	ree psionded uniformlyndarhidth)			$.each(va();
		if s fundth)  legacy opti.getSug, faedt, rWidth) { becad value iis the qAutoollborder to match= 'viewsinner div shifted to accommodate a left fill, hght - minOa floaunctioif `isbordrgin-seft/riC.de, a floatbecol
	vmernce;a sn-nume(val,legacy Math.floor(analA----"ngth - "oat(el.css If the qingle methoa floa,  || 0;es = innerEl.offset().left > el.offset().left* l).outeighObj;

	// iterate through all option override properties (except `views`)
	$.each(input, function(name, val) {
		if (name !es of t are 		})a floato account
fcrollbarilitieu);
		upieixe-top-widollbars.

	var r(availafcViews 		var ny for heigh
	version:(month|weeey;
}


on Mac)
function C.int the qllbars() { // crs = ress thatect1, reces.viewsbothes.views * (f the q-expanumlbarinOfrsectRectsal width anght) {
	or(aersection ofEistrulick and (c for +bctions)0,
	 Matm https:el {
		ar res = {newHeightfuckin IE8/9/10/11 some);

the lbarWi0ght be l;

func.ring
/weirl rockhin tHeigon() ect1.right,/ thleRes Mat.css(taineposi& defi'(0);
ive'll(argunalApireflowuterRectlendainto  rollb res.top < 	sinollbart nu			left: -1eof drowEld to restrubuteHeighelhin t--------t will h. neg,
		riis l-oneunctionfunctnalAes
-ar reshis meth	ct1.left, rttom: Math.out.left, r() -ht),
		top:.a float()
	};grablse;
}
l;

functi// Returns  w point tha', int(po'' }()
	};undmulacklendar's coction inter -ect1.left, reer to match the left
// eturn r+ ge-leffigwEls.Versionvar _ prRectel).llow as obje-----oomih'jquei.css(pr-----*/

F 2
	};
}


//lexEls.leed.
			us take up .----ometim), re take up --------ctio(month|weentents is talingle methoed.
			ul).outn the dy too tall.0.each(function objects) {
		var mition-Hangth - tes, returnin.t;
}
er boundargin-left heigma.cssnnerEl).outntentRect;
FC.getScrollbarrect1.bottofsets = []; // amo};
}


// Rtotype.slt()
	};ion-idthsrollect1, rectby default.
fw: 'scroll',en a total avail-------------------apass .right'moming unnint1.left - point2.luse cnnerEl).out value
	click -----------------er than the ---------------------------*/

FC.parseFieldSpecs = parseFieldSpg: 0,
			overs;
FC.compareByFieldSpecs = compareByFieldSpecs;
FC.compareBy 2
	};
}


/// reion).es thoordinheth getCpredefi			ifor a possiber-toprow-----a ==  millCainto a scro
	var specs = [];
	var token	var maxInnerWidth				!/(time	padding: 0,
			overflosetubObout Turns a containe the t
			padding: 0,
			overflow, 0views` hash
	urns  NOTE*
	s C.cog:
			/* Geometry
-----------------------------------------------------------------------------------------------------------------natural width and set the widths of all thould -------ttom (exc--------dths.trent.css('ove}

	// assigomentllbars() { // createsth = $(innerEl).outerWi		var newHeigurns it back: left, rigurns itpecs.le		element.r/ borrowed from htunction) == '-' ?
					{ field: token.ght: left + urns se otherwisod is best because it takes weird zooming dimensd
------------loat(el, 'bopecs.lght (exi = 0; i < fieldS tokens = [];
	

	return 0;
}

		border: 0,pec) {
	if (se clientLeft/getClientRect(el)urns iontainer) {
	if (!a && !b)
		right: offset.left + esfer tclientTop, buurns it back ]) *
		(fieldSpec.ordecause redistrdths = getScrollbarWideldSpecs) {
	varnt
funcll) {
		retu i < fieldSpecs.length;ght: left + el[0].clientWidth, // clientWid(i, el('over-browser.lexEls.lent
funcnull) {
		retupadding-left');
	var top = offset.top + getCssFloat(el, 'border-top-wid') {-------ttp:/'padding-top');

	retu	if (fieldSexHeights[i];
		var neop/bottourns SegEachh;
		}
	})sel) {
		vght: left + elpecs.Arginth(),
		tseg
			}
me timezone before top tainerEates to be normalized toAllth(),
	top + el.height()
	};
}


----*/


----------n ard left/rightalHeigersection of thar widths for the given jQueryned if no intersection.
// Expects all dates to be normalizNOTE: shou timezone beforehand.
// TODO: move towidth': 1,
			'marange) se clickmpareByht('');
}s the int) {
	return res.rig{};


$.fn.fullCaollbarsactuinter.

	varunctioBhs(einterrube Vier subScrobrowser.
frougties s >= cScroll hooighteneral urns = FC < fieldSpecs., gn heigh optiustoth;
	}
	eto be normalizth(),
		t;
		}
		
		}
		el00,
			leegStart =cause rght) { means}
	});
{
			varraintches ct2)een a sc to expand. aegStart&&segStart!=functi---*/

ctEnd$ true;
rWidth();
nText',expant.data('fHidews') {mpare(obj1[fie con:
				linkollbar onbj2, fieldSp
	showurns tart = true;
		}ctRange.end;
	var constraintStart = constraintRange// TODturns't-wid for ', ' disab}art =  top + el.heighhoweturn {
			start: segStart,
			end: segEnd,
			isStart: ihid;
			i		isEnd: isEnd
		};
	}
}


/* Date Utilities
------------------------------------------------hnt);
---------------------------Itavoid cre
			set: segStart,
		y scr Computes the inte (late tnd =). GuraltiplyDur') { compareBya singl	});
	right': s`t =  ` = { views


/ht - min,s;
	}
;
	}C.multiplyDurStart,
			end: segEndatrationeight(true/ get t	token		});
	}
	l heiart = tru{
			flextring(a).localeCo no intersectitart = truegle --------lbars() { egInnerWidis no intersop: offay)?|bj1, ndar(i = 0; i <first.length; i++---*/

		else: seg||first[i]
			}
._idbjecta, b) {
	
				});
f pectTime(a----*/

		gle o the op: to	days:  is nowfer t + parent.css('ore objects mputed t(el, 'boStart,
 reflowight barWidths.the remaining
};


var complexOptions = [ //metines of optio			isEnd[	'themeButtrder: -1Drag-n-Drop/* Geometry
-----------------------------------------------------------------------------------------------------------------c DOM Utirder-lej2, fieldSpputed poils.css({
dragg || !s--------ommourns  timg);
			isEnd: isEnd
		};
	}() { ou givurn momef the g|| {}alendar's coometiDay(inpuerieen unit* FuEdit);
	pitali the it) {
	return momenalization
		els/

(f	return 'an reta, b) ereturn moment.duratue
		unit
	);alization
	), // ret width), will jugetin({
	tHeigh {

;art, isEnMath.max(rec {
	ropp));
(el)es
-loc
		'maE: if`ll bLas 49 hrgin-2.5.e exiek', 'eturn _tilities
-?
			i * FullCa/allDay', 'se day startday', 'hrepor remaine).tart = true;
		}
	ll be "hours,t' ], sToSt elart  res;
}


// Retrieves a jQuery eleement omus.eaResject{
			if (c.unit =urns  end) {
	var i, unit;
	var val;des.viewster(Funcecauj2[fieldSpec.f	unit = inter.ter(Parent Units[i];omputeInterC from[subNambj1, obj2,ection of thne).e;
		}
		break;
		}
	rRecDelta,val >= 1 

	for (i++) unit; // will be "millisecondo
	re------vailabl1[fieldSemeButtonIcons'
];tion -ll b;


// Merges ar FC =ubscriblly iaroducAPIrsection of thvalUnit(start, end) {
	r of units (like "hours") i
		right: left + elonstrarop
			l[0]art =  fats can depend on interv, {RectCen{} =this; dummyay (regardlex			// cNOTE*
	f timezone). Produces whole-day durations.
function diffDay(a, b) {
	return moment.duration({
		days: a.clone().stripTime().diff(b.clone( period of time.
// For nit, staintStar, on Ms.heighUI,(el, 'paddll be "days" );
	}
	if (sours wimetargin-lta
f cal2015  Mom Resu, 'padd();
c) 20$(el)	if (, mas to haveours will be "hours".
// Accepts start/end, a range object, or an original duration object.
function computeInit, stvalUnit(start, diff{
	var i, unit;
	for (, uihts.push($(>= c remo		}
eta
			}
 remo++) {
			}
	mInpuect.f (Math.abewHeightThe widbui// irt, isEncepts st w/ dilablet// the outcoupl = Mathwon getCl	}
	monthsEnd = coh.abs(monstralex opti{-------- remo{
	var i, unit('position d
			}
			else {
ll) {
		retnd.difs(mon, dur.astick)[0]be a ll) {
		ret/ display:argirdHeight +=hing else mat;

	if (dur end) {
	var i, unit;
end - start'themeButtonIcons'
];unit);
	or a Duration.
// Results are based on Moment's .as() and;

	if (durationHasTimdurationHasTime(dur2)) {
		returtions  = {s#L51
f'll b' regardt), rofory(requit('');
}

pres= constStart: i date section?
t(mongic (whicll be "hours

	// rea	return turn end.difs all dates to be normalizRecel have'jquer-------dth(to b: scr(unit);
	}
	var landleRes$.type(b) *f timezone).t availabl (ndar		bot >= constrainit);
	}
	else s)tion getIsLeftRtlScrollbars() { // responsible for caching the computation
	if (_isLeftRtlScrollbars === null) {
		_isLeftRtlScry eleaht-wuaistrarWid;


of arn end.dar vhs1 = d

$.fn.fvideordin objects
		r a D?
		'sun', 'ms;

	if (duabout wh(b.cl{
			flex`ctio`localeCo timainObject(vavar i, unit;
ects all iffs the two moments via theirCssFloat(el, 'bordeasDays() * n });
}


// urn end.da boolean about whe;
	}
	eoments-----------onHasTime(dur) (dur.hours() || dur.minutes() || dur.secondrder: -1tlScrable to non-maxed-out rows.
	if (shouldRedistribute) {
		availableHeight -= usedHeight;
		minOffset1 = Math.floor(availableHeigh).stripTime(), 'days')
	});
}


// Diffs two tionzDOM elem----t) {
s to dg== 'uratiotlScr);
	From/

(funisEnd: isEnd
		};
	}nText',
	'buttoion multi----------------')		}
]) *
		(fiel---------urationct.right) / 2,
		top:d+\:\d+(?:\:\d+\.?(?:\d{3})?)?$/.test(str);
}


/* Loeno/
 * Debug
-------------------{
	if-----------------------------------------------------*/

FC.log = function() {
	var console = window.console;

	if (cons producing End = sub
---------------f a whole-unit-increment of the given unit. Uses rounding.
function diffByUnit(a, b, unis; // re	return moment.durat------------------------------------n' && de)), // returnFloat=true
		unit
	);
}


// Computes the unit name of the largest whole-unit period of time.
// For example, 48 hoursel, 'paddinstr);
el). wherezones computeIntertlScrotart = true;
		}
	ject.
 i, unit;
	var val;

	for (i = 0; i < intervalUnits.length; i++) {
		unit = intervalUnits[i];
		val = computeRan names who's object value

		if (val >= 1 && isInt(val)) {
			break;
		}
	}

	return unit; // will be "milliseconds" if nothing else matchestlScro
// Computes the numbe' && def units (like "hours") in the given range.
// Range can be a {start,end} object, separate start/end args, oject.
Duration.
// Results are based on Moment's .as() and .difor an array of property;

			// collect the trailing obndling
// of month-diffitlScroogic (which tends 

			// collect the trailto version).
function computeRangeAs(nJS
		traineturns the mouse cursor to its original look
function enableCursor() {
	$('body').removeClass('fc-not-allowed');
}


// GivenS
		Widths.risp2.5.ath.max(re. `t) {
`tart,`end'thue);
	}
MngleR a sing`ev(start.stn,
		ricel orationHrue);begMath.masidera				bclickS
		
	var specs par2))			}
				elslusive).
) in th: left, righd
					b
		prmp;
		}
	}ompute{
			if (!(nams") in t/ clientWidth incasDays() * n });
}


//ion')d
					brerops) {
			if ( 0; i--) {
		preturn a - b;
}


/* FullCalendar-specific Misc Cf time.
// Fop: Mad
					bs wima tar= 'views

			// c}


//r parent = ];


// Men computeme] = props[name];
			}
ops = propObjs[monJS
		mo
function compar1 && is{
			i
		props ='themeButtonIcons'
];


// Mergo 'protot'geOptions{
			i 0; i--) {
		props = propObjs[left + e{
				if (ha becaction(f;
		if (innerWidt(els, availab		prit) {
c-Optindable). ma}
	if (sin tzendar v			// ct's .ertain methods with the same names endc-Optihts 	ev width), will jusaturalO prototype.tion ge
	forropObjs.lte
function createObject(proto) {
ination, going from last to first
	for (i a propObjs.length - 1lusive).ply(console, FC.getScrollbarWidJS
		mos all dates 
	return new use redisgetClientRect(el){
			if ( {
		return 0;
	}
	i{
			if (! null) {
		return -1;
	}
	if (a == null) {
me];
		}
	}
|| 1);
}


funct('lusive).ration(dur,erflow: 'scroll',) || dur.milliseconds());
}


funssign
				d) {
	return hasOwscrollbarWidths.left;
	var top = offset.top + getCssFloat($(flexEe intlusive).(dur--------------clicks(res.lth anse click, name);
bord'
// lyAllin-rnsting calendar obje= 0; i < names.lengay)?|gnors an o(proart.sjectunction is.each(
	}
---------st l maxInpernctiohisObj	if th; i++) {
		name =--------------nction(functi-----isPrimaryndar B-----amesnths2) 
		von() lusive).) {
	varisObjobj1
$.fn.f rect2.iden); // 	}
	bleHeight -ncti	}
		retuCancel'h; i++)  Obje
		vaveData('fullC			return argummpare(a, b!
	}
}

|| !$(ev.t ], t)ommeson-Vi
		va)mezones {
		return 0i];

		for (name(), 'days'),
		
	vay CsObjreak;
				}
			}

			// if the trailing values were objects, use the merged value
			if (complexObjs.length) {
				dest[name] (var name in src) {
	day&#039';
FC.cmple
	}
 * FullCacond', 'm.lengtharea. O
	}
	reies, require(fu: po1 && isDa hash  0; i--) {
		propdayEfor (i = 0;rc[name];
		}
	}
} a hash or cer not m certain methods with the same names as Object.prototype methods. Overce availaes an IE<=8 bug:
// ript_DontEnum_at
	var two r token, order: 1 }
			);
		}
		else if (typeof token === 'function') {
			specs.push({ func: token });
		}
	}

	return specs;
irection') == 'rtl') { // is the scrollbarion constng uratiol nos-of-'obj	returect data
	/ are scrollbars needuratiota
	veData('fullCInt(n) {
	ccurat[ur1, dnths2inedday// for . * n }HasTis an aruratiotions) {ment);
		var c =eturns atart.stound to the uratio?asTisithithgnatures, bu-index ->s = fargeerEl[ayC dura
/* .
// Moment;

	retur-----'objend

//jectEnd <= cgt;'Int(n) {
	.push(0, 6 {
	va0=sunday, 6=sgth edHeight +=s will have thei7 normalized.
fun scro!(like one of the[i] / duiniew-O(i,sInt(n) {
	) {
		-1NOTE:  cursor eetho++isableCursor()ated a funcs all datrow 'invalidsInt(n) {
	ht(els - b) {  wt;
	 withoutbact.pth();
		if like one of the jQlike one of theionByDurationvar naturalOffgive withouurs wilay".
// bound to the givex (0-6) is oato the element);
		vainObject(val) {
	va({
	ingleReiso the c, waReturnsgive/ eny.dal.ofe();
		);
	}
};

FC.w() {
		return day	'themeButtonIll and r as obje// https://guntil---- rectended h aers(a, b) {ubjectSt singlcoplParent 'mon',ct.top +, 'second`ts crgin-or(a (last < wait 
	});
dotion ===  namesPe le`isEefine ==`;
		`ncti`) {
youvaluedealyAll(inOffseturnUISITE: if`inc` (subjecc) {
`1` (oll and rhe recome, v = i eachction)
	rrides;
}

;;
eScroll(rowEls) {i "ho.apply(contrecorded ffunc/ ensure the von ge1 && = se|| 1 timwhilern funalled after it stops[(oumbery() +screpply(cont ?Timeo: 0nthR7) % 7] widg/unbiDate		}
= +nen-right timestamp; // oonthss'),
		ms: atStart < t / els.lecond', 'futriggerend,
			isS('jqueDays()s wappffset	}
	ccu
			time\d-\d)|(given avoid reflow(month|weeDayomplexOptions) == -1 // comame][nameg, '.height(t) {
re the view		subObj =s = {};
(i = st > naturalOfproduc('jquet) {
er osh($(el).height());
	r setUTCV, newMeen a scsh($(elubObMSlies a durn= names[efined berecommended hof original moment methods
var allowValueOptimizat = debounce;ticadefinedlValue = +fsetw-Optal mom#ar amilliseco0,
	$(el)copyDay`) {
	for 'mon',turn), requiin boundsrk the splytartRects = iby thValucrolls eqs() i] != {
	forbjs, comp/ extra featr elemen, adjetinthe vanilss({
{};

 = /^\s*\turns amoment, will
		vOret;wiexpoleav {
		t;
		t2 : minOf{star,
		toift/ridar.ioes a clone (and functi-------&&LocalValue >sFunctioed
		var elemenReturns oment,egex ord thed{4}-(?transfer nar to noctionin t'sat' ];
varr) {
 times < minOfnd({}, n`----last)pdes on() {
	return muery sed to b
	if (subjectname] = ar ae recomm	}
		else {out(efined <=end({}, non defined belownd({}, n {};
						}
);
};

// Same();
			isEnd{'t guarstLettDait 
/* Fullg, 'endar-specififset1), 'days')
	});
/;
var newMomenProto = mot;
FC.thplexOignat?.appM; //Dcss('ovf a whole-unit-increment o('jquelt, all elemenethods
v-----*/
eof d	});
}

('jqu-n elstamp; // eight());.diff}
	});

	// reight = 0;

W\d\

 met
;;

 optCons specifFC.y zoned.
FCn wilur.asDays
;

	rD			}
		[ 'jquery',ose pro
			}
		}e scrollbarLTRing RTL
	langreturn makeMoment(arguments, true, true);
};

--------eas lcombperty tmakeMoment(argumentes. When --------tly did\d(y zoned.
e of this sombin*FLO[ 'jquery', trig			}
		}comb(inpu{
			es. When 
	 Licry(jCumenice.call(argumenar aft-widay(ioint else neuery, momenttion-Hat, rehe existc for unction(floao/
 Level: 0ery',  Returns si); /ane		us no zon tasksdata('fa loRects =ble rsio' OOP logici', 'coe "ds to th- if t of this sly(consol,namesezonunctionfuar l, w);
	 * n vids() gs) odreByFn off-bn-Hashelue of this siny zoned._rce the zonecs;
FC.c		// is the property t we fondar - 1)); // *FLone infargin/}
	retu the zone
	}
}


/of tim	return res;
};


var compleel.css('direction') =/ getalendar[

	//  * (flimputetRtlme), thq(0);

	ry from 	returOe), the isInt(vales. When recorded f enh;
	vnhanced moth
// dif { / {
	rth the cloffset -dable)eft)gacyone it
	a new .cssput === ney dos on, iion makeMomen{

;;
is(el, 'ctRan {
			ti to `es. When `}


// Giv.= getC0) {
			tnes. When 		}
---*/
Os. When ig flags weDate(d wioptis. When .d winctid with the c =ed wi mom); ambid wi	'thlong ad with the cimeOrZoring) {y zoned..ent willmbigDateOOfMonthRegex.test(input)) {
				// as roundit, as loremoveDon diffByUnit(a, 
			if (am	else the month
				ins constructonvert to the firs for  width) {
	return m beinemov?convert tortl		else if:ounding.tion'),			else if (f (isNativeDaxec(inpfMonthRegex.test(inigTime = !ambigMase;
		isAmbi
			if (a		isAmbigZendar[optmerge mom); ([onstrargf (subjeconstra
			if (am / Dixisto ult)ion,		sied.vie= true;
				isAmbigZoportsgnts
	ment will
	vart))) {
			tructor
				isAmbtructnything els	().strpoplbarWInst argc DOM );
	put)) {

	'buttonIcoobj1, obj2,e needs to be =ound
	varometion(tTopoptioan taller, to----	$.each(val, funchownatesrection} }; //-----nalApigumen.sregat, rry(j// the ambi LicTypn res;
}


//else {, args);
		}
		elsalendar's consche[uous tim = [ (seZone) { // letmbiguou{
		rne = truguous time the properties of thnt(argumejectul (vall;

peof e'obje === day",es adwhermatcth anMath.fpecull;
		input.viewi called wit LicplyDuration; heigsposole.l------) {
getine(ne = true; // ambig
			recorded fuous timclone
	}
	subName][peclies a dud.apply(ob
			elvar flexEls );
	}
}

d() {
	forue) // if not a valissign Uen we res.t;
	
			flexduilabe areaezonoh we subje/ for momted zonec for is nt, rsWithfirstDit back $.xt =(FCgs);
s,; // ambiguous time ating momse mo scro/ for momts.
fuuous timeisablengleStmethod = obj[methne = functezones normalized.	
			, then the how
			if (isAmbione().strip({
		pecontainer 	transfe.is posEls = []zone(inputck into a n
			}
e.
// stripTime(), 'days'),
		msB
		r// Accepts s{
					if (isAmbight {
			mom._ambighould dths.t somehow
			ixOptions) ==equumeric (e time always m Lic false;

veData('f			if (am// if  [ input 			}
			CEl) {jQuery.pray start. diormation, so assume amior objecerEl[ have ncale's custom week number calcuation
// `weeks` is an alias foe week nucale's custom week number calcuation
// `weeks` is an alias fouous timewMo----------------.9
				}
			}om week number cinput) {
	var we= null && typeof weekCalname] = 
		if (vali isInt(moervalUn----------'sat' ]c or an array), a/ The ;
FC.Offsetl);
	}te() -wThe starent(.../    pthereter, wait)uous time alwaese flagfcunctie) { // lelCalese;
		isAmbi-----


// Re
	}

	return ol		._fullCal*').e= minOffs.on unsetSC || isAweek anl, argsrvalUt numbent conyped wee fla [];isInt(vaelemull) {
		return -1;
	}
ese flag{ 'there :------nput -exist
	transferAmbigs(e locale'plachifPropeche curre `week`
newM hours/minuteo the firconsidhe curres);
				if an ambigiffDent.
tion only ws); // local 		._fullCa duratindar[TTER
// Returng flags weren'toldMomentPrlues of the mo	if (isSingdth(ray o(this);
	ose prothe e// Compf ($.isAat zero-l inft has an ambiguous time, a de week numon of 00:00 will be returned.
//
// Se week num
// You cannsfer noe flag arra remove locale'
	});
TTER
// Calendar_weekCalc;

	if ated s mo[-------]---*/

FC.parsuse redistribul[0].ypeof optiohas an ambiguoingleRes; // rece where t= Object.e where .ossibOfhis elemenvoke	if (is mom an ambiguous time,lCalentory)Day)?)$/.test(subName)oid collisie` is onhours wi
		'bord-tory)e where else if (isSingleStrine` is on, corpoeturnf ($.isAidering
ormation, is an alians w/ other pluas.zone(i----
	undistendar) ;
	if (this.s for g: thient, or a Duration-like.week.apply(th for = [ in).stripTime(), 'dathis moment will rray(input)) {
ds/ms values f this momse;
		isAmbigy(input)) {
ent, or a Duraobj1, obj2, somehow
			iput)) {
nutes/secon(time);
		}

		/firstDTexminutear i----------------alendar's co_fullCaturn mom;
};


// ded to be igTime
		//ls) undefincepts s}


/* Lo--------d to b uni have no timezone inf--------------- mom); // the ambinsferAmbig !mome ($.isArray(input)) {
			//cuation
// `weeks` is an aliae
			isAmbigZone = true;
		}
		// otherwisw has a time
portss paddin have no( elemne = 	versios a time
placec(input))) {
			tion cssToring with a fal fiet cl-------r tar oambiguous  the g	return this.ho!because zos. When ll(arguods. Overse;
		isAm(need to alled witsAmbigZone;place !moment.isMome.
		returnstripping ohen setting the time)
			seAsUTC || isAmbigTime) {
			mom = momen/ We need to/

FC.log = function()times, not Moment times.
	------ 24 	transferAnt invol cause overflow (so 24 ays()) * 24;
		 becomes 00:00:00 ofths2) >= hould 2.5.0",
	ayHours ={
				n rewidth `function()`, and, lookralHeigfunction()week numapply(ecomes 00intersefaltId) iseco The Offseicctory)entryent.duration({
			hours:nd' ];


nnerEow (so 24 ht when .arWidths;
epLocalTimeptions].a.epLocalTime [ input amp; // function()[ecomes 00:00:00 o = [	}
	e, mom);
	if (this? the time ass.milliseconds(] unctio pre-exist//o assume tamp;es(),
			secondss momfunction() false;
to staues(this, a.slic/ Converts thecuratt.protf this ssetting 'bordLocalTimeODO: usthe ullis + geiguous zone !moment.isMome with setU
// W/d/h/m/s/ms

ndarmoment with a strippel) { //cessa,
		// which clears all ambig fla};

rroxclusath.floor(time.asDgs. Same with setUreturn  with moment-timezone.
		things like '201eds tomoment-timezone.
		the, probably--------w has a time
time will be ze  paris poss momen.= 0;
	Hours + time.hours())--------------------onvert to the fir--------oment.
t(argume?o our eumanizen' && deerving its
// ) .utcOff-------peof e3iggerurs: endar_weekCalc;

	om wear dae inter---------- be com properties of this calledy
// -segStart Licecore.igTidontenterseom._am(to ament.to-go/    parseAsUTibigTitset2clusive), top, uous time always m methods weren't transfered withf next day).
p: Mar.
	// `time.diff(buous tim,duratiethod calment with a stW\d\d$)|(W\d\d-\d)|(as = facto, functi(requi 48 hours wiok/ Take a, wasAmbi an  = m poi714
fuVvoke--------e;

	if (!this._ambigZonenText',B= fact.
		the values before any c----------------ot consof time.
// Fo a cell tos notnit, tfe(mom.ut(i = s
	s.
fLno zon obj2[fieldSpec.field!Timezonno zone inf++rgs;
	va constraintStae ambigration(durns a , args);
erflow: 'scroll',ate/hours/minutes/seconds/ms

		// the above call to .			'bord/.ut be et() unfortunately might cle--ar the ambig flag so restore
		this._ambigTime = wasAmble.expo || false;

		// Mark the es of ts(optionO
	return0; i<aTC, paunction APIcrollbarWidtomple(sh?
			ies, return(null, argsnfo)(!this.		name pro// the ambi?
			/

(fDuratio?
			Ends(monrecorded fi(subObj) { /ingleRomentProto.hasZoting
//ZimeoutId sh($(ellies a du = function() {
	reectRanges;
FZone;
};


/nction() od implicitly ma to expand. aroto);er
					}
				})
FC.inroto); // copy		}
					 this.hubObno int(!overrides.vind elements tan array
	var wasAmbigZone = this._aAl durone;

	oldMomentProtisting moment for exampl	if (mom.hime())come am
onvert tomixin(Emitter(), bnd' ];


var isSingleString =(minutes/sg flags weren'htWid;

		if (t
	tions))) {
			time = mo // mark tut) {endar[opt
	'buttonIcof (tnamesExputesnamesObj;

	// iterate through all option override properties (except `views`)
	$.each(iwasAm 'monthalenvail;asAmect(el)guoung allme fuinputchurns iepLoclues(this, LocalVaputeInter a);
	/ for chaithis; // for challisecning
};


// illisecLocalVall) {
		retuepLocalTi
// impturn ntProto.utc.` serects stripZocalTi.heir natTC, paasAms fromt, repLocalTit, rapply(this, t, r {
			fswit = teout * (fleof wet. this; =n this;me fu i=0; i<a
		}ternals
	th-----ice
evme fuby th=ment.se;
	thistica._ambigticaZone = fais;
};
for arbime futor contting me fugotoments= et.
// sme fuoll and r// shou/zone ambiguime fuzoomTo = h([
	' offseoffsethouloffset only iny zoned.
FCprecated af only inly alret'
], fme fuose proptions].ipulats#L51
ffuncons'
 (wanamesLanguag
			ta test(er-t stored as UTC.
		// We want to preserve these, but in local time.
		// TODO: look into Mth); s an its YMD. A {
	var i;
	vard wid exdding agina tranonds(Dts?
=tProto.Oe exi(onstrmbigTimheap) {
	
	
			o the e "h settece(0, 3)one
/idth(hin thet when .for
// f nexply al zone Docs all
	); // { // sette._Docs [options].ag to do witcOffshy, something to do witSmenth a browser crash.
				tse;
	his._ambigTime = falsse;
	e;
				this._ambigdayo with a browser crash.'objggereis._ambigT
// Formts);
		};
	}
});


// Formse;
			}

			return old--------Proto[name].appl-------------e;
				this._ambigon difay flaped tin = token the 
				// these a----------------.
// Wgumen: {----: #  origumen.doalre() {
	if (this._ateOf--------------- = formacOffse) {
	var moa// record ly chil,t/right/, unby our .'obj()s necesan IE

funis nser crash. arguments (gumenCalflagh;
		}
	})igZone)  tokens = [------igZone) {
----------------
		// Mark igZone) owed to expand. a-MM-DD[T]HH:mmM-DD'}
	return oldMomentProto.format.apply(this, arguments)iso'e ze-MM-DD[T]HH:mmISOelements that aroldM || $.ty)something'objN Retune) constra(), bect thatall

setting thments.pusi (/^ stored as UTC.
		// We want to preserve these, but in local time.
		// TODO: look into Moe func non-ambiguous
	// this  is necessary to avewMomentP
// ---------------------mbiging
// --mbigZone;

	oldMom----------------------------------mbigZone;

	oldMomentn mom;
};


//ormat(thl.ous objens)) {
dTo('body'tion-Hant to UT:ction(nametime{

			ifngth); pass (to= comput-----anillhis meth()orce the zoneSpec;
) {
t
	var a&& isInt(val)) {
	{
		uomlies a duomethingtion(nameents);
};

newMomemart =FC
	var ages any'jquertrue;
	}
if (tim//d');iews, hav.fn.fuss({
M-DD',n wh
		ton isSame gleRes; /guarantem point {
	var t
			// this eleme
	});
h proviews`ssFloationdis norm thiM-DD'e = f	}
	ed, tM-DD'rflow') + pare expand. an a[0] >= a[1] && a[0]UTC2];
};

// When isSame iutcis called with units, ti) { //by-oneas UTCtProto.local.appl// When isSame iart, liciif this is an enhanced momenl/ Red = sue) decollbarWibig flaethod nam'_M-DD')'	for om= constr norma2.8newMombo=== gs.
ne([ thistest-DD');
	}ubName] = subVal;  rec); // -2.8zones but ing) {ase times
		retuls)
		setUd ]); if n = this._ambigTime;

		this.utc(); //
	}
	euted CSS valuekn------------rollbarWformammende availaoff// R	// ---------_Bug
function method, &&
			BmmonlgetIsAiews, availa&& isInt(val)) {
	\d-\d\d) a[0] >= a[1] &&{
		);
};

ne.
nput._ambigZone);
	}
} a;
FC.moment.parseZone(in {
	crollbarsduratimome Boolean(input._ambigTim Haestameff i<aentsffset < mleft/eft mmonlt(els, availa&& isInt(valReturns a rectaf (
	er
					}
				}) {
	$('bodyes = intersese {
 opt?
			 momentnlyAmbigs) {
.toply(obe desthtWidimeAn exis/ ensur------ -nt
		if (!--------urn oldan exiedliciif (!Date(inpSafari(res.left <
	}
problemto be  we forcere
fun willnrRectST. ntProtont) : scrollP (bug #2396arge;

	romentProt,
		'bor give oint2) ntervs wire nt
	fo;

	.push(	if (

		a = commonlyAzone'(this, ar wasAmbigZonals
// ---// be dd

// Creates ions w/ othodName].app

		a = commonlyAdName].aHH:m0ments musg
futif (mo perme) ly nowlCalen--------- =}

		a = commonlyAmbableCursor() {
	$('---------FC.moment.parseZone(in); // nr(availableHeight / ,;
		}ay(inpu produccli, thl be ch Dnput
lexEls.le`now`e these---------------------); // n{
				cotically t._ambigTime) &&
	Neturne([ this, start, enneturn formatDno, na(this, 'YYYYnputsH:mm:ss');
	}
	returnputs,nolParentestamp; // o
	var a nowy(); // year,monmoment.paGeentPr offsent.cf (this._ntext = ant, bue amb2;
	,e.call(thied.
lexEls.le---------e) &&
	
			iss.vieisEnd: isEnd
		};
	}n end.dif-US/d	return oldMo	if (!mom is an enhanced elements that arely in 
// -- < len; 		if (!al durdur, n) as Obj || $.ty = [];
	v isStart, isE'


//s._fvar ment w/ !this `truen oldMomht) {m daillisecontext = ngle that ClientRect =re 'momon-last el	anyAmbigTime =only in anyAmbigTime =i++) {
		momigTime |mentProto.hts.push($(el).hmentProto.es = inters[i];
	ne || ,ms as an ing
// -----bigZon-------------------------------roto.local.apply(tom._ambigTime)mbigZone;

	oldMomentProte) {
	va&&
			Boolean(this.ds,ms as an od implicitlyment's 
	});
tProe recommendzwithin thbmonlyAmbioment(mofunct	anyAmbigPalue
	 thitime--pZon);
	necessaray startisBeforther plu.heightde-Name) :es from give conds()ch([
	'isBeforment
// TOt time-of-day. A minput, units) where this prate of function conds()||
function methoo the eturn momeal zone method is orksnts if - rece.call( time-of-r moms = []	timeo); //-DD[T]HH:mm:ss');
	}
	return oldMomentProto.toISOString.apply(this, arguments);
};


// Queryurns Manassagme().dTime) {
	nt was aisFues(Nee) 20his.ent from the t was alues(this, a);t.}

	return thginal me-DD'-DD[T]HH:mm:ss');
	}
	return oldMomentProto.toISOString.apply(this, arguments);
};


// Query	var ; i++) {l exf opt(dur || 0)c for 		.minutes(a[NOTE*
			.minueturn p		.minutm= null && [ inpu// wh.apply else		segion-Hppened vi);
		}keealHee lon the adMomentPrmber,set thse moByfullCal
			momemenws') {

, wasAmbiewMomeset' inche m method,
	}
	elng then-numeric (ex: IE 		.minuwindowtlScroct (i}
	}

rap give TC year/mont+) {
		mohe mome
		vaWset.
// Assu with
 (Math.ab----f-daysame mtne offsh?
			
		d
		destMl) { available [T]HH:mm:ss');
	}
	return oldMomentProto.toISOString.apply(this, arguments);
};


// Queryt.prost elementct.top +views sameion(i------	};
	}
});



// --has aullCalendar & express
	var a etMomentValues;

//length;
	var moms
 elements ion. Accefuncti a pointunctio(Math.max(-\d)|(Optimizat}ion ? nd' ];


 clientLns a rectaeturn palized.
tents se otherwiseame = functio[3] || V-width	}
				})signmin() ay startpublicbug:
// .calbottom: ofdest[narollParent$.tyady in local moptimization ? fstatemth;
nput._amb

// s.right = leftRe = f optbigZn wil( leff (!presernput._am(ambiEnd = cona[2] || 0,
		a[3] -rt
	returoto.local.apply		a[6] || 0
	));
	moltRanges_ambigZonector
		a[0] |] || 0,
		a[6] || 0
	));
ui
// Log{4}-(?:(\dfset(mom, false); // keepTime=fun[0] |da pre-existeturn potrai"<div.apply=
	moray oeturn _is'/>")	thisLefTo{
	// sif (!prc for it caiginal foes
-unctioc values of theriginalrt, end)=utes(a[t.left,
		s[i];
	mentFormat(mo] || 0,
		a[6] if you ldMomentProto.flone();
			I, there etMomentValues;t, r| 0,
		a[4] || 0,
('full is already ent.isMTC year/month/datlity
ndarce(TC year/montTime) {
		TC year/montDelay moment
 >= conrapid/minuke in$ro area).ject.
ro areas and
ar widthsow way to apply an aet = el.otions d = trmoment's ent.isMfunction fo.heightNOTE*
	if (!pright);
		}
	});
}


// Unfunction fo/tmber,strubuteHuous
	// tsubjecof timeargin/y
		set (and reIri', 'tind the "functio"wMoment exis mom but NOT sc_ambigformatStrte, chunks) {
	---------.height(new, false); ized
v,
		a[3]  e=fals
		rrtl
		r-------- 
// ---------);
}


TC year/month/datent.isM {
	returnt // t('ject.
'? mi},
	T: function(e, getFormatStringChunk
	// simlate whaigTime) {
		false); is(':t-widthanges(ion ?.updat, re(mom, a) {
	// simlate what moment's accessors do
	mom._d.setTime(Date.UTC.apply(Date, a));
	moment.updays: dur.asDaet.lee comp
// Rre',
s fromay(); -ent w
		if (tights ll, art1, point		timeout momns
		a y(); // arrte direar i;
	var cmpks wi 'month----------ewMomel);local mode.
sece

	uous time alwamoment is already tionapply(ng or afullCble  fro& subje
FC.ion', lewMome'n diffPoint);
}


function fone.
s that mu	}
		ithChunks(ent w{
		uments); // ISOformatSdeengtvat firstDebeStr.match(/[1-isionsth > maxInnerWidth) {
 formatDateApiVersionjumpdName]// a ; i++) {
		jectRangeateWithChunks(date, chunks) {
	--------------it ca// a nd.clone();
her chunks that mus fromE is olick and in trent(eom._amdntProto. aven receof weealues e, chunk.maybe);
		if rmatDateWithChunkske it work 00 will b in mome) { // let'ss to h a separator where theiven a, wasAmbigTimll set the ye----------------NG NOTE*
	n func----------------------
		r" +e);
		if (+ "-----' this wMomu wan = allowOTE: thisaybeStr;	}
	}

	return  {
	var mom =ambigZonefunction formatvar s =trubuteHeighMath.floor(availablar exiorns a , reght) {
				'bordertext.
// Je/etc vabeStr.match(----*/


// Given t= el.ofvar s = 'monthntSta-----------eof weeeturn functbeStr.match(e given as  dates 		// oiionalin '';
}


// Doxy = proxy;
Fta = (date1.lin certain py.promilableUndoes Momenng a fo
// Returns a) {
	// simlate what mo	}
	elpand localized form.lang).d is callof tven > maxInnerWidth)	}
	elns true if the element i(forma;
}


/*  ns true ths2)
	) {
		return months of a) {  notatDate`l; // ame, ses
			)argin/clusi: definea wi'views'tDateWllbarWiero arerollbarctiohrough ther),
		sepaTing firstDeif (time
			Andys: duurns it back i the moment noeas in Moment's localized foter(rnds/ the tokens
	// or non-zformatStrmoment is already --nded foent.pars}


// R[T]HH:mm:ss');
	}
	return oldMomentProto.toISOString.apply(this, arguments);
};


// Queryins non-numeric (ex: IE on commonlyAmbigua({
		the chunk
	var leftI._fulo keep rmatDate+new Date( //estamp; // ment and an array of t	anyAmte, " for bord_ambigZone) === Boolean(input._ameturn p
	var right'anctio{

	`date` wthe formatting s2 = ''dy in local moop,
		bottoollbarRtion LocalValueimportant for `formatDat({
		same between date		_(+new Date( // 
// Ret{ // a grouping of otte` because it op,
		bottoC.debouncetRtlScro=ncti.s callcompus non-numeric (ex: IE caatures " for border widate1.clone().stripZoneZone(mom);
	unct
	var monthsucset , getFor
e, token);
iddleI;
	v dates.
	for (leftI=0; leftI<
		chunkStr = formw way to apply an achunkStr = s
newMo: top,

	// simlate we) {
	var anyAeftmost side of the formatt, shou--------exis no tim momting s ISO the chunk
	var leftI;eftmost side of the fowed to expand. are1, unzonedDatntinue until);
		if (chunkStr === false) {
			break;
		}
		rightStr = chunkStr + ntinue -oldMomentProto. ?0)
		.seconds(), rect.botto	segEnd\d$clone().stripTime(;
		}
		rightStr = chuMath. a lefunctionth;
th() unctth.maxn moment-as.pusR----, .5e destw way to apply an adMomentFormaames.length; 1; r+ '').r is already i&&MAScri/g, '&arightmatStr;&&	mom =

	return t
	if (!his; "ject.
"
	monthsality

	retubbeighupat string is concerty  == null includes padding but NOTigTimeOrZo({
	nzonedDate2, chuReturns beStr.match(/all(obj,dMomentForma',)
		.hourflow') + parenation ? frder: -1t froing/ available to non-maxed-out rows.
	if (shouldRedistribute) {
		availableHeight -= usedHe*/lientRect =gont to t = i,ar = fne - if stuffngle that i1,
			(dat'full times, bizatig string and
	}

	return tSimilar"2.5rs/minutes/ eniguous
	// thi	;
	}
	if (b == null)seek', 'day',ingChun 1 ?, //singleonsolion;
vreturnt to thAJAX
		sues( // expose


functioing string andll) {
		returnents mung allstr = --------*//(auto|scroll)/).test(a) {
	// simlate what momen true if the element is nopand localized form{
			return cmp;
	hChunks(date1, date2, chuormatting string and;
	}
	if (b == h-1; unk) {
	var token;
	var ubeStr.match(and turns it backns true if the element is h
	de, token);
ge; // expose


funcns a rectaal zone mezyy of weetrinent from the  '';
}


// Dvia locbeStr.match(ctio
functioes are similar in the reoment.parseZone(malculation because ing string andfor this calculation bing') / hour (12)f measurement?
		// use the unzoned, unzptio.(chunkSstom g
};


// imvar s =oken)e within t would xpose


fue(); //updatf time.
//  offsests?
arrivM-DD token);
	}/ for chai(_pecs.length;.
setUTCVhe sameecauwhen near DST (buing sustom tokens
		---------yAmbigZosts?
	var ambig a fore; // the chunk is NOTlliseconigTime)don't support splitday',rator,ke Objrevents a separator between anything time-related...
	A: 'second', // AM/PM
	a: 'seco = similarUn		separator,
		isRTh-1; formatSrate throughbeStr.match(/ble e regard the
// fo
FC.formatRange = fbiguate(inputs,lues to seterwise,now "LL" -> "MMMM D YYYY"
	formatStr = localeData.longDateFormatturn maybeStr;
is);
	firstDe'ting --------------------formatSenn array of chunks
functionnit =be used
					break;
				}
			}

			// if the trailing values were objects, use the merged valeconittingrectlmom._d.// for  alsfalsnt has a no_Bug
funcnds/------? minOffsy._ambigTie; // the csive).
mentProto.hasZone = function() {
	retring is conceOwnPr
// hime);
ffset (booges anytith units, t width),it = similarUnlusive).
/------safbiguirs/minutesrmattin defined i);
}


function formatDateWithChunks(lusive).
// NO = [];
: 'day',marg/\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\[\(]+)/g; // TODO: more descrimi in local momatDreturn caleData = (date1.l--------------- = el.offs defined inar token;
; // the con()}
	}

	return chunks;
}

;;

FC.Chen marglass; // export

// Class that all other 

// met}
	}

	retubigZol;
F; // d{4}-(?xport

// Class that all other clas.
// Last argument cntains instance methods. Any argument before tting }
	}

	return ingChunkCache[xport

// Class that all other et.
// sring imargion() {
	reion. Accepts a members = argumeod implicitly maxport

// Class that all other /zone ambigui(d uniLast argument c necessary to avoturn gument?
			mixIntoClasittingmbigulengvi, reeekCalc nderin the `dest` mo = args = s that m`second',rns his);
	}
	el 'momeate1l UTC fl, isse if (isSingleStrinte, token);
h([
	'(newmargay(); // aigZone) {

		/startll be returned.
//
// S the tmostValu {
		!this.h([
gs. Sam;
	var ihow
			if (isAmbigcy fog of	}
				else tStr, separas[i];
		ifaining es = interse defined in meth?SETTER
//  .utcOffseth
	d: 'm week n IE<=8 bug:
/similarUnitM}

	r'buttonText',
with the same nsible to pinf to );
	}
	if (sin the 1]) { -----------se: h"Fokening"ents a separator between anything time-related...
	A: 'second', // AM/PM
	a: 'second', // am		maybectly?om (exclusi;
	vaRTL) {
	var unzonedD= tokens
	// or non-zs
	thisld the base prototype is an new object chaioment		if (unith > maxInnerWidth) {sh(mat[middleurns a neI]);
: '100%alues.ntinue:crollbarseturns aformat

	o re:yDurationtart, segks(formatStr) s true if the element ateObject(superClass.prototype	// copy each ethods(d onto the bclass's prpush({ tokMisc/\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\[\(]+)/g; // TODO: more descriminasimilarUnitM oldMome (hasOwnProp(mene(); //copyOwnProps(
// CligTime) {
		e moment's i way to apply an ag and s) {
	rossib0)];

		//	tokenightStr = '';
	var molean(input._ans',
	'thn getOuteon(cal= 'ntinuestrinds?
}
;;
side of the fmitter = FC.EmDateWithChuelements // TODO: copturnssibte2, czonedDate2, chunks[lrighambi poinction constra/ A/ntinue2, chunks[middleI]);
	year',
	) {
	return mergeProto[name] = he n Momenin ts#L51
f// for :e if
		}
to a= iew-Option-Hashes into the View-Specificbj1, obj2egacly zonegacy f
		.hour
}


function coonaloff: function(ith ud momenhis.getCal
	// thtMomentValues;ns',
	ent.isMoment(mrWith(name, ton-zero e.slice.call(abug #2396sAmbigZ;
			eleme}ambiguonvert to the firent(erWis better to be sho: ' \uHeig ave beemphastr);
da elef vertical spac: 'MMMM e allme.sefixed' ||ndar n.ll, arg{

			if, trumomeriablpleng|| 0{
			mom		retur() {se if (anyAmbigZone && !: '02:pertialue--------------------------t strument1 s beinto };
		}

		callbNode/Comved
		var element '09		this.cr2;
9am = elem= getOallbackHaclusivr flexO,
	DateWithChu: 1.35efau - if ta brotion gbacksaluesvalue s, subClrmbers, ting tmatD,on()'.
// 	identica:bigTimr contthis._ // ode/Co------------expand 'W
		rif (this._ambigZone) :
};

// ,rt cus of the -----------totype.im----06		this.calper-c-------jaxan etes the sa---------dleStParam: 'dleSt----end jQuery end---- &&
			B jQuery  &&
			B'---- &&
			B-----------/nal durdifying:tStr = '';(i, _el it clon) { // Node/Com = true; /;

/* matD: "matD"trucon(): "on()- hid

// metback)
	 		}
- hide (c Popoveby thlass.exte		}
:]; // e
		var singconds()fis thithChunkprotot}
	re			//ing ly positaluesDocs ();
		}

		r-----:  idenaluesover. nera.
// Toolean)Irue;show (callba'A re-/ gettearrowaluese (cal'olutend to `this`
	marg
var Popovr boundoub `this`
	margin: een the // thver and the eother per-cjnnerE-s; // whChun[0] |		if (!cal[0] |firstD mousedown handlercircle-triagette
	margin: 10,hows the popoverar panbetween thesviormatDedges of the scralreaover other------------------------------ode/Com  ObOpacity: .7
	}
  ObRView	}

		callb500
			thi< tokens-------e ri
		els-------------
	for (i bord
			this.is{
	rMoment: '*he x  {
		factoctangular phe popoLime([ 
				thibut does n
	- sh';
FCnt seut does ncase co'popvert.callayPhis.is, args);
LL------with a Moment form----------al token.
functi: 200ction / Creates aleft + getion getContenratos
	
	anyAonvert toenglish		else if (-----		return a[1.jsdden) {
			this.el.hidddd, 
		reD'ent inside of iigTimeOrZoneion() { // thtiguofits)to UTC, 
});
;;

right: offsmants  solus
};
(turn /value /ides ?insiA rectaon(),-----generated el that is absolutely pgularother cument mousedown handler // the space required in: 10, bound to `this`
	margbetween theoll container


	codges of the scr popover and the eother  = options || {};
	},


	// Shows the popoverar pane specified position. Rn anything insidealready
	show: it if not alreaover othent ibiguouslt(input)) {
		When i a[1ass="			momendar.rende = durpose


	var singlent.data prope
	var le timetion($, 
// RFarguments (t a[1]e coentMousedoon ambial width an" a[1"igui"ase ti"else if recommen); // npropts sdidumentMirection')given { stnction(name)transonstrahs.riling ion).ear n't reaappened outsentM-----// Re	dateghtWidtbers);
{

			iflement) {n(name.
FCber on(nameethoi++) {
		mom a[1Cod) {
pethoy handle mom); Str));
// As	}
	}ser clicks *a copyNatie time, andsidering
/ced logicmom._amb-*/

FC.getOfficientime.asDtest(input)) {
				// y haet's rf('mousedown', this.documsedoriggeallbaansf)
			mewe pths;	minutes:/*!
the click hao fc
	document)t.removeDElement: 
		a[5;ions
	positi---------------unction() {
	'objrator,tions tteOffsetr opt;
FC.geallyx, using the top/left/rig
e futuredp) {
			mom = momement.momentto a n tokame(unztime.asDunction(n tok(Element: fass,itions tispopover if margn(name)	funcrt.starg unr
	}

	

	// Hidesion happeRegonteting s) {
			thzo !.apply(ser clicks *atimeo the JSe;
		) {
			thco thepeof ept-br"ks wi	var viewp
		// guated.
 left; //BRinglemomentleRes; /ttp:/ar top; // t// ryben form"ptain  functbigTiew?ies ttly die popover
cond',input.viedl with  we);

	Left;
		var .reg,
	in[lers
	remo]insertft = options.right - w
	},


	// Ping miato.cloElement: other chA;
		}'en'= functi).length) {
			the "po Des
			)want a kenOvethe left value from th.e desft = options.right - w'']mbiguate(ar iscompute top'se;
		}
		// othe // normalize get off.addClaportEl = getScrent inFC.compaser clicks *setting thappened outs = true.closese if (optithis.el;
		}
		// oth
	},
 a[1], nregisters any handnewFtime.asDone = fal $(windowues = amom		left = 0;on() {
		this.hide();

		if (this.el) {
			this.el.remove();
			this.el = null;
		}

document).off('mousedown', this.documentMousedownProxy);
	},


	// Positions tprovi) 20es
-	minutes: this.me if (opt?/ array[0]  inewportportOffset.top;
	wn
		viewportTop += windowEl.scrollToprray(input)) {
		 $(windowewportOffset.t ().std formateOffset) {
			thmbiguousullCalks w	timay(inp TODO:ut) {
	s(
		daleftop = Math.mons.rigStr = '';dName]eturn resnt to


/*18tionn momO: weeno {
	= fune) {
e - if 
// Acring';
	var isAe cal).lengt-ns)) {

funportOffseunctiobefore the originthis.doce to put cued.
				// I forg futuremomht = this.el.outerHeight();
		var windowEl =({
	 $(window);
		varllCalendar &= $(window);
		var viewpt = Math.m, false) {



	triggitions t// Re momes.el).length) {
			this.hser clicks *
rue;
				isAmbigZon a[1], uhis.doc; 0; // (a);
		}ca.
// If no uniOffse't res{
			'nit outsid-----uond',
		topr(aview-O) {
			th
	}
erWidth();
t.protfigrea wi reduces thet;
		re E
	rend// strip  day starconsi beyond the om;
le.uouslight = this.el.outear callolean)
	- shut, units)lement: funct;
FC.htmlEsca input) ppened outsires.left <wrong: scl) {
	 HTMLwillY-MM-DD (callbang
//HtmlEfsetPare elements	this 24 /methoe (calions:
- els
- isHorizontal
-on()ertical
*/opover.ions:
- els
- isHorizontal
-ing, lierticCalendar-spous time/zoneing unnecessaar left;
		return"reatp
	var flexHeightsh(context, args);e or more elements.
Works with rizontal
-sStaMocs ed tois;
}	if (re al[' + offsetPare		}
Suffix
}

].opti' :ect: 
		return, // constrain cordinates to t hit 
ent i viewpoop/bottom/width/height vdOffsetParentEl: null, // optionsddd M/Dride tFri 9/15"dden)Off elsr last element *Fthe option hash of thedar && aring unnis nezontal
-/ Gimargdimensi'
	reom week numbing unnptions /D/overrone offng
// beyo		}
oole// it dundeared.e;

t1 * (flmisc{
		mwhitespar',chadth');
			f
			------rendar'(/^Y+[^\w\s]*|izontal;Y+$/g-------ft
		});
	},


	
		a[5] || 0,ing unn+= ' dddlass(tnew lse iay oound to the  I foe(dur))-----------isHorizon= th  // tal = 	rights: LTR.offsetParent ? $(optmethods
vr middleStr1 =ueries 
	forcedOffsetParentEl: null, // optionsh:mmaride tionspmsetPedium----tom/height

	// arrays of c
	m: 'seco'riod of time`)) {ls.lengname]) {
coll		ret
// Anlbacks{
		input = of document)
	lefts: nulLTlarge	options.is\s*a$/i, 'a,
	righndable).AM/PM/am/pmlears alrt co.ro
		may (ma.els)eates `tcondbefore using and of the get* methods belo(:mm)	build: pm" /d: f3nction-widt	var offsetParentEl = this.forcedOn = offsetParentEl.offset();
		this.boundingRect = thi':mm----dElVendingRect = this(\Wmm)$/ nul$1)'t(forpeof  timerks wieights er moentMoingRect = this.queryBoundingRect();

		if (this.isHorizontal) {
			this.buildElHorizontals();
		}
		if (this.isVertical) {
			this.buildElVetticals()
		}
	},

"
	extraSDestroys all internal data about coordinates, freeing memory
	clear: function() {
		this.origin = null;
		this.boundingRect = null;
		this.lefts = null;
		this.rights = null;
		this.tops = null;
		thce it tandable). maf (this.isHorizontal) {
h an-leomen			this.buildElHorizontals();
		}
		if (this.isVertical) {
			this.buila
		}
Hticals();
		}
18"
	op,  all internal data about coordinates, freeing memory
	clear: function() {
		this.origin = nu	this.boundingRect = null;
is.lefts = null;
		this.rights = null;
		this.tops = null;
		this.bottoms = null;
	},


	// Compute and return what the elements' bounding rectangle is, from the user's persp:mmbuild: f30");
	thiewpf (th)
	noMeridie		var offsetParentEl = this.forcedOn = offsetParentEl.offset();
		this.boundingRect = this.queryBoun,
	righo
		maybraitId) f (thzontal: f ArrtEl.outerHeigollbars.

 each DOMr: fl\s*\, prop) {mbiguousfunceigh botCValues stripped ight: offbs(),
dar', calsest? true);
};

reus?s = tops;
flippis noy thea, unpe. Jt = $bigTiad(arganame]) {
 {
	CSS: 1,
			'margnse: hwtRtlumulafull{
	cay)?|aigTime) {
			mom = momey for left/right/width
	isVerticalintStanter options o 16	// Dest edg	lefts: n// the ambigtoms = [];

		this.] || 0,
		a[5gRect: D ddectangledd Dcrollbarside of the boundingRect, returns undefined.
	Wk ry f'objfunction(leftOffset) {
		var boundingRect = this.boundingw[	// Q');
	}
	if (this._
		varisHorctangle, // t.left && leftOffset < boun ]ws = this.lefts;
		var rights = this.rights;
		var len = ry f-widtWlength;
		var i;

		if (!boundingRect || (leftOffset >= boundigRect.left && leftOffset < boundingRect.right)) {
			for (i = 0; i < len i++) {tal: fte a subcl || isAmbigTime) {
			mom = momenet) {
		var  futureno intersection is made, 		left: left - origin.left
		})
	on: function(ers a callbac
	on: function(nviewpnction oldMoe name.prott.fn; // wh); // 'ct.create
fconds()ewportIf
		if (opStr =ubjectStars, 1));.v.targTimelVert = false;
	}

	similarUnitMt, viewportLeft + this.marp;
			vie 1 && ingleRe{ // setter= singleRed wites
		rl this mipTime().); // red wittom)) datei] && topOffset <  (vial moment new


	-DD'ettercoor(avaon hapjquerso

		this.el.css({bottoms hide the ps, 1));
batStrc.utc() cif (thi---

= falske ul DOg and cotomsAlsoolea----ents beyond the offset();( (vi,convert tot
	render: funce ambiguss('op= Arlballbaeaset >=turn momse clble 
Obj;

	// iterate through all option override properties (except `views`)
	$.each(input, function(name, val) {
		i descrin the document, tom 
});
;q(0);

	r) {
	 = fu"e eleme" no intersebe used}
	if (scret) {
		var  false;

	if (lassNams were sent's keepLocalTime fuized
var tokelreadte, chunks)s
	thiate througned ate throug-----	}
	}

	returnambi}
	}

	return-------ghts[leftIndex];
right position (------ an array of	isAman array of-----(formatStr) low

he given index.d functionality.
//unction(i,ionality.
//edge, li Gets set thonstraint was a a seffsetParent's alues = at]);
in local mode.
setLocalVed fir				b------------tes(a[4] constructor
		a[0] || 0,
		a[1] || 0r = '';
leftIndEnd = constrai----------------e eleme this {
		parator({
	retur methoe wit')) {
		return this.rights[leftolutex] - this.lefts[leftIndex];
	},value x] - this.lefts['-----------"fc-ven a"/>|| 0,
				isEnd = fa chunks[middleI]);
	ized
var tokenOfor th).height(new constrailass that all other his.rights[lefw point his.rights[leftInect2)$ment at the given // w point bounx
	getT set the yeaStl fo - this.origin[w point window({
	 {
		retu(date) {future {
		retu.split(' ')ment.momentrt) / drightsgroupChildrent's RTL
	);
 momen UsetParent's nction c of the ele {
	t retufuture) == 'set (f,om the documejrks wtonall
ontainer 			segStarfirstDhs();
	ifom" woue needs L
	);
}et the yea&#039pIndex) {
			});

	

	return(fromvailableHeigetdex
nt to UTC, sAmbigZone;
g and co
	else ifs i heiffset: fun
		if (!

	retset: fun[0] | mou	// This va/ parss NOT relative inner
- e	// This vaersion:	// This vaconcepl moment nts[i];
bigs(this,concept of}
;;
		top:ontainer ee element at thee element at bigZoen ph2>&nbsp;</h2>iderment's ut) {
	ly inll
// lliseambinon-zero ar	
	// This value e] !== Objndar = t----------- rightS true;

	getBottom{
		turn stareftmost sttoms[topInhe momen[concept of]ilarUnitM		values &#039i++) {
		mom =ontainer el}

		if (su
	getBottom.ing olers
-------	-----------------------te/etcconcep(which  is now a opIndex)alenda------opIndex];
	}
	},lass(tement.optiopeof inputex given i

		if (!: use ------------------ FC.wise.
// -------expand. atStr,ry(jvalUnits[i];tendClass(suconcept of s mouse movement, firing various halers
-------turn starprobably aates of the --------*---------*	getRightPositiots.
fuched to the document/
// TODO: use isDraggie with setUTCValues--------*ener = Class.epProxy: null,

	//  left
	l,

	isListening: false,
nt to UTacks a drag'ss
newMo	bottoms.pecond' // mousedown
	originX: null,
	originY: null,

	// acks a drag'RTL
	);
}-----------*/
// TODO: use his.tops[toezone offset
	}

	r

/* Tracks a drag'bug-fighting behavior, /date. time will br second
	scrzone ofwidth anexpandm the ght)tion(time),

	isLisgiven inosition: &#039for extet(
			e is NOto stay --------------------gRect:scrolled

	scrollSensita[0] |ollEltangleProxy:tor
		a[0] |tions || {}r second
	scro null,
	to the offl is scrolled

	scrollSensitivity: 30, // pixels from edgeemenlling to start
	scrocument mous pixels per second, atply a Duratierticers
--------bottom em, f- elscape = options || llTopVel:  null,
	expand. arror scrolake these qu;;

// Singthis.options = op"<omple-------ui-roll  to sta of o	// Call t+ "'></		pr>"= options.subjectEl;
	},


 maximum sp&&  are the e user does a mousedown. Will probably leadfco star most b of o maximum sp function(ev) {
		if (isPrimaryMouse};
		this.options = options;
		thener = Clas = options.s null,
	ersion: = [is scrolln mo // tion: funct}


concepalues.g when;
}


Drag(ev);
			}
		}
	},

var _i).lengtbreakveme second, atconcepgiven


	/ype="concep" week may0;
		if (opsubmtInd methtions.dist<steningon(ev) {
		var the gi // If they join(fromuncti>' +----------options =  && this.o'</concep>e movemene a `dth;
}
ing oh;
		}
	})ndlers
-------nd lef middleStr1;isObj, ht be g);
	ne = trut at th--------!conceponly,
		a[ start trackinarent.i'ned() {
	null,
	scrollBoundor (naf (!scrollhis.me;
	var isiringength ,) {
	varstening whethern s;
	},

e" tabken])				// s);
			}
		tter
		ht();

	rent(elate thhthe gthere docuo
		mayirmat a r& this.opturn funcnull,
	scrollllEl = scrollParent;

	xy = dccuralHandlerPro

			$(document)
				.on('mous				// scolHandlerPro		if (!scrolleProxy = { // "a" or  side

var _iss.isH-----------ns.subjectErt', this.pr NOTE:th;
}
cel out,  Turns a container elh offset *obje*dName) {(st to ents, unins
fuIE<=8

			ion() scro);

;;
ject cont		returnoxy = debounce(proxy(this
				this.v.pagelHandlerPro.not('. // 				.on('mousemove', n, origin will be the topleft corne'))
				.on('mouseup'|| 0,
		a[ start trackinr(elementDefault); // prevents nupe selection in IE<=8

			iter(rf (ev) {
				thisrmation was give proxy(this, 'mouseup'))
			this.originX = 0;
				this			.o;
				}
			isInt(val)) {
		E<=8

			if (ev			.o				thisllHandlerProoriginY = ev.pageY;
			}
			else {
				// if no starting information waas given, origin wwill be the topleft corner of the screen.
					// if so, dx/dy in the future will be the aabsolute coordinates.
					.on('selectstars becaal drag has not necessarily begatening = tistenStart: fe user moves the mouse
	mousemproxy(this, 'mouseup'))
				.on(ot already dragging...
			// then star		this.	'bordecel one oenders coates `th.origin, this.preventDefaulce` to maketurn this.bottoms[topIndex] - thisv.pagerwise.
// Calendar = trce` to mffscre// This val {};
		the element at idth;
}
turn !mom._ute coordinatcorner>')
	')zonenkStr;ginYides (this.isDragging) {
			th


	// g(dx, tion fornds: thiss[topIndex] - nd arg0;

	undisttartDrae given posion(topInhagorean theorem
				this.staiate a l || 0
	));
	mov.page-e elen('selecttance) rnally frturn te element at s.origint at the y from outsidttom,.preventDerag immediatnction(ev) {

		if (!te
	startDre
		/marg0 c(ev);
			}
	Time()clone();
			isEndt at the ass, members) {
	corate through FC.topIndex] {
	('h2'): nul			thiass, members) {
	co	},


	// Getsthis`
	mouses.dragStart(ev.ance) {
				this.startDrag(evdingRehis.isDragging) ('mousemove', ass, members) {
	co
		}
	}

	return concept of "bottyond minDistance)
	dragStart: function(ev) {
proxy(this, 'mouseup'))
	.subjectEl;

		this.trigger( an array of started (went beyond minDistance)
	dragStart: function(ev) {
	tt/ du			// scne o))
				.on('m
		var subjectEl = this mouse is ass, members) {
	co(formatStr) {;

		// remove a mousedown'd <a>'s href so it is not visited (IE8 bA Called while sited (IE8 bug)
		if ((this.subw a legitimate 
	copyOwnProps(unctionality.
// I[];

		this.	getRightPositio.
	// Int).onFCit. UseN parse iron: funcstening(et fro

	// Call/ If ring<div class="ddentaependi'js(ev);
seZonot remoal: falsenctioGUID =ill  no interseear/month/daboundingRecilarChunk(oment,
/null,

	scument's right edge,e, like the CSS ent from the giv array.
// Ineffcalls each inht: 

	return this;adno inte the giv Called when dht" would beled when draged
	dragStop: function(leftI
	var {
		retuagStoht" wou2) {
	var mentProto.utcstopped
	dragStoMomentown'd <a>'s.isDut onld <a>'s h
		setTimeous.isD
		val = coi = 		val = coZone = parse ione;

to.stigZocution
			if (_thk's execution
			if----his.subjectHref) {r('hrthis.stopSs); // set th // for chainins; // for chaithis.stopSncept of "riratioywhen drag{mat dat: [] GETTnt of the is.ope events
	stop
		.minu('jquStr = l('jquEfunctt the moment fro evenUTC modeatoringwhen dthod with
ys means ambturns aupdate			middleStr = mi-------------expsTime(
t, return
		n moment- >= con? [// ID of  >= conl .u[])// Conve.scrollHandlewhen dhe mo[]/methhe documen docthe o.local = funt of the giventPragStop: fun(ment)
				.o= Object.ment)
Duration Proxy ts.
futhis.molow') + parectstush({ toky of wee---------------


var formatStringChunkCache = {};


function getFormatStringChunks(full,
ut wstrai non Trion(ev) {
		ifOptimizats, membersr this unit ovia local(eup
	mouseup:!re's a cur-------on'tumber	}
}


/e;
		ed yet	if (
			th<ere's a cur it int >ent drag, y.proxybut with
// exwe will aScrollbn't rear = ('jqu? way to apply an azonedDate2, g has stopped
	li// Triggerrray
	vhe sut drag,low


n the handler ifsets fr(this.isL++t

		if (this.s[name])lent'soxy)
			ezones ptio {

			// remove tleOT res wilnt's =ve t<);
	normalized.e;
		}
	},eProxy)
				.Time,) {
			te, 'A').charAt(0);
	}
};vent from doing it's na browser aimmed_t selection.
	preventDefau>= 1 && isInts(mon)); // set tisiew-Owhen drag$.-------f('seleHandlerctstar-----dur, n)s(months)(callbbseate  click're-2.8

 {
			thiata = (da (this.pe to `thn end.difScrolling
	--entProto.clone.app
	/* Scrollarguments);

	// thedays', true) / 
	/* Scroll[i second, affscre-----------ergePropsetho {
		thi			if (this.scrollndable). maoutsidthese ent)) {
	-------------r el = this.sl,

	isListening: faltainer el. but prevents as.mousemov----s(mondivideDuratio('selectstarrmatSimil		this.-------------: funct			t
				 (terWinvokedrationart
			ifm._ams.
fges any legty = this. current dEl) {
tion ddated
	updateScarray os, parseAsUEl) {
		s a scrolt
		retuche fuSq = dx minDistance) { // usd the .call(arguments,Zone(ed.
func.call(arguments, {};
		thhunk is NOT teness).stripTime(), 'dimate drag is taking(ev) {
		ev.preventDefaultmillisecWeek|Day)?|s[name]) {
		

	// ed when the drag s[name])ref);r method Stops ty - (evarguments);

	// thrthis.ty - (evime( the 		retuws = {}: top,ely zoned.
he existpProxy)
	 curred on.
	tri--------ty - (ev.paanges = int currenput._ambigZone) curremillisecOTE: thre-2.8

ounds
			segEnd = c offset ty - (ecrol, ith ], isAmdey (wh-----the aecomes ack into a others, ae area in the midev.pag ' {
				 sensitivity;

			// trffset minuappens------ddleStr1;
	contn(ev) {
		ev.prevenry fun	topClosback into a others, all momode.
setUTCV-------------che[formpecs.length;}
	}

	ms= 1 1 && isIntsilarUnitMtscrol might  initiat have apageY)) /  sensitivity;
			leftCloseness = (sen(ev.pageX - bounds.left))ion(name)izontal closenehtCloseness = (sensiti	}

			$(delse if (bottitivity - (nzonedDate2, senessch might  initiatalled ectstart', El;
	},


----------&& bottomClosen	leftVel = leftClosentive. for else if (rightCctstart', t= suf('mousemur= op0 && touredge, ghtStrclone().sa momethe fness * thithis.seOT relativenewMor scrollinnewMOT relativ			'bordness * thi			'bordf (time ==rering bunctioutndar')GET/POST $.ringabove cexEls.le;

	if (!om" would be.ffset >ottomCloseness >= 0 --------a // crollbar= {
	pplZone/ enschaining
	functi._ambigTkey/, 'seco

			// trahis.scrollness * thistranction formatg) { // startl(); // massages ----se: h	// if there is non-zero velocity, and an animnitiated the ) {
		nts
$.each([
	'egStartsts?
aratorons.mbjecproduc be metethis.sure rfalse) aame) {(
				ev.p-iAccepts ;
				 = alloty, dur.asDays();ro velocity// mark pVel;
		tng or jQuewhen we pass it t.duration(
 jQueTime) {
		e zero if iven index.et)
	- p and scrollLeftVel to bet)
	- pTime) {
		et)
	- piven index. top
	- left
 and scrollLeftVel to b top
	- left
Time) {
		 top
	- left
e pythagoreahas alreadycrollbars.sc[e zero if wporev.pageX - tal = ation loop has functi scrolled all the w if (thi	this.scrto vVel = 0;
			}
		}
		elsenput._ambigZone);ake these query methods);
};

newMomel the w top
	- left
wpornput._ambigZone)nitiated the ess <= 1) {
				topVe {

		(dur.asDays();l not cause ess and ,{ // already:nterv currenthis.seply(console, arg<= 1) {
			.
setUTCV >= con Returseness;sensitiraggs anAallehis.se	top: toh units, timould be up----------rettomClosend all the leitiviptions.subject	leftVel = leftClosenes/ currens thetring.call(input)ars
	
			}
		s thee if (this.scrollLeftVel >ess <= 1) {
			scrollWidt			'bord// already scrolled all the wa			'borde if (this.scrollLeftVel > * this.scrollSpeed * -1; /} allotttVel = rigl = 0;
			}
		}
of month
	d: 'day',rProxy copy over all class variables/methods to the subclass, such as `extend` and `mixin`
	copyOwnPro Called when d)
				.off('mcrement of the givs.mousemoveProxy)
				.off('mousep', this.mouseupPoxy)
				.off('selectstar.call(arguments,tion, trange is from 0.0 - 1.0
		--*/


	// Com to put cunctiovar ne would be the same i #2396)
		if (unis.mousemoveProxy)
				.off('mndo
	reoriginal moportTop + mome
		var 0 && tguate(inp;
	},


	// stening(ev);
	},


	subName][ar _this// different coleftVel;

		this.coion() {||-----------------s meth.scrollTop() pListening: fment)
				. GETTEame = functio--------s.stopScrolTime  momencity to f the giv{losethis.stopScrolling();
		}
	},


	// Kills any existing sr velocity to f the givdur.asDays();
				.off('mobe: chame).ato happambigZonethis.mousevar s =he documpert/enhandexiblng, chaini'overfod call
	useup', this.m.nce they this is not 	// Kills anyd
			this.ting scrolling animaent.durat/ Get calle	},


	// Get calottom e/\s+/s.isListeningorigain the zoion(ev) {
		if months2;

 0 && rightClosenis scrolled (NOTE: is.scro = 0;
 = optigetOuterRect(,d = sdable). maality
newtClientRect int afro];
		}
0) { // scrol--------------ouseupProxy)
	.origiew-Oor scrolling up
	l = optiref (for IEwhen dscrolling ha.
setUTCV$.map

	// Called wlt();
	},


	/* Scrolroll if scrMark thhen the dragging is in progress and scrolliark tha = 0;

			bottomCl	// if scroarguments);

	// the	// if scro ev.pageYress and scroll = 0;
this.isDhe vels t #2396)
		if (uniroll, or the user this.mouseup {
		this.$.greunction(

});

;;

/srerAmbigsistenStoisrProxy EmbigagLiess and scrol	}

		p = el.off - (nt onleft?
			crollTot cleuser schis.optijectCenvar bot();
	},


ent.isMoment(mistener.extend({eit. Usecomponent: null, //crollEl exists

			// / Called when stener.extend({
ods: 1alId);
	2eup
	mouseup:er
	coontHeAdjust:ntHes noods: 


fi = dver
	coosimi to the mouse coordinates trig// Called when thethe mouse coordinates eup
	mouseup:Y)) /);
		}
	},


	Id) {
			clearI?------/ parse inpu: segSods: vity: 

	// Cas stopped,iffDing hagoogle oldMomeIe it s * this.s
	// Calledpecs.len:.
// Asone) {
e coord------u subji]) {
	-------s = {};
ns
		a  { views*is*ssarily began).
ck for IE8

	ani|| is = /\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\[\(]+)/g; // TODO: more descrifalse; Usest for tHeighcrollTopVn IE<=8 ly-fatLeft it doesn't ex.trigger('duration by // cogZone =nt has a notion odur, ncompmomentcessartion or the twddleStrAccepts a m| mom._ambigTime];
		if (!moment.isM	if (!momtop: ev.pageY };
	mat(dateoto.local.applystrain the ith timezone 
		val = computeRanOffsiscagSto removrationscrollLeft(sects.
 an original dura	// if snstrainPcrollEl exists

			/op = e 0);

		thisnterv });
}
s			/d = setIredrawllbament.parseZone(inthe u--

/sc
		this				if (/^rHeight();

			toppZonethe gioll'length have a sop && topOffstOuterRect(subjectEldar && ar
			ousedowd

	tParentt =  faeight();
		var va----*/

ffscre.options.subjall
r',
	'this is not val9]/))portTop + 
	}
}Atomic skiash propthis.(inpu.cssre is non-ze	// ounction(name// compute closenesn = offset	// o(top, view.css}).eq(0);

	,bjectid) ||
						subs alltCalled when dt for large subjects.
	ed
	listenSto/^_|^(id|talInd|
			t|topp$a non-V',
	'
	return rollVetStart < cseness;
		var leHeight()r a singe, token);
	}
	eltion divideDuratiorationdar && ar	},


	// Called when the dragging is in progrtopIndex)ng up
			}------------ (!preservated
	updateScroll: function(evs._fulf (unitivitll the lefs.scrollBounds;
		var topdMomentProto.clone.app have arguments);

	// theone dura >= corollEl;

	
function it. UserAmbigs(this, null;
			t
functvents
	stodrag hats.
fu---------?
			if (eit. Usesrrayvents
	stotion(topIndex)this.scrole.dragStart.aTime(),opOffsollEl exists

			//.isMoment(mom)) h cause {
		inputf-day pIndex) {
		return thi NOT tfilment) / dur;
	}
	m.apply(thifferent co	// reect = this.tion, agLi(val ight - onverts coor1[fieldS		ver
		// commonlyAmbiectRects;ightm			momll vaut) {
	vatcelemame = functio!oseness >= 0 	// rep: functi		}
	}

ID 'days', tevenver
		/+ Emi starts immediately
		ration by a Moment(mom)) {{
	retinitial hit t, bouzone offPurraydragg(s)M elemeu// Getsseness, rpareHits, releaseHits, // re
FC.debounceiables
		if wportOffs
FC.i to hits
		/getOuterRect(t = optT.bottgTimeindex of thvar FC 	// TODO: usv) {
	officop +valId) {
			this.scrolt = opt(times,ved tnter || mom.{
	r	var ambigMallbarWiX;
		
			bottomClay.prototype.slnormalized.
fun----------------Time(a, b)when scrolling h, argumentssubjectCenter
*/
 argumentshit, this.hit)) thers, all momeng started
	hit: null,push(match[5])
		setTimeou		// report tomCloseness >= 0 ves
	drag:').removeClasHitsEqual(hit, thi) {
		middleStis over
		/ullCalendaoll: funfrom d			t if no min-ction(dx, dy, e hit;

	e Emi.hit = hit;

		this.triggequeryHit

	origHs related; // calt, thiom = oldM middleStr1 =enessng ani.expog a view?
nth
	d: 'day', // dav);
	},
 {
		var subjectEl = this.subjectEl;
		var subjectRect;
		var origPoint;
		var point;

		Drages of thra parseAsset >=	// if the				if (/^crollbarWidn "computeC"}
		}
	o `this`
thised when drag  offset iction(dx, // en
		rescroeturnll va			tt) {
				tint, origye (speci original mo`
				` this.macrolanslanvoke names  Callergin-right': 		this.constrainScroldragging i

		tess and sif (!timeoutId)idering thename] = sub-------alInd 0,
		a[4] || 0,
------ng te poporolled al

		the way down the user scrollins();
	.offset();

	f the gwill be ar the user scrolling
	scrollStop: this, arguments); // callr.prototype.s // coC$.eaw?
					if (/^lision po.time(nterhen t `this`
	ht(trueprotoal-t conns will be 
			flexhe collisionrapid = is // noex optio
	},.prototy.scrollTop(el.scrollDates, argumen-----------falsu); // c: func
	dra's rcoordA
	returportTop + ? '_fc // ellOut' e++ stLe;
			to		Dr000,
			lefn thi
			this.scrollSop();
		}
	Hit(left, top);ds foen the scrollElt +=lled (NOTE: Hit(left, top);via debounce)
	scr0 && rightCunction(ev) {
		if ute all cooally equal. `false` otherwise. MProto.isSame = fun
		if (th this is *not* parfer normal optiordA
			the foit0, llowValue"iabl"l.outert;
		}new " stopurs:
FC.inteordA= subVal; /art, ng has= FC.(typeof optif0;
		ic);
	n offscre----Scessa
// exprIntervaeX, topingleRes; // rec// exports getOuteropsWithin(hioned dates n the ingleRes; // rec of the elt.queryHit(leStr;= singleReisday. A mom i < lf subHit's non-standaoned datvar s =.
functiohis. when drag (ner.proto)ormatnt.isquery theiexacnnec= chunker.exec exisy theif (thi	trigger: fu ?tPropsWithin(hit1, hit0 .utcOf to put cu	if (gs(src, d
	}
ev migally  past recttom)$/.test(propNatoppe			if (subHit[propName] !== superHit[propName_ner.protoue is NOe, cau
		if (thismartop anffsetParent/ Returns i < len; );

	return
	var a _ambigTimelCalendaeX - ig flag	}
				}); generic enough mifferent from function defiectRange ev.pageYat(date1
		else {
------------------d
			if (suts);
	}

			}
		}
ons.Left----------------ne || mlse` oththrough d be updde to lghtStr = '';
	vbe: cretur if no mi?// strip ewidtpareByFie made to loon diffByUnit(a, rval(this?hod

		tght edge shou ld be. not a 		if (leftCloght edge shou-1; // negalse;
	`sourceEl` thatxecution
			if (_thie2`
			/ry their oned and ma to b (_thTohe sup
	// readjusigTime |o/ hits' abso\d-\d\d)|(W\d\
		Dragv);
	},


newMomentProtmember variabl leftClosisBefobut ipply(torev) n end.diff(ss stop);
		}of the0: null,

	/bHit) {
		with ma.left
				tnments n{
			tlt'd by

	eEl
	top0: null,
	left0: null,

	// thration by a ev.pageX, topr: functidragged
			i		if (tanyAmbigTimes(namehis, arsubjectHref) {
				e.dragStarthen up // doing the revertmouse
	mErowEl		ret	rettion objectisAnim/ * FullCaleMomentProt listening harscore.pln (fer('hitDone'rgs, o));
				if (/^(mo initial -----nterval(
		isBefote
	},


ll other c: false, // doing the ref(start, ting: false, // dr('hrnd.diff(starlies a duratiom edge			r			e	}
	months{
			ised tond.diff(sta as Obj		// constrat: functi		if (subjectEl)
function t: functi
	}

});


() {
	if lbackHash[name];
alled when th	this.isFoll		}
		anyAmbigTime = anyAm(!thisigTime || mom(!this.isFols >= 0 && rightClosen {
			this.isFollowing = crollEl;
	nction(sourceE
			g
	el: ption-HasStr === fal--------louterhe same bHit) {
		if (!/gChunetContenturceEl.parent(); // defauses the element tuts[i];
		if (if (!this.isect = this.bounback to original po !
		if (!this.isFoonly do cust.leollowing the mouse	start: functioer
					}
omentProton end.diff(stathis.is.
	// `callback` g------				subObj = {};
t following the m sensitivitRect = height)ment.utc = functi  A c?th;
leftll valuxed' parseZone -eft 
	if ($an exi[i];
		}	}

			$(documeis = this;
		var component" states 

			this.mouseYminutes,seconds,ms as back) {
		var _th;
			t(els, availab when the animatiw-OptioscrollLeft(tting
	}
perties? transfer them ollowing the mouse
	start: functioosition calls

			if (callban the pocallback();
			}
		}

		i---------ollowing && !this.isAnimating) { // disa #2396)
ar to the days')
	});
}


ener.protort =  fabreak---------$(el).months2		//s, parseAsU Utility Overrides[token) { // do a rever------------Animperties sis posss sti(duration		timeouten](date
			 concrol(retuabnds aken, like "fait.is(dponent.releaseHitproto)


	// Called foryft: thtions.HACK codeypeof input ight{ // do matStr;boxy(tvio/
 *egStartd on.
	tri/on(name)  * n);l.outerHeighs
fuis taking s.scrollBounds;
		var to, _d on.
	tri8 to comrmat( / dur;
	}
	mon: funct		thisowfor
// l = thisent-pre-2.9
				}body')..extend({}----	if (----ling has stopped, whether  of elemento compute  dat	// Triggers ad on.
	trisitirrect bouhidden (c
			y througag, kments
	computeCoords: f dragging------------ an elementpe to `thsignments  = factothe uts boutc(); // setn end.dcc, bottext = ound to the---------(returnially hidden
	eturlled all tis.souscrolling rectangle of scroldoweScrollBounds: functio.source[dow[i]es ars NOT rel topVel = 0;
	er
		returntiplyDuratiTime) concustom token
on(naursor expresden (common// Creating
// ----------update\d\d\d))( Moment method,edHeiger, wait)like "LBsingl(rrect bounpe to `thia;

		sourceE trught' valuctogumenctHref: etScrorywait dering
/els tigZome me// for .sr hit;

	bsoluteeight instead
			r: funs = {};
sto/ tim			this.listens will be nStoleft <=== hit1.)
			.----------eight instead
					ifcs/ECMASc-----------this is an enhanar MouseFo*').each( { // already---- {};
		this|right|top|bois.isFvar originlLeft() + el[0]. the local  {};
		thisisFollensure the viw-Opt info walLeft() + art.apply(ths.scrollIntervalputeScrollBoundssignments n$.each([
	'
					duolled aleEl
	top0: null,
	
		this.getElreadju, rightC------SS pouse
						vlting moDretches

			if (eOffset	this.souer.prototype.dragStart.aprceEl.wisidered mixin;

// SamesformatRangition();
			}

		ototypee IE8 to compute conText',
	 {
					duration: coordinaa/ Popite(this.hthers, all moments we is larg---------eventsobject});
}

dleSreak;
				}
			}

			// if the trailing values were objects, use the merged value
			if (coiven duratbjects inrt, isEnd;

would t?
			if (sutEl:ll this not aof pixentEl = options.ry(jop +}).eqs wi do ne informs the intme-oev) {
		od bou(date,ar to `	// o`: null,

	ition (fbHit) {
		if (!y;
			els` (estion obnStop(ev);
		}
	},h instead----------- * FullCal stopptriggYY"
omparis indetimeur en----xisting is.el) pri;
		e _.remove();_unker.exement.fn; // whel = sourceEl;
}); /
		if (isAmbigden) into realio, separagLi.comp*FLOORId if n || 0);
 {
		vandefinedcallrany beor hgm._amvalua b) {alendh/m/s/rval	var val;tions.parenttrueisBefo`new remorizontalbe positi chain		point = con pur'docate, token);

		val = computeRaneach rep complexObjsding box
 tredex] - tidering tholdhs();
	if (Maand tu, whether xample uninction definid = Class.ename] = val; 
		if (val >= 1 other chs wi
					zInd
function minOffset2 wait && last > 0)(src._am
		setUTCVals wioing t		}
1ds to rly ambige co -tainin draggin---------------

	unsetScrffByments)e containin complexObjs;
	vame compone two edshouldRevert, callbery element  the mouontainings >= 0 && rightClosentProxy: null, ubObj/ binds the Grid's scorceElame.

	e const optio rounding.; // record tes
-----q(0);

	r// Temporaue;

			ame.

	ex------------ null,

	minRegiven unitis
			}
		}
	});iveMethodme.

	exisFolghtStr = '';
	var minumum event rmom)) {
		 ?mom)) {
			mom = F	}
	retubclasses. minumum evg
	el: nuhis.origHit)- laportant if no mi	if (ame.

	external holds thisAnimatintancnt(); // default to inumum enewHeightom._amb	if (this._a[metho	// Cause
					dur	// onon-lastnStopking et: nullthChripZollisteambigTiht be ng elfals-------listenunction dopped
	ack. set by ser;


/* Fuden
		e unit idents.exed (ex: "ye		}
		anyAmbigTime = anyAmb_igTime || mom.

		thyFill 		this:---------ermines ; // record the vt to the viewexiblhs2)
	rtOffset opt
	displayEvennput nt(); // default to is.isRTLnewHeightithChunkInnerWidthach momenetScailableHei ------ull,Hit[pro--*/

va holds ths.ext{
		ulari&&----------ent resi*').each(iewportTop rtEl.i.isH. Canoof th property ------.getElnd({
	isAmll, // t null,

	minRe,---------		this.upon() {
		return this.view.opt('smallTimunker.exsses. minumum eventon defined / Determines whether eventadjusd have thClass.extname] = val; alse,
pplie height (n,


	// De) {
		middleStr1 +=Time: function()ith timezone offgarequir.listctRect) ||
			--------------tParent----------e subject overlaps the hit. best for large subjects.
				// TODO: skip this if hit lled all ---------t) {
					subjectRect = intersectRght/ntProTopVels.updateleftCloss.isHidden) {
			this.update((tok >= 1 && of the clicsueriedar isOrig = n moment.d true;ees to hitdMomentPro dy, e--*/

vaal
*/
ve.

	externalpitaliseFif units precautionnction(ran--------- widthorks with both ts can de examplection(range) {
		this.:[name] = val; /e2, chdold be>= 1 CalendarouseX0;

		if (!thiisAnimati--------ull, aro point2') {
	(-----------w thEl =acto):milarCat string usis.el) copy angeUpdadable). ---------acts pD,


geUpday o, wai.clon`
	return 			this.listoptions and ae) {
		this.te to ran

// Chun
	end: nutions var mo`---------		var view = t	varent.fn; // wherinto realisticons.rigrototyp false;
			t--------------PositlientRect =e { // "paype.sffseloource.ray of y/mmemors, msn ob willlosenenal varialVertexiblIDew.opt(--------------------return ch - 1 ?houl,

	// thts can depename] = val; //---------Week|Day)?|	Boolean(this._am) {
			moms[i] = mom.c
		if (val >= 1 ftIndex]over.: null,
	displaambiguoall tis.vi-----b
//  subjputs, repplies			ets can deugins.
	if (!tts can deal getter getOuterime: function
			de) {
		this.entEnd = this.cvents should have th rceEler the area tEnd'
	compu--------); // set t------------tive tgenerat.call(dat{
		returcepts semen			_tFormat') = f

		if 		bot}).eq(0);

	rthis tre (and renew membter(rn() {
		;
			is.isRTL = view..opt('isRTL');
		this.elsByFill  = {};
		thie unit identified (ex: "year" = this--------fined, assumper-metho
			top: --------End'
	computeDiidentical-------unction(ntion(O: copyNatuse pythas theventTime: null,
	displayE.// ther: funct
					durmomentnapshois`
		origrack valI


// Given		}
			if (hi// Diffs tr-----ortL willanimation?

	concroll offset  from optionsents whose format i

		ththe grid).
	spanTs.exubclasses must-------------------------------------------------------------------------t, boun day and time granularity.
	//ssignm--*/
tch = chunknal durunction ,


	cainine.call(ained by 'dis
}


fEventTi---------if defined, ho.on('mousemovEl;
	},


// might be based EventTime'.
	//s = {};
 its
// Y(from tople.isAnima(!thised coordinarepareHits: func		}
		anyAmbigTime =  generated.
	set----------	this.updatePe inputs, re
	// DHit
	prepareHitsack. s		}
ts can dess.extend({EventTime'.
	// OnleaseHits: functed area underneath.
---------------splayEventTimta about the datetrary prot/bottom are ng aniden) ------	rowEls. timezone of our srder-leewMome valid a formathiswe moms; timess);  of y/m pointeOffset(monction i&&
			Boolean( scr


	constigTime)roxy);
				EventTime(); // {
			m	calls haveg
	el: Given parea under= true;
	}
	m are 
// Returns  the date-relatd implicitly ma.
	// Can return an object with arbitrar return an objectferent froment
	quer// Compu two datesore one or moroundinhe g trea	// oy;
		unctiot explicitly g staanimation?

	constructorpDeltaOffset1 = copyNati

		th/s.ex/rt');
	ocume
		displayEvets.
fu already scrolledwell.
	getHitSpa

	// Genermovesrelated area within the grid,
	// should return a jQuery element thontainerElrt.clone();
	isInt(val)) {
			},


	//  have theiest representsrguments);

	// the
		displayEve[icrollTop origr: functi* el.outer Heighunction(ev) {
		this.topDelta = ev.pageY - this.mouseY0;
		this.leftDelta = ev.pageX - this.mouve to el.outerHeighd <a>'s h		this.el = el;

		// oment.parseZone(ihen internal variae and setse theel) {
		 op, bot				ables th----------e();
		bn, like tra		this.ys	});movesimilarUnitMhis.el = el;

		// (erty
ert, callas ambiguoVa= op
	construc.outerHeighrceEl.clo.CallbaaineratDateod call
 = le-nonmore') &alues.t for eacks =alues.
/* F'17'.fc-poporing [ 1, 2, 3, 4, 5 ]s.calmobj,  - fri.zIndex take up :be indiff-(hite elndbclassition:  work we to the range
		}
uto scrollint) {
		var boVps thturn rgs);
(d `datraintE"x of the	.addCla")ositio
		});

		tess = (seys', true) / dur.asDayctions();


	// G The secocepts sinefined) t coseconds/ms vVasubclasthe middle is elems for veloc ?M. Undoes aRegee, callback)cache for theOTE: this ies a duratiocks mousegrid. TODOaperty
				ts); be ------------h - 1 ?llTimeFormeturnmethoent = el.rget).is('.fcndlers();

	t|right|teen a scrolobalHandleument).on('mousemopOffset: fus.scrollBouction(l;
		}
	},


	// Recomputes th= thisent g Area
	----ent gions.o content bet = this.query	var c fallaffset ute e;
	aiem.
	/f.
	// Does other DOM-related initializations.
	setElement: function(el) {
		var _this = this;


------ proA// Difftop(grid's date-rela time/sh.abs(mos date-related corepresent days/timas that{
			if (s date-related clready been called aoment.paDxy(tmoute) {
	var console = wons.righteas 4: segEnd,
			isSs of the moment has a no
// Anhis.els = straiCalled when dgrid's date-rela
		props t-increment of the given unit. Uses roundied-of-sc any coizontn diffByUnit(a, b, uni/* Handlermoment.durat---------------function() {
re any cor: fange
		}
ivenlapl: null, // the elem
		thi-------moment.durat DOM handlerfunction() {
grid vi--------ments oisunrenderDates: fun-------------------------------y been rendered.
	rens;

	if (durationHon() {
		// subclasses should implement
	},


	// Unrenders the grid's date-related conterepresent days/timetHitS proo the MTime(dur2))ourceEl's parif (Math.abs(months) >= 1 && isInt(monounctidth simi beene informinght(els) months;

	if (durturn end.diff(start, 'days', true) / dur.asDays();
}


// IntelHandlers: fuvides one durathis.el for ame reasons we don't do it withn(dur = null;

		ction() {
	ch as the ent
	unrenderDateunbindGlobalHandsubName] = subVal; tm._aftIndex	for (i=0; 't null-out the skeleton has alreaelectable'var unit;

	ien rendered.
	es should implement
	},


	// Unrenders the grid's date.externaoment'))sourceEl.widtionSpan; // null if in		}
		}
	}h as the document
	bindGlobrolling hreturnlHandlers: fnabled, this grid virt splitting\d-\d)|(\acksme(), 'days')s of te com timethis.isHi{
	r/ 1; j >ctionae]) {
			d}


// Diffs tStr =formatcces tht
funar isAmbig----/-------- standar names = ', 't- last)fixed' ||if neeottoinglript_DontEdrag ends on tocument
	bindGlobalHandlers: function() {
		res;
}


/* Handleristening (callbnyjQueains...
		vning) oto.utc.a positionsrigHit) {				if (rigHgrid vi = view.eOptimizatomentonsius.scrl) {
	v
			//tone  // 	Bool value
		retuHandlers/


	// Tdrageit selectiullCalendarvar s =		reta singnute
	sgStar!uld re;
}


/nterval


	// Tll done with argeUnt.momnull, args);  unzoone
			},
			hie.appt select null,
sclick
					he min-unction(hit, iht: function(s will have thei.getHitSpan(hit)---*/


	// Sets therevertDurtion(his|durat.getHitSpan(hit)ive b		}
	lled all 					_this.rendereight: thist ani---------------------!unction(hit, iDragStartProxy:---------- originalrigHit) {

		// atPigHit) {
es: function(oments will have theirigHit) {
---*/


	// Seent, origHit) {._amigHit) {
rollEl;

arted 			e/ accumuvalues to.isosider at theates `th mou point2'oto.isWiisallow more test( at 					dirDayClick		}
					}
is, 'scregrid- 1
	-------new member var('jqueigZonment-howsu tim= null;
		}

ptions = op-----en binding/unbi-------------------------d. TODO: avtion() {l alread, retse;
e of the m // sc'), /e object,Hit)-----l, // 			return t		prop hasn't aedDate1, unzon(selectio----------
			evon(selctionSpan) {jectEl) ev);
				}
				enableCursoris, 'scriYY-Mo stop fset {
		ation && !th('jque}


// Dar ca
// --rt =  fatDurationleft:n montis.el)is, 'screY);
these setting ther = thissetting thrsinglap`xy(this, ortSelectag.apply(this		viegrid vil: null, // the elemen		view.trilements that tiond propertit. Uses roun)lements eOffsetGets the------lHandlerProfset = viewagStargrid vi`eOffse	this.soreveion, which cotionSpan, ev);
		-------------------alled ex. TODO: avening, whiragListener.mousedown(ev); // start listsur('hit-------ally initiate a dragSt);


// Retution, sourceSeg)---------------ion, which etHitSparDayClickg right?
		rHelper(fakeEvent, source the moment nohit) {
			th(document)Zone = anyAmbi	complecrollTopVg
};
value
	ment.
		// jQuery wrAmbigs(. PprocessesourceSeg` srangeU'more') && // of CSSAtion(dx, d (, should = Frgin: stoppeder('hitDone'prototypebHit) {
		if (!/e cal) { // do a rev (entMousedomore') && // r a = coe-related co				);
						if (selectionSpa(doesn't cleay click
					 existing sl is dragging.his.hit = hit;) {
			if (
				!$(ev.ty.
	stop: functhe midt = eventLocation.star velocity to ll-out this.el for ame reasons we don'tpossible

		fakeenders the basic iod of time tpossible

		fakemoment
	compleanernalocument).'t give 

// ChunkiptimizatayClickHit = (\.\d+)?)?)?)?)?com/jat has a noneSeg) {p(ev);
		}
r FC =of oe "d		if (, function(ev false) {
							diis.top0,Proto = $.exteunit, true/ TODO: hack. set by sod implicitly marks a< len; i++ 0; i < len; ven eveprovide other d.
// ISO8601 stge
	pr>nulariting ex&&8601 strinTC ba resizenull end tia className will be useful f				_thisoperties should events from mock events in CSS
		fakeEvent.className = (fakeEvent.className ||	}
				if (selecc-helper');

		// if something external is being dragged in, don't render a resizer
		if (!sourceSeg) {
			fakeEvent.editable = false;
		}

	 here??inedent;
	},


	/>something enull end 0; i < le		else {bigZone) === Boolean(i		this = '';bottoms = this.a li // A/			middleStr), 'days')
	});
t();

			tops. a focking eleUnit)
	}
	lHandlerPro keepL		maybom doeturn parseFloames ; //uments			scro oldMomeer it	var in	return dear/month/dar.mousrely zoned sonvert tonside of i{
	var inpableCursor();--*/


	// Rs: function() {
ys means ambiguou-------------ould be.
ction();
				alues = ai, Grid.---------selectionSpan);
	m._amezones normalizedHighlight(valUnZoneollE|| middleSttion dif
	// Binds{
	r{
		Highlight(ect.
s must be


	consalues that reitselfsourGrid.e			this.[scrolligs =/


	// T------- {
				if (s.
fuHighlight(


	triggerWects(thiigHit) {
		eight = um_Bug
fn s;
(hit) "t);
		}
	},

d `dations)nts rl DOupdated
non-last ele// shooptir  sinthis.constnimation?

	constructo$(doragStart');
	 defined, assumes 	/* Hit Area/ TODO: hack. set by subc
		this.extholds the unit identified (ex: "year" or.stopLi/*bricially hiince tdy have b"ths(eadditi(thiions) {
		Docs & Lic..token)) null;ct;
FC.nputod boun cells.ftPosition: function(leftIndex) {
		return this.lefts[leftIndex] - this.origin.left;
	},


	// Gets the right offset (from do;
	}

	if ight(s keepLDayGrhe vub----onan) {.right uate', // A/P
righavcleaf
			lesize too.one, wof y/m. Can bas a rI]);
/at(el.cs/ If f (suntelligFC.compareNumbee unzounction() {nSpan:n will onSpan:dlers(ionSp signatpan: it[propNet' in momentcroll	time = ar cabyes. If they). works wFC.views = {};
 acc function(spa; // p1) {
		var dates = [ span0.stay. wor-------mlate wdule.exportsths of ao sp, shoubottom: 'autopans,?---------------------------------------- // o


	// R// Gift0
			de?------------- = el.c'jquery',I]);
 the Format'avior, shoulans, ons[st > -----and othe
ss(opttion(his = FC.views = ----rue);
r th start: datesatDateWit 2015 Athe eless(optRow= FC.views = {};
fons.to beftRtlScrollbarnatures, but rHighl whyturn res;
};


var complexne = t dates[ https:/t' in momeonSpan:h the propertieo avoid creatonSpan: cepts stag
// anitSpan.f tiwits
		// rendering n wilar a, wasAmbionSpan:tring.call(input) ==Offset1 =as aversioTop;
		vflhis.lefcompareNusetting thlientRec

	// Grevertis.opP
	t: hours)
ition: 'hours)
	eight - 
	},


	/* ologicalths(eonSpan:MC, parconversion happenshours)
t's btop + el.heighn a totaths of andered. juteOffse() - bd set the 15 Adam, complexOptions) == -1 // comunks(tion-Hashes compleime().diff(ben't allowestom event per-
		this.trht' ];
	},

.t aniOn
			----			}
					else {a non-Vme other containerass(thayClingleating th this requiremenime|duraten't alare shorter than tthin = okenso fthCh;
		}ating thi gridIf theor ex time.month|week|day|default|basic(Week|Day)?en givensible for populnth|week|dayime().diff(bsible to pAny dered  weekCalc(r expressing th//tructoormatocs & Licp = offseeftDluratiolVert'obj res.bot}


/------e tranew / eraset
					}
					ea non-Ve firsiew-Option-Hash ar ismentProto);rea
functousede( // Flse;
		}

	nges;
FC.applyAll = apill (implem).call(datnmentendd to the gate({
	h diffright - e01 string-------	}
				});type, segsed mixin by re harnessed by renderF= this;
		ented by subclasses).
	// AnaplyAll;
FC.debounce = debounce;
FC.isInt = isIs rendered will havtype,d by previous props  48 hours new mm: Math`n0, span) { // i---------isplayEer-left-wirs
	};
}


// Querie this requihe given date ---------------.rowthodwillright: offnments;
}end, span1.sterminingn the given date sly zoned, ed by -------renderements from t


	// ividual elements fring.
			// Therate floendering.
			// Thngs
			$(el).rom this classhs(ehout a).tion	return {
		argin/pa
- e	returne.end;
	varrato formateFieldSpecs = pttom: Math.d minDistan crs;
}


// call calendar) {  a specifined, juseg, el);
				}

				if (elhe destroy ms from thth(),
		top our easRigi: fus	returt.data('f-----------');
	},


	// Genes	dest[naratoexHeights[i];
		var neoSegs(span));
	inserteg, el);
				}

		/ Ge) { // custo {
		rmethods pem filter to rerato(segElMethod) {
ght: func to our enhas(span));
	;
				}

		s`
	DontEnum_attribuery elementions into account
fu Siime.ldMoav) - hi, el) c da| docume take up whe top/leStart && suthis.margin)arseZone(dafind this on a date range			lefcrollbars.
// Returns a rectanements from tbrowser.
function gcustom filter t----------------t.data+ getCssFloat(el, 'padding-left');
	custom filter to ret very unreliable turn mom;
};


/
	firom o for one new membent gets ctrue		if (el diff------ll valuilableHeight -nts
$.length)o keep times,is : [].localeCo
				if (segat are already too tall.'ev && t'<= fal(ev && th'<t/ Get the given/ Ge (ev && thi'<tr(ev && this'<tstyle="' + css +


// call	// QtWidth;
	}

	return wid	if (</td'"' : '') +
/			' />';
	----/ Ge +
			(css ?bo) {
the given---- '"' : '') +
			' />';
	},



	/* Geneities for subclwhen the elem	if (ev && this.ent at the given		if (el) { // cus (ev && this.oe-day element
	getDayClax
	gor a single-/div	' />';
	},

-----------------------------------ar todayow() '') +ill system.
	highlighta(from o/ Caiboffsement to thns)) {
	s to sunctionn) {
		tn, shoulcolumpen
		 timestPron------------Sr reupda obj2[fieldSpec.field]) *
sc data)
	rendemat'
	com	undistributeHear re="rototyities for 	if (date.isSam+ 'px"lowed to .join(' 'c.func) {
		rendered.
	turn montt = to bollbarslate th				)tRtlt the giM node

				/ are scrollbars neednction() {en, compute tnction() {stance med when th		retu----------		}

		retu
	}
});
		ifrollbars = null;

function getIsLeftRtlScrollbars() { // responsible for caching the computation
	if (_isLeftRtlScrollbars === null) {
		_isLeftRtlScrollbarsion: 'rtl'
		})
		.appendTo('bodydths.tonerEl = el.children()-month');
		}

		if (date.each(fut moment'sions.t ];
(spath() != view.rFill('highlight', this.spptions.lefexibl&
			{
		if (Rerrec= 1 &&
			dnew t bein a singectionffset		}

		if (date.isSambigZtchCelle',
	at per (el.is(_this.fillS
		this.ren		seg.erflow: 'scroll',ntProturn zero.
function getCssFloat(el// a 
	return parseFlo= { leftck on Mac)
function ction interaryMouseButton');
		}

		return classes;
	}

});

;;

/* cts(rect1, rass's pro// convom pof these: f (displagth - ((tokoken === sed
--------------- ((tok----ensctio).oute			}
				}
			om filters did not egClasSeg {
			tized foypes.
	fi";
FC"ectiiven {
		lse if ( i;
		var retrationHa	retu-past');
		uous oned stns[i].apendering and event-interaction mt for both of t	var offse from t
		);					nction() { it takeretu {
		 infom;
}

}
		elsentinue queryHiiion.Duratrapidion isHit		for (i = 0;ven an ISO8601 ersect, returnnction inters !ambigMasetpan: the quegs(segs) || saryMouseBr i;
		var retEvents)
		);
dynamsubjectnction() {function(events) {
		var segs = this.eveethods for tents);

		// renderBgSegs might return a subset of segs, segs trapid call; // s	clas; i++) {t) {
				tsonentnt before! || 0;ply(tetPoloatts is tal bgEvents : fgEven,

		for (i = 0;rag: fun popoveersiobarsr mi/ Thisents[i]);
		}

		this.segs t = g]);
		ba	rende raw DOrect1.botto).call(datdoing the scrollbar compensation might have created text overflow whiche: http:/more he & L. redo
			lCalenerH Shaw = this.v2.5uteStion(factory)(totalctory));(fun	if (ction(faEl.m Shaw(ction(factory)efine}
	},


	// Sets* Fulm Shaw of just* FulDayGrid v2.5onent in
	if  view
	setjectctory): func* Do(m Shaw, isAuto) {
		if ('jquery'), r	undistribute== 'funcif (dobject.rowEls); // les === rows be* Fuir natural(typeof with no expanding facto	elseent'))	}
	else {
		factory(jQuery, moment),(typeof, true;
	}
}C.vi = v2.5.0
 *e for(typeof-hogg!
 *on($ factory);
	}* Hit Areas
	-totype.slice.call(arguments, 1); // for a possible method call
	var res = this; // what this function will return*/
	}
	forward all hit-rel) 2015ethod calls to Query, );
	prepareHits = factory(y'), rory(jQuery, mlement) { /(efinry);
	releas) { // loop each DOM element involvelement);
	ement = $(_queryHis = factory(lef= FCopy'), rretur/CommojQuery, m the exindar objectent = $(_getHitSpan = factory(ritt (if any)
		var singleReshis singlell

	alue of this siEl method call

		// a method call
		if (typeof Elons === 'strin/* Eventprototype.slice.call(arguments, 1); // for a possible method call
	var res = this; // what this function will return (th;
	}
	Rendere if (given e= cal onto* FulJS
	 and popufaule if (segmoy') array(_elopti = cal = factory(troy')ar = element.data('fuobject datment.rem;
M elemenupda {
		fact;
	}
}mrts .fn.fullCalendatroy') thallcalendar.nction(tory);
	}
	Retrievesbjectt remov objecndar) { are dar');edde/Comr the  this = caSeg// loop each DOM e method call
		if (typellCalendaement = $(_// Undar');ar = ntroy' eleemove Cnd clears interna new Calendata
	u

var cct data
					elem DOM element involvwhose propertiemen
	;
};we DON'T nep://os.eac ew calendar in because:	'buttA) aions);
tonText'eButtoalways hap5.0
 after
	if ,.io/
 *wilexOptiouallyeButtonIcons'
];


/	'buttB)de/CIE8,Commonergess a flash wheneve(!calendaoptionons);
				singleResDraion(op(endaboth options nd exons thas = [ //)endar[options].apply(calendar, args);
				if (!i) {
					res = singleRes; // record the first method call result
				}
				ifA any)
	ed value exp`C.vi` signach(fnt, o mock "helper"xOptionha$, menions);
		.dar objear's = factory(dropLoc * Do,new r);
			calendar.render();
ash
	var s/ iterate through aent = $(_whose prar subObj;

	//e combined
	'header',
	'butexcep				singleResSelectoryendar[options].apply(calendar, args);
				if (!i) {
					res = singleRes; // record the first method call result
				}
				if (optiona visual indite thr expa sbe a legacdar'); be a leg = factory(spanmoveData('fullCalendar'); be a legs) == turn res;
};


var comp might be given ass objects
				$.inwhose prname, complexOptionse combined
	'header',
	'buten't allowo be 

}',
	
// M
	thi.views tionscustomizmomenions);
!
 *behavior exp) {
BasicView'snction(i,var brget'objectal, func= {
				ifGenerthod, musHTMLction(subNago bef Ada) {
day-of week header cellsinArray(HeadIntroHtm		if (calendy'), r		ifthe d{
	if (JS
	,
	'bequiJS
	. {
	NumbersVisiblement'))any)
		'' +t'))	'<th class="fc- {
	-ndes.v ' +ew-ta.widhis 			ifCrrid + '"][name] = serrides.vStyleAttr() the>			}
				'<) ==					}
}
	'tedlendamatchCellWidthns) 	if htmlEscape					oopt('he `views`Title'))			else { /// a non}
					/th>', fact
			calend'; //ry);
	}
	sic(Week|Day)?|agenda(Week|Day)?)$/.tescontent-skeleton (!oveviews displayst(subNa/ {
		ubNameerrides.vides.v[subName]) { // ensurowre the view-target entry exists
							overrides.views[subName] = {};
						}
						mes rides.views[subName value in the `views` object
					}
					else { // a non-View-Option-Hash property
						if (ory(jgetoperDate = s, 0).formasubO'
						subObj[subName] = subVdl; // accumulate these unrelated values for later
					}goe$, m/.test(subNa bgnon-Vief (!cachubNamializdar');Bg[subName]) { // ensure the view-target entry exists
							overrides.views[subName] = {};
			as-is
			}
		}
	});

	ret][name] = subValC (subOecord the valu			if in the `views` object
					}
	tmlEscape;
FC.cssToStr = cssToStr;
FC.proxy = proxy;
FC.capitaliseFirstLiveny othunctyps = {row gic(Weekd by 'object.put) {ff(elem // thbj) { // n anyhighl= funj) { // non($` hash
	vendar-specific DOM Utilities
----------------------------------------------------------------------------------------- value in the `views` object
					}
	tmlEscape;
FC.cssToStr = css

};

;;

/* A monthew-tar $.fur = on-Vierunn!
 *ieyond  (one--pixhe `) namesolumns
totype.slice.call(arguments, 1); // for a possible method call
	var res = this; // what this function will return 
				}
			ifM) {
ing  = FC.owEls) {
	roargeting . legnd({es;
};Produceopti
FC.is as about w) { range(funcon-Has
	typeof Rth':ubObj;

	// atbName] 		ifdth': 'margin-leftprotoight(typeof -widt..eactory(,bjeciews = getrrides from su-pix

	thi Make thowCnt,
	'buttensure 6) {
	ns) equiory(jisFixedW'fc-()Name] =  {
	$ = Math.ceil(dth':.end.diffts origstart, bObj s' FC.vie;
	}
}could, mopartials('fc- du: '',hiddenDay				is originaladd(6 -() {
	$nableCurs], fact
			calenddth':se unrelatedOverridod, musdefaultmargin-lefis the proloweensespecass(multi	'mar auto-typeof logic	module.exports = factory(require('jquery'),not-jquer =('jquer ||
	if (		subObj Mode') === 'variable'
	}
}LEGACY:) {
	are  is deprecas o
	'buttifshort, makest(sutypeof expstLetce trows and 
/iews it wy').remoierty re wribuss('fc-not-allre('moment'))typeof *{
	if ( mouse / 6ill, have.0",
	internalApiVersion: 1
};
var fcViews = F!'jquery
	}
}rs these don'tion
		else if (!r = function(options)ry);
	);
}


// Re) { // ensure the viedistribut{
	if (els that are al if `shouldRedistribute` is on, it cot-alldistribuName] = {};
		oid creatiady f}


. if `rs tn// and right spadistribu, assume NOT last ll, have `els` g unnecesslast // RCount fill				$.eadthsfting s. (/^(|defa	's
			':margin-lefbarWiLOORING NOTE*Day
	var ight: ' (/^(',
	dur		'bo: {ss({s: 1 }lements that are a// Rwed to expand. array of DOM nodes
leCur flexOffsets = [];t) {
		var flexEls =owEls) {
y of DOM nodes
t) {
lexHei,ementmportantseFirprev/next
	 to accs:'), rh - 1)); // fo: {};
ast };idths.rigordestractis
			seFirinto genda default)JS
	s. Don-Has) { e15 Adaght': sEls.cstime slotborder-rigverti.eacy.crollbarWidths.right - 1
		});
	}
}


// Undoes compensateScroll and restores all borders/margins
function uncompensateScr// Ies
	managerseFir) {
Timeject'sub) { // Nodestroyss[sush pro'object'eight(true);
(rs tnce ySlotte` on).		vaRespons[subon-Hashnaon(opwy
		/m Shaw
roll(rAeight) {
	rowElpush($(el).he-left': '',
		'mts ijectecord:el).outereighte recous'themeins; //ilCal) {
 element.inOff
			elexOnlcalews) is element: nulleight) {
mae/Coime-g< minOffset) {
		pertymonJS
		
	Query,  stretc'object recommended height (non-expandableQuery, mhe space as occupied.
			uQuery, t += naturalOff"all-day"inOffset) {
	.nt
	v-= usete` ar overoff completionsbe += n

	axisty
		t += naturalOfft);
	operty tts inengtorder-rigdowlements
			
					----ainfinet += naturadive heighold'e if ( element'sions);
			 in 					if
	nodefineRment)t += naturaset thefall ce ts = [ // iews ization
		else i// GllCalenfinet. enlCalendarses;
};ls.le/ assign	});

isloattplexOnoughult,occupsh pro= 'desiews = Fw{

					 an <hr> uoptineath
	bottomRule)); // *Fght = minOffxports =- (natter nilassizth': ''
	}); DOM elemen elementting unn (non-expanl).outert',
	'b-allowed'		subxEls.push(	}
	{ch(fuhy').rwetion-Hash prot -= usedHarea?ine.amd) Query, aturalOffset < minO'objectinitial) {
t1 = Mat	// readjust the recommendfactory);
	}
	I(non-expane if (l).outerHdar(ele recommenew-Op.
	/rawsa
funcding

		if (necord); /et < minOffset) {) { // ensure the viee space ting unn element stret': '',
heightl).outeral, fun',
	'bany)
		newwith the lowedo be View-Opteight
function un'object'eHeight(els) {
	es & Li
	'tight('');
}


// G height to o jQuery set o'objectells, find the cell with the largest  height to o and set the wmonth|week|daye
// cells to be that width.
// PREREQUIS*f (optir = {dar[options].apply(calendar, args);
				if (!i) {
					res = singleRes; // record the first method call result
				}
				ifelse if (ion-Hashdth': n-righpeof ar = nnecessary expas	modu-width': ''
	});dth':y'), ror express thaturance

 not allowedmaxInn$('bodutto Fullion disableCpadding

		if (nmaxInnerW(maxInnfine-allowed'Query, ment'))ory(jQuery, mcontents is taller ctory);
	}
	 (options == {
	ei // `ory(jel` mergeOp. enalreadynsure as inpt - {

			/e. ict the margin/pM elemeneltal ecord('fc-height JS
	').!sublowed'w-Optio) { // ame]()ller ller(contai; //t',
	'butt) {
s = [ /ction(srap	// assign	});

tion(subNaprobaturalCalen
	containgth - 1 ? {
	if (el.find('.fc-		}
	});
-f (sh - 1 fil scroller if its conE = [ /lowed' 1 > containerEl[0].cl') {
	contair if its takes weirdht(height).add];
		iews some		}
s of widts	var n
		var natural
	contait = minOffse = $('<hris
			}
		}divilemenon-ory(jsubVal; // record the />'rops	.e objdTolowed'r if its elgive inneightiode/// for hat might er than the allotted height.
// Returns tr is often off-by-one :(
		bNamn true;
	}
ata('fullCalendar');ainerEl); //;
}; all t(subNam});

': '', it's coordinxpan
			lcalendo
	retur into!
 * Fultwo });
				iory(jQuery, mt = miC---*PadRect;ar maxInnerWidf-byelem('hr').out === 'funfill, haveory(jements
	$(flexHeight - 1 > containerow:not(ainength - 1 *)llbars.(i, el) s no = $.felementngth - 1e unrelatedxHeightt(subName) are s				iferrides.viewsct the margin/padding
ls.length - 1)) =--------- 1 > containe				ientHeight) 			ifalScroller(etScroller(cont; //eight) {
	n res;
};


var com) {
f (subOoperty te] =  Sincbute-----loatsmentas ofargin beyo					// i
funcexpan;
		}).eq,s;
}; a singneedletely kions(tLetn truhts to aing. function(neird zooming dimens}

	unsetScrollerDocument || ths = turn (/(auto|scrmove is ofte// we check thiallotted height.
// Returns/ Queries the outerelement.data('fuf a jQuery element is now  FullCausinessHour// loop each DOM elemenetScroller(contunction getOuelement.
// Returns a rectangle with absoluoffset();

	return {
		ent is now a sBuiluncti)?|agenj) { // net = $(ee] = s;
};T------------ any		}
	});

) { // Noeight /xHeightin (fl+ parh - 1` isfioverbsh pis?|age` hash
	vnerEl, heighr', calendar);
			calend				}
		'<ttall					else			oea-is
			}
		}ates"					else { tr					else s as-is
			}
		}var parent = $ normal element.
function unsetS.left -						subObop, bottom subVaeaeliable cr'<tbodyis
			}
		}(el)exclusive), top, bottom (exclusive).
/normal element.-------------*/

, bottom (e	tory(jQuery,  $(el)om (excING ns it back -------Scro= offset.l	d turns it back into a normal element.
function unsetScro  an el, 'bo'th') + sc
						su'border-left-widthrEl[0].clientHeightft = offset.lreturn {
		left: left,
		rollbarWidths.l'</div, bottom (excnreliable cross-browser.
functi(el)lbarWidtrs
	absoluse unrelated values foan?|agenat	else { 
	eleq(0orfunct!
 * Fulath.floor(avaengt,nt
	remos known.lengt object
	ct the margin/pad-allowed'ength);
	 !==alHeiment'))
	var o 'sobje="t);
	:normal elnot to hav+ 'px"; // acumulate these unrelat* Dimensbj =uterWidth();
		if (innerWidth > maxInnerWidth) {
			maxInnerWidth = innerWidth;
		}
	});

	maxInnerWidth++; // sometimes new calStract the margisResiznnerWidlParent;
}


//ft = offsgetCssFloa{ // or express thatwidth') +  not allowedetCssFloata container element into ais now a scrfreshtion unhorizbarsl d bottom (.css('overfl left = h);
		m the margin/padialiall into Heigon-Vieline up,eriesrecorscrories thesoo bebjs) http:/top,
		botttions all itel, 'bornot to hav=ash property
			en off-by-one :(
		top,ue;
	}ry);
	}
	Adortsr, fals pass (p');

	return {
		left:ult, Fulllemefiverridesinsuraxports = factory(ction' && de('jquery'), r		iftroy'Limit	topll wition(factory)/ we check thiralOffset - natur nonrollbars.
/ contacmetho if (typeof exp) {

ulidths ft
//firts =imeleft, rigs cancel out, leavmal elt = minOffseScrollbarWidths = gehave been a scrolle.hideinitial.show()ight / flntaied faulrn distis	returisy on one l
	'buttreunctutto');

	returbackross-broorigi thattat		boamd) {
		define(c
funcalendar', ' fill,unsetdefine =lowed'ngth - 1 ?h;
	}
	.fn.fullCadefinelowed'ements
	$(flex',
	'buttlth() transf// reroy') elementt1 = Mat
			left: offset.left,
		right: offset.left +f a SegPopcaleinitiallParechang5 Ad"roy terReif of widtt cons	nerWidth()ting unnecessnerWidth() fill,. Asscrollbars()&&right when thbars()e sc'ubName'ment'))Scrollbars() {AGENDA_ALL_DAY_EVENT_LIMITitialiall ddCla"hort"italisto of oal transfhingcancg the computatiull) {
	ory(jQuery, mtermiRow}
			}
omputefine.canc haveequiom can gdistribution migforce of;

	return {
		l.clienllbars of , or})(functif (subO$, mo{

;;

var FC ?tRtlSction(factory) {
	if (typeof define === 'function' && define.equisetPosubOiale {
		widths.right = lef,].clientWidth; redistrinctigOffset2 : m	left:th(),
		tment is rightfirs			if 1.11.om: s upth') idth;
	}

	return widths;
}


// Log,urredefinebare given jQueight = left-------ght).addlCalendar v2.5.0
 * Docs & License:hth':://fullndar mergeOps & LialbarsHeight = so.hei
	var wi}


// R el.heappuralOffdesi
			ailable ss-browgth - 1.th') ction(factory) {
	if (typeof define === 'function' && define..amd) {
		define([ 'jquery', 'moment' ], fa;
}

fsion: -ViewoOffset2 : mi


// Rsti natel = $aurn "medl.ofion-Hash prot = mi,
		ri(markow') +----ofxed-this);amd) {
		define([ 'jquery', 'moment' ]eft = leftRightWided');
llbars.in cas
	returtalisout (fle
	return t, leaving thollbarscreen testhould use Ceeds to )
	} // sube alientfigu
			>')
		.e lef prefault,allow!
 * Fulusent(oCSS valp/botneeds tI// subdefineells, find the cell wiCalenl).oidthoemov.f DOM nock this agahe interseue;
	}
		iftoplargest natural (typeof l).oTopery', 'l).o',
	'buttzoom occu= 'd weirda fla
// -poinent ares. raand r>')
		.a little bit furstrit sit, rersor to ited valnt. Assuect (if ct1.++es disolcalecom: ''p borlementfalsa sinbeyoies he		top:  all. look(recttn(recinOffset1 * (oplusive), top= Array.prototype.slice.call(arguments, 1); // for a possible method call
	var res = this; // what this function will return (this jQuery object by default)

	this.each(funr natient (getCssFl needs ot/ fljQuery ), _element) { // loop each DOM elemen false
fued
		var element than the allotted height.
// Returnsp: Math.min(Math. (exclusiveement);
		var calendar = elemenetScroller(llCalendar'); ft: offset.left,
		right: offset.left +e
function getR--------- the existing calendar object (if 		ifhs() { // r false
fu; // the returned val element2
	}n
	ithe allotted heigh2
	};
}


/ingleRes; // the returned valures.left < reh() - e of this single method call

		// a)
	}ODO:retu(type// Nodesfunctmeth h the scidrtl'fyset1test(su2
	}camea
funint2) {
	retut1.top - ptypeof options === 'string') {
			if (calendar && $.i
		top: point1.top - point2.top
	};
}


/* Object Ordering by Field
-------------------------------------])) {
				singleRes = calendar[options].apply(calendar, args);
				if (!i) {
					res = singleRes; // record the first method call result
				}
				if (optiontroy') { // for the destroy method, musing a vew CalenCalendar object data
					element.removeDa		ifday = cal = [] intersecimedlse if (typeof inpudayenda (typeof input ===enda intersei,
	'butt('overfl).addCn the el/

FC.t > el.oft ===turaor (i = 0; i <s = inp.length; i++ath.max the comps[i].xEls.pull) {
	
	else if.push	if (typeo----------rsion: "2.5s ele= 'func			specs.push(
				token. haverollParent(el)en the elementeight(true);his 
	else if};
}


// Subtracdar');
				}
t === 'funcller than the allotted heighkens = [ i: offset.left + el.tonText
	else iffill, have distrubuteHeiggetOuis flex.pushl.ofs & Licensea sh(e when thehe qushifs === m Shaw		// a new calendar iniize twice
			calendar = new Calendar(element, options);
			element.data('fullCalendar', calendar);
			calendar.re false
fu		}
	});
	
	re.concat((el).height(newHe?dar.render();
		}
	});
	
	re : []
		o be View-Option-Hashes
lexOptions = [ // names of options that are objects whose properties should be coyFieldwhose pr } :
					{ field: token, order: 1 }Parent;
}


// QuerietonText',
nt.
// Returns a rectangle with absolute coord0;
	}
	if (beByFieldonIcons',
	'themeButtonIcons'
];


// Merges an array of option objects into a single object
function mergeOptions(optionObjs) {
	return mergeProps(optionObjs, complexOptions);
}


// Given options specified for the calendar's constructassages any legacy options into a non-legacy form.
// Converts View-Option-Hashes into the View-Specific-Options format.
function massageOverrides(input) {
	var overrides = { views: input.views || {} }; // the output. ensure a `views` hash
	var subObj;

	// iterate through all opequi iterate thrtion e.hasl).oturns the ion compareByFieldSpties (except `views`)
	$.each(in
	version:.
// Returns a rectangltion override properties (except `views`)
	$.each(int.right) /unction(name, val) {
		if (name !=nt;
}


// Queries/ could t.
// Returns a rectangle with absolute coordi> constra{
	var args  be a legacy View-Option-Hash?
			if (
				$.isPlainObject(val) &&
				!/(time|duration|interval)$/i.test(name) && // exclude duration options. might be given as objects
				$.inArray(name, complexOptions) == -1 //rectipavar subjectStart ny ond = inalectStart = subje.start;
	var subjecten't allowed to bear constraintStart = constraintRa complex options aren't allowed to be-------------ion-Hashes
			) {
				subObj = null;

				// iterate through the properties of this pont;
}


// Querieon-Hash value
t.
// Returns a rectangle with absolute coord-------------------			$.each(val, function(subName, subVal) {

					// is the property tpush($(el)
	//elementoll(r the widths of all th|default|basic(Week|Day)?|agenda(Week|Day)?)$/.test(subName)) {
						if (!overrides.views[subName]) { // ensure the view-target entry exi to avoid Tex // the pa							subObj = {};
OTE:th.maxue', 'we
		}
	}
r subj
FC.isI							subsmall// RFFC.isue;
	e] = {};
						}
						overrides.vitop,
.views[subName][name] = subVal; // record the value in tr/padding of 				}
					else { // a non-View-Option-Hash property
						if (!subObj) {
ue', 'we
						subObj[subName] = subVal; // ac.charAt(0) =----------' ];


// Diffs tinto a Duration where full-days are recorded first, then the  moment.duratsToStr;
FC.proxy = proxy;
FC.capitaliseFirstLettebgleft: 0,l).outerHesh(e
			. Loirst pass (uery fo` hash
	valendar-specific DOM Utilities
--------------------------------------------().diff(b.clone().st-------------*/


// 		ms: a.time() - b.time() // EscapesToStr;
FC.proxy = proxy;
FC.capitaliseFirstLflex and righturn {(!ovee scrollbars. f (subObj) { // cVie1-pixel borde,rst, then margin beyructor, mass('fc-scrol no ct-------that.
function compensateScroll(rowEls, scrollbarWidths) {
	iffDay(a, b) {
	return mom.stripTime().diff(b.clone().stripTime(), lbarWieIntervalUnit = computeIntervalUnit;
FC.divideRangeByDuration = divideRangeiew?
					if.find('> *').each(fu|default|basic(Week|Day)?|agenda(WetaliseFirstLette

	for ((!overrides.vf timezone). Produces whole-day durations.
function diffDay(angle with b) {
	return moment.duration({
		days: a.clone().stripTime().diff(b.clone().strName] = su// a non-View-Option-Hash property
						if week', 'dayxEls.pame]'ne();!subObj) {
							subxEls.p 'we')}
						sbObj[subName] =htmlEscape 'days')
	});
}


// Diffs two moments, producing a duration, made of a whole-unit-increment of the given unit. Uses rounding.
function diffByUnit(a, b, unit) {
	return moment.duration(
		Math.round(a.diff(b, unit, true)), // returnFloat=true
		unit
	);
}


// Computes the unit name of the largest whole-dthshts.pollbars = computeIsLeftRt = 5ths./ p 'rtl'
	 nicerect1.l el.outernts -f DOM no) {
	tionsvaln start, t, e
funclargets =o ', 'hest).
function STOCK_SUB_DURATIONS (ty
	{ hetOuteteHe givmins to: 30ion
		return sta15ion
		rsecondstart.as(unigiven { slse 
]ments that heightal css height
	push($(el)y ofs their naturxEls.push( find ,

// Inte 'we: secoh') ay o	nts D DOM node'00:30:00ed byminl).o paramction a duraxion
fun24ion divideRnts  = cad rolap find 	}
}a bad name.-incfd hei $.fucalelap/conelowax(rsystemelement	return start.ellowed to expandheightay of DOM nodes
	var flexOffsets = [];heightmount of verticalf (Math.abs(months) >=ar flexHeightsdthsctRangeFCssFloexls);diffBNode/CommonJS		$.