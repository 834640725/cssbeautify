/*
 Copyright (C) 2011 Sencha Inc.

 Author: Ariya Hidayat.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/*jslint continue: true, indent: 4 */

function cssbeautify(style, opt) {
    "use strict";
    var options, index = 0, length = style.length, formatted = '',
        ch, ch2, str, state, State, quote, comment,
        openbrace = ' {',
        trimRight;

    options = arguments.length > 1 ? opt : {};
    if (typeof options.indent === 'undefined') {
        options.indent = '    ';
    }
    if (typeof options.openbrace === 'string') {
        openbrace = (options.openbrace === 'end-of-line') ? ' {' : '\n{';
    }

    function isWhitespace(c) {
        return ' \t\n\r\f'.indexOf(c) >= 0;
    }

    function isQuote(c) {
        return '\'"'.indexOf(c) >= 0;
    }

    if (String.prototype.trimRight) {
        trimRight = function (s) {
            return s.trimRight();
        };
    } else {
        // old Internet Explorer
        trimRight = function (s) {
            return s.replace(/\s+$/, '');
        };
    }

    State = {
        Start: 0,
        AtRule: 1,
        Selector: 2,
        Block: 3,
        PropertyName: 4,
        Separator: 5,
        PropertyValue: 6
    };
    state = State.Start;
    comment = false;

    // We want to deal with LF (\n) only
    style = style.replace(/\r\n/g, '\n');

    while (index < length) {
        ch = style.charAt(index);
        ch2 = style.charAt(index + 1);
        index += 1;

        // String literal
        if (isQuote(quote)) {
            formatted += ch;
            if (ch === quote) {
                quote = null;
            }
            if (ch === '\\' && ch2 === quote) {
                // Don't treat escaped character as the closing quote
                formatted += ch2;
                index += 1;
            }
            continue;
        }

        // Comment
        if (comment) {
            formatted += ch;
            if (ch === '*' && ch2 === '/') {
                comment = false;
                formatted += ch2;
                index += 1;
            }
            continue;
        } else {
            if (ch === '/' && ch2 === '*') {
                comment = true;
                formatted += ch;
                formatted += ch2;
                index += 1;
                continue;
            }
        }

        if (state === State.Start) {

            // Copy white spaces and control characters
            if (ch <= ' ' || ch.charCodeAt(0) >= 128) {
                state = State.Start;
                formatted += ch;
                continue;
            }

            // Selector or at-rule
            // FIXME: handle Unicode characters
            if ((ch >= 'a' && ch <= 'z') ||
                    (ch >= 'A' && ch <= 'Z') ||
                    (ch >= '0' && ch <= '9') ||
                    (ch === '-') || (ch === '_') ||
                    (ch === '-') || (ch === '_') ||
                    (ch === '*') || (ch === '@') ||
                    (ch === '.') || (ch === ':')) {

                // Clear trailing whitespaces and linefeeds.
                str = trimRight(formatted);

                // After finishing a ruleset or directive statement,
                // there should be one blank line.
                if (str.charAt(str.length - 1) === '}' ||
                        str.charAt(str.length - 1) === ';') {

                    formatted = str + '\n\n';
                } else {
                    // After block comment, keep all the linefeeds but
                    // start from the first column (remove whitespaces prefix).
                    while (true) {
                        ch2 = formatted.charAt(formatted.length - 1);
                        if (ch2 !== ' ' && ch2.charCodeAt(0) !== 9) {
                            break;
                        }
                        formatted = formatted.substr(0, formatted.length - 1);
                    }
                }
                formatted += ch;
                state = (ch === '@') ? State.AtRule : State.Selector;
                continue;
            }
        }

        if (state === State.AtRule) {
            // Continue until we hit semicolon
            if (ch === ';') {
                formatted += ch;
                state = State.Start;
                continue;
            }
            // or a block
            if (ch === '{') {
                formatted = trimRight(formatted);
                formatted += openbrace;
                if (ch2 !== '\n') {
                    formatted += '\n';
                }
                continue;
            }
            formatted += ch;
            continue;
        }

        if (state === State.Selector) {

            // Handle string literal
            if (isQuote(ch)) {
                formatted += ch;
                quote = ch;
                continue;
            }

            // Continue until we hit '{'
            if (ch === '{') {
                formatted = trimRight(formatted);
                formatted += openbrace;
                if (ch2 !== '\n') {
                    formatted += '\n';
                }
                state = State.Block;
            } else {
                formatted += ch;
            }
            continue;
        }

        if (state === State.Block) {
            // Continue until we hit '}'
            if (ch === '}') {
                formatted = trimRight(formatted);
                formatted += '\n}';
                state = State.Start;
                continue;
            }
            // Make sure there is no blank line or trailing spaces inbetween
            if (ch === '\n') {
                formatted = trimRight(formatted);
                formatted += '\n';
                continue;
            }
            // property name
            if (!isWhitespace(ch)) {
                formatted = trimRight(formatted);
                formatted += '\n';
                formatted += options.indent;
                formatted += ch;
                state = State.PropertyName;
                continue;
            }
            formatted += ch;
            continue;
        }

        if (state === State.PropertyName) {
            // Continue until we hit ':'
            if (ch === ':') {
                formatted = trimRight(formatted);
                formatted += ': ';
                state = State.Separator;
                continue;
            }
            // or until we hit '}'
            if (ch === '}') {
                formatted = trimRight(formatted);
                formatted += '\n}';
                state = State.Start;
                continue;
            }
            formatted += ch;
            continue;
        }

        if (state === State.Separator) {
            if (!isWhitespace(ch)) {
                formatted += ch;
                if (isQuote(ch)) {
                    state = State.PropertyValue;
                    quote = ch;
                    continue;
                }
                state = State.PropertyValue;
                continue;
            }
            continue;
        }

        if (state === State.PropertyValue) {
            if (isQuote(ch)) {
                formatted += ch;
                quote = ch;
                continue;
            }
            // Continue until we hit ';''
            if (ch === ';') {
                formatted = trimRight(formatted);
                formatted += ';\n';
                state = State.Block;
                continue;
            }
            // or until we hit '}'
            if (ch === '}') {
                formatted = trimRight(formatted);
                formatted += '\n}';
                state = State.Start;
                continue;
            }
            formatted += ch;
            continue;
        }

        // The default action is to copy the character (to prevent
        // infinite loop).
        formatted += ch;
    }

    return formatted;
}
