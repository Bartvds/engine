var Command, Parser, Stylesheet, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Parser = require('ccss-compiler');

Command = require('../Command');

Stylesheet = (function(_super) {
  __extends(Stylesheet, _super);

  function Stylesheet() {
    _ref = Stylesheet.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Stylesheet.prototype.type = 'Stylesheet';

  Stylesheet.prototype.signature = [
    {
      'source': ['Selector', 'String', 'Node']
    }, [
      {
        'type': ['String'],
        'text': ['String']
      }
    ]
  ];

  Stylesheet.define({
    "eval": function(node, type, text, engine, operation, continuation, scope) {
      engine.Stylesheet.add(engine.engine, operation, continuation, node, type, node.textContent);
    },
    "load": function(node, type, method, engine, operation, continuation, scope) {
      var src, xhr,
        _this = this;
      src = node.href || node.src || node;
      type || (type = node.type || 'text/gss');
      xhr = new XMLHttpRequest();
      engine.Stylesheet.block(engine);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          engine.Stylesheet.add(engine, operation, continuation, node, type, xhr.responseText);
          if (engine.Stylesheet.unblock(engine)) {
            return engine.Stylesheet.complete(engine);
          }
        }
      };
      xhr.open('GET', method && method.toUpperCase() || src);
      return xhr.send();
    }
  });

  Stylesheet.mimes = {
    "text/gss-ast": function(source) {
      return JSON.parse(source);
    },
    "text/gss": function(source) {
      var _ref1;
      return (_ref1 = Parser.parse(source)) != null ? _ref1.commands : void 0;
    }
  };

  Stylesheet.add = function(engine, operation, continuation, stylesheet, type, source) {
    var el, index, old, stylesheets, _base, _i, _len;
    type = stylesheet.getAttribute('type') || 'text/gss';
    if (stylesheet.operations) {
      engine.queries.clean(this.prototype.delimit(stylesheet.continuation));
      if ((old = engine.stylesheets[stylesheet.continuation]) !== stylesheet) {
        engine.stylesheets.splice(engine.stylesheets.indexOf(old), 1);
      }
    } else {
      stylesheet.continuation = this.prototype.delimit(continuation, this.prototype.DESCEND);
    }
    stylesheet.command = this;
    stylesheet.operations = engine.clone(this.mimes[type](source));
    stylesheets = (_base = engine.engine).stylesheets || (_base.stylesheets = []);
    engine.console.row('parse', stylesheet.operations, stylesheet.continuation);
    if (stylesheets.indexOf(stylesheet) === -1) {
      for (index = _i = 0, _len = stylesheets.length; _i < _len; index = ++_i) {
        el = stylesheets[index];
        if (!engine.queries.comparePosition(el, stylesheet, operation, operation)) {
          break;
        }
      }
      stylesheets.splice(index, 0, stylesheet);
    }
    engine.stylesheets[stylesheet.continuation] = stylesheet;
    stylesheet.dirty = true;
  };

  Stylesheet.operations = [['eval', ['[*=]', ['tag', 'style'], 'type', 'text/gss']], ['load', ['[*=]', ['tag', 'link'], 'type', 'text/gss']]];

  Stylesheet.perform = function(engine) {
    var stylesheet, _i, _len, _ref1;
    if (engine.stylesheets) {
      _ref1 = engine.stylesheets;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        stylesheet = _ref1[_i];
        this.evaluate(engine, stylesheet);
      }
    }
    return this;
  };

  Stylesheet.evaluate = function(engine, stylesheet) {
    var scope;
    if (!stylesheet.dirty) {
      return;
    }
    stylesheet.dirty = void 0;
    if (stylesheet.getAttribute('scoped') != null) {
      scope = stylesheet.parentNode;
    }
    return engine.solve(stylesheet.operations, stylesheet.continuation, scope);
  };

  Stylesheet.complete = function(engine) {
    this.perform(engine);
    if (engine.blocking === 0) {
      engine.blocking = void 0;
      return engine.engine.commit(void 0, void 0, true);
    }
  };

  Stylesheet.compile = function(engine) {
    this.CanonicalizeSelectorRegExp = new RegExp("[$][a-z0-9]+[" + engine.queries.DESCEND + "]\s*", "gi");
    this.CleanupSelectorRegExp = new RegExp(engine.queries.DESCEND, 'g');
    engine.engine.solve('Document', 'stylesheets', this.operations);
    if (!engine.blocking && engine.stylesheets) {
      return this.complete(engine);
    }
  };

  Stylesheet.update = function(engine, operation, property, value, stylesheet, rule) {
    var body, dump, generated, index, item, needle, next, ops, other, previous, rules, selectors, sheet, watchers, _i, _j, _len, _ref1;
    watchers = this.getWatchers(engine, stylesheet);
    dump = this.getStylesheet(engine, stylesheet);
    sheet = dump.sheet;
    needle = this.getOperation(operation, watchers, rule);
    previous = [];
    for (index = _i = 0, _len = watchers.length; _i < _len; index = ++_i) {
      item = watchers[index];
      if (index >= needle) {
        break;
      }
      if (ops = watchers[index]) {
        other = this.getRule(watchers[ops[0]][0]);
        if (previous.indexOf(other) === -1) {
          previous.push(other);
        }
      }
    }
    if (!sheet) {
      if (dump.parentNode) {
        dump.parentNode.removeChild(dump);
      }
      return;
    }
    rules = sheet.rules || sheet.cssRules;
    if (needle !== operation.index || value === '') {
      generated = rules[previous.length];
      generated.style[property] = value;
      next = void 0;
      if (needle === operation.index) {
        needle++;
      }
      for (index = _j = needle, _ref1 = watchers.length; needle <= _ref1 ? _j < _ref1 : _j > _ref1; index = needle <= _ref1 ? ++_j : --_j) {
        if (ops = watchers[index]) {
          next = this.getRule(watchers[ops[0]][0]);
          if (next !== rule) {
            sheet.deleteRule(previous.length);
          }
          break;
        }
      }
      if (!next) {
        sheet.deleteRule(previous.length);
      }
    } else {
      body = property + ':' + value;
      selectors = this.getSelector(operation);
      index = sheet.insertRule(selectors + "{" + body + "}", previous.length);
    }
    return true;
  };

  Stylesheet.getRule = function(operation) {
    var rule;
    rule = operation;
    while (rule = rule.parent) {
      if (rule[0] === 'rule') {
        return rule;
      }
    }
  };

  Stylesheet.getStylesheet = function(engine, stylesheet) {
    var sheet, _base;
    if (!(sheet = ((_base = engine.stylesheets).dumps || (_base.dumps = {}))[stylesheet._gss_id])) {
      sheet = engine.stylesheets.dumps[stylesheet._gss_id] = document.createElement('STYLE');
      stylesheet.parentNode.insertBefore(sheet, stylesheet.nextSibling);
    }
    return sheet;
  };

  Stylesheet.getWatchers = function(engine, stylesheet) {
    var _base, _base1, _name;
    return (_base = ((_base1 = engine.stylesheets).watchers || (_base1.watchers = {})))[_name = stylesheet._gss_id] || (_base[_name] = []);
  };

  Stylesheet.getOperation = function(operation, watchers, rule) {
    var needle, other, _i, _len, _ref1, _ref2;
    needle = operation.index;
    _ref1 = rule.properties;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      other = _ref1[_i];
      if ((_ref2 = watchers[other]) != null ? _ref2.length : void 0) {
        needle = other;
        break;
      }
    }
    return needle;
  };

  Stylesheet.set = function(engine, operation, continuation, stylesheet, element, property, value) {
    var rule;
    if (rule = this.getRule(operation)) {
      if (this.watch(engine, operation, continuation, stylesheet)) {
        if (this.update(engine, operation, property, value, stylesheet, rule)) {
          engine.engine.restyled = true;
        }
      }
      return true;
    }
  };

  Stylesheet.block = function(engine) {
    return engine.blocking = (engine.blocking || 0) + 1;
  };

  Stylesheet.unblock = function(engine) {
    return --engine.blocking === 0;
  };

  Stylesheet.remove = function(engine, continuation) {
    var operation, operations, stylesheet, watchers, _i, _j, _len, _ref1;
    if (engine.stylesheets) {
      _ref1 = engine.stylesheets;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        stylesheet = _ref1[_i];
        if (watchers = this.getWatchers(engine, stylesheet)) {
          if (operations = watchers[continuation]) {
            for (_j = operations.length - 1; _j >= 0; _j += -1) {
              operation = operations[_j];
              this.unwatch(engine, operation, continuation, stylesheet, watchers);
            }
          }
        }
      }
    }
  };

  Stylesheet.watch = function(engine, operation, continuation, stylesheet) {
    var meta, watchers, _name;
    watchers = this.getWatchers(engine, stylesheet);
    meta = (watchers[_name = operation.index] || (watchers[_name] = []));
    if (meta.indexOf(continuation) > -1) {
      return;
    }
    (watchers[continuation] || (watchers[continuation] = [])).push(operation);
    return meta.push(continuation) === 1;
  };

  Stylesheet.unwatch = function(engine, operation, continuation, stylesheet, watchers) {
    var index, meta, observers;
    if (watchers == null) {
      watchers = this.getWatchers(engine, stylesheet);
    }
    index = operation.index;
    meta = watchers[index];
    meta.splice(meta.indexOf(continuation), 1);
    observers = watchers[continuation];
    observers.splice(observers.indexOf(operation), 1);
    if (!observers.length) {
      delete watchers[continuation];
    }
    if (!meta.length) {
      delete watchers[index];
      return this.update(engine, operation, operation[1], '', stylesheet, this.getRule(operation));
    }
  };

  Stylesheet["export"] = function() {
    var id, rule, sheet, style, text, _i, _len, _ref1, _ref2;
    sheet = [];
    _ref1 = engine.stylesheets.dumps;
    for (id in _ref1) {
      style = _ref1[id];
      _ref2 = style.sheet.rules || style.sheet.cssRules;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        rule = _ref2[_i];
        text = rule.cssText.replace(/\[matches~="(.*?)"\]/g, function(m, selector) {
          return selector.replace(/@\d+/g, '').replace(/↓/g, ' ');
        });
        sheet.push(text);
      }
    }
    return sheet.join('');
  };

  Stylesheet.getSelector = function(operation) {
    return this.getSelectors(operation).join(', ');
  };

  Stylesheet.getSelectors = function(operation) {
    var bit, bits, cmd, custom, groups, index, parent, paths, result, results, selectors, update, wrapped, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1,
      _this = this;
    parent = operation;
    results = wrapped = custom = void 0;
    while (parent) {
      if (parent[0] === 'if') {
        if (results) {
          for (index = _i = 0, _len = results.length; _i < _len; index = ++_i) {
            result = results[index];
            if (result.substring(0, 11) !== '[matches~="') {
              result = this.getCustomSelector(result);
            }
            results[index] = result.substring(0, 11) + parent.uid + this.prototype.DESCEND + result.substring(11);
          }
        }
      } else if (parent[0] === 'rule') {
        cmd = parent[1].command;
        selectors = cmd.path;
        if (parent[1][0] === ',') {
          paths = parent[1].slice(1).map(function(item) {
            return item.command.selector || item.command.path;
          });
          groups = ((_ref1 = cmd.selector) != null ? _ref1.split(',') : void 0) || [];
        } else {
          paths = [selectors];
          groups = [cmd.selector || (cmd.key === cmd.path && cmd.key)];
        }
        if (results != null ? results.length : void 0) {
          bits = selectors.split(',');
          update = [];
          for (_j = 0, _len1 = results.length; _j < _len1; _j++) {
            result = results[_j];
            if (result.substring(0, 11) === '[matches~="') {
              update.push(result.substring(0, 11) + selectors + this.prototype.DESCEND + result.substring(11));
            } else {
              for (index = _k = 0, _len2 = bits.length; _k < _len2; index = ++_k) {
                bit = bits[index];
                if (groups[index] !== bit) {
                  update.push(this.getCustomSelector(selectors) + ' ' + result);
                } else {
                  update.push(bit + ' ' + result);
                }
              }
            }
          }
          results = update;
        } else {
          results = selectors.split(',').map(function(path, index) {
            if (path !== groups[index]) {
              return _this.getCustomSelector(selectors);
            } else {
              return path;
            }
          });
        }
      }
      parent = parent.parent;
    }
    for (index = _l = 0, _len3 = results.length; _l < _len3; index = ++_l) {
      result = results[index];
      results[index] = results[index].replace(this.CleanupSelectorRegExp, '');
    }
    return results;
  };

  Stylesheet.getCustomSelector = function(selector) {
    return '[matches~="' + selector.replace(/\s+/, this.prototype.DESCEND) + '"]';
  };

  Stylesheet.getCanonicalSelector = function(selector) {
    selector = selector.trim();
    selector = selector.replace(this.CanonicalizeSelectorRegExp, ' ').replace(/\s+/g, this.prototype.DESCEND);
    return selector;
  };

  Stylesheet.match = function(node, continuation) {
    var index;
    if (node.nodeType !== 1) {
      return;
    }
    if ((index = continuation.indexOf(this.prototype.DESCEND)) > -1) {
      continuation = continuation.substring(index + 1);
    }
    continuation = this.getCanonicalSelector(continuation);
    return node.setAttribute('matches', (node.getAttribute('matches') || '') + ' ' + continuation.replace(/\s+/, this.prototype.DESCEND));
  };

  Stylesheet.unmatch = function(node, continuation) {
    var index, matches, path;
    if (node.nodeType !== 1) {
      return;
    }
    if (matches = node.getAttribute('matches')) {
      if ((index = continuation.indexOf(this.prototype.DESCEND)) > -1) {
        continuation = continuation.substring(index + 1);
      }
      path = ' ' + this.getCanonicalSelector(continuation);
      if (matches.indexOf(path) > -1) {
        return node.setAttribute('matches', matches.replace(path, ''));
      }
    }
  };

  return Stylesheet;

})(Command);

module.exports = Stylesheet;