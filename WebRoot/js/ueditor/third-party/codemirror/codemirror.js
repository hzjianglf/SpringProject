// CodeMirror version 2.2
//
// All functions that need access to the editor's state live inside
// the CodeMirror function. Below that, at the bottom of the file,
// some utilities are defined.

// CodeMirror is the only global var we claim
var CodeMirror = (function() {
    // This is the function that produces an editor instance. It's
    // closure is used to store the editor state.
    function CodeMirror(place, givenOptions) {
        // Determine effective options based on given values and defaults.
        var options = {}, defaults = CodeMirror.defaults;
        for (var opt in defaults)
            if (defaults.hasOwnProperty(opt))
                options[opt] = (givenOptions && givenOptions.hasOwnProperty(opt) ? givenOptions : defaults)[opt];

        var targetDocument = options["document"];
        // The element in which the editor lives.
        var wrapper = targetDocument.createElement("div");
        wrapper.className = "CodeMirror" + (options.lineWrapping ? " CodeMirror-wrap" : "");
        // This mess creates the base DOM structure for the editor.
        wrapper.innerHTML =
            '<div style="overflow: hidden; position: relative; width: 3px; height: 0px;">' + // Wraps and hides input textarea
                '<textarea style="position: absolute; padding: 0; width: 1px;" wrap="off" ' +
                'autocorrect="off" autocapitalize="off"></textarea></div>' +
                '<div class="CodeMirror-scroll" tabindex="-1">' +
                '<div style="position: relative">' + // Set to the height of the text, causes scrolling
                '<div style="position: relative">' + // Moved around its parent to cover visible view
                '<div class="CodeMirror-gutter"><div class="CodeMirror-gutter-text"></div></div>' +
                // Provides positioning relative to (visible) text origin
                '<div class="CodeMirror-lines"><div style="position: relative">' +
                '<div style="position: absolute; width: 100%; height: 0; overflow: hidden; visibility: hidden"></div>' +
                '<pre class="CodeMirror-cursor">&#160;</pre>' + // Absolutely positioned blinky cursor
                '<div></div>' + // This DIV contains the actual code
                '</div></div></div></div></div>';
        if (place.appendChild) place.appendChild(wrapper); else place(wrapper);
        // I've never seen more elegant code in my life.
        var inputDiv = wrapper.firstChild, input = inputDiv.firstChild,
            scroller = wrapper.lastChild, code = scroller.firstChild,
            mover = code.firstChild, gutter = mover.firstChild, gutterText = gutter.firstChild,
            lineSpace = gutter.nextSibling.firstChild, measure = lineSpace.firstChild,
            cursor = measure.nextSibling, lineDiv = cursor.nextSibling;
        themeChanged();
        // Needed to hide big blue blinking cursor on Mobile Safari
        if (/AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent)) input.style.width = "0px";
        if (!webkit) lineSpace.draggable = true;
        if (options.tabindex != null) input.tabIndex = options.tabindex;
        if (!options.gutter && !options.lineNumbers) gutter.style.display = "none";

        // Check for problem with IE innerHTML not working when we have a
        // P (or similar) parent node.
        try { stringWidth("x"); }
        catch (e) {
            if (e.message.match(/runtime/i))
                e = new Error("A CodeMirror inside a P-style element does not work in Internet Explorer. (innerHTML bug)");
            throw e;
        }

        // Delayed object wrap timeouts, making sure only one is active. blinker holds an interval.
        var poll = new Delayed(), highlight = new Delayed(), blinker;

        // mode holds a mode API object. doc is the tree of Line objects,
        // work an array of lines that should be parsed, and history the
        // undo history (instance of History constructor).
        var mode, doc = new BranchChunk([new LeafChunk([new Line("")])]), work, focused;
        loadMode();
        // The selection. These are always maintained to point at valid
        // positions. Inverted is used to remember that the user is
        // selecting bottom-to-top.
        var sel = {from: {line: 0, ch: 0}, to: {line: 0, ch: 0}, inverted: false};
        // Selection-related flags. shiftSelecting obviously tracks
        // whether the user is holding shift.
        var shiftSelecting, lastClick, lastDoubleClick, draggingText, overwrite = false;
        // Variables used by startOperation/endOperation to track what
        // happened during the operation.
        var updateInput, userSelChange, changes, textChanged, selectionChanged, leaveInputAlone,
            gutterDirty, callbacks;
        // Current visible range (may be bigger than the view window).
        var displayOffset = 0, showingFrom = 0, showingTo = 0, lastSizeC = 0;
        // bracketHighlighted is used to remember that a backet has been
        // marked.
        var bracketHighlighted;
        // Tracks the maximum line length so that the horizontal scrollbar
        // can be kept static when scrolling.
        var maxLine = "", maxWidth, tabText = computeTabText();

        // Initialize the content.
        operation(function(){setValue(options.value || ""); updateInput = false;})();
        var history = new History();

        // Register our event handlers.
        connect(scroller, "mousedown", operation(onMouseDown));
        connect(scroller, "dblclick", operation(onDoubleClick));
        connect(lineSpace, "dragstart", onDragStart);
        connect(lineSpace, "selectstart", e_preventDefault);
        // Gecko browsers fire contextmenu *after* opening the menu, at
        // which point we can't mess with it anymore. Context menu is
        // handled in onMouseDown for Gecko.
        if (!gecko) connect(scroller, "contextmenu", onContextMenu);
        connect(scroller, "scroll", function() {
            updateDisplay([]);
            if (options.fixedGutter) gutter.style.left = scroller.scrollLeft + "px";
            if (options.onScroll) options.onScroll(instance);
        });
        connect(window, "resize", function() {updateDisplay(true);});
        connect(input, "keyup", operation(onKeyUp));
        connect(input, "input", fastPoll);
        connect(input, "keydown", operation(onKeyDown));
        connect(input, "keypress", operation(onKeyPress));
        connect(input, "focus", onFocus);
        connect(input, "blur", onBlur);

        connect(scroller, "dragenter", e_stop);
        connect(scroller, "dragover", e_stop);
        connect(scroller, "drop", operation(onDrop));
        connect(scroller, "paste", function(){focusInput(); fastPoll();});
        connect(input, "paste", fastPoll);
        connect(input, "cut", operation(function(){replaceSelection("");}));

        // IE throws unspecified error in certain cases, when
        // trying to access activeElement before onload
        var hasFocus; try { hasFocus = (targetDocument.activeElement == input); } catch(e) { }
        if (hasFocus) setTimeout(onFocus, 20);
        else onBlur();

        function isLine(l) {return l >= 0 && l < doc.size;}
        // The instance object that we'll return. Mostly calls out to
        // local functions in the CodeMirror function. Some do some extra
        // range checking and/or clipping. operation is used to wrap the
        // call so that changes it makes are tracked, and the display is
        // updated afterwards.
        var instance = wrapper.CodeMirror = {
            getValue: getValue,
            setValue: operation(setValue),
            getSelection: getSelection,
            replaceSelection: operation(replaceSelection),
            focus: function(){focusInput(); onFocus(); fastPoll();},
            setOption: function(option, value) {
                var oldVal = options[option];
                options[option] = value;
                if (option == "mode" || option == "indentUnit") loadMode();
                else if (option == "readOnly" && value) {onBlur(); input.blur();}
                else if (option == "theme") themeChanged();
                else if (option == "lineWrapping" && oldVal != value) operation(wrappingChanged)();
                else if (option == "tabSize") operation(tabsChanged)();
                if (option == "lineNumbers" || option == "gutter" || option == "firstLineNumber" || option == "theme")
                    operation(gutterChanged)();
            },
            getOption: function(option) {return options[option];},
            undo: operation(undo),
            redo: operation(redo),
            indentLine: operation(function(n, dir) {
                if (isLine(n)) indentLine(n, dir == null ? "smart" : dir ? "add" : "subtract");
            }),
            indentSelection: operation(indentSelected),
            historySize: function() {return {undo: history.done.length, redo: history.undone.length};},
            clearHistory: function() {history = new History();},
            matchBrackets: operation(function(){matchBrackets(true);}),
            getTokenAt: operation(function(pos) {
                pos = clipPos(pos);
                return getLine(pos.line).getTokenAt(mode, getStateBefore(pos.line), pos.ch);
            }),
            getStateAfter: function(line) {
                line = clipLine(line == null ? doc.size - 1: line);
                return getStateBefore(line + 1);
            },
            cursorCoords: function(start){
                if (start == null) start = sel.inverted;
                return pageCoords(start ? sel.from : sel.to);
            },
            charCoords: function(pos){return pageCoords(clipPos(pos));},
            coordsChar: function(coords) {
                var off = eltOffset(lineSpace);
                return coordsChar(coords.x - off.left, coords.y - off.top);
            },
            markText: operation(markText),
            setBookmark: setBookmark,
            setMarker: operation(addGutterMarker),
            clearMarker: operation(removeGutterMarker),
            setLineClass: operation(setLineClass),
            hideLine: operation(function(h) {return setLineHidden(h, true);}),
            showLine: operation(function(h) {return setLineHidden(h, false);}),
            onDeleteLine: function(line, f) {
                if (typeof line == "number") {
                    if (!isLine(line)) return null;
                    line = getLine(line);
                }
                (line.handlers || (line.handlers = [])).push(f);
                return line;
            },
            lineInfo: lineInfo,
            addWidget: function(pos, node, scroll, vert, horiz) {
                pos = localCoords(clipPos(pos));
                var top = pos.yBot, left = pos.x;
                node.style.position = "absolute";
                code.appendChild(node);
                if (vert == "over") top = pos.y;
                else if (vert == "near") {
                    var vspace = Math.max(scroller.offsetHeight, doc.height * textHeight()),
                        hspace = Math.max(code.clientWidth, lineSpace.clientWidth) - paddingLeft();
                    if (pos.yBot + node.offsetHeight > vspace && pos.y > node.offsetHeight)
                        top = pos.y - node.offsetHeight;
                    if (left + node.offsetWidth > hspace)
                        left = hspace - node.offsetWidth;
                }
                node.style.top = (top + paddingTop()) + "px";
                node.style.left = node.style.right = "";
                if (horiz == "right") {
                    left = code.clientWidth - node.offsetWidth;
                    node.style.right = "0px";
                } else {
                    if (horiz == "left") left = 0;
                    else if (horiz == "middle") left = (code.clientWidth - node.offsetWidth) / 2;
                    node.style.left = (left + paddingLeft()) + "px";
                }
                if (scroll)
                    scrollIntoView(left, top, left + node.offsetWidth, top + node.offsetHeight);
            },

            lineCount: function() {return doc.size;},
            clipPos: clipPos,
            getCursor: function(start) {
                if (start == null) start = sel.inverted;
                return copyPos(start ? sel.from : sel.to);
            },
            somethingSelected: function() {return !posEq(sel.from, sel.to);},
            setCursor: operation(function(line, ch, user) {
                if (ch == null && typeof line.line == "number") setCursor(line.line, line.ch, user);
                else setCursor(line, ch, user);
            }),
            setSelection: operation(function(from, to, user) {
                (user ? setSelectionUser : setSelection)(clipPos(from), clipPos(to || from));
            }),
            getLine: function(line) {if (isLine(line)) return getLine(line).text;},
            getLineHandle: function(line) {if (isLine(line)) return getLine(line);},
            setLine: operation(function(line, text) {
                if (isLine(line)) replaceRange(text, {line: line, ch: 0}, {line: line, ch: getLine(line).text.length});
            }),
            removeLine: operation(function(line) {
                if (isLine(line)) replaceRange("", {line: line, ch: 0}, clipPos({line: line+1, ch: 0}));
            }),
            replaceRange: operation(replaceRange),
            getRange: function(from, to) {return getRange(clipPos(from), clipPos(to));},

            execCommand: function(cmd) {return commands[cmd](instance);},
            // Stuff used by commands, probably not much use to outside code.
            moveH: operation(moveH),
            deleteH: operation(deleteH),
            moveV: operation(moveV),
            toggleOverwrite: function() {overwrite = !overwrite;},

            posFromIndex: function(off) {
                var lineNo = 0, ch;
                doc.iter(0, doc.size, function(line) {
                    var sz = line.text.length + 1;
                    if (sz > off) { ch = off; return true; }
                    off -= sz;
                    ++lineNo;
                });
                return clipPos({line: lineNo, ch: ch});
            },
            indexFromPos: function (coords) {
                if (coords.line < 0 || coords.ch < 0) return 0;
                var index = coords.ch;
                doc.iter(0, coords.line, function (line) {
                    index += line.text.length + 1;
                });
                return index;
            },

            operation: function(f){return operation(f)();},
            refresh: function(){updateDisplay(true);},
            getInputField: function(){return input;},
            getWrapperElement: function(){return wrapper;},
            getScrollerElement: function(){return scroller;},
            getGutterElement: function(){return gutter;}
        };

        function getLine(n) { return getLineAt(doc, n); }
        function updateLineHeight(line, height) {
            gutterDirty = true;
            var diff = height - line.height;
            for (var n = line; n; n = n.parent) n.height += diff;
        }

        function setValue(code) {
            var top = {line: 0, ch: 0};
            updateLines(top, {line: doc.size - 1, ch: getLine(doc.size-1).text.length},
                splitLines(code), top, top);
            updateInput = true;
        }
        function getValue(code) {
            var text = [];
            doc.iter(0, doc.size, function(line) { text.push(line.text); });
            return text.join("\n");
        }

        function onMouseDown(e) {
            setShift(e.shiftKey);
            // Check whether this is a click in a widget
            for (var n = e_target(e); n != wrapper; n = n.parentNode)
                if (n.parentNode == code && n != mover) return;

            // See if this is a click in the gutter
            for (var n = e_target(e); n != wrapper; n = n.parentNode)
                if (n.parentNode == gutterText) {
                    if (options.onGutterClick)
                        options.onGutterClick(instance, indexOf(gutterText.childNodes, n) + showingFrom, e);
                    return e_preventDefault(e);
                }

            var start = posFromMouse(e);

            switch (e_button(e)) {
                case 3:
                    if (gecko && !mac) onContextMenu(e);
                    return;
                case 2:
                    if (start) setCursor(start.line, start.ch, true);
                    return;
            }
            // For button 1, if it was clicked inside the editor
            // (posFromMouse returning non-null), we have to adjust the
            // selection.
            if (!start) {if (e_target(e) == scroller) e_preventDefault(e); return;}

            if (!focused) onFocus();

            var now = +new Date;
            if (lastDoubleClick && lastDoubleClick.time > now - 400 && posEq(lastDoubleClick.pos, start)) {
                e_preventDefault(e);
                setTimeout(focusInput, 20);
                return selectLine(start.line);
            } else if (lastClick && lastClick.time > now - 400 && posEq(lastClick.pos, start)) {
                lastDoubleClick = {time: now, pos: start};
                e_preventDefault(e);
                return selectWordAt(start);
            } else { lastClick = {time: now, pos: start}; }

            var last = start, going;
            if (dragAndDrop && !posEq(sel.from, sel.to) &&
                !posLess(start, sel.from) && !posLess(sel.to, start)) {
                // Let the drag handler handle this.
                if (webkit) lineSpace.draggable = true;
                var up = connect(targetDocument, "mouseup", operation(function(e2) {
                    if (webkit) lineSpace.draggable = false;
                    draggingText = false;
                    up();
                    if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
                        e_preventDefault(e2);
                        setCursor(start.line, start.ch, true);
                        focusInput();
                    }
                }), true);
                draggingText = true;
                return;
            }
            e_preventDefault(e);
            setCursor(start.line, start.ch, true);

            function extend(e) {
                var cur = posFromMouse(e, true);
                if (cur && !posEq(cur, last)) {
                    if (!focused) onFocus();
                    last = cur;
                    setSelectionUser(start, cur);
                    updateInput = false;
                    var visible = visibleLines();
                    if (cur.line >= visible.to || cur.line < visible.from)
                        going = setTimeout(operation(function(){extend(e);}), 150);
                }
            }

            var move = connect(targetDocument, "mousemove", operation(function(e) {
                clearTimeout(going);
                e_preventDefault(e);
                extend(e);
            }), true);
            var up = connect(targetDocument, "mouseup", operation(function(e) {
                clearTimeout(going);
                var cur = posFromMouse(e);
                if (cur) setSelectionUser(start, cur);
                e_preventDefault(e);
                focusInput();
                updateInput = true;
                move(); up();
            }), true);
        }
        function onDoubleClick(e) {
            for (var n = e_target(e); n != wrapper; n = n.parentNode)
                if (n.parentNode == gutterText) return e_preventDefault(e);
            var start = posFromMouse(e);
            if (!start) return;
            lastDoubleClick = {time: +new Date, pos: start};
            e_preventDefault(e);
            selectWordAt(start);
        }
        function onDrop(e) {
            e.preventDefault();
            var pos = posFromMouse(e, true), files = e.dataTransfer.files;
            if (!pos || options.readOnly) return;
            if (files && files.length && window.FileReader && window.File) {
                function loadFile(file, i) {
                    var reader = new FileReader;
                    reader.onload = function() {
                        text[i] = reader.result;
                        if (++read == n) {
                            pos = clipPos(pos);
                            operation(function() {
                                var end = replaceRange(text.join(""), pos, pos);
                                setSelectionUser(pos, end);
                            })();
                        }
                    };
                    reader.readAsText(file);
                }
                var n = files.length, text = Array(n), read = 0;
                for (var i = 0; i < n; ++i) loadFile(files[i], i);
            }
            else {
                try {
                    var text = e.dataTransfer.getData("Text");
                    if (text) {
                        var end = replaceRange(text, pos, pos);
                        var curFrom = sel.from, curTo = sel.to;
                        setSelectionUser(pos, end);
                        if (draggingText) replaceRange("", curFrom, curTo);
                        focusInput();
                    }
                }
                catch(e){}
            }
        }
        function onDragStart(e) {
            var txt = getSelection();
            // This will reset escapeElement
            htmlEscape(txt);
            e.dataTransfer.setDragImage(escapeElement, 0, 0);
            e.dataTransfer.setData("Text", txt);
        }
        function handleKeyBinding(e) {
            var name = keyNames[e.keyCode], next = keyMap[options.keyMap].auto, bound, dropShift;
            if (name == null || e.altGraphKey) {
                if (next) options.keyMap = next;
                return null;
            }
            if (e.altKey) name = "Alt-" + name;
            if (e.ctrlKey) name = "Ctrl-" + name;
            if (e.metaKey) name = "Cmd-" + name;
            if (e.shiftKey && (bound = lookupKey("Shift-" + name, options.extraKeys, options.keyMap))) {
                dropShift = true;
            } else {
                bound = lookupKey(name, options.extraKeys, options.keyMap);
            }
            if (typeof bound == "string") {
                if (commands.propertyIsEnumerable(bound)) bound = commands[bound];
                else bound = null;
            }
            if (next && (bound || !isModifierKey(e))) options.keyMap = next;
            if (!bound) return false;
            if (dropShift) {
                var prevShift = shiftSelecting;
                shiftSelecting = null;
                bound(instance);
                shiftSelecting = prevShift;
            } else bound(instance);
            e_preventDefault(e);
            return true;
        }
        var lastStoppedKey = null;
        function onKeyDown(e) {
            if (!focused) onFocus();
            var code = e.keyCode;
            // IE does strange things with escape.
            if (ie && code == 27) { e.returnValue = false; }
            setShift(code == 16 || e.shiftKey);
            // First give onKeyEvent option a chance to handle this.
            if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
            var handled = handleKeyBinding(e);
            if (window.opera) {
                lastStoppedKey = handled ? e.keyCode : null;
                // Opera has no cut event... we try to at least catch the key combo
                if (!handled && (mac ? e.metaKey : e.ctrlKey) && e.keyCode == 88)
                    replaceSelection("");
            }
        }
        function onKeyPress(e) {
            if (window.opera && e.keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return;}
            if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
            if (window.opera && !e.which && handleKeyBinding(e)) return;
            if (options.electricChars && mode.electricChars) {
                var ch = String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode);
                if (mode.electricChars.indexOf(ch) > -1)
                    setTimeout(operation(function() {indentLine(sel.to.line, "smart");}), 75);
            }
            fastPoll();
        }
        function onKeyUp(e) {
            if (options.onKeyEvent && options.onKeyEvent(instance, addStop(e))) return;
            if (e.keyCode == 16) shiftSelecting = null;
        }

        function onFocus() {
            if (options.readOnly) return;
            if (!focused) {
                if (options.onFocus) options.onFocus(instance);
                focused = true;
                if (wrapper.className.search(/\bCodeMirror-focused\b/) == -1)
                    wrapper.className += " CodeMirror-focused";
                if (!leaveInputAlone) resetInput(true);
            }
            slowPoll();
            restartBlink();
        }
        function onBlur() {
            if (focused) {
                if (options.onBlur) options.onBlur(instance);
                focused = false;
                wrapper.className = wrapper.className.replace(" CodeMirror-focused", "");
            }
            clearInterval(blinker);
            setTimeout(function() {if (!focused) shiftSelecting = null;}, 150);
        }

        // Replace the range from from to to by the strings in newText.
        // Afterwards, set the selection to selFrom, selTo.
        function updateLines(from, to, newText, selFrom, selTo) {
            if (history) {
                var old = [];
                doc.iter(from.line, to.line + 1, function(line) { old.push(line.text); });
                history.addChange(from.line, newText.length, old);
                while (history.done.length > options.undoDepth) history.done.shift();
            }
            updateLinesNoUndo(from, to, newText, selFrom, selTo);
        }
        function unredoHelper(from, to) {
            var change = from.pop();
            if (change) {
                var replaced = [], end = change.start + change.added;
                doc.iter(change.start, end, function(line) { replaced.push(line.text); });
                to.push({start: change.start, added: change.old.length, old: replaced});
                var pos = clipPos({line: change.start + change.old.length - 1,
                    ch: editEnd(replaced[replaced.length-1], change.old[change.old.length-1])});
                updateLinesNoUndo({line: change.start, ch: 0}, {line: end - 1, ch: getLine(end-1).text.length}, change.old, pos, pos);
                updateInput = true;
            }
        }
        function undo() {unredoHelper(history.done, history.undone);}
        function redo() {unredoHelper(history.undone, history.done);}

        function updateLinesNoUndo(from, to, newText, selFrom, selTo) {
            var recomputeMaxLength = false, maxLineLength = maxLine.length;
            if (!options.lineWrapping)
                doc.iter(from.line, to.line, function(line) {
                    if (line.text.length == maxLineLength) {recomputeMaxLength = true; return true;}
                });
            if (from.line != to.line || newText.length > 1) gutterDirty = true;

            var nlines = to.line - from.line, firstLine = getLine(from.line), lastLine = getLine(to.line);
            // First adjust the line structure, taking some care to leave highlighting intact.
            if (from.ch == 0 && to.ch == 0 && newText[newText.length - 1] == "") {
                // This is a whole-line replace. Treated specially to make
                // sure line objects move the way they are supposed to.
                var added = [], prevLine = null;
                if (from.line) {
                    prevLine = getLine(from.line - 1);
                    prevLine.fixMarkEnds(lastLine);
                } else lastLine.fixMarkStarts();
                for (var i = 0, e = newText.length - 1; i < e; ++i)
                    added.push(Line.inheritMarks(newText[i], prevLine));
                if (nlines) doc.remove(from.line, nlines, callbacks);
                if (added.length) doc.insert(from.line, added);
            } else if (firstLine == lastLine) {
                if (newText.length == 1)
                    firstLine.replace(from.ch, to.ch, newText[0]);
                else {
                    lastLine = firstLine.split(to.ch, newText[newText.length-1]);
                    firstLine.replace(from.ch, null, newText[0]);
                    firstLine.fixMarkEnds(lastLine);
                    var added = [];
                    for (var i = 1, e = newText.length - 1; i < e; ++i)
                        added.push(Line.inheritMarks(newText[i], firstLine));
                    added.push(lastLine);
                    doc.insert(from.line + 1, added);
                }
            } else if (newText.length == 1) {
                firstLine.replace(from.ch, null, newText[0]);
                lastLine.replace(null, to.ch, "");
                firstLine.append(lastLine);
                doc.remove(from.line + 1, nlines, callbacks);
            } else {
                var added = [];
                firstLine.replace(from.ch, null, newText[0]);
                lastLine.replace(null, to.ch, newText[newText.length-1]);
                firstLine.fixMarkEnds(lastLine);
                for (var i = 1, e = newText.length - 1; i < e; ++i)
                    added.push(Line.inheritMarks(newText[i], firstLine));
                if (nlines > 1) doc.remove(from.line + 1, nlines - 1, callbacks);
                doc.insert(from.line + 1, added);
            }
            if (options.lineWrapping) {
                var perLine = scroller.clientWidth / charWidth() - 3;
                doc.iter(from.line, from.line + newText.length, function(line) {
                    if (line.hidden) return;
                    var guess = Math.ceil(line.text.length / perLine) || 1;
                    if (guess != line.height) updateLineHeight(line, guess);
                });
            } else {
                doc.iter(from.line, i + newText.length, function(line) {
                    var l = line.text;
                    if (l.length > maxLineLength) {
                        maxLine = l; maxLineLength = l.length; maxWidth = null;
                        recomputeMaxLength = false;
                    }
                });
                if (recomputeMaxLength) {
                    maxLineLength = 0; maxLine = ""; maxWidth = null;
                    doc.iter(0, doc.size, function(line) {
                        var l = line.text;
                        if (l.length > maxLineLength) {
                            maxLineLength = l.length; maxLine = l;
                        }
                    });
                }
            }

            // Add these lines to the work array, so that they will be
            // highlighted. Adjust work lines if lines were added/removed.
            var newWork = [], lendiff = newText.length - nlines - 1;
            for (var i = 0, l = work.length; i < l; ++i) {
                var task = work[i];
                if (task < from.line) newWork.push(task);
                else if (task > to.line) newWork.push(task + lendiff);
            }
            var hlEnd = from.line + Math.min(newText.length, 500);
            highlightLines(from.line, hlEnd);
            newWork.push(hlEnd);
            work = newWork;
            startWorker(100);
            // Remember that these lines changed, for updating the display
            changes.push({from: from.line, to: to.line + 1, diff: lendiff});
            var changeObj = {from: from, to: to, text: newText};
            if (textChanged) {
                for (var cur = textChanged; cur.next; cur = cur.next) {}
                cur.next = changeObj;
            } else textChanged = changeObj;

            // Update the selection
            function updateLine(n) {return n <= Math.min(to.line, to.line + lendiff) ? n : n + lendiff;}
            setSelection(selFrom, selTo, updateLine(sel.from.line), updateLine(sel.to.line));

            // Make sure the scroll-size div has the correct height.
            code.style.height = (doc.height * textHeight() + 2 * paddingTop()) + "px";
        }

        function replaceRange(code, from, to) {
            from = clipPos(from);
            if (!to) to = from; else to = clipPos(to);
            code = splitLines(code);
            function adjustPos(pos) {
                if (posLess(pos, from)) return pos;
                if (!posLess(to, pos)) return end;
                var line = pos.line + code.length - (to.line - from.line) - 1;
                var ch = pos.ch;
                if (pos.line == to.line)
                    ch += code[code.length-1].length - (to.ch - (to.line == from.line ? from.ch : 0));
                return {line: line, ch: ch};
            }
            var end;
            replaceRange1(code, from, to, function(end1) {
                end = end1;
                return {from: adjustPos(sel.from), to: adjustPos(sel.to)};
            });
            return end;
        }
        function replaceSelection(code, collapse) {
            replaceRange1(splitLines(code), sel.from, sel.to, function(end) {
                if (collapse == "end") return {from: end, to: end};
                else if (collapse == "start") return {from: sel.from, to: sel.from};
                else return {from: sel.from, to: end};
            });
        }
        function replaceRange1(code, from, to, computeSel) {
            var endch = code.length == 1 ? code[0].length + from.ch : code[code.length-1].length;
            var newSel = computeSel({line: from.line + code.length - 1, ch: endch});
            updateLines(from, to, code, newSel.from, newSel.to);
        }

        function getRange(from, to) {
            var l1 = from.line, l2 = to.line;
            if (l1 == l2) return getLine(l1).text.slice(from.ch, to.ch);
            var code = [getLine(l1).text.slice(from.ch)];
            doc.iter(l1 + 1, l2, function(line) { code.push(line.text); });
            code.push(getLine(l2).text.slice(0, to.ch));
            return code.join("\n");
        }
        function getSelection() {
            return getRange(sel.from, sel.to);
        }

        var pollingFast = false; // Ensures slowPoll doesn't cancel fastPoll
        function slowPoll() {
            if (pollingFast) return;
            poll.set(options.pollInterval, function() {
                startOperation();
                readInput();
                if (focused) slowPoll();
                endOperation();
            });
        }
        function fastPoll() {
            var missed = false;
            pollingFast = true;
            function p() {
                startOperation();
                var changed = readInput();
                if (!changed && !missed) {missed = true; poll.set(60, p);}
                else {pollingFast = false; slowPoll();}
                endOperation();
            }
            poll.set(20, p);
        }

        // Previnput is a hack to work with IME. If we reset the textarea
        // on every change, that breaks IME. So we look for changes
        // compared to the previous content instead. (Modern browsers have
        // events that indicate IME taking place, but these are not widely
        // supported or compatible enough yet to rely on.)
        var prevInput = "";
        function readInput() {
            if (leaveInputAlone || !focused || hasSelection(input)) return false;
            var text = input.value;
            if (text == prevInput) return false;
            shiftSelecting = null;
            var same = 0, l = Math.min(prevInput.length, text.length);
            while (same < l && prevInput[same] == text[same]) ++same;
            if (same < prevInput.length)
                sel.from = {line: sel.from.line, ch: sel.from.ch - (prevInput.length - same)};
            else if (overwrite && posEq(sel.from, sel.to))
                sel.to = {line: sel.to.line, ch: Math.min(getLine(sel.to.line).text.length, sel.to.ch + (text.length - same))};
            replaceSelection(text.slice(same), "end");
            prevInput = text;
            return true;
        }
        function resetInput(user) {
            if (!posEq(sel.from, sel.to)) {
                prevInput = "";
                input.value = getSelection();
                input.select();
            } else if (user) prevInput = input.value = "";
        }

        function focusInput() {
            if (!options.readOnly) input.focus();
        }

        function scrollEditorIntoView() {
            if (!cursor.getBoundingClientRect) return;
            var rect = cursor.getBoundingClientRect();
            // IE returns bogus coordinates when the instance sits inside of an iframe and the cursor is hidden
            if (ie && rect.top == rect.bottom) return;
            var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
            if (rect.top < 0 || rect.bottom > winH) cursor.scrollIntoView();
        }
        function scrollCursorIntoView() {
            var cursor = localCoords(sel.inverted ? sel.from : sel.to);
            var x = options.lineWrapping ? Math.min(cursor.x, lineSpace.offsetWidth) : cursor.x;
            return scrollIntoView(x, cursor.y, x, cursor.yBot);
        }
        function scrollIntoView(x1, y1, x2, y2) {
            var pl = paddingLeft(), pt = paddingTop(), lh = textHeight();
            y1 += pt; y2 += pt; x1 += pl; x2 += pl;
            var screen = scroller.clientHeight, screentop = scroller.scrollTop, scrolled = false, result = true;
            if (y1 < screentop) {scroller.scrollTop = Math.max(0, y1 - 2*lh); scrolled = true;}
            else if (y2 > screentop + screen) {scroller.scrollTop = y2 + lh - screen; scrolled = true;}

            var screenw = scroller.clientWidth, screenleft = scroller.scrollLeft;
            var gutterw = options.fixedGutter ? gutter.clientWidth : 0;
            if (x1 < screenleft + gutterw) {
                if (x1 < 50) x1 = 0;
                scroller.scrollLeft = Math.max(0, x1 - 10 - gutterw);
                scrolled = true;
            }
            else if (x2 > screenw + screenleft - 3) {
                scroller.scrollLeft = x2 + 10 - screenw;
                scrolled = true;
                if (x2 > code.clientWidth) result = false;
            }
            if (scrolled && options.onScroll) options.onScroll(instance);
            return result;
        }

        function visibleLines() {
            var lh = textHeight(), top = scroller.scrollTop - paddingTop();
            var from_height = Math.max(0, Math.floor(top / lh));
            var to_height = Math.ceil((top + scroller.clientHeight) / lh);
            return {from: lineAtHeight(doc, from_height),
                to: lineAtHeight(doc, to_height)};
        }
        // Uses a set of changes plus the current scroll position to
        // determine which DOM updates have to be made, and makes the
        // updates.
        function updateDisplay(changes, suppressCallback) {
            if (!scroller.clientWidth) {
                showingFrom = showingTo = displayOffset = 0;
                return;
            }
            // Compute the new visible window
            var visible = visibleLines();
            // Bail out if the visible area is already rendered and nothing changed.
            if (changes !== true && changes.length == 0 && visible.from >= showingFrom && visible.to <= showingTo) return;
            var from = Math.max(visible.from - 100, 0), to = Math.min(doc.size, visible.to + 100);
            if (showingFrom < from && from - showingFrom < 20) from = showingFrom;
            if (showingTo > to && showingTo - to < 20) to = Math.min(doc.size, showingTo);

            // Create a range of theoretically intact lines, and punch holes
            // in that using the change info.
            var intact = changes === true ? [] :
                computeIntact([{from: showingFrom, to: showingTo, domStart: 0}], changes);
            // Clip off the parts that won't be visible
            var intactLines = 0;
            for (var i = 0; i < intact.length; ++i) {
                var range = intact[i];
                if (range.from < from) {range.domStart += (from - range.from); range.from = from;}
                if (range.to > to) range.to = to;
                if (range.from >= range.to) intact.splice(i--, 1);
                else intactLines += range.to - range.from;
            }
            if (intactLines == to - from) return;
            intact.sort(function(a, b) {return a.domStart - b.domStart;});

            var th = textHeight(), gutterDisplay = gutter.style.display;
            lineDiv.style.display = gutter.style.display = "none";
            patchDisplay(from, to, intact);
            lineDiv.style.display = "";

            // Position the mover div to align with the lines it's supposed
            // to be showing (which will cover the visible display)
            var different = from != showingFrom || to != showingTo || lastSizeC != scroller.clientHeight + th;
            // This is just a bogus formula that detects when the editor is
            // resized or the font size changes.
            if (different) lastSizeC = scroller.clientHeight + th;
            showingFrom = from; showingTo = to;
            displayOffset = heightAtLine(doc, from);
            mover.style.top = (displayOffset * th) + "px";
            code.style.height = (doc.height * th + 2 * paddingTop()) + "px";

            // Since this is all rather error prone, it is honoured with the
            // only assertion in the whole file.
            if (lineDiv.childNodes.length != showingTo - showingFrom)
                throw new Error("BAD PATCH! " + JSON.stringify(intact) + " size=" + (showingTo - showingFrom) +
                    " nodes=" + lineDiv.childNodes.length);

            if (options.lineWrapping) {
                maxWidth = scroller.clientWidth;
                var curNode = lineDiv.firstChild;
                doc.iter(showingFrom, showingTo, function(line) {
                    if (!line.hidden) {
                        var height = Math.round(curNode.offsetHeight / th) || 1;
                        if (line.height != height) {updateLineHeight(line, height); gutterDirty = true;}
                    }
                    curNode = curNode.nextSibling;
                });
            } else {
                if (maxWidth == null) maxWidth = stringWidth(maxLine);
                if (maxWidth > scroller.clientWidth) {
                    lineSpace.style.width = maxWidth + "px";
                    // Needed to prevent odd wrapping/hiding of widgets placed in here.
                    code.style.width = "";
                    code.style.width = scroller.scrollWidth + "px";
                } else {
                    lineSpace.style.width = code.style.width = "";
                }
            }
            gutter.style.display = gutterDisplay;
            if (different || gutterDirty) updateGutter();
            updateCursor();
            if (!suppressCallback && options.onUpdate) options.onUpdate(instance);
            return true;
        }

        function computeIntact(intact, changes) {
            for (var i = 0, l = changes.length || 0; i < l; ++i) {
                var change = changes[i], intact2 = [], diff = change.diff || 0;
                for (var j = 0, l2 = intact.length; j < l2; ++j) {
                    var range = intact[j];
                    if (change.to <= range.from && change.diff)
                        intact2.push({from: range.from + diff, to: range.to + diff,
                            domStart: range.domStart});
                    else if (change.to <= range.from || change.from >= range.to)
                        intact2.push(range);
                    else {
                        if (change.from > range.from)
                            intact2.push({from: range.from, to: change.from, domStart: range.domStart});
                        if (change.to < range.to)
                            intact2.push({from: change.to + diff, to: range.to + diff,
                                domStart: range.domStart + (change.to - range.from)});
                    }
                }
                intact = intact2;
            }
            return intact;
        }

        function patchDisplay(from, to, intact) {
            // The first pass removes the DOM nodes that aren't intact.
            if (!intact.length) lineDiv.innerHTML = "";
            else {
                function killNode(node) {
                    var tmp = node.nextSibling;
                    node.parentNode.removeChild(node);
                    return tmp;
                }
                var domPos = 0, curNode = lineDiv.firstChild, n;
                for (var i = 0; i < intact.length; ++i) {
                    var cur = intact[i];
                    while (cur.domStart > domPos) {curNode = killNode(curNode); domPos++;}
                    for (var j = 0, e = cur.to - cur.from; j < e; ++j) {curNode = curNode.nextSibling; domPos++;}
                }
                while (curNode) curNode = killNode(curNode);
            }
            // This pass fills in the lines that actually changed.
            var nextIntact = intact.shift(), curNode = lineDiv.firstChild, j = from;
            var sfrom = sel.from.line, sto = sel.to.line, inSel = sfrom < from && sto >= from;
            var scratch = targetDocument.createElement("div"), newElt;
            doc.iter(from, to, function(line) {
                var ch1 = null, ch2 = null;
                if (inSel) {
                    ch1 = 0;
                    if (sto == j) {inSel = false; ch2 = sel.to.ch;}
                } else if (sfrom == j) {
                    if (sto == j) {ch1 = sel.from.ch; ch2 = sel.to.ch;}
                    else {inSel = true; ch1 = sel.from.ch;}
                }
                if (nextIntact && nextIntact.to == j) nextIntact = intact.shift();
                if (!nextIntact || nextIntact.from > j) {
                    if (line.hidden) scratch.innerHTML = "<pre></pre>";
                    else scratch.innerHTML = line.getHTML(ch1, ch2, true, tabText);
                    lineDiv.insertBefore(scratch.firstChild, curNode);
                } else {
                    curNode = curNode.nextSibling;
                }
                ++j;
            });
        }

        function updateGutter() {
            if (!options.gutter && !options.lineNumbers) return;
            var hText = mover.offsetHeight, hEditor = scroller.clientHeight;
            gutter.style.height = (hText - hEditor < 2 ? hEditor : hText) + "px";
            var html = [], i = showingFrom;
            doc.iter(showingFrom, Math.max(showingTo, showingFrom + 1), function(line) {
                if (line.hidden) {
                    html.push("<pre></pre>");
                } else {
                    var marker = line.gutterMarker;
                    var text = options.lineNumbers ? i + options.firstLineNumber : null;
                    if (marker && marker.text)
                        text = marker.text.replace("%N%", text != null ? text : "");
                    else if (text == null)
                        text = "\u00a0";
                    html.push((marker && marker.style ? '<pre class="' + marker.style + '">' : "<pre>"), text);
                    for (var j = 1; j < line.height; ++j) html.push("<br/>&#160;");
                    html.push("</pre>");
                }
                ++i;
            });
            gutter.style.display = "none";
            gutterText.innerHTML = html.join("");
            var minwidth = String(doc.size).length, firstNode = gutterText.firstChild, val = eltText(firstNode), pad = "";
            while (val.length + pad.length < minwidth) pad += "\u00a0";
            if (pad) firstNode.insertBefore(targetDocument.createTextNode(pad), firstNode.firstChild);
            gutter.style.display = "";
            lineSpace.style.marginLeft = gutter.offsetWidth + "px";
            gutterDirty = false;
        }
        function updateCursor() {
            var head = sel.inverted ? sel.from : sel.to, lh = textHeight();
            var pos = localCoords(head, true);
            var wrapOff = eltOffset(wrapper), lineOff = eltOffset(lineDiv);
            inputDiv.style.top = (pos.y + lineOff.top - wrapOff.top) + "px";
            inputDiv.style.left = (pos.x + lineOff.left - wrapOff.left) + "px";
            if (posEq(sel.from, sel.to)) {
                cursor.style.top = pos.y + "px";
                cursor.style.left = (options.lineWrapping ? Math.min(pos.x, lineSpace.offsetWidth) : pos.x) + "px";
                cursor.style.display = "";
            }
            else cursor.style.display = "none";
        }

        function setShift(val) {
            if (val) shiftSelecting = shiftSelecting || (sel.inverted ? sel.to : sel.from);
            else shiftSelecting = null;
        }
        function setSelectionUser(from, to) {
            var sh = shiftSelecting && clipPos(shiftSelecting);
            if (sh) {
                if (posLess(sh, from)) from = sh;
                else if (posLess(to, sh)) to = sh;
            }
            setSelection(from, to);
            userSelChange = true;
        }
        // Update the selection. Last two args are only used by
        // updateLines, since they have to be expressed in the line
        // numbers before the update.
        function setSelection(from, to, oldFrom, oldTo) {
            goalColumn = null;
            if (oldFrom == null) {oldFrom = sel.from.line; oldTo = sel.to.line;}
            if (posEq(sel.from, from) && posEq(sel.to, to)) return;
            if (posLess(to, from)) {var tmp = to; to = from; from = tmp;}

            // Skip over hidden lines.
            if (from.line != oldFrom) from = skipHidden(from, oldFrom, sel.from.ch);
            if (to.line != oldTo) to = skipHidden(to, oldTo, sel.to.ch);

            if (posEq(from, to)) sel.inverted = false;
            else if (posEq(from, sel.to)) sel.inverted = false;
            else if (posEq(to, sel.from)) sel.inverted = true;

            // Some ugly logic used to only mark the lines that actually did
            // see a change in selection as changed, rather than the whole
            // selected range.
            if (posEq(from, to)) {
                if (!posEq(sel.from, sel.to))
                    changes.push({from: oldFrom, to: oldTo + 1});
            }
            else if (posEq(sel.from, sel.to)) {
                changes.push({from: from.line, to: to.line + 1});
            }
            else {
                if (!posEq(from, sel.from)) {
                    if (from.line < oldFrom)
                        changes.push({from: from.line, to: Math.min(to.line, oldFrom) + 1});
                    else
                        changes.push({from: oldFrom, to: Math.min(oldTo, from.line) + 1});
                }
                if (!posEq(to, sel.to)) {
                    if (to.line < oldTo)
                        changes.push({from: Math.max(oldFrom, from.line), to: oldTo + 1});
                    else
                        changes.push({from: Math.max(from.line, oldTo), to: to.line + 1});
                }
            }
            sel.from = from; sel.to = to;
            selectionChanged = true;
        }
        function skipHidden(pos, oldLine, oldCh) {
            function getNonHidden(dir) {
                var lNo = pos.line + dir, end = dir == 1 ? doc.size : -1;
                while (lNo != end) {
                    var line = getLine(lNo);
                    if (!line.hidden) {
                        var ch = pos.ch;
                        if (ch > oldCh || ch > line.text.length) ch = line.text.length;
                        return {line: lNo, ch: ch};
                    }
                    lNo += dir;
                }
            }
            var line = getLine(pos.line);
            if (!line.hidden) return pos;
            if (pos.line >= oldLine) return getNonHidden(1) || getNonHidden(-1);
            else return getNonHidden(-1) || getNonHidden(1);
        }
        function setCursor(line, ch, user) {
            var pos = clipPos({line: line, ch: ch || 0});
            (user ? setSelectionUser : setSelection)(pos, pos);
        }

        function clipLine(n) {return Math.max(0, Math.min(n, doc.size-1));}
        function clipPos(pos) {
            if (pos.line < 0) return {line: 0, ch: 0};
            if (pos.line >= doc.size) return {line: doc.size-1, ch: getLine(doc.size-1).text.length};
            var ch = pos.ch, linelen = getLine(pos.line).text.length;
            if (ch == null || ch > linelen) return {line: pos.line, ch: linelen};
            else if (ch < 0) return {line: pos.line, ch: 0};
            else return pos;
        }

        function findPosH(dir, unit) {
            var end = sel.inverted ? sel.from : sel.to, line = end.line, ch = end.ch;
            var lineObj = getLine(line);
            function findNextLine() {
                for (var l = line + dir, e = dir < 0 ? -1 : doc.size; l != e; l += dir) {
                    var lo = getLine(l);
                    if (!lo.hidden) { line = l; lineObj = lo; return true; }
                }
            }
            function moveOnce(boundToLine) {
                if (ch == (dir < 0 ? 0 : lineObj.text.length)) {
                    if (!boundToLine && findNextLine()) ch = dir < 0 ? lineObj.text.length : 0;
                    else return false;
                } else ch += dir;
                return true;
            }
            if (unit == "char") moveOnce();
            else if (unit == "column") moveOnce(true);
            else if (unit == "word") {
                var sawWord = false;
                for (;;) {
                    if (dir < 0) if (!moveOnce()) break;
                    if (isWordChar(lineObj.text.charAt(ch))) sawWord = true;
                    else if (sawWord) {if (dir < 0) {dir = 1; moveOnce();} break;}
                    if (dir > 0) if (!moveOnce()) break;
                }
            }
            return {line: line, ch: ch};
        }
        function moveH(dir, unit) {
            var pos = dir < 0 ? sel.from : sel.to;
            if (shiftSelecting || posEq(sel.from, sel.to)) pos = findPosH(dir, unit);
            setCursor(pos.line, pos.ch, true);
        }
        function deleteH(dir, unit) {
            if (!posEq(sel.from, sel.to)) replaceRange("", sel.from, sel.to);
            else if (dir < 0) replaceRange("", findPosH(dir, unit), sel.to);
            else replaceRange("", sel.from, findPosH(dir, unit));
            userSelChange = true;
        }
        var goalColumn = null;
        function moveV(dir, unit) {
            var dist = 0, pos = localCoords(sel.inverted ? sel.from : sel.to, true);
            if (goalColumn != null) pos.x = goalColumn;
            if (unit == "page") dist = scroller.clientHeight;
            else if (unit == "line") dist = textHeight();
            var target = coordsChar(pos.x, pos.y + dist * dir + 2);
            setCursor(target.line, target.ch, true);
            goalColumn = pos.x;
        }

        function selectWordAt(pos) {
            var line = getLine(pos.line).text;
            var start = pos.ch, end = pos.ch;
            while (start > 0 && isWordChar(line.charAt(start - 1))) --start;
            while (end < line.length && isWordChar(line.charAt(end))) ++end;
            setSelectionUser({line: pos.line, ch: start}, {line: pos.line, ch: end});
        }
        function selectLine(line) {
            setSelectionUser({line: line, ch: 0}, {line: line, ch: getLine(line).text.length});
        }
        function indentSelected(mode) {
            if (posEq(sel.from, sel.to)) return indentLine(sel.from.line, mode);
            var e = sel.to.line - (sel.to.ch ? 0 : 1);
            for (var i = sel.from.line; i <= e; ++i) indentLine(i, mode);
        }

        function indentLine(n, how) {
            if (!how) how = "add";
            if (how == "smart") {
                if (!mode.indent) how = "prev";
                else var state = getStateBefore(n);
            }

            var line = getLine(n), curSpace = line.indentation(options.tabSize),
                curSpaceString = line.text.match(/^\s*/)[0], indentation;
            if (how == "prev") {
                if (n) indentation = getLine(n-1).indentation(options.tabSize);
                else indentation = 0;
            }
            else if (how == "smart") indentation = mode.indent(state, line.text.slice(curSpaceString.length), line.text);
            else if (how == "add") indentation = curSpace + options.indentUnit;
            else if (how == "subtract") indentation = curSpace - options.indentUnit;
            indentation = Math.max(0, indentation);
            var diff = indentation - curSpace;

            if (!diff) {
                if (sel.from.line != n && sel.to.line != n) return;
                var indentString = curSpaceString;
            }
            else {
                var indentString = "", pos = 0;
                if (options.indentWithTabs)
                    for (var i = Math.floor(indentation / options.tabSize); i; --i) {pos += options.tabSize; indentString += "\t";}
                while (pos < indentation) {++pos; indentString += " ";}
            }

            replaceRange(indentString, {line: n, ch: 0}, {line: n, ch: curSpaceString.length});
        }

        function loadMode() {
            mode = CodeMirror.getMode(options, options.mode);
            doc.iter(0, doc.size, function(line) { line.stateAfter = null; });
            work = [0];
            startWorker();
        }
        function gutterChanged() {
            var visible = options.gutter || options.lineNumbers;
            gutter.style.display = visible ? "" : "none";
            if (visible) gutterDirty = true;
            else lineDiv.parentNode.style.marginLeft = 0;
        }
        function wrappingChanged(from, to) {
            if (options.lineWrapping) {
                wrapper.className += " CodeMirror-wrap";
                var perLine = scroller.clientWidth / charWidth() - 3;
                doc.iter(0, doc.size, function(line) {
                    if (line.hidden) return;
                    var guess = Math.ceil(line.text.length / perLine) || 1;
                    if (guess != 1) updateLineHeight(line, guess);
                });
                lineSpace.style.width = code.style.width = "";
            } else {
                wrapper.className = wrapper.className.replace(" CodeMirror-wrap", "");
                maxWidth = null; maxLine = "";
                doc.iter(0, doc.size, function(line) {
                    if (line.height != 1 && !line.hidden) updateLineHeight(line, 1);
                    if (line.text.length > maxLine.length) maxLine = line.text;
                });
            }
            changes.push({from: 0, to: doc.size});
        }
        function computeTabText() {
            for (var str = '<span class="cm-tab">', i = 0; i < options.tabSize; ++i) str += " ";
            return str + "</span>";
        }
        function tabsChanged() {
            tabText = computeTabText();
            updateDisplay(true);
        }
        function themeChanged() {
            scroller.className = scroller.className.replace(/\s*cm-s-\w+/g, "") +
                options.theme.replace(/(^|\s)\s*/g, " cm-s-");
        }

        function TextMarker() { this.set = []; }
        TextMarker.prototype.clear = operation(function() {
            var min = Infinity, max = -Infinity;
            for (var i = 0, e = this.set.length; i < e; ++i) {
                var line = this.set[i], mk = line.marked;
                if (!mk || !line.parent) continue;
                var lineN = lineNo(line);
                min = Math.min(min, lineN); max = Math.max(max, lineN);
                for (var j = 0; j < mk.length; ++j)
                    if (mk[j].set == this.set) mk.splice(j--, 1);
            }
            if (min != Infinity)
                changes.push({from: min, to: max + 1});
        });
        TextMarker.prototype.find = function() {
            var from, to;
            for (var i = 0, e = this.set.length; i < e; ++i) {
                var line = this.set[i], mk = line.marked;
                for (var j = 0; j < mk.length; ++j) {
                    var mark = mk[j];
                    if (mark.set == this.set) {
                        if (mark.from != null || mark.to != null) {
                            var found = lineNo(line);
                            if (found != null) {
                                if (mark.from != null) from = {line: found, ch: mark.from};
                                if (mark.to != null) to = {line: found, ch: mark.to};
                            }
                        }
                    }
                }
            }
            return {from: from, to: to};
        };

        function markText(from, to, className) {
            from = clipPos(from); to = clipPos(to);
            var tm = new TextMarker();
            function add(line, from, to, className) {
                getLine(line).addMark(new MarkedText(from, to, className, tm.set));
            }
            if (from.line == to.line) add(from.line, from.ch, to.ch, className);
            else {
                add(from.line, from.ch, null, className);
                for (var i = from.line + 1, e = to.line; i < e; ++i)
                    add(i, null, null, className);
                add(to.line, null, to.ch, className);
            }
            changes.push({from: from.line, to: to.line + 1});
            return tm;
        }

        function setBookmark(pos) {
            pos = clipPos(pos);
            var bm = new Bookmark(pos.ch);
            getLine(pos.line).addMark(bm);
            return bm;
        }

        function addGutterMarker(line, text, className) {
            if (typeof line == "number") line = getLine(clipLine(line));
            line.gutterMarker = {text: text, style: className};
            gutterDirty = true;
            return line;
        }
        function removeGutterMarker(line) {
            if (typeof line == "number") line = getLine(clipLine(line));
            line.gutterMarker = null;
            gutterDirty = true;
        }

        function changeLine(handle, op) {
            var no = handle, line = handle;
            if (typeof handle == "number") line = getLine(clipLine(handle));
            else no = lineNo(handle);
            if (no == null) return null;
            if (op(line, no)) changes.push({from: no, to: no + 1});
            else return null;
            return line;
        }
        function setLineClass(handle, className) {
            return changeLine(handle, function(line) {
                if (line.className != className) {
                    line.className = className;
                    return true;
                }
            });
        }
        function setLineHidden(handle, hidden) {
            return changeLine(handle, function(line, no) {
                if (line.hidden != hidden) {
                    line.hidden = hidden;
                    updateLineHeight(line, hidden ? 0 : 1);
                    if (hidden && (sel.from.line == no || sel.to.line == no))
                        setSelection(skipHidden(sel.from, sel.from.line, sel.from.ch),
                            skipHidden(sel.to, sel.to.line, sel.to.ch));
                    return (gutterDirty = true);
                }
            });
        }

        function lineInfo(line) {
            if (typeof line == "number") {
                if (!isLine(line)) return null;
                var n = line;
                line = getLine(line);
                if (!line) return null;
            }
            else {
                var n = lineNo(line);
                if (n == null) return null;
            }
            var marker = line.gutterMarker;
            return {line: n, handle: line, text: line.text, markerText: marker && marker.text,
                markerClass: marker && marker.style, lineClass: line.className};
        }

        function stringWidth(str) {
            measure.innerHTML = "<pre><span>x</span></pre>";
            measure.firstChild.firstChild.firstChild.nodeValue = str;
            return measure.firstChild.firstChild.offsetWidth || 10;
        }
        // These are used to go from pixel positions to character
        // positions, taking varying character widths into account.
        function charFromX(line, x) {
            if (x <= 0) return 0;
            var lineObj = getLine(line), text = lineObj.text;
            function getX(len) {
                measure.innerHTML = "<pre><span>" + lineObj.getHTML(null, null, false, tabText, len) + "</span></pre>";
                return measure.firstChild.firstChild.offsetWidth;
            }
            var from = 0, fromX = 0, to = text.length, toX;
            // Guess a suitable upper bound for our search.
            var estimated = Math.min(to, Math.ceil(x / charWidth()));
            for (;;) {
                var estX = getX(estimated);
                if (estX <= x && estimated < to) estimated = Math.min(to, Math.ceil(estimated * 1.2));
                else {toX = estX; to = estimated; break;}
            }
            if (x > toX) return to;
            // Try to guess a suitable lower bound as well.
            estimated = Math.floor(to * 0.8); estX = getX(estimated);
            if (estX < x) {from = estimated; fromX = estX;}
            // Do a binary search between these bounds.
            for (;;) {
                if (to - from <= 1) return (toX - x > x - fromX) ? from : to;
                var middle = Math.ceil((from + to) / 2), middleX = getX(middle);
                if (middleX > x) {to = middle; toX = middleX;}
                else {from = middle; fromX = middleX;}
            }
        }

        var tempId = Math.floor(Math.random() * 0xffffff).toString(16);
        function measureLine(line, ch) {
            var extra = "";
            // Include extra text at the end to make sure the measured line is wrapped in the right way.
            if (options.lineWrapping) {
                var end = line.text.indexOf(" ", ch + 2);
                extra = htmlEscape(line.text.slice(ch + 1, end < 0 ? line.text.length : end + (ie ? 5 : 0)));
            }
            measure.innerHTML = "<pre>" + line.getHTML(null, null, false, tabText, ch) +
                '<span id="CodeMirror-temp-' + tempId + '">' + htmlEscape(line.text.charAt(ch) || " ") + "</span>" +
                extra + "</pre>";
            var elt = document.getElementById("CodeMirror-temp-" + tempId);
            var top = elt.offsetTop, left = elt.offsetLeft;
            // Older IEs report zero offsets for spans directly after a wrap
            if (ie && ch && top == 0 && left == 0) {
                var backup = document.createElement("span");
                backup.innerHTML = "x";
                elt.parentNode.insertBefore(backup, elt.nextSibling);
                top = backup.offsetTop;
            }
            return {top: top, left: left};
        }
        function localCoords(pos, inLineWrap) {
            var x, lh = textHeight(), y = lh * (heightAtLine(doc, pos.line) - (inLineWrap ? displayOffset : 0));
            if (pos.ch == 0) x = 0;
            else {
                var sp = measureLine(getLine(pos.line), pos.ch);
                x = sp.left;
                if (options.lineWrapping) y += Math.max(0, sp.top);
            }
            return {x: x, y: y, yBot: y + lh};
        }
        // Coords must be lineSpace-local
        function coordsChar(x, y) {
            if (y < 0) y = 0;
            var th = textHeight(), cw = charWidth(), heightPos = displayOffset + Math.floor(y / th);
            var lineNo = lineAtHeight(doc, heightPos);
            if (lineNo >= doc.size) return {line: doc.size - 1, ch: getLine(doc.size - 1).text.length};
            var lineObj = getLine(lineNo), text = lineObj.text;
            var tw = options.lineWrapping, innerOff = tw ? heightPos - heightAtLine(doc, lineNo) : 0;
            if (x <= 0 && innerOff == 0) return {line: lineNo, ch: 0};
            function getX(len) {
                var sp = measureLine(lineObj, len);
                if (tw) {
                    var off = Math.round(sp.top / th);
                    return Math.max(0, sp.left + (off - innerOff) * scroller.clientWidth);
                }
                return sp.left;
            }
            var from = 0, fromX = 0, to = text.length, toX;
            // Guess a suitable upper bound for our search.
            var estimated = Math.min(to, Math.ceil((x + innerOff * scroller.clientWidth * .9) / cw));
            for (;;) {
                var estX = getX(estimated);
                if (estX <= x && estimated < to) estimated = Math.min(to, Math.ceil(estimated * 1.2));
                else {toX = estX; to = estimated; break;}
            }
            if (x > toX) return {line: lineNo, ch: to};
            // Try to guess a suitable lower bound as well.
            estimated = Math.floor(to * 0.8); estX = getX(estimated);
            if (estX < x) {from = estimated; fromX = estX;}
            // Do a binary search between these bounds.
            for (;;) {
                if (to - from <= 1) return {line: lineNo, ch: (toX - x > x - fromX) ? from : to};
                var middle = Math.ceil((from + to) / 2), middleX = getX(middle);
                if (middleX > x) {to = middle; toX = middleX;}
                else {from = middle; fromX = middleX;}
            }
        }
        function pageCoords(pos) {
            var local = localCoords(pos, true), off = eltOffset(lineSpace);
            return {x: off.left + local.x, y: off.top + local.y, yBot: off.top + local.yBot};
        }

        var cachedHeight, cachedHeightFor, measureText;
        function textHeight() {
            if (measureText == null) {
                measureText = "<pre>";
                for (var i = 0; i < 49; ++i) measureText += "x<br/>";
                measureText += "x</pre>";
            }
            var offsetHeight = lineDiv.clientHeight;
            if (offsetHeight == cachedHeightFor) return cachedHeight;
            cachedHeightFor = offsetHeight;
            measure.innerHTML = measureText;
            cachedHeight = measure.firstChild.offsetHeight / 50 || 1;
            measure.innerHTML = "";
            return cachedHeight;
        }
        var cachedWidth, cachedWidthFor = 0;
        function charWidth() {
            if (scroller.clientWidth == cachedWidthFor) return cachedWidth;
            cachedWidthFor = scroller.clientWidth;
            return (cachedWidth = stringWidth("x"));
        }
        function paddingTop() {return lineSpace.offsetTop;}
        function paddingLeft() {return lineSpace.offsetLeft;}

        function posFromMouse(e, liberal) {
            var offW = eltOffset(scroller, true), x, y;
            // Fails unpredictably on IE[67] when mouse is dragged around quickly.
            try { x = e.clientX; y = e.clientY; } catch (e) { return null; }
            // This is a mess of a heuristic to try and determine whether a
            // scroll-bar was clicked or not, and to return null if one was
            // (and !liberal).
            if (!liberal && (x - offW.left > scroller.clientWidth || y - offW.top > scroller.clientHeight))
                return null;
            var offL = eltOffset(lineSpace, true);
            return coordsChar(x - offL.left, y - offL.top);
        }
        function onContextMenu(e) {
            var pos = posFromMouse(e);
            if (!pos || window.opera) return; // Opera is difficult.
            if (posEq(sel.from, sel.to) || posLess(pos, sel.from) || !posLess(pos, sel.to))
                operation(setCursor)(pos.line, pos.ch);

            var oldCSS = input.style.cssText;
            inputDiv.style.position = "absolute";
            input.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e.clientY - 5) +
                "px; left: " + (e.clientX - 5) + "px; z-index: 1000; background: white; " +
                "border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
            leaveInputAlone = true;
            var val = input.value = getSelection();
            focusInput();
            input.select();
            function rehide() {
                var newVal = splitLines(input.value).join("\n");
                if (newVal != val) operation(replaceSelection)(newVal, "end");
                inputDiv.style.position = "relative";
                input.style.cssText = oldCSS;
                leaveInputAlone = false;
                resetInput(true);
                slowPoll();
            }

            if (gecko) {
                e_stop(e);
                var mouseup = connect(window, "mouseup", function() {
                    mouseup();
                    setTimeout(rehide, 20);
                }, true);
            }
            else {
                setTimeout(rehide, 50);
            }
        }

        // Cursor-blinking
        function restartBlink() {
            clearInterval(blinker);
            var on = true;
            cursor.style.visibility = "";
            blinker = setInterval(function() {
                cursor.style.visibility = (on = !on) ? "" : "hidden";
            }, 650);
        }

        var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};
        function matchBrackets(autoclear) {
            var head = sel.inverted ? sel.from : sel.to, line = getLine(head.line), pos = head.ch - 1;
            var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
            if (!match) return;
            var ch = match.charAt(0), forward = match.charAt(1) == ">", d = forward ? 1 : -1, st = line.styles;
            for (var off = pos + 1, i = 0, e = st.length; i < e; i+=2)
                if ((off -= st[i].length) <= 0) {var style = st[i+1]; break;}

            var stack = [line.text.charAt(pos)], re = /[(){}[\]]/;
            function scan(line, from, to) {
                if (!line.text) return;
                var st = line.styles, pos = forward ? 0 : line.text.length - 1, cur;
                for (var i = forward ? 0 : st.length - 2, e = forward ? st.length : -2; i != e; i += 2*d) {
                    var text = st[i];
                    if (st[i+1] != null && st[i+1] != style) {pos += d * text.length; continue;}
                    for (var j = forward ? 0 : text.length - 1, te = forward ? text.length : -1; j != te; j += d, pos+=d) {
                        if (pos >= from && pos < to && re.test(cur = text.charAt(j))) {
                            var match = matching[cur];
                            if (match.charAt(1) == ">" == forward) stack.push(cur);
                            else if (stack.pop() != match.charAt(0)) return {pos: pos, match: false};
                            else if (!stack.length) return {pos: pos, match: true};
                        }
                    }
                }
            }
            for (var i = head.line, e = forward ? Math.min(i + 100, doc.size) : Math.max(-1, i - 100); i != e; i+=d) {
                var line = getLine(i), first = i == head.line;
                var found = scan(line, first && forward ? pos + 1 : 0, first && !forward ? pos : line.text.length);
                if (found) break;
            }
            if (!found) found = {pos: null, match: false};
            var style = found.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
            var one = markText({line: head.line, ch: pos}, {line: head.line, ch: pos+1}, style),
                two = found.pos != null && markText({line: i, ch: found.pos}, {line: i, ch: found.pos + 1}, style);
            var clear = operation(function(){one.clear(); two && two.clear();});
            if (autoclear) setTimeout(clear, 800);
            else bracketHighlighted = clear;
        }

        // Finds the line to start with when starting a parse. Tries to
        // find a line with a stateAfter, so that it can start with a
        // valid state. If that fails, it returns the line with the
        // smallest indentation, which tends to need the least context to
        // parse correctly.
        function findStartLine(n) {
            var minindent, minline;
            for (var search = n, lim = n - 40; search > lim; --search) {
                if (search == 0) return 0;
                var line = getLine(search-1);
                if (line.stateAfter) return search;
                var indented = line.indentation(options.tabSize);
                if (minline == null || minindent > indented) {
                    minline = search - 1;
                    minindent = indented;
                }
            }
            return minline;
        }
        function getStateBefore(n) {
            var start = findStartLine(n), state = start && getLine(start-1).stateAfter;
            if (!state) state = startState(mode);
            else state = copyState(mode, state);
            doc.iter(start, n, function(line) {
                line.highlight(mode, state, options.tabSize);
                line.stateAfter = copyState(mode, state);
            });
            if (start < n) changes.push({from: start, to: n});
            if (n < doc.size && !getLine(n).stateAfter) work.push(n);
            return state;
        }
        function highlightLines(start, end) {
            var state = getStateBefore(start);
            doc.iter(start, end, function(line) {
                line.highlight(mode, state, options.tabSize);
                line.stateAfter = copyState(mode, state);
            });
        }
        function highlightWorker() {
            var end = +new Date + options.workTime;
            var foundWork = work.length;
            while (work.length) {
                if (!getLine(showingFrom).stateAfter) var task = showingFrom;
                else var task = work.pop();
                if (task >= doc.size) continue;
                var start = findStartLine(task), state = start && getLine(start-1).stateAfter;
                if (state) state = copyState(mode, state);
                else state = startState(mode);

                var unchanged = 0, compare = mode.compareStates, realChange = false,
                    i = start, bail = false;
                doc.iter(i, doc.size, function(line) {
                    var hadState = line.stateAfter;
                    if (+new Date > end) {
                        work.push(i);
                        startWorker(options.workDelay);
                        if (realChange) changes.push({from: task, to: i + 1});
                        return (bail = true);
                    }
                    var changed = line.highlight(mode, state, options.tabSize);
                    if (changed) realChange = true;
                    line.stateAfter = copyState(mode, state);
                    if (compare) {
                        if (hadState && compare(hadState, state)) return true;
                    } else {
                        if (changed !== false || !hadState) unchanged = 0;
                        else if (++unchanged > 3 && (!mode.indent || mode.indent(hadState, "") == mode.indent(state, "")))
                            return true;
                    }
                    ++i;
                });
                if (bail) return;
                if (realChange) changes.push({from: task, to: i + 1});
            }
            if (foundWork && options.onHighlightComplete)
                options.onHighlightComplete(instance);
        }
        function startWorker(time) {
            if (!work.length) return;
            highlight.set(time, operation(highlightWorker));
        }

        // Operations are used to wrap changes in such a way that each
        // change won't have to update the cursor and display (which would
        // be awkward, slow, and error-prone), but instead updates are
        // batched and then all combined and executed at once.
        function startOperation() {
            updateInput = userSelChange = textChanged = null;
            changes = []; selectionChanged = false; callbacks = [];
        }
        function endOperation() {
            var reScroll = false, updated;
            if (selectionChanged) reScroll = !scrollCursorIntoView();
            if (changes.length) updated = updateDisplay(changes, true);
            else {
                if (selectionChanged) updateCursor();
                if (gutterDirty) updateGutter();
            }
            if (reScroll) scrollCursorIntoView();
            if (selectionChanged) {scrollEditorIntoView(); restartBlink();}

            if (focused && !leaveInputAlone &&
                (updateInput === true || (updateInput !== false && selectionChanged)))
                resetInput(userSelChange);

            if (selectionChanged && options.matchBrackets)
                setTimeout(operation(function() {
                    if (bracketHighlighted) {bracketHighlighted(); bracketHighlighted = null;}
                    if (posEq(sel.from, sel.to)) matchBrackets(false);
                }), 20);
            var tc = textChanged, cbs = callbacks; // these can be reset by callbacks
            if (selectionChanged && options.onCursorActivity)
                options.onCursorActivity(instance);
            if (tc && options.onChange && instance)
                options.onChange(instance, tc);
            for (var i = 0; i < cbs.length; ++i) cbs[i](instance);
            if (updated && options.onUpdate) options.onUpdate(instance);
        }
        var nestedOperation = 0;
        function operation(f) {
            return function() {
                if (!nestedOperation++) startOperation();
                try {var result = f.apply(this, arguments);}
                finally {if (!--nestedOperation) endOperation();}
                return result;
            };
        }

        for (var ext in extensions)
            if (extensions.propertyIsEnumerable(ext) &&
                !instance.propertyIsEnumerable(ext))
                instance[ext] = extensions[ext];
        return instance;
    } // (end of function CodeMirror)

    // The default configuration options.
    CodeMirror.defaults = {
        value: "",
        mode: null,
        theme: "default",
        indentUnit: 2,
        indentWithTabs: false,
        tabSize: 4,
        keyMap: "default",
        extraKeys: null,
        electricChars: true,
        onKeyEvent: null,
        lineWrapping: false,
        lineNumbers: false,
        gutter: false,
        fixedGutter: false,
        firstLineNumber: 1,
        readOnly: false,
        onChange: null,
        onCursorActivity: null,
        onGutterClick: null,
        onHighlightComplete: null,
        onUpdate: null,
        onFocus: null, onBlur: null, onScroll: null,
        matchBrackets: false,
        workTime: 100,
        workDelay: 200,
        pollInterval: 100,
        undoDepth: 40,
        tabindex: null,
        document: window.document
    };

    var mac = /Mac/.test(navigator.platform);
    var win = /Win/.test(navigator.platform);

    // Known modes, by name and by MIME
    var modes = {}, mimeModes = {};
    CodeMirror.defineMode = function(name, mode) {
        if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
        modes[name] = mode;
    };
    CodeMirror.defineMIME = function(mime, spec) {
        mimeModes[mime] = spec;
    };
    CodeMirror.getMode = function(options, spec) {
        if (typeof spec == "string" && mimeModes.hasOwnProperty(spec))
            spec = mimeModes[spec];
        if (typeof spec == "string")
            var mname = spec, config = {};
        else if (spec != null)
            var mname = spec.name, config = spec;
        var mfactory = modes[mname];
        if (!mfactory) {
            if (window.console) console.warn("No mode " + mname + " found, falling back to plain text.");
            return CodeMirror.getMode(options, "text/plain");
        }
        return mfactory(options, config || {});
    };
    CodeMirror.listModes = function() {
        var list = [];
        for (var m in modes)
            if (modes.propertyIsEnumerable(m)) list.push(m);
        return list;
    };
    CodeMirror.listMIMEs = function() {
        var list = [];
        for (var m in mimeModes)
            if (mimeModes.propertyIsEnumerable(m)) list.push({mime: m, mode: mimeModes[m]});
        return list;
    };

    var extensions = CodeMirror.extensions = {};
    CodeMirror.defineExtension = function(name, func) {
        extensions[name] = func;
    };

    var commands = CodeMirror.commands = {
        selectAll: function(cm) {cm.setSelection({line: 0, ch: 0}, {line: cm.lineCount() - 1});},
        killLine: function(cm) {
            var from = cm.getCursor(true), to = cm.getCursor(false), sel = !posEq(from, to);
            if (!sel && cm.getLine(from.line).length == from.ch) cm.replaceRange("", from, {line: from.line + 1, ch: 0});
            else cm.replaceRange("", from, sel ? to : {line: from.line});
        },
        deleteLine: function(cm) {var l = cm.getCursor().line; cm.replaceRange("", {line: l, ch: 0}, {line: l});},
        undo: function(cm) {cm.undo();},
        redo: function(cm) {cm.redo();},
        goDocStart: function(cm) {cm.setCursor(0, 0, true);},
        goDocEnd: function(cm) {cm.setSelection({line: cm.lineCount() - 1}, null, true);},
        goLineStart: function(cm) {cm.setCursor(cm.getCursor().line, 0, true);},
        goLineStartSmart: function(cm) {
            var cur = cm.getCursor();
            var text = cm.getLine(cur.line), firstNonWS = Math.max(0, text.search(/\S/));
            cm.setCursor(cur.line, cur.ch <= firstNonWS && cur.ch ? 0 : firstNonWS, true);
        },
        goLineEnd: function(cm) {cm.setSelection({line: cm.getCursor().line}, null, true);},
        goLineUp: function(cm) {cm.moveV(-1, "line");},
        goLineDown: function(cm) {cm.moveV(1, "line");},
        goPageUp: function(cm) {cm.moveV(-1, "page");},
        goPageDown: function(cm) {cm.moveV(1, "page");},
        goCharLeft: function(cm) {cm.moveH(-1, "char");},
        goCharRight: function(cm) {cm.moveH(1, "char");},
        goColumnLeft: function(cm) {cm.moveH(-1, "column");},
        goColumnRight: function(cm) {cm.moveH(1, "column");},
        goWordLeft: function(cm) {cm.moveH(-1, "word");},
        goWordRight: function(cm) {cm.moveH(1, "word");},
        delCharLeft: function(cm) {cm.deleteH(-1, "char");},
        delCharRight: function(cm) {cm.deleteH(1, "char");},
        delWordLeft: function(cm) {cm.deleteH(-1, "word");},
        delWordRight: function(cm) {cm.deleteH(1, "word");},
        indentAuto: function(cm) {cm.indentSelection("smart");},
        indentMore: function(cm) {cm.indentSelection("add");},
        indentLess: function(cm) {cm.indentSelection("subtract");},
        insertTab: function(cm) {cm.replaceSelection("\t", "end");},
        transposeChars: function(cm) {
            var cur = cm.getCursor(), line = cm.getLine(cur.line);
            if (cur.ch > 0 && cur.ch < line.length - 1)
                cm.replaceRange(line.charAt(cur.ch) + line.charAt(cur.ch - 1),
                    {line: cur.line, ch: cur.ch - 1}, {line: cur.line, ch: cur.ch + 1});
        },
        newlineAndIndent: function(cm) {
            cm.replaceSelection("\n", "end");
            cm.indentLine(cm.getCursor().line);
        },
        toggleOverwrite: function(cm) {cm.toggleOverwrite();}
    };

    var keyMap = CodeMirror.keyMap = {};
    keyMap.basic = {
        "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
        "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
        "Delete": "delCharRight", "Backspace": "delCharLeft", "Tab": "indentMore", "Shift-Tab": "indentLess",
        "Enter": "newlineAndIndent", "Insert": "toggleOverwrite"
    };
    // Note that the save and find-related commands aren't defined by
    // default. Unknown commands are simply ignored.
    keyMap.pcDefault = {
        "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
        "Ctrl-Home": "goDocStart", "Alt-Up": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Down": "goDocEnd",
        "Ctrl-Left": "goWordLeft", "Ctrl-Right": "goWordRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
        "Ctrl-Backspace": "delWordLeft", "Ctrl-Delete": "delWordRight", "Ctrl-S": "save", "Ctrl-F": "find",
        "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
        fallthrough: "basic"
    };
    keyMap.macDefault = {
        "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
        "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goWordLeft",
        "Alt-Right": "goWordRight", "Cmd-Left": "goLineStart", "Cmd-Right": "goLineEnd", "Alt-Backspace": "delWordLeft",
        "Ctrl-Alt-Backspace": "delWordRight", "Alt-Delete": "delWordRight", "Cmd-S": "save", "Cmd-F": "find",
        "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
        fallthrough: ["basic", "emacsy"]
    };
    keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;
    keyMap.emacsy = {
        "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
        "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
        "Ctrl-V": "goPageUp", "Shift-Ctrl-V": "goPageDown", "Ctrl-D": "delCharRight", "Ctrl-H": "delCharLeft",
        "Alt-D": "delWordRight", "Alt-Backspace": "delWordLeft", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars"
    };

    function lookupKey(name, extraMap, map) {
        function lookup(name, map, ft) {
            var found = map[name];
            if (found != null) return found;
            if (ft == null) ft = map.fallthrough;
            if (ft == null) return map.catchall;
            if (typeof ft == "string") return lookup(name, keyMap[ft]);
            for (var i = 0, e = ft.length; i < e; ++i) {
                found = lookup(name, keyMap[ft[i]]);
                if (found != null) return found;
            }
            return null;
        }
        return extraMap ? lookup(name, extraMap, map) : lookup(name, keyMap[map]);
    }
    function isModifierKey(event) {
        var name = keyNames[event.keyCode];
        return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
    }

    CodeMirror.fromTextArea = function(textarea, options) {
        if (!options) options = {};
        options.value = textarea.value;
        if (!options.tabindex && textarea.tabindex)
            options.tabindex = textarea.tabindex;

        function save() {textarea.value = instance.getValue();}
        if (textarea.form) {
            // Deplorable hack to make the submit method do the right thing.
            var rmSubmit = connect(textarea.form, "submit", save, true);
            if (typeof textarea.form.submit == "function") {
                var realSubmit = textarea.form.submit;
                function wrappedSubmit() {
                    save();
                    textarea.form.submit = realSubmit;
                    textarea.form.submit();
                    textarea.form.submit = wrappedSubmit;
                }
                textarea.form.submit = wrappedSubmit;
            }
        }

        textarea.style.display = "none";
        var instance = CodeMirror(function(node) {
            textarea.parentNode.insertBefore(node, textarea.nextSibling);
        }, options);
        instance.save = save;
        instance.getTextArea = function() { return textarea; };
        instance.toTextArea = function() {
            save();
            textarea.parentNode.removeChild(instance.getWrapperElement());
            textarea.style.display = "";
            if (textarea.form) {
                rmSubmit();
                if (typeof textarea.form.submit == "function")
                    textarea.form.submit = realSubmit;
            }
        };
        return instance;
    };

    // Utility functions for working with state. Exported because modes
    // sometimes need to do this.
    function copyState(mode, state) {
        if (state === true) return state;
        if (mode.copyState) return mode.copyState(state);
        var nstate = {};
        for (var n in state) {
            var val = state[n];
            if (val instanceof Array) val = val.concat([]);
            nstate[n] = val;
        }
        return nstate;
    }
    CodeMirror.copyState = copyState;
    function startState(mode, a1, a2) {
        return mode.startState ? mode.startState(a1, a2) : true;
    }
    CodeMirror.startState = startState;

    // The character stream used by a mode's parser.
    function StringStream(string, tabSize) {
        this.pos = this.start = 0;
        this.string = string;
        this.tabSize = tabSize || 8;
    }
    StringStream.prototype = {
        eol: function() {return this.pos >= this.string.length;},
        sol: function() {return this.pos == 0;},
        peek: function() {return this.string.charAt(this.pos);},
        next: function() {
            if (this.pos < this.string.length)
                return this.string.charAt(this.pos++);
        },
        eat: function(match) {
            var ch = this.string.charAt(this.pos);
            if (typeof match == "string") var ok = ch == match;
            else var ok = ch && (match.test ? match.test(ch) : match(ch));
            if (ok) {++this.pos; return ch;}
        },
        eatWhile: function(match) {
            var start = this.pos;
            while (this.eat(match)){}
            return this.pos > start;
        },
        eatSpace: function() {
            var start = this.pos;
            while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
            return this.pos > start;
        },
        skipToEnd: function() {this.pos = this.string.length;},
        skipTo: function(ch) {
            var found = this.string.indexOf(ch, this.pos);
            if (found > -1) {this.pos = found; return true;}
        },
        backUp: function(n) {this.pos -= n;},
        column: function() {return countColumn(this.string, this.start, this.tabSize);},
        indentation: function() {return countColumn(this.string, null, this.tabSize);},
        match: function(pattern, consume, caseInsensitive) {
            if (typeof pattern == "string") {
                function cased(str) {return caseInsensitive ? str.toLowerCase() : str;}
                if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
                    if (consume !== false) this.pos += pattern.length;
                    return true;
                }
            }
            else {
                var match = this.string.slice(this.pos).match(pattern);
                if (match && consume !== false) this.pos += match[0].length;
                return match;
            }
        },
        current: function(){return this.string.slice(this.start, this.pos);}
    };
    CodeMirror.StringStream = StringStream;

    function MarkedText(from, to, className, set) {
        this.from = from; this.to = to; this.style = className; this.set = set;
    }
    MarkedText.prototype = {
        attach: function(line) { this.set.push(line); },
        detach: function(line) {
            var ix = indexOf(this.set, line);
            if (ix > -1) this.set.splice(ix, 1);
        },
        split: function(pos, lenBefore) {
            if (this.to <= pos && this.to != null) return null;
            var from = this.from < pos || this.from == null ? null : this.from - pos + lenBefore;
            var to = this.to == null ? null : this.to - pos + lenBefore;
            return new MarkedText(from, to, this.style, this.set);
        },
        dup: function() { return new MarkedText(null, null, this.style, this.set); },
        clipTo: function(fromOpen, from, toOpen, to, diff) {
            if (this.from != null && this.from >= from)
                this.from = Math.max(to, this.from) + diff;
            if (this.to != null && this.to > from)
                this.to = to < this.to ? this.to + diff : from;
            if (fromOpen && to > this.from && (to < this.to || this.to == null))
                this.from = null;
            if (toOpen && (from < this.to || this.to == null) && (from > this.from || this.from == null))
                this.to = null;
        },
        isDead: function() { return this.from != null && this.to != null && this.from >= this.to; },
        sameSet: function(x) { return this.set == x.set; }
    };

    function Bookmark(pos) {
        this.from = pos; this.to = pos; this.line = null;
    }
    Bookmark.prototype = {
        attach: function(line) { this.line = line; },
        detach: function(line) { if (this.line == line) this.line = null; },
        split: function(pos, lenBefore) {
            if (pos < this.from) {
                this.from = this.to = (this.from - pos) + lenBefore;
                return this;
            }
        },
        isDead: function() { return this.from > this.to; },
        clipTo: function(fromOpen, from, toOpen, to, diff) {
            if ((fromOpen || from < this.from) && (toOpen || to > this.to)) {
                this.from = 0; this.to = -1;
            } else if (this.from > from) {
                this.from = this.to = Math.max(to, this.from) + diff;
            }
        },
        sameSet: function(x) { return false; },
        find: function() {
            if (!this.line || !this.line.parent) return null;
            return {line: lineNo(this.line), ch: this.from};
        },
        clear: function() {
            if (this.line) {
                var found = indexOf(this.line.marked, this);
                if (found != -1) this.line.marked.splice(found, 1);
                this.line = null;
            }
        }
    };

    // Line objects. These hold state related to a line, including
    // highlighting info (the styles array).
    function Line(text, styles) {
        this.styles = styles || [text, null];
        this.text = text;
        this.height = 1;
        this.marked = this.gutterMarker = this.className = this.handlers = null;
        this.stateAfter = this.parent = this.hidden = null;
    }
    Line.inheritMarks = function(text, orig) {
        var ln = new Line(text), mk = orig && orig.marked;
        if (mk) {
            for (var i = 0; i < mk.length; ++i) {
                if (mk[i].to == null && mk[i].style) {
                    var newmk = ln.marked || (ln.marked = []), mark = mk[i];
                    var nmark = mark.dup(); newmk.push(nmark); nmark.attach(ln);
                }
            }
        }
        return ln;
    }
    Line.prototype = {
        // Replace a piece of a line, keeping the styles around it intact.
        replace: function(from, to_, text) {
            var st = [], mk = this.marked, to = to_ == null ? this.text.length : to_;
            copyStyles(0, from, this.styles, st);
            if (text) st.push(text, null);
 rsion 2.2
copyStyles(to, this. Cod.lengthctions s All , str version 2.2
/ess to the  = str's state live insid Cod =tions that slice(0, from) + Below+that, at the botttoor's state live insideateAfter =Mirro version 2.2
/if (mk) {version 2.2
/r = var diffw thhat need a - (to - of th version 2.2
/ducefor (funci = 0, mark = mk[i]; i < mk need a; ++im
var CodeMirror = (r stnce..clipTo(of t =the onm of t ||nstato_n CodeMirruncttionnction that producesar we clae.
isDead()) {tionsdetach(ions); closp botti--, 1);}tion that producesr options = {},r options =},version 2.// Split a part off a line, keeping e
// tandate.ers intact.version 2.ts.t: function(pos, {
 Beforem
var CodeMirrorfuncsow t[ions[opt] eMirro], m. Itions ults.d version 2.2
//
// All f  options that need access to the editor's state live functaken theew Line/ Cod[opt] 
// some utilitiespos)editor's state live e claim
var CodeMirror = ( an editor ins   // closure is used to store the editor stafuncnce. It's
  odeMirror" + (options.linenewnce. It'e.

      options[opt]  need a   // Determine effective op       d to store the editor statargetDo! // TivenOpt)  // TivenOptnOpt" CodeMirror-wrap" : "")ive ilow: hidden.push      wra;        .atlues a// T   // Determine effectivr options = {}, defaults = CodeMirror.default: 0;returnx; hei CodeMirrors;
        append           ts)= (givenOptions && gimyl The    var targetDocum(opt)ts)ivenOpt, my(opt) ? givenOptions : defaultsion. Below+
      {
  version 2.2
//
// All f0,1">' +
   need acc     o the edess to the r wrapper = targetDocycument.createElement("div");
        wrappeyclosure is used // Determine effective opty's
 .ton CodeMi)itionto coverze="of CodeMirror-wrar options = {},e clai && closure im
var CodeMirror = (  '<d scrol ? givenOpt     (opt)osition: relative; wiouter:div");
        wrapper.className = "CodeMirror" + (options.lineWrapping ? " CodeMirror-wrap" : "")t"></d hidof theper.innerHTML =
           an editoj     wjosition: relative"j">' +
                '<div apitalize=nce. It'viewjsition: relative; width: 3px its parent hidover ve="off<divss="CosameSetptionon g/div>' +
                '<pr statss="CodeMi This over visib ?></div:      '<d+           '<div clases"><div style="position
       based on g the actual code
                sor
      values and deiv></div>';
        if (place.appendChults.
        va the actual code
                r options = {}, defputDiv = wrappercontinuetioniner seen more elegant code in mye.
        var inputDiv = e.
        var inputDie.
        var inputDition:;">' / Wrapo store the editor state.
es inputendChild(wrapper); else pla relative="-1ntains the actual code
    e optionsto ! visible is DIV c,
            lineSpace =aults = CodeMirror.defaults;
        fixMarkEnds           othert="off" autocapitalizeopt) ? givenOpt, othemesor.nivenOptions : defaultst"></dk) width:code.firstChildiv");
        wrapper.className = "CodeMirror" + (optilineWrapping ? ", close        '<div></dicode.firstChild, gue cl.test(&&    </div></div>';
        istyle="position: absoute; width: 100 the actual code
        e cloden">0;</pre>' + // Ab.test(nafalse; breakar options = {}, defaults = CodeMire.width = "0pstChild, m"></textarea></div     '<div class="CodeMirrmeasure.nextSiblingStartineDiv = curextSibling;
        themeChanged();o hide big blue blinking cursor on Mobile Safari
        if (/AppleWebKit/.testptions.lineNumbers) guiew
 ction CodeMi)t's
 time/i) 0 wrap="off" ' +
       ddling             wrapper.innerHTML = = mover.firstChild, gutterText e cldiv>' +
    )
     div>' +
     osition: relative ? givenOpt   mover = code.firstChild/ Delayed obsort(         a, b){width: (atime/iace,)his ban interval;} code.firstCs;
        forRun the given mode'spt iser overaults)
 update new o the 
        forarray, which.firsains alternat    fragments offile,defaCSS
        forclassesperty(opt))highligh            d(),editate, tabSiz = (givenOptions && giverea  e elemStringSy conbug)") CodeMo historeditplay = "o the edpo the= new Error(gent) &&chang          , curWor    st[0], prev    lorer. (innerHTML bug)")Below = ""rsor"ode.blankent )s maintained to( // u code.firstChildwhile (!ry con.eolv></div></div>';
     & giveylt(navmaintoken(ry con   // u code.firstChild, gu& givubsts thhat, at the bottd is ussnot editis us    code.firstChild, gu, to: {line: loadch: 0}, nt)) input.style.width afCh&&oadMpos-1]are s
  options.tabindex != nulusly tr2]meas= {frocode.firstChild, guelseTML b= {fro</div></div>';
        i  '<d work, f&& (usly t+1]lings
   ||ing obviously tr2lse;);
    ))), work, foctruecode.firstChild, gutterite = f+] loaft.
    // happened
  code.firstChild, gutter);
     =
       ;
        loadMpos" CodeMirror-wrap" :r options = {}, def// Give up when>' +  is ridiculously longptions.lineNumbers) gution-relat > 5000</div></div>';
        i  // happene{line: 0, ch: 0}, to: {}, inw).
        rAgent)) input.style.wiC =  if (!textarea style="position: absolute; padding: 0; ible r   // Thby sos) {a backet hs bee;ion/endOperationd to remember that / Variables used by startOperion/endOperation to track whatfor hort>' + s with simpled, and hiss width: deMirrdefaareo that the horizocounted as, work, fby new dri
  becaus holdyscro likely too that the horizo, and hisholds ame way in selious.firsextld be parsed 0; width:  work, f   /a backet h< 5verw   var targetDoc < 10v>' + // T     l = new Delayed(), highlighFetch new inker; selepace.a Delayecharacter. Usefulpace.hackde API object.that want to inspecconten   /  // u (sc is an co        )perty(opt))getTseleAstory the
        // undc"CodeMirror-gutter     low that, at t 0, ch: structor).
        vxtor's state live  Invert range (may< chverwed is used to remember that the us       // Selection-related flags. shiftSeleer is
        // selecting bottom-to-top.
        e; padding: 0; width: {line::*after* openi;
         shiftSel    tion-relatGecko.
        if s).
 ecko) concurrent()Gecko.
        if t shoNameecko       deMir(scroller, "contextmat"scroate} = new Delayed(), highlindenta               o history ptions.vr maColumn var mode, dions) { histor;s;
        forProducf (de HTML
       ler, new ts)
 tak     ele     ;
        forChilingwhen s, and his    into ac = sc operation(onD opt           sof tedito, includePOwnPtabT);
 endAtneSpace, "dragstart",html     , firranchCtion to track whate cl"keyup", o    if (e.message.minpu   mov   varoller, " ? '<precrolle="'
// som        co+ '">': "ct(i>"inverted: false}         span/ CodeM      odeMirror-gutter-text"></unctng cursor on Mobile Saf horizoWork aroun sc bug  guOwnPin some "dblat    cs, IE ignores lead     pacode API obje      connecut", f&& ipx";{
     cAt(0)are a ")file,= "\u00a0"e file,he bottever seen more eleganut", fas          // Current visible rus);(onKeyDown'<focunput, "kenFocus),onKey,nnectEscap in wh).replace(/\t/gperation(), "</focu;
        connectftSelecti(onKeyDown connect(input, "cut", operation(functioe. Context menu is
        // & givenOpChunk([new Leallion(DragStart);
  +
      ? givenOptions : defaultsible ction Costo) DocumenshowingTo = 0, lastSfunc"off">efore o";

        // Checke clKeyUpling.first"off">Math.minonFocu,    inve hide big blue blinefore on&&nKeyUp         (scroller, "contextocus" ",veElemeing.firbvious<div></div>'"CodeMirror-   });ed" :Mirror version 2.2
/lecting, : rel overwDocument.& l < doc.size;}
      an editor instac// m0ed. <    ; i+=2 "CodeMirror" + (options.linefrom: st/\w+/s
     the+1], ut, str";

        // Checkstyle.width =h + l >

 o wrap thrhe bottom "off-(lincode.firstChild, guttere di= ingTo = 0, lastSizeC = 0   //str        && "cm-conn    co      // bracketHighlighted is uselecti
var CodeMirror = (funcafChunk,or instap));
  he il);
 sghunk([new Line("")]gent) && /MoafChun-1tance. ItrAgent)) input.style.wi(input, "nextlingn we have a
     ce = gutter.nextoverdiv></div>';
        if (pplaceSel+= 1er seen more elegant code ince. Ite ele
    ayed oblass="Co?;
    [s[optio]to
   area
                '<textarea style="position: absolutindeInput(); o); fastPoll();});
 Invert
     is
CodeMirror" + (options.lineupisplaains the actual code
    funcextra/ All
            lineSpace = gutter.instance obje   setOption: function(optionhemeChange> beene) {onBDocumer seen more elegant code ilecting, lat we'll re||that Wrappindiv></div>';
        if (place         else  n. Mostly calls out er seen more elegant code in mynged)();ing.firste) {onB else onBe) {inputver seen more elegant code i.lastChild, code = scroller.firstChild,
      Invertnce. <divextSibling.fir          },<s beentUnit") loadMode();
         gutter.next               else if (option ==.firstChilWrapping" && o option == "fir relative" != value) operation(wrappingCha if (option == "tabSize") operation(tabsCh+n(onD con#160;n.
        var updateInputce = gutter.nextSibling.firstredo: operation(redo),
   tLineNumber" || option == "theme")
                    operation(gutterChan an e;;se if (option == "tabSize") o     nelChlue)  {
    // Ter seen more elegant code ifuncapplied    elsen, dir == null ? "smart" : dir ?ut(on        e)story: function() {hi ?       +ation(tabsCh:ation(tabsCer seen more elegant code i   // red>      ?nect(scrolle0// mis thbeen:ion,,story: functi     indentLine: operation(fut(onFo >=     ) {Below thct(scrolle          p;ction:        if (!options.gutter && !ateInput,fChunen     // The seleeouts, makinge onlo call+]ingF  else getValue,    lie;
                if (option == "mode" || option == "indenhemeChanged();
 ct that we'll r)    // The rn. Mostly calls out e. Context menu is
        // nnect(input, "k      // IE"</s));
        connectwidth: (onKejoin("on(start){
 s;
        cleanUporking when we have a
        vapaenu) the only global var we cl ? givenOptn. Some do some extra
        // relse/ Delayed obsure is  // es used  ? givenOpt    lace.appendChild(wrapper optioay([]);// Utility us maxWicut", ohen s
    abovolling.(input, "/
// All fect(in"firsource, desp));
         an editor instation: getnnect(e che
    s.chor clipping. operatioelect Select     /\w+/ redo: histotMarif (hasFocus) setTimeout(o     se=val.deMirror-gutter-text"><ion(fuof the   m   movrker)e botttChil     ,operation(rker),
    },      pw Br operat+1]     indentLine: opee(pos.line)of the     set
                operation(setValue)arker: operat1on(removeGutterMarker),
      etTosetLineClass: operati, giv      pration(function(h) {return setLinlectisetLineClass: ration(function(h) {return ser options = {},getStateAfter: funct              fu// Data   /uctur holat holdsholds equence// wcrollperty(o(input, "LeafChunkorreclse if (option   vacrollb
     ted flags. s charCoords: function(pos){re        coordsChar:       need acchehe co    wrapp        div></div>';
          Coords: fstChll ? doc.size -       "-1">' oll,       ;
                return l         ds(clipPos(por optiors || (li.prototyp setdiv></div>'c (liistoorking when we width: 1ush(f);
ords) {
s;
        removon = "absoluaft +, callbousenction(pos, node, an editor in     seta,
/nd/oidget: function(pos, node,atch(e) {rDir: functlocalCooll ? doc.size - 1:        var t-
      ds(clipPos(pos));s, node, scr.l.to);loadMode();
        e clheightandlersoptions.tabindex != nulstyle="position: abscode.clientWie; width: 100%(vert ==    movcode.clientWi[j           if (!isLine(line)) re           ts.
      ids(start ? sel.from : selollapson = "absolue.handlers = [])).ode, scro       .toryy      , [      code.a, 0].concatgeCoore.handds(start ? sel.from : seinsertH                    Width >        },
            char    pos = t * textHeight()),
 ight)
          .offset          , [                  left = hspace 
            lineInfo: lineInfo,
 f (vert == "ne scroll, vert, horiz) {
        - node.offsetterN               if op"over") top = pos.y;
        else if atidget: fat    if (e.message.matchope.left = no[at])ng cursostPoll);
                     (input, "Branch| (linchildrf (option == "ress",  (code.lCha (code.ll ? doc.sid to iz setB           ad    },
            lineInfo: h) / 2;ords) {
            rk,
            seange h) / 2; Math.max(scroller     +
  .e.positio();     pos = chht * textHeight()),
 che.clientWidth - node.offseentWidth - node      n            return l  var top = pos.yBot,  return line;
            },,

  ddle") left               node.style.position = "absolute";
          unt: pendChild(node);
                if (vert == "over") top = pos      line-= or on Mobile Safari
        if (/Ap node.offsetWeWebKit/.test(navigator.userAgent) &&h) /  var vsp           , sz)
     eft, top, lefptions.lineNumbers) guelse sz(option == "readOnly" && valurment else onBnrsor:- aion(old;
   : operatit * textHeight()),
     e.offsratie);
      rmf (vert == "ll ? doc.size - 1: linesetHeight, doc.tCursor(lirwarine, line.ch, user);
           arkerzeratre">'Selected: functts.
        va operatCoords: functieme")
                 e cl(n
      ration;
        // bracketHig     e.left = (left +         f linea doc.sz     '<div class="CodeMirror-gutte sel.to);
 n < 25m
var CodeMirror = (funcf);
   osition: relative; wi      e.offse "";
 rn getLine(line);},
    offsetWidt[elemes || (line.handath.max(scroller for problem with IE inde.offsetHeight;
                    if         coordsChar: functx";
                }
                setCu          setLine: operatio- node.offsetWidth             }
    ));
        connect(istyle.left = (left +   if (horiz == "right") {
                    le    pos = localCoords(clipPos(pos)););},
   tWidth;
      }
             t = hspace - node.offsetWidth;
                }
                node.style.top = (IntoView      code.ap node.style.top = (top + paddingTop()) + "px";
  line).text.length});
            }),
            rem !posEq(sel.from, sel.to);},
            setCursor: operation(function(line, ch, user) {
       rn gse if (option == "tabSizeoperat      getRange: function(from, to) {return tracked, and the raticrollb&&   togg      code.ay be se if (option == "tabSize") o Invert        postion(off) {
                var lineNo =         pill     
          ts.
  
                d- 25,funcer seen more elegant code in my;
    lean() 
                                  if (sz > off) { choperation(fu
   f; ret, line.ch, user);
           tWidth - node.offsetWtSelectio + 1,nodeo;
                 if (sz > off) { cho;
    vert, horiz) {
            tChild,
            scroller = wrapper ? giveybeS    ption) {return options[op          }),
        ;
        // bracketHighlighted is use: functurn getLine(line).text;},
    s;
         0) returnorking when we have a
         getLied: function() : op10ng cursor on Mobile Safalize  var vsmands[cmd](instdo            moveH: opera          melipPos({line: lin        refr  // This5,                if (sz      bl    rn truddle") left                 off -= sz;ns in e: funct    // Becop);er our rds:nodolling.
      .from, sel.toopyld: function(){retu        refds.
        var instanceopy: functionm,
            getTokenA        ref) {tter,InputFieull ? doc.size - 1: line     tter(line) {if (isLine(line)) to store the editor state.to);
  nputFiert = stion(){return gutter;}
    ++lineN) {
    line.ch, user);
           alize=Index = (optxOfeturrn wra         , m                return ge= line; n; n = n.presh: fun      fo, ch: cnputFie           setValue: operation(setVrollIn{
   lement: fun    updisLine(line)) renged)();ction(){updateDisp>ndex     gutterDirt= line; n; 0) return 0;
        etWidth;
                      },
 style           dateInput the fu = trsel.inverted;                  node.style.right = "0px";
      ds, probably not much use to outside code.
            moveH: operation(moveH),
            deleteH: operation(deleteH),
            moveV:          if (ch == null && typeodsChaine.line == "number") nction(from, to, user) {
   toggl    }    dsCh = tr = 0;
                 pPos(to || from));
  dsCh        }),
            getLine: function(line) {if (isLine(line)) return getLine(line).text;},
               f (horiz == "migetent At(e.pos    ction update Invertee.pos     lene, ch: getLine(line).text.len;{return !posEq(sel.from, sel.to);},
 rapper      setCursor: operation(function(line, ch, user) {
   e: ferati                 if (! || option == "indent            // See if this is a click iue(options.vapper; n =[nath.max(,

  (input, "    Noorrect="off" autocmax(code.Coords:   },
  ept static 
              cus th      var s, nspla (var n curt = noderrectt = (left + paddingLns.onGutturnes(top,     ihange         ran.onGuttesor: lement: // Stuff used by commands, probabl              ords) {
s used to store the editor a wid               tartcur  }),
            getLinen meastart.ch, true);
ion(function(line, ch, usershowingFrom, e);
           non e_preventDefault(e);
   A getRangenu(e);"CodeMirror-gu;
  hunk([new Line(ioning on(f){return opera          case 2:
                    if ((vert == "near") {
               ) {
                    ifll)
     iff = height - line.heighte clkinglineS;
        rClicfirstChild, inp index = coords.ch;hn (lclength};},
        nView(lration(function(line, ch, usere; padding: 0; width: " wrap="off" ); n != wrapper; n = t = (left + paddingLeft()) + "px"pper; n =             }
                if (scro     va         retCursl// mheight * textHeight()),
 = +new Dlh  }),
            get.timelmmands[cmd](,

      reventDe + in e_preventDefault(e);h: 0},A     r (var n = e_target(e)ect(it the
            // selection.
            if (!start) {if (e_target(e) == scroller) e_preventDefault(e); return;}

            if (!focused (options.onGutterClick)
                        options.onGutterClic(lastDoubleClick && lastDoubleClickText.childNodes, n) + ) {
 astDoubleion(replaceRange),
 e; padding: 0; width:            la               setTimeout(focusInput, 20);
  oller)n      re      }
 localCoords(clipPos(pos));his.
              line = Th  //story obj;
 '     s'.value     atabTexmadinpuest(togeor.n  line = en sct almoscontent.
 timeon() {bigger undoable unition(){se(input, "H      n we have a
    varxt =unk([new Line(     do   va[];ientX)     Math.ab e_preventDef                      node.styladdCwork,        connine: 0add for l    setOption: fun(e.clientY       // mk([new Line("")])]),(e.clie+elemD/ undlaranchChunkntY [;
      dateDispla1ath.max(scroller    gxt =-th.abs(e.cl> 400    !Input||l.to, start)) {
 Inpu // Sel>;}),r,
/               retur+
           <;
    -e_preventDef e_prevoex: ass="Cn getLine(line);},
        ;">'  in onMous          :           :    ll = new DelasetValue),
            getSelecolddefaaceSelection: operatioarker: r{
       retu      if (!webkit) lineSpace.draggr in      retur-ult(e);
1olle>     -->' + // Moved around its         sor(unshift(olf = ether this is a click in            
                                    updateInpu// Selecti        var visible = r options = {}, deflecting,       returault(e)se if (option == "tabSize         lt(e);
                         if ( e_prev false              var top = {line: 0, ch: 0};
  onFocus();
     d(e);}- 150);      sor(start.oller) e_prev                 updateInpusor(;">' r);
                    u| cur.linentDefaud(e);)teInput = fa=_prevespace && pos.y > node.offsetHeight)(e.clie);
              else if   up();
      stopMethodn wee_ocumrstChil,

  // Ense);an evrds:has Lineop mnt, "   up();
      addS", o           }

      !     .  cl)      e);
oing ument, "ment, "mouseup", o     clientY) <  up();
      e_);
entDefault(       }

      e.reventDefault()   focusInput();on(line, ch, lectie.width:Valux;
       e_preventDefault(e);eup", Propagns.fie);
                ), true);
    
   ), true);
     dateInput = true;
cancelBub    astPoll);
  ();
            }), te);
_preventDefault(e);;  }), true);
       ion(funcn. Mostly .eup", Statup", e(); upntDefault(e);reventDefault(     reventDefault( var start = posFrom), true);
             rue);
     = connect(targetDe_targe(e);
nUser(st.          e.srcEle    ion(funcstart};
  butt      }
        functi the osFromMouunctionateInput = true;      t);
  & setwidth: 
           lecting, efault();
2         3 var pos = posFromMouse(e, true4         2 cur);
        tion       ientW registrns.fi. If disconn;
 isstPol, it'll        ans.readOn(input, " lineun      .hasnew turn;
   up();
       && fil(per;,     ,    func
   s && fil      }

          ofpper;    ly) rL    nis t= "        "  return;
                       reader;
            = new History();;
      var reader width: king when we     e);
            text[i] = reader.result;ay([]);
    var pos = posFrrk,
            sewrapHurn;
 === n) {
      varturn;
          window.     v                       s inply) r("onconne[i] ={
        ;
                        if (++read == n) {
         values                            setS                   e_preventDefault(e && filetLin& fil = connect(targetDDelaye"mous      );
se(e)                            sestory the
  s, ftabinearTimeou       id)bs(e.cl     set        f, matiop = connec = get;
 drag-and-dropversiofunctragAndDr     king when we have a
 // IE8     on  ellast))defa    op propertinodebut doesn't seem
        //     ctually suppal s      var tenew      t'sext) {sChato workperty(opt))e cl/MSIE [1-8]\b/.test(navigator.userAg   v(++read ==put(); fastPollfunctiv = docu    .create       ('div'meout(focusIwidth: "  elg    " e_sdive(); up( for           geckspla/ext) \/\d{7}/i                  var curFe(); upcus() wra pos);\d                   var curF           webkier.r/WebKit\/t();
                    }
               Se    "\n    if (// Reane);-d);
  whfalsexFromrollbin     are    (inponveraxLito \r\nversiois active n we have a
       wra                      s"t = getSon(start){
 te.v       "foo\nbar    if (optieaderransfer. (var n "\r") > -1left =
      r   functio}(eft =unction oCr ma      coller defsetr txLine(dow, 
     tabasOwn {updateDisplay(retusCha    

  find (options.fition loadFile(file scroller.nding(e)endndo history (instance ),
    art = posreturn;
       redo:nding(.search(/[^\s      ]/plorer. (innerHTML bl || e.taTr           ifdone.length};},
            an editor instast theller) nds used to store the edible ra  if", operition(o\t")q(last;
    his n %";
      operation(setValue)++" wrap="off" stDoubleClick = {t cur);
                e"dblut functi(e;
 if (name == nullltextMenu)  matchnDrop(e)ions.keyMap))) ctionUser(pos, endlaceRangetCt-" + name, optieMirror versio     line = Fxt =er ouosiill rof
         axWifollow
    h    andlPn wrapchaitions.ke    f screen==ength &&
     sbound = (ra     than page) coordinat      (line.handleeltO   }{
    ound =set escapeElementbo         ownerD        bodAt(doc, n); func for0, emende) kipBodemen.from, curTo = s an editoThe eode;    The e.    }
                  if (scroout, ext;
  Left, os: fuxt;
  T   var st        // Rirefoxcoororts weir = k);
       }s  gutt               bordnction lo              ==    e;
xalse elseabs(ol); y(instance);
 tgetVoperation(setValue),nd(insol  if    telecting = prevSharker      romIt-" + name, on) shoextraKr.onlixtionine: 0, ch: 0};
   && (bound                  else.length,              !  }
    >' + // Tb) setSelectioey(e))) options.k       Ns.keyMon =     if (s();
    eturn true;
       .scroll    ed();
     x
   IE does str    th escape.ift)   if (e.shiftKey {left: x },p: yay([]);on(functioUompute fa     - offaeadegetBler,ingClientR;
 arTime  guttpos    eperty(o             on a cha        } eftKey);
          ing.first bound =             ommands[bound];
        (e2)ak){return   // wbtKey); c      r;
   n(onelectiinteresaxLie_stoleKeyBin     to edit optne maxe;
        forsi    hiftwidth:ed nsfer.cannot be.value ||ex obje (te(uteTabTexkepleKeysyncine hiftptions.k;
 lbar
 txtr ourgode;
      try {        forse bos.
            if (oleft      { = falbox.topd afnValtrlK& e. }electing = prcatche);
.metaKey= faled afnVal088)
         FromMs[bound];
        e,
    e      toplevel    oMirraceR  vaoller, brower;tioner
   ion(){setValue(oe cllaceRanatchYvent && ();
                else i                 ce to handle th    on a chan    e = e.keyCo(line, ch, user) {
   t if (ie &&         th                       }
 ch;
    rlKey)
    if (ie && eyCode == yBinding(e)
     {line: doc.size function updateLineHeighandleKeyBilastStoppedKey = neturn;
      lastStoppedXr ch =  1, if it was clicked inside the editor
  boxe(); up(;
        }nKeya     's      n(funeDisplay(e(bound)) boion(nKeyEons.extraKeystor
     // extC > -1), funon()innerre on(sel.to.l.to      ||e if (opti     line = Ope     i     {ts)
 ch}            (line.handleposEq. blin e_prevenannect      (opti&& a.angens.och  selectWordAt(stposLess
            if (opti<s.onKeyE   /f (options.onKeyEvent &&     ards selectWordAt(sttterPos(x         i     : xnnect  }nFocch} = n          eect(itions.on           htmlEscape(txt)preon(start)rt};
    connect(intClick, lastDoubns.readOnly) ) {indentLine     setSelectionUser(stptions.onFoculine, opte(); up();
  ightecLine(lect(2011) fastP betaar tidth bogus       varacontent    (wrapper./ woress{indentLinratileKeKey)p thoseyEvent opti      if (o"a"rl-" + nareturn true;      if (            tClick, lastDoubleCloptions.onFocus(instance);
                    focused = true;
           scroller, "paste", f        retSop);IEs doxt")preserve      through          versiolecting,           if name!" + namAlone) resetInput(true);
            }
            slowPoll();
         lse if (option == "ted = true;
        Coublion a chan      ion(         d;
                reted = true;
                if   if (focusntDefault(eetInput(true)      if (;
        }s[e.ktoons.extraK   fuursers.r is an     /redokeyMai    vatholling.//sInput.opeed    connect
               ditEnddateInputvar cur = posFromMTo.+read ==Chil?nes(fdateDisp:, true);
   FromMof thewidth: 1o           }
     an editor in, to, newTe,ositi  if (histt = curEvenj= cur;
  , --(options.tabinde conn to,me = "Ctrl!
    ", operj)  }),
           width: jlue( cur);
                e{
      ol });
  KeyEons.extraKeys, oph, old);

                (history.done.lengoptiot = (left + paddingLeft()) + "pxhistory.dont, "mousemove", operation(functiile (history.d;
         width: : now, p       hist-addChange(fm.line, newTexs    Char(lineSpace, "drawidth: /\w       on o||ffsetoUpperCase(push(f (chLowe) {
  s || options.readOnSeevent"" mess es.le    r handIE vers;
  if soe();ovid{
 ;
       e objectv      toff.left         (li(f)();li     
   "\n\nbtart + (/\n/)backet has 3rom,
             et escapeElementtion: getnl, res      osition: rela Invert(nthat ch  if          n"),
 )e.dataTrreturn;
      placed           if .
      0, c) name = "CnltaTr-" + r"own(l  lato
llinker);
       getStanlry.addChang   lastDoubleClic- 1,
                    linker);
   width: updatee(); up(ory nge.start, addee_preven     if        r? to.         ntDefault(e.text); });
.text); })     }
     hasS  });
  CharCode(get}
       change.startmeout(operatiombo
 width: 1e.   });
  not ush(ly.undone);}Eame;
                    m = sel.from, click in ch: getLinedoHelper(history.donypeofork,(modeound = null;
    });
     cleRork,(var options =                    }
   ndo(fr||Undo(fe = e.k       spush(l {
      .from, curTo = s: 0}, {lgth =
   reEndPoints(" not ToEnd",ing)
push(ft = (le (mode.elentDefault(edefineMerva"irro",             try {
     functi selech: getLine(eneae">', to: {lk  fulFrodFile(functieplaced {
               IMEt);
 /plaichan if (l      }
     keyr, "
   {3: "Eing(", 8: "Bousever"", 9: "Tab", 1erDirty = tr16: "St, cine 7: "Ctr(lin1ue;Alt"on() {
   1   vP com", 20irstapsLock= gefirsEsc", 32 fro       3erDiPageUpt ad4ust theDowchan35rDirtd(from.line),3- frHomst adfirs    akinue; line    vR his", 4tLine, taki4strucrintScr to.cg soIocuse(from.line),4- frDelet = g5   v;    1: "Mom.li9  //This iserDiThis i18- fr    18firs=ed spue;,(from.line), 8   v-ed s9tLin./ sur // // sur  //`= ge last[= geetLin\\e sup // ]e sup  //'", 6327- fr the linversion 2.r adfirscture, takir adg some ca    ierDihlighti632 strutact.
      // line    g so(from.cevLine = nulldjust         30  //Text.len    i  // {
   , pos);
          th > 1) gutth > 1)        is active.tance, addStop(eNumbength de API objee = true;
         1lt-"++)ine.fixMa[eNo,48pener).
 (i.done.shift(// Alphabetic = 0, e = newText.length - 165t-" += 9 ++i)
               added.time/    n. Mpush(Line.inheritFs will r= 0, e = newText.length - 1ast = ind2++i)
              11acks              ne(fr    "Fdent: now, po)  if (draggwidth: n. Mostly ;

      {
                    xm(line.text.leconfig,our eveCe(fro change.ocus()optioUn   }ce(froPos({                 Kludkit)=.ch, to.ch, nnull;     ?         e_prutoSelfCgablrs: {"br":length "img          h
          link           nput        version 2.2
/"meta          col          frame          bas(lastLine);           s;
        doNot    nt1]);ocus   var added = [];a);
Unquotd(e)tPol.done);}
{newText.length-1])},;
            } befo= newText.le.fromay([]);rHistlignCDATALine = firstLine], firstLi;
        }Ridth: oper    sroll(iseleizerde API      /gr, "       = connect(targetDin   seting bottom-torkText: opera
                s.nextSibling;
    Displ/ sele     ngth ==;
                retgth ==cting bottom-to-top.
        if (oif (scroll)
tion-reInpu for (var n =d the dr.on<unction() {
     ible range eat("!"></div></div>';
                  doc[remove(from.line + 1, n1, nlines, callm     "rstLi);
 ptions.valin(inBlock("atomto.l]]>"linker);
       r pos = posFrFromMouse(e);

         if (cur.line >= visible.to || cu          var --= [];
                fircom    to.l--lace(from.ch, null, newewText[newText.length-1DOCTYPE",length tPol></div></div>';
        i         dWInve(/[\w\._\-yMap = next;
    tValue(options.valinion     (1ce(from.ch, null, newcur.line >= visible.to |
                lastLinee: operation(function(h) {       doc?remove(from.line + 1, n           added.push(Line.inheritMarks(newText      firstLine.r      fir     , "?ceSelection("");}));
os, end)     == null ? e.keyCode : e.chsetValue),
            getS       .insert(from/"    "ggablTag to"open{
 nverted: false};
        eat Firson(line, ch, user) {t(from.lse if (option == "themen;}
adMode();
               (cext.length, fu options.ke=<>\"\'\/?]/ratir guess     ptions.lineWrapping) {
              Tagoller.clientWidth / charWidt          if (lineshowingFrom, e);
    lecting, ine.app&unction() {
                added.p^;yMap = next;
    .insert(from;ed;
                retrstLin    }
            if    operation(functio         var l = li&<yMap = next;
    FromMouse(e);

                 line);
        ag     }
            } else , to.ch, "");
                firstLine.app>"  if ine.app/lways.insert(fromlace 1) {
                firstLine.r      mands[cmd](insta       (recomput? "end{
     selfine) {
 l.length > maxLineLengt       doc.iter              op function(l=unction() {
            "equalsction(line) {
                          recot.length, fun/[\'\"]
           maxLineLength = 0; maxLine = ""; mAttribut  e_axWidth = null;
            firstLin
                lastLine.re           maxLine = l; maxLineLength = l.lengtess != line.height) ul.length > maxLineLengtwor     if (opti   recomputeMaxLength = fal
         wTextngth == maxLineLengtmputeMaxLength 
            } else ons. Inverted is used to remember that the ust[newText.l      e.apvar newWork = [], guess);
                });
            } else {
  = 0;
        // bracketHighlighted is used to remember tineLengt: edit
           ddChange(from.line, newText    fi      rtermtyIsolick, lastDoublendiff = newText.length - nlines - 1;
            for (var i = 0, l = work.length; i < l; ++i) {   var = from.lin1; i < e; ++i)
           ; maxLine = ""; maxWidth = null;
  ch;
                doc.iter(0, coords.line, funct"");
                fiag handler handle this.
 n, dir == null ?f);
      MaxLength = f
      dep="CodeMirror-gulendiff = newText.length - nlines - 1;
      n;}
ectstart", e_preventDexLengthe display
 push(;
                else irstLine.append(lastLine);
   Wrapping) {
                        v    ether this is a click in              }
            }

            /(isLine(line))   if (recompuick, lastDoubleClick, draggin      rn setLineHidden(h, false
            startWorker(100);
            // Rememb
                doc.iter(0,       function updateLineHeight(l     cur.next = changeObj;
       -    } else textChanged = c = changeObj;

            // Update the selection
        '<textarea style="position: absolute; padding: 0; width: dth() - 3;
     f);
                   S// undsedropShift = tent(instanass             f.y;
         rg     ngth + 1;
ast = cur;i--) {
     .cc      rom; else
         = null;
        }ngth;return;
  );
.offsettic wheom; elsege.start, ch: 0}, {pper; n = n.panKeyEvent(instanushdentLxt(t(from.li     Ofd to pwe have to adjuso       =    last.
         .hasOwnrue)erty pos)) r    i       code(funct     
             .r line = // highligh;
                  node.stylnput, us:(pos.line == to.l0]);
         t(from.:rt(from.lastLine);
           ar ch = p.line edto.line == fromurn end;
 nction nd;
 to.line == fromr line =:    }
  o: to.line + 1, diff: lendiff});
popess(to,            while (
                     code= to.linear ch = pos.ch;
);
 cur);
                e_      s    r = new FileReader;
e.app         change.old.lengtnd1) {
 r guess = t(from.xWidth = null;
      adjusa        st;
 tagend1) {
 urn end;
   to) {return ength, fun
        ine) {
              if (scroer     put(); fastPoll();}on(end1) {
          div></div>';
           ar ch = pos.ch;
r guess sh(l        function replhars && mode.electricChars      tPoll);
        cobound(instance);
 err)      frolengttly ction(line) {
        adjusendggabl) {om, neSpace);
              }
       eplaced = [              se) {urn end;
              lendiff = newTex adjustPos(sel.tol.to)};
        oc.size, funct = true;
          , sel.fromc.iter(0&&os.line +newText.length-h - (to.line - frn end;
               var re))eturn true;
       computeSel) {
    s(sel.to)};
        c.iter() {posLess(to, rn end;
       eturn end;
  ;to);
        }ask > to.line) newWork      }

       + 1, diff: lendiff});
 function replac1 ? code[0].length + from.ch : code[code.length-1].leom, to: end};
            });
      nction getRange(from, te1(code, from to.line;
     return {from: seo: end};
            });
        }
       rom; else (vere            // Add t             if (!(code, col: adjustPos(sel.to)};
        work = tr: end};
  (code, co" to.line;
   (code, col         if (nction getRangh > math > option pollinsfer,ction() {
          firstLngth;
   ush(ta, sel.to);
                 var pollingFast = false; // E newText[
  e(); up();
           tPoll
             return getRange(sel.from+ code.lengthush(Line.inh, sel.to);
   push(tasto.line;
            if (() {
            if (t cancel fastPoll
  0) rge.start, ch: 0}, {, function() {
                start 0) r: adjustPos(sel.to)};
                });
        }
        function fastP.line + 1, n, function() {
          if return;
            orking when we have a
     neLength) {retion       , cc: "inp 0));
 ectioreturn {line:t.lengtth - (todeMirr = end1st = fay([]);
       per(history {recomputeMaxLength th - nlines - 1;
      t[newText.lsowsers fire contextmenu *af        replaceperation to track what
  evinpu 0));
           (options.fi, start)) {
                e_p             dn;
   osFromMouse(e);sh(getLine(l2).text.slice       r guess =  == input); } catch(e)       // c

            // Update the selection
 ents tht instee + 1,pPos(to || from))roll", fu adjus
    d};    ne.fixMaom: end, to: end};
 nd1) {
 events adMode();
               th - option == "readOnly" && valucomb events te = op(    iom), tother this is a click in a wiomb{
        
    }),
            getLinesition: absolute; padding: 0; evinput is a hack to       if (collapse  from.li: end}; text = ;}
                endOp.line ? lt(e2);
    undoextor isine.ll;
              InputAlone to.linefocusedt[same
        // supported    firstLine!;
    le enoif (same < prevInpu      = true;
                    vas.ch;
         Sel.from, newSel.to);
     whileundo( whilelEnd);/^(\s*)/)[0], newText, selFrom, se) {
    , firstLin&& /<!\[rstLi\[       
       
        /om, sel.to))
                v/^<         line, ch: Mm = {line: sel.from.line,          return {fromlineNo = 0, ch;         v! replaceurn end;
  ngth - same))};
            replaceSelection(text.slicine).text.l });
       h;
.line astL{
              startOperation();
= new Error("A Cext, {line:           ineDiv = cur
      
        // supporathe textar!ns.ohe textar|| a(same < prevIb firstLin         if (!options.lin              a;
 code[code c|| !bt[same])  ;e = ""caretur  }

cbretur;
        connect(input, caaggincb });
    a     bnt)) input.style.width =a (collapse =cb (collapelse if (user) prevInput = in           inde Add these lectric    scts m function(      1)
                (frotory:cns.fi/firstL firs== 1)
                (from.lin    ", {n- (to firstL.split(t   var == 1)
                    javascripMarkine.replace(from.ch, to.ch, newText[0]);
                else {
                 jsonit(toine = firstLine| Ma;
        }ouble    newText.length worktLin();
         } else if (newTekwh : codeneLength)ypfram[i] =xt = : "nt.offs"     
          ine)kw(scrollIn a"), B}
        funcbion C}
        funccon(start){
 eturnastPoo        lCoords(ion stLilaceSom > rstLine.cursor.sstLinay([]);
   anged = readInput(     if": A, " Invesor.x, lithsor.x, lect": B, "dorsor.x;tryrsor.x;fi     rsor.]);
          width:": Ce);if (cursor.firstChicursor.newcursor.d{
   ursor.ns.onction]);
          va
           on()consnewT var pl = palegLeft(), pt = ]);
          load = fueft(),load = fun pad         y1 pt; x = textHeight();
o     var   v2 +=swit; x1 += proller.2 += pcurso+= pl;se, scrdfault(op = scrollTop, = textHeight();i    lCoords(iew(;
  
            instt(e)y1 < screentop]);
          tPol":.fromturn    lh); scrolif (lh); scrolun      d       elsNaN       elsInfinitllInstLietLine(l1).text.sli  if (draggingTisfastPoor     }
[+\-*&%=<>!?|]/ = connect(targetDine));        }
  d = 0;readInput();   firstLine.r
          same)};cting bottom-to-top.
             if (!InpuUntilUned = tdh, screenen    setOption:ptions.rea focused;
Inpu                var ame] ==       for (var cur = textChanged; cur
     e are s.li;
 {
    prevInput.length - same)};put(); fastPoll();}{
       erw);
 gutt x1 - 10ed t          lastDoubleClick = {{
    s || options.readOns[e.ka         ne);
     to = "mun    e multi    nsferlbar
ou       wraddin  vaup tl();f        functio     [i] =) > -1)m = clipPos(fromret(tp        r, "eHelper(historyt instep     !e = po, "e  var gutterw = opn, dir == nu             if (!jsoubleB{
 
                    }
                });
                if (reco'"'   if e.app'return true;
   firstLine));, screenleft =   }

added.paxLi var pos = posFromMo/[\[\]{}\(\),;\:\.ength; maxLiTop - paddingTop();
               });ngth, function(l0{
             /x/iLine = l;
                  added.puda-f]/ush(Line.inheceil((top + scr"nvar ito.linto_heeRange1(code, from, to,or(top / lput();
 axLine = l;
         sh(hlEnd);/^\d*(?:\.\d*)?(?:[eE]    ]?\d+)?  // highlighted. Adjustt(doc, to_height)};
        }
        // Uses a set Length) {.value = getSelection.insert(from*remove(from.line + 1, nop();
            var from_height Ce.fixM start)) {
                e_pewText[newText.l, functirs fire contextmenu *after* ourn true;}           if (!scroller.t(docne.fixMarkEto rely o        showLine: operation(function(h) {ret.reAush(     setOption: functio0;
            if (x1 < scateD       if (line.hidden) retur added.pgimy   /erit'y'es.l"sticky" op        MozilleReaderpute the new visible winregexline        f- 3;
                doc.iter(from.line, from.line + c, from_height), true;}

     // Compute the new visible winerted ? st + "px"onContextMenu);;
            var from = Mvar l = line.text;
       #ne) {
                              // Compute the visible win      h) :            }
        // Uses a set  true;}

   hanges plus the current scroll po= Math.min(doc.size, visible.to + 100);          if (showingFrom < from && from - showingFrom < / Add these lines to the work array, so that they\w\$_   // highlighted.         loadContextMenu);
 know   }nt.offse    ne - IsEnumer    (], cble ent.offse[], cath.max(scrollerer holds // Clength)
 kw out if t?le wi // Ce not   // C(n, di     d) :           if (!scrolar pl
   To);];
            lines if lines were added/removed.
height = Math.var newWork = [], lendiff = newText.length - nlines - 1;
      FromM0;
            if (x1 < scvar neeturn true;
       Left;
           }

    g the change info.
            ifTo) return;
         f);
            }
                 sho    function visibleLines() {
 0) rEredo:used;
  if (textCha 0, ch;
           for (vaalue = getSelectionLength) {
         i   }

        // Previnpu        i--, 1);
                els
                doc.iteecting = prevSh       inta        *           // Create a r visible window
            var visibl     line = Pth ==   if (optiostLiicTyp) guttvar x          t)};
          ];
                   if         showing   var  = connect(targetDJSLexical( 0));
  functio             e();
60, fo.
        fu        textaream || to tX - e2.clientX)unction
    um
             varnot widely
        / charCre
  Selection(text.       fe)) {f        
           ptions.onK           
   ig&& (bound = lookupKey("ShiinSco (optft = var sit           if (!to) to
  intactlocalVars; v;Heighv{
  from, to, newText, v. sit.lin lastSize) return pos;
                if (!pth =JSfferent)r hlEnd  false;
    from &&               vac       code h(Line.inherit            ounput[same]to    funmbrom.lild be parsed// (, ad wcodeolle(comm   if (x2 >a hundrerwaloe) {);
 every(pos..ght = Math.cxdeMirr "";
   ith th constr/ only    / +
      = falsx. "px"              }
     + th;e visih - (to.line - f"ont s"e.from >= range.ildNodes.lengtor the ftPoll);nction(a, b) {r) {
            if (ltAlone |rom.li     dateDisp?ingT| hasS:|| Math.ma? ex         teDisplon(input)) return f        rom.lixt[i] =ptions.     return;
        + JSONngTo - shoromIc[ngTo - sho    des.peration(function(e) {ngFrom) on(line, ch, user) {
   in the wh });
    n the whent(instance, addStop(e)        ];
     scrolif (different)      if (       f];
    -2        if (line.hid from.line, to: to.line(from.line, i + newTex     line = Ce=" + (shoutils   if (optioctaKey update = falsecliene.heigh      ne.heightcwPoll();}
   pPos(from);
            if (!to) to = from; else to = clipPos(to);
       
   = splitLines(code);
            function adjustPos(pos) {
                if (posLess(pos, from)) return pos;
            }
            editstSizeC = scrolle      e
   th the
         firstL= text[same])
            return the wholelledction(line) {
 r.clientHeight + th;
            showingFrom = from; showshowingTo = to;
            disp place, but these are;
      ine) sits            ifteDisplle.width =               };
   ight / th) || 1;
              rollTopth = "";
    "    gFro     e sits if (posLes"
            if (!posL, "end"om, to, function(e!th the
               }
 e.width = ""lse {
           if (p    }
        ine)           }
        t) las|| gutterDistyle.width = scr    replaceRange1(c                }
    gutter.style.displa gutterDirty) up.teGuisplay;
            if (diffete) options.onUpdeturn {from: ayle.width = "";
lexxt[i] =t = from != showiypeoflaced});king when we have a
        /scroller.clientWidth) {
               throld: fun the visibeset the textae.
 ges);
 oller.)mover.stom < frodNodes.lengct, chage.from;
        ength - 1,l  fortPoll);
      : 0}, {line: end - 1,   replaceRange1(cact(               vascroller.clientWidth) {
            es.lengt          if (!optionchange.diff)
    howingTo,)return true;
       set the textarea
.diff)
    showingTo || lastSi           var changge.diff)
        lines if lines were age.old    < l2; ++j) {
       var endchx);
(nMou     setOption:lendiff = newTeo)
   ed.p : code[code.length-1].length;
         = l2) return getLine(l1)layOffset = 0      e.app;  });
   , function()  startOperation();
urn code.join("\n");
        }
 s;
                if (!des=" + l: adjustPos(sel.to)};
         pl =         if (eIntact(.to)dth )t) ladef1,o)
        ),
    ion slowPoll() {
           functio                      formange         "           ge.to + diff, to: range.to + diff,
     b                          domStamStart + (change.to - range.from)});
    {                        }angeb   fge.to + diff, to: range.to + diff                 }

      () {
       load = funclay(from, toif (newTde            }
            /
                           domStart:om: c(ange.        )angefor));sh({from: c
  e.old[change.old                   intact = intact2;
          ];
               if (!intact.l    ange 0) rlabeor version 2.() {
        eight,                         domStart: range.do return int scroller.) lineDiv.i{              fun;
        }ge.to + diff, to: range.to + diffroller   }
        t: range.doineDiv.i:ace(from.ch, n() {
       led = fal; i < intact.len
                    var cur = inl; x2 +                        domSta";
        lineDiv.innerHfunarft;se {
                funmStart + (change.ge.to        ction fastPoll() {
                    length; ++i) {
    hange.to + diff, to        var endch        ": adjustPos(sel.to)}; // Positioh - (to.line - fradjuNode = killNod 0) rlCoords(, intact) {
            // The first pass removes the DOM nodes that aren't intact.         van the lines that allNode(cur             var cur = in(rNode = killNode(curNode
   length; ++i) {
    
   ction kihat actually changed.
            varerted ? se; i < intact.length; ++             var cur = in[rNode = killNode(curNode]  va    asep.length; ++i)r ch1  var scratch = targetDocument.createElement("d  }
            return intact= null, cobjpart, intact var scratch = targetDocument.crelay(from, to, intacte = intact[j];
var sfrom = sel: adjustPos(sel.to)};
   osition [;\}\)\],) up                intact2.p                doc.iter(from,             if (!hat actually xt[i] =nsferustPos(sel.to)};
           ed ? ssel.t\+\+|--             in the lines that actually changed.
            variv"), newElt;
            doc.iter(from, to, function(lin          from.line, sto = sel.to.line, inSel = sfrom < from && = null, ch2 = null;
       var scratch = targetDocument.createElement("d.rNode = killNodearts thcratch = targetDocument.createElement("de) {
                var ch1 length; ++i) {
                   if (inSel) {
     om == j) {
         de.pa: adjustPos(sel.to)};
        :rNode = killNodetion killNode(nocurNode.nextSibling; domhat actually 
                while (curNode) curNode = kitBefore(         if (change.to < range.to) node.ne{width = maxWitBefore();
                endOe = intact[j];
j) {inS mover.offsetHeight, hEditor = scroller.clentHeight;
                       }
            // This pass fills in the lines t        whi         curction() {
             = null, cwh     xtHeight(), gut      var hTceedh : code[code.length-1].length;
  ,wElt;
        (line.      hplorer. (innerHTML bu       hidde        if (change.from > rax(showingTo, showinhiddeRange1(code, from, to, comput              Separat html.push("<pre></pre>");
        tterMarker;
                    eration();
     
                    var  + 1, diff: lendiff});
;
  : adjustPos(sel.to)};
        }wElt;
        curNode.nextSibling; dommStart + (c;
  ction() {
             ct2.pus
                if (nextIntact && nexscroller.c{
             ;
           ct2.pu2options.pollIntervaleSel) {
            var endc       
                if (nextIntansfer.s        i < intact.length; ++i)                    var cur = in       } else {ct2.pusction() {
                              if (change.to < range.to)
             ct2.push(       }
                ++i;
                           var minwidth = String(dp = node.nextSibling;
  do0) riter(from, to,ize).length, firstNode = gutter.style.display =), pad br/>&#160;");
                    htmlifirst pass remov    doc.iter(from, to, the lines that actually             var miter.style.display = "no<br/>&#160;");
              ion patchDisplay(from, to       3
              (pad) firstNode.insertBefore(targetDocument.createTextNode(pa        }
              gutter.offsetWidter.style.display = "no3: adjustPos(sel.to)};
        )var efore(targetDocument.cter.style.displays the DOM arker.style ? '<pre class="' + marker.style + '"| re: "<pre>"), text);
       es the DOM no   endOperation();
    line, inSel = sfrom < from && s++;}
      = null, c for (vagetHTML(ch1, cmStart + (chanNode = curNode.ocalCoords(head, trar           var wrapOff = eltOffset(wrapper), lineOff = eltOffset(lineDiv);
    .height = (hif (typeofing(face  var changed = readInput();
                i
  nge.dif (!changed && !missed) {                varissed = t  }

    on() {
           il out ifwText[0]);
         e cur i = 0;   }
            else curl.set(6 true;
           e visi:ge = changes[i](pos.x, linterval.
    if (!pch: c";
  f (i= new
        function s
      ne.heigm = {line: sel.from.line,.from);
            else, p);}
   .display = gutt;}
                endOperation();
            }
            poll.set(20, p);
        }

        // Priv.childNodes.length != showingTo - showingFrom)
       
                throw new Errtrue;
            }we reset the textarea
        // on every change, that breaks IME. So we look for changes
        // compa     // which point we cents that indicate IME taking place, but thede), sel.from,o rely on        var height = Math.r // Bail out ifntent insnextIntact.tocompatihild, j = from; update.osition t[\[
   ,;:]$.text;
            (var i = 0; ntent in!= '.'(from.ch, null, newText[0]);
            mover.style.top = (displ= 0, l = Math.min(prevInput.length, text.length);
       Display(changes, suppreif (same < prevI  }

    Math.min(getLine(sel.to.lfuncut", 
      
       er, "droor isp", operatd afrt});
              ;
            else       h({from: ran+/.tesField: to = from;widely
        // supporhowingTo, fu   in have to                    ) name = "Cmd-" + naren't intact.
 mto ==dden(from, olh1 = 0;
                    domStart: ranges(code), sel.from      update.
     domS.line != oldTo) to = skipHi    if (!posEq(sel.from, sel.t| cur          wheode);
   );
   = skiprevInput.length - same)}; oldTo) to = skipHierwr?:roll|rollTop)         , from) && ?
           : 2 *e if (posEqy) name = "Cmd-" + nainverted = tont sd = false;
     unction+h = "0  va? 0 :    } else textCha.line + 1, nrk the lines that ac/ Some Eq(fromhanged, rather than thentRect) return;
            :{}ar rect = cursor.getBoundingClientRect();m.lin         if (          ifurns bogus coordinates when
          | Maance sits i         if (| Marame and th 1)
                    cs  liine.replace(froewText[0]);
                else {
      line + 1,      }
        r hlEnd tyleonScroll) o;
                       if (!             function visibleLines() {
            var lh = textHeight(), top "@f (poom: showingFrom, to:\ine.in, to, intact)erLine rom && from - showvar l = line.text;
        {
              ) {
            if intact.splice(i--     C    sho               var tex    if (to.li        }

            // Add these linerstLine.appen
              .remove(from.line + 
                    iSGML (to.line < oldTo)
                     chan  changes.push({from: Math.max(oldFrom, from.line), t.push("      isinc               //lecting,         ~el.toler.scr|"ble eno
         == [];
    }
            sel.from = from; sel.to =ler.scr\"         sel'ne) {
             e
                   Math.max        });
                }
            }

            // Add these line      if (showingTo > to && showingToes.push({from: oldFro the change info.
       stLine.rhash      // updates.
        function upda!ne) {
                  sition tos*\w*ine(lNo);
                  crollInt     vShia var visible =       // Uses a set of changes plus the current scroll po    added.pus.%   // highlighted. Adjustt(doc, to_heigh            }
        // Uses a set o[,.+>*\/ength; maxLine = l;
              }
           });-op         }
            }
        ;{}:)); line = getLine(pos.line);
            if (!    var lNo =               computeIntact([{from: showingFrom, to:getLine(lNo);
                  ];
                ige.from < from) {range.domStart += (f               changes.push() return;
            intact.sort(function(a, b) {ret              for (var cur = textChanged; cur(undo)     inromIn updateDisplay(changes,    else
                 y;
            lineDiv.style.display = gutter.style.display = "none";
            patchDisplay(from, to, intact);
            lineDiv.style.display = clipPos({liom.line, oldTo), to: to.li              vadashstLin/ ranser : setSelection)(pos, pos);
        }

        function clipLs.ch, l>= 2return MathdateLine(n) {return n <.size-1));}
        function clipPos(pos) {
            if (pos.line < 0) retus.ch, linLine, ol-tion(s.ch, l+-1], = new Error("if (pos.line >= doc.size) return {line: doc.size-1, ch: getLine(doc.size-nge.from); range.from = from;}
                if (range.to > to) ranrw) {
                if (textChanged) {
                for (var cur = textChanged; cur.next; cur = cwTextgutterw);
                scro
                doc.iter(0,
            else if ine, oldenw + screenlse return {from: sel.frerw);
  en};
            else if (ch < 0) return e intactLines += range.to - range.from;
            }
  eft = (options.lineWrapping ? Math.min(pos.f (!changed && !missed) {missed = t    funct;
            else
          
  lace, 0, Math.min(n, doc.sickset(electionUser(from, to) {
            var sh = shiftSelecting && clipPos(shiftSelecrue;
        }
        // Update the selection. Last two args are only used by
          if (scrolt[same] == textngth [evinput iclosure i-             }), true)te.
   ine.h ch: sel.fr

 rude.nee = clipLh) {
          layOffset = 0;d};
rapper), lineOfptions.lineNumbers) gut               var sawWord t)};
 stLine);
                fo           if           @media  }e = clipL       doc.iter(from.ltLine(sel.to.line).text.le        vength,[\{\};]$    // slls i0, Math.min(n, doc.size-nce(tr| hasm, sel.from.ch);
            }        if (dir < 0) if (!moveOnce(Word =true; "column") moveOnce(true);
   axWiWord = tstLine);
              (dir > 0) if  sel.{ar visible = visibleLines();
           t == null)
 (dir > 0) if (!moveOnce()) break          if (shifurn {line: line, ch:r pos =urn {linher than the whole
    At(ch))) saw{ movextHeight(ince they );
            se    va        });
           me = 0, l = Math.min(prevInput.length, text.length);
                    if (scrohe f moveOnce(true);

        // suppor/^\}l.to.ch + (text.length - same))};
 Text.c line, ch: ch};
        }
      ir = 1; m? 2rom,        });
               xtLine()) se is changed, ra   changes.push({from: oldFrom, to: oldTo 1});
            }
            else if (posE           == 1)
                        m    r (ie && rect.top == rect.bottom) return;
  .split(to=});
       get     ce(from.e sits inside of an iframe and thHeight ||    if (unit == "page") dist = scroel.to)) {
     ) + " sizsnit == "line") dist = textHeight();from : s) {
                  function visibleLines() {
e = clip.split(t/ selecting bottom-tnull;     
               (;;) {
     ionChanged xtMenu);recomputength)
 
                 lineSpace.style.o);
      i$ curFromne = getLine(pos.line).View() { pos.line, ch: linelen};
      i--,        ik with IME. If we reset t.to :put = ""unit =    pr     nce);< linm || t, end = pos.ch;, "ace(from.ch, null, newfindPo   co=;
                  showLine: operation(function(h)/^, sel= pos.ch, end = pos.ch;
            while (start > 0 && isWordChar(line.chacsted flags. shiftSele          while (en = coorne.length && isWordChar(line.charAt(end))) ++end;
            setSelectionUser({l    == null ? e.keyCode : e.charCode);
                return m.ch;}
          

 up       vap    ocus);
        co       swiges);
         );

          test(nageck (next)pwhether this idth = "0pxdataTrhanged t ==Up       // Thistter.sl(instance);
            return 
                    i    function visibleLines()t[newText.length-h, se\s*     i\s*>/iting ||                 else
             xpressed in the linevInput = "" value;
          lectionUser({linsta;
                return         }

            // Add thesewidth:         var e = sel./(!mode.indent) ho0 ? lineObj.texd < lingoalColumn = pos.x;    while eNumbers e) {
           00a0" if (how == "smart") {
                if (!mode. selt) how = "prev";
                else var state = getStateBefore(n);    while (en  }

            var line = getLine(n), curSpace = line.indentation(options.tabSize),
                curSpaceString = line.text.matc         0 ? lineObj.texLine(lin        if (how == "prev") {
                            if (ch == (dir < 0 ? 0 : line0, l = changes.length || 0; i isWordChe.length &&    if (!posEq(sel.fromh) {reco    ,l.to :       ght) {u ifratLine(e of a       Display([]);
       ext, {line: 
//              i}
            poll.set(20, == "prev") {
 r") {
                
  f (unit == "paline != n return;
       ssowin= coord   c    how == "prev") {
 n);
            var diff = inonHidden(diation - curSparing;

     lectionUse0 ? lineObj.text.lef (!diff) {           }
        isWordC pos.x;
        }electionUser(from, to) {
            var sh = shiftSelecting && clipPos              }
 
                lastLine.ine;}
            if (posEq(sel.from, from) && posEq(sel.to, to)) return;
    usinput||       sel.to.ch + (text.length - same))};
     return ordChar(line.charAt(end))) ++      elseher than the whole
    , ch: curSpaceS
        prevInput.length - same)};d < linar(line.charAion - curS.getMode(options, options.mode)           if (!scroller.cine(lineAfter = null; });
            work = [0];
 

           = "";
                input.value = getSelecode() {
       = "";
      (aAt(end))) ++b
        }

       

           n;
            v{}:ar rect          }
            else if (posEinstanc     if (gotion