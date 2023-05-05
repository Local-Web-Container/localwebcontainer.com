
/** @typedef {{
  name?: string;
  pattern: RegExp;
  handlers: Array<(i?: number, token?: string) => State | void>
}} State */

/** @typedef {{
  name: string;
  as: string;
}} Specifier */

/** @typedef {{
  start: number;
  end: number;
  toString: (nameBySource?: Map<string, string>) => string;
  specifiers?: Specifier[];
  [key: string]: any;
}} Range */

/**
 * @param {Specifier[]} specifiers
 * @param {string} name
 */
function get_alias(specifiers, name) {
  var i = specifiers.length;
  while (i--) {
    if (specifiers[i].name === name) { return specifiers[i].as; }
  }
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 * @param {Specifier[]} specifiers
 * @param {string} source
 */
function importDecl(str, start, end, specifiers, source) {
  var name = get_alias(specifiers, '*') || get_alias(specifiers, 'default');

  return {
    start,
    end,
    source,
    name,
    specifiers,
    toString() {
      return ("/*" + (str.slice(start, end)) + "*/");
    }
  };
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 */
function exportDefaultDeclaration(str, start, end) {
  var match = /^\s*(?:(class)(\s+extends|\s*{)|(function)\s*\()/.exec(str.slice(end));

  if (match) {
    // anonymous class declaration
    end += match[0].length;

    var name = '__default_export';

    return {
      start,
      end,
      name,
      as: 'default',
      toString() {
        return match[1]
          ? ("class " + name + (match[2]))
          : ("function " + name + "(");
      }
    };
  }

  return {
    start,
    end,
    toString() {
      return "__exports.default =";
    }
  };
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} specifiersStart
 * @param {number} specifiersEnd
 * @param {number} end
 * @param {string} source
 */
function exportSpecifiersDeclaration(str, start, specifiersStart, specifiersEnd, end, source) {
  var specifiers = processSpecifiers(str.slice(specifiersStart + 1, specifiersEnd - 1).trim());

  return {
    start,
    end,
    source,
    /** @param {Map<string, string>} nameBySource */
    toString(nameBySource) {
      var name = source && nameBySource.get(source);

      return specifiers
        .map(function (s) {
          return ("__exports." + (s.as) + " = " + (name ? (name + "." + (s.name)) : s.name) + "; ");
        })
        .join('') + "/*" + (str.slice(start, end)) + "*/"
    }
  };
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} c
 */
function exportDecl(str, start, c) {
  var end = c;

  while (str[c] && /\S/.test(str[c])) { c += 1; }
  while (str[c] && !/\S/.test(str[c])) { c += 1; }

  var nameStart = c;
  while (str[c] && !punctuatorChars.test(str[c]) && !isWhitespace(str[c])) { c += 1; }
  var nameEnd = c;

  var name = str.slice(nameStart, nameEnd);

  if (name === 'function') {
    while (str[c] && /\S/.test(str[c])) { c += 1; }
    while (str[c] && !/\S/.test(str[c])) { c += 1; }

    nameStart = c;
    while (str[c] && !punctuatorChars.test(str[c]) && !isWhitespace(str[c])) { c += 1; }
    nameEnd = c;

    name = str.slice(nameStart, nameEnd);
  }

  return {
    start,
    end,
    name,
    toString() {
      return '';
    }
  };
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 * @param {string} source
 */
function exportStarDeclaration(str, start, end, source) {
  return {
    start,
    end,
    source,
    /**
     * @param {Map<string, string>} nameBySource
     */
    toString(nameBySource) {
      return ("Object.assign(__exports, " + (nameBySource.get(source)) + "); /*" + (str.slice(start, end)) + "*/");
    }
  }
}

var keywords = /\b(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
var punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
var ambiguous = /(\}|\)|\+\+|--)\s*$/;

var punctuatorChars = /[{}()[.;,<>=+\-*%&|\^!~?:/]/;
var keywordChars = /[a-zA-Z_$0-9]/;

var whitespace_obj = { ' ': 1, '\t': 1, '\n': 1, '\r': 1, '\f': 1, '\v': 1, '\u00A0': 1, '\u2028': 1, '\u2029': 1 };

/**
 * @param {string} char
 */
function isWhitespace(char) {
  // this is faster than testing a regex
  return char in whitespace_obj;
}

/**
 * @param {string} char
 */
function isQuote(char) {
  return char === "'" || char === '"';
}

var namespaceImport = /^\*\s+as\s+(\w+)$/;
var defaultAndStarImport = /(\w+)\s*,\s*\*\s*as\s*(\w+)$/;
var defaultAndNamedImport = /(\w+)\s*,\s*{(.+)}$/;

/**
 * @param {string} str
 * @returns {Specifier[]}
 */
function processImportSpecifiers(str) {
  var match = namespaceImport.exec(str);
  if (match) {
    return [{ name: '*', as: match[1] }];
  }

  match = defaultAndStarImport.exec(str);
  if (match) {
    return [{ name: 'default', as: match[1] }, { name: '*', as: match[2] }];
  }

  match = defaultAndNamedImport.exec(str);
  if (match) {
    return [{ name: 'default', as: match[1] }].concat(processSpecifiers(match[2].trim()));
  }

  if (str[0] === '{') { return processSpecifiers(str.slice(1, -1).trim()); }

  if (str) { return [{ name: 'default', as: str }]; }

  return [];
}

/**
 * @param {string} str
 * @returns {Specifier[]}
 */
function processSpecifiers(str) {
  return str
    ? str.split(',').map(function (part) {
      var ref = part.trim().split(/[^\S]+/);
      var name = ref[0];
      var as = ref[2];
      return { name: name, as: as || name };
    })
    : [];
}

/**
 * @param {string} str
 * @param {number} i
 */
function getImportDeclaration(str, i) {
  var start = i;

  var specifierStart = i += 6;
  while (str[i] && isWhitespace(str[i])) { i += 1; }
  while (str[i] && !isQuote(str[i])) { i += 1; }
  var specifierEnd = i;

  var sourceStart = i += 1;
  while (str[i] && !isQuote(str[i])) { i += 1; }
  var sourceEnd = i++;

  return importDecl(
    str,
    start,
    i,
    processImportSpecifiers(str.slice(specifierStart, specifierEnd).replace(/from\s*$/, '').trim()),
    str.slice(sourceStart, sourceEnd)
  );
}

/**
 * @param {number} i
 */
function getImportStatement(i) {
  return {
    start: i,
    end: i + 6,
    toString() {
      return '__import'
    }
  };
}

var importMetaUrlPattern = /^import\s*\.\s*meta\s*\.\s*url/;

/**
 * @param {string} str
 * @param {number} start
 * @param {string} id
 */
function getImportMetaUrl(str, start, id) {
  var match = importMetaUrlPattern.exec(str.slice(start));
  if (match) {
    return {
      start: start,
      end: start + match[0].length,
      toString() {
        return JSON.stringify('' + id);
      }
    }
  }
}

/**
 * @param {string} str
 * @param {number} i
 */
function getExportDeclaration(str, i) {
  var start = i;

  i += 6;
  while (str[i] && isWhitespace(str[i])) { i += 1; }

  var declarationStart = i;

  if (str[i] === '{') {
    while (str[i] !== '}') { i += 1; }
    i += 1;

    var specifiersEnd = i;

    var source = null;

    while (isWhitespace(str[i])) { i += 1; }
    if (/^from[\s\n'"]/.test(str.slice(i, i + 5))) {
      i += 4;
      while (isWhitespace(str[i])) { i += 1; }

      while (str[i] && !isQuote(str[i])) { i += 1; }
      var sourceStart = i += 1;
      while (str[i] && !isQuote(str[i])) { i += 1; }

      source = str.slice(sourceStart, i);
      i += 1;
    }

    return exportSpecifiersDeclaration(
      str,
      start,
      declarationStart,
      specifiersEnd,
      i,
      source
    );
  }

  if (str[i] === '*') {
    i += 1;
    while (isWhitespace(str[i])) { i += 1; }
    i += 4;
    while (str[i] && !isQuote(str[i])) { i += 1; }

    var sourceStart$1 = i += 1;
    while (str[i] && !isQuote(str[i])) { i += 1; }
    var sourceEnd = i++;

    return exportStarDeclaration(
      str,
      start,
      i,
      str.slice(sourceStart$1, sourceEnd)
    );
  }

  if (/^default\b/.test(str.slice(i, i + 8))) {
    return exportDefaultDeclaration(
      str,
      start,
      declarationStart + 7
    );
  }

  return exportDecl(
    str,
    start,
    declarationStart
  );
}

/**
 * @param {string} str
 * @param {string} id
 * @returns {[Range[], Range[], Range[], Range[]]}
 */
function find(str, id) {
  /** @type {State} */
  var escapedFrom;
  var regexEnabled = true;
  var pfixOp = false;

  /** @type {State[]} */
  var stack = [];

  var lsci = -1; // last significant character index
  var lsc = function () { return str[lsci]; };

  /** @type {Record<string, number>} */
  var parenMatches = {};

  /** @type {Record<string, number>} */
  var openingParenPositions = {};
  var parenDepth = 0;

  /** @type {Range[]} */
  var importDeclarations = [];

  /** @type {Range[]} */
  var importStatements = [];

  /** @type {Range[]} */
  var importMetaUrls = [];

  /** @type {Range[]} */
  var exportDeclarations = [];

  function tokenClosesExpression() {
    if (lsc() === ')') {
      var c = parenMatches[lsci];
      while (isWhitespace(str[c - 1])) {
        c -= 1;
      }

      // if parenthesized expression is immediately preceded by `if`/`while`, it's not closing an expression
      return !/(if|while)$/.test(str.slice(c - 5, c));
    }

    // TODO handle }, ++ and -- tokens immediately followed by / character
    return true;
  }

  /** @type {State} */
  var base = {
    pattern: /(?:(\()|(\))|({)|(})|(")|(')|(\/\/)|(\/\*)|(\/)|(`)|(import)|(export)|(\+\+|--))/g,

    handlers: [
      // (
      function (i) {
        lsci = i;
        openingParenPositions[parenDepth++] = i;
      },

      // )
      function (i) {
        lsci = i;
        parenMatches[i] = openingParenPositions[--parenDepth];
      },

      // {
      function (i) {
        lsci = i;
        stack.push(base);
      },

      // }
      function (i) {
        lsci = i;
        return stack.pop();
      },

      // "
      function (i) {
        stack.push(base);
        return double_quoted;
      },

      // '
      function (i) {
        stack.push(base);
        return single_quoted;
      },

      // //
      function (i) { return line_comment; },

      // /*
      function (i) { return block_comment; },

      // /
      function (i) {
        // could be start of regex literal OR division punctuator. Solution via
        // http://stackoverflow.com/questions/5519596/when-parsing-javascript-what-determines-the-meaning-of-a-slash/27120110#27120110

        var b = i;
        while (b > 0 && isWhitespace(str[b - 1])) {
          b -= 1;
        }

        if (b > 0) {
          var a = b;

          if (punctuatorChars.test(str[a - 1])) {
            while (a > 0 && punctuatorChars.test(str[a - 1])) {
              a -= 1;
            }
          } else {
            while (a > 0 && keywordChars.test(str[a - 1])) {
              a -= 1;
            }
          }

          var token = str.slice(a, b);

          regexEnabled = token
            ? keywords.test(token) ||
              punctuators.test(token) ||
              (ambiguous.test(token) && !tokenClosesExpression())
            : false;
        } else {
          regexEnabled = true;
        }

        return slash;
      },

      // `
      function (i) { return template_string; },

      // import
      function (i) {
        if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
          var j = i + 6;
          var char;

          do {
            char = str[j++];
          } while (isWhitespace(char));

          var hasWhitespace = j > i + 7;

          if (/^['"{*]$/.test(char) || (hasWhitespace && /^[a-zA-Z_$]$/.test(char))) {
            var d = getImportDeclaration(str, i);
            importDeclarations.push(d);
            p = d.end;
          }

          else if (char === '(') {
            var s = getImportStatement(i);
            importStatements.push(s);
            p = s.end;
          }

          else if (char === '.') {
            var u = getImportMetaUrl(str, i, id);
            if (u) {
              importMetaUrls.push(u);
              p = u.end;
            }
          }
        }
      },

      // export
      function (i) {
        if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
          if (/export[\s\n{]/.test(str.slice(i, i + 7))) {
            var d = getExportDeclaration(str, i);
            exportDeclarations.push(d);
            p = d.end;
          }
        }
      },

      // ++/--
      function (i) {
        pfixOp = (!pfixOp && str[i - 1] === '+');
      }
    ]
  };

  /** @type {State} */
  var slash = {
    pattern: /(?:(\[)|(\\)|(.))/g,

    handlers: [
      // [
      function (i) { return regexEnabled ? regex_character : base; },

      // \\
      function (i) { return ((escapedFrom = regex), escaped); },

      // anything else
      function (i) { return regexEnabled && !pfixOp ? regex : base; }
    ]
  };

  /** @type {State} */
  var regex = {
    pattern: /(?:(\[)|(\\)|(\/))/g,

    handlers: [
      // [
      function () { return regex_character; },

      // \\
      function () { return ((escapedFrom = regex), escaped); },

      // /
      function () { return base; }
    ]
  };

  /** @type {State} */
  var regex_character = {
    pattern: /(?:(\])|(\\))/g,

    handlers: [
      // ]
      function () { return regex; },

      // \\
      function () { return ((escapedFrom = regex_character), escaped); }
    ]
  };

  /** @type {State} */
  var double_quoted = {
    pattern: /(?:(\\)|("))/g,

    handlers: [
      // \\
      function () { return ((escapedFrom = double_quoted), escaped); },

      // "
      function () { return stack.pop(); }
    ]
  };

  /** @type {State} */
  var single_quoted = {
    pattern: /(?:(\\)|('))/g,

    handlers: [
      // \\
      function () { return ((escapedFrom = single_quoted), escaped); },

      // '
      function () { return stack.pop(); }
    ]
  };

  /** @type {State} */
  var escaped = {
    pattern: /(.)/g,

    handlers: [
      function () { return escapedFrom; }
    ]
  };

  /** @type {State} */
  var template_string = {
    pattern: /(?:(\${)|(\\)|(`))/g,

    handlers: [
      // ${
      function () {
        stack.push(template_string);
        return base;
      },

      // \\
      function () { return ((escapedFrom = template_string), escaped); },

      // `
      function () { return base; }
    ]
  };

  /** @type {State} */
  var line_comment = {
    pattern: /((?:\n|$))/g,

    handlers: [
      // \n
      function () { return base; }
    ]
  };

  /** @type {State} */
  var block_comment = {
    pattern: /(\*\/)/g,

    handlers: [
      // \n
      function () { return base; }
    ]
  };

  var state = base;

  var p = 0;

  while (p < str.length) {
    state.pattern.lastIndex = p;
    var match = state.pattern.exec(str);

    if (!match) {
      if (stack.length > 0 || state !== base) {
        throw new Error("Unexpected end of file");
      }

      break;
    }

    p = match.index + match[0].length;

    for (var j = 1; j < match.length; j += 1) {
      if (match[j]) {
        state = state.handlers[j - 1](match.index) || state;
        break;
      }
    }
  }

  return [
    importDeclarations,
    importStatements,
    importMetaUrls,
    exportDeclarations
  ];
}

/**
 * @param {string} source
 * @param {string} id
 */
function transform(source, id) {
  var ref = find(source, id);
  var importDeclarations = ref[0];
  var importStatements = ref[1];
  var importMetaUrls = ref[2];
  var exportDeclarations = ref[3];

  var nameBySource = new Map();

  importDeclarations.forEach(function (d) {
    if (nameBySource.has(d.source)) { return; }
    nameBySource.set(d.source, d.name || ("__dep_" + (nameBySource.size)));
  });

  exportDeclarations.forEach(function (d) {
    if (!d.source) { return; }
    if (nameBySource.has(d.source)) { return; }
    nameBySource.set(d.source, d.name || ("__dep_" + (nameBySource.size)));
  });

  var deps = Array.from(nameBySource.keys())
    .map(function (s) { return ("'" + s + "'"); })
    .join(', ');

  var names = ['__import', '__exports'].concat(Array.from(nameBySource.values()))
    .join(', ');

  /** @type {string[]} */
  var hoisted = [];
  importDeclarations.forEach(function (decl) {
    var name = nameBySource.get(decl.source);

    decl.specifiers
      .sort(function (a, b) {
        if (a.name === 'default') { return 1; }
        if (b.name === 'default') { return -1; }
      })
      .forEach(function (s) {
        if (s.name !== '*') {
          var assignment = (s.name === 'default' && s.as === name)
            ? ((s.as) + " = " + name + ".default; ")
            : ("var " + (s.as) + " = " + name + "." + (s.name) + "; ");

          hoisted.push(assignment);
        }
      });
  });

  var transformed = "__shimport__.define('" + id + "', [" + deps + "], function(" + names + "){ " + (hoisted.join(''));

  var ranges = importDeclarations.concat( importStatements,
    importMetaUrls,
    exportDeclarations
  ).sort(function (a, b) { return a.start - b.start; });

  var c = 0;

  for (var i = 0; i < ranges.length; i += 1) {
    var range = ranges[i];
    transformed += (
      source.slice(c, range.start) +
      range.toString(nameBySource)
    );

    c = range.end;
  }

  transformed += source.slice(c);

  exportDeclarations.forEach(function (d) {
    if (d.name) { transformed += "\n__exports." + (d.as || d.name) + " = " + (d.name) + ";"; }
  });

  transformed += "\n});\n//# sourceURL=" + id;

  return transformed;
}

// @ts-check

/** @type {Record<string, Promise<any>>} */
var promises = {};

/** @typedef {(id: string) => Promise<any>} __Import */
/** @typedef {Record<string, any>} __Exports */

/**
 * @param {string} id
 * @param {string[]} deps
 * @param {(__import: __Import, __exports: __Exports, ...deps: any[]) => void} factory
 */
function define(id, deps, factory) {
  var __import = function (dep) { return load(new URL(dep, id).toString()); };

  return Promise.all(deps.map(__import)).then(function (__deps) {
    var __exports = {};

    factory.apply(void 0, [ __import, __exports ].concat( __deps ));
    return __exports;
  })
}

/**
 * @param {string} url
 */
async function load (url) {
  return promises[url] ??= fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(url + ' returned non ok response')
      return r.text();
    })
    .then(text => evaluate(transform(text, url)) )
}

/** @param {string} code */
function evaluate(code) {
  return (0, eval)(code);
}

globalThis.__shimport__ = {
  define,
  load,
  transform
}

export { define, load as shimport, transform }
