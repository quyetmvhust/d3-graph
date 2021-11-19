// Modes
var VIEW_MODE = "view";
var EDIT_MODE = "edit";

// Colours
var DEFAULT_ACTIVE_COLOUR = "#399ED1";
var DEFAULT_INACTIVE_COLOUR = "#BBBBBB";
var DEFAULT_SUCCESS_COLOUR = "#57A763";
var DEFAULT_COPYRIGHT_COLOUR = "#333333";

// Languages
var DEFAULT_LANGUAGE = "en";
var ARABIC_LANGUAGE = "ar";
var CHINESE_LANGUAGE = "zh";
var JAPANESE_LANGUAGE = "jp";
var EASTERN_ASIAN_LANGUAGES = [CHINESE_LANGUAGE, JAPANESE_LANGUAGE];

// Copyright location
var TOP_LEFT = "TOP_LEFT";
var BOTTOM_LEFT = "BOTTOM_LEFT";
var TOP_RIGHT = "TOP_RIGHT";
var NO_LOGO = "NO_LOGO";

// Transition durations
var DEFAULT_TRANSITION_DURATION = 1000;

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

var namespace = function(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
};

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

var creator = function(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
};

function none() {}

var selector = function(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
};

var selection_select = function(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

var array = function(x) {
  return typeof x === "object" && "length" in x
    ? x // Array, TypedArray, NodeList, array-like
    : Array.from(x); // Map, Set, iterable, string, or anything else
};

function empty() {
  return [];
}

var selectorAll = function(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
};

function arrayAll(select) {
  return function() {
    var group = select.apply(this, arguments);
    return group == null ? [] : array(group);
  };
}

var selection_selectAll = function(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection(subgroups, parents);
};

var matcher = function(selector) {
  return function() {
    return this.matches(selector);
  };
};

function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

var find = Array.prototype.find;

function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}

function childFirst() {
  return this.firstElementChild;
}

var selection_selectChild = function(match) {
  return this.select(match == null ? childFirst
      : childFind(typeof match === "function" ? match : childMatcher(match)));
};

var filter = Array.prototype.filter;

function children() {
  return this.children;
}

function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}

var selection_selectChildren = function(match) {
  return this.selectAll(match == null ? children
      : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
};

var selection_filter = function(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

var sparse = function(update) {
  return new Array(update.length);
};

var selection_enter = function() {
  return new Selection(this._enter || this._groups.map(sparse), this._parents);
};

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

var constant = function(x) {
  return function() {
    return x;
  };
};

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = new Map,
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
      exit[i] = node;
    }
  }
}

function datum(node) {
  return node.__data__;
}

var selection_data = function(value, key) {
  if (!arguments.length) return Array.from(this, datum);

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = array(value.call(parent, parent && parent.__data__, j, parents)),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
};

var selection_exit = function() {
  return new Selection(this._exit || this._groups.map(sparse), this._parents);
};

var selection_join = function(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
  if (onupdate != null) update = onupdate(update);
  if (onexit == null) exit.remove(); else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
};

var selection_merge = function(selection$$1) {
  if (!(selection$$1 instanceof Selection)) throw new Error("invalid merge");

  for (var groups0 = this._groups, groups1 = selection$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection(merges, this._parents);
};

var selection_order = function() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
};

var selection_sort = function(compare) {
  if (!compare) compare = ascending;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection(sortgroups, this._parents).order();
};

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

var selection_call = function() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
};

var selection_nodes = function() {
  return Array.from(this);
};

var selection_node = function() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
};

var selection_size = function() {
  let size = 0;
  for (const node of this) ++size; // eslint-disable-line no-unused-vars
  return size;
};

var selection_empty = function() {
  return !this.node();
};

var selection_each = function(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
};

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

var selection_attr = function(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)
      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
};

var defaultView = function(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
};

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

var selection_style = function(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove : typeof value === "function"
            ? styleFunction
            : styleConstant)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
};

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

var selection_property = function(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
};

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

var selection_classed = function(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
};

function textRemove() {
  this.textContent = "";
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

var selection_text = function(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction
          : textConstant)(value))
      : this.node().textContent;
};

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

var selection_html = function(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
};

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

var selection_raise = function() {
  return this.each(raise);
};

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

var selection_lower = function() {
  return this.each(lower);
};

var selection_append = function(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
};

function constantNull() {
  return null;
}

var selection_insert = function(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
};

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

var selection_remove = function() {
  return this.each(remove);
};

function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

var selection_clone = function(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
};

var selection_datum = function(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
};

function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

var selection_on = function(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
};

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

var selection_dispatch = function(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
};

var selection_iterator = function*() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
};

var root = [null];

function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection([[document.documentElement]], root);
}

function selection_selection() {
  return this;
}

Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

var select = function(selector) {
  return typeof selector === "string"
      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
      : new Selection([[selector]], root);
};

var selectAll = function(selector) {
  return typeof selector === "string"
      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection([selector == null ? [] : array(selector)], root);
};

var noop = {value: () => {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames$1(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$1(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1000;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
}

Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};

function timer(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
    t = t._next;
  }
  --frame;
}

function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}

function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}

function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

var timeout$1 = function(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(elapsed => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
};

var emptyOn = dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

var schedule = function(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create$1(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
};

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create$1(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = timer(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return timeout$1(start);

      // Interrupt the active transition, if any.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions.
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    timeout$1(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(node, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

var interrupt = function(node, name) {
  var schedules = node.__transition,
      schedule$$1,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule$$1 = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule$$1.state > STARTING && schedule$$1.state < ENDING;
    schedule$$1.state = ENDED;
    schedule$$1.timer.stop();
    schedule$$1.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule$$1.index, schedule$$1.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
};

var selection_interrupt = function(name) {
  return this.each(function() {
    interrupt(this, name);
  });
};

var define = function(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
};

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*";
var reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*";
var reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
var reHex = /^#([0-9a-f]{3,8})$/;
var reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$");
var reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$");
var reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$");
var reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$");
var reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$");
var reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  copy: function(channels) {
    return Object.assign(new this.constructor, this, channels);
  },
  displayable: function() {
    return this.rgb().displayable();
  },
  hex: color_formatHex, // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});

function color_formatHex() {
  return this.rgb().formatHex();
}

function color_formatHsl() {
  return hslConvert(this).formatHsl();
}

function color_formatRgb() {
  return this.rgb().formatRgb();
}

function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
      : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
      : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
      : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
      : null) // invalid hex
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb: function() {
    return this;
  },
  displayable: function() {
    return (-0.5 <= this.r && this.r < 255.5)
        && (-0.5 <= this.g && this.g < 255.5)
        && (-0.5 <= this.b && this.b < 255.5)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex, // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));

function rgb_formatHex() {
  return "#" + hex(this.r) + hex(this.g) + hex(this.b);
}

function rgb_formatRgb() {
  var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
  return (a === 1 ? "rgb(" : "rgba(")
      + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
      + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
      + Math.max(0, Math.min(255, Math.round(this.b) || 0))
      + (a === 1 ? ")" : ", " + a + ")");
}

function hex(value) {
  value = Math.max(0, Math.min(255, Math.round(value) || 0));
  return (value < 16 ? "0" : "") + value.toString(16);
}

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  displayable: function() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl: function() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "hsl(" : "hsla(")
        + (this.h || 0) + ", "
        + (this.s || 0) * 100 + "%, "
        + (this.l || 0) * 100 + "%"
        + (a === 1 ? ")" : ", " + a + ")");
  }
}));

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

const radians = Math.PI / 180;
const degrees = 180 / Math.PI;

// https://observablehq.com/@mbostock/lab-and-rgb
const K = 18;
const Xn = 0.96422;
const Yn = 1;
const Zn = 0.82521;
const t0 = 4 / 29;
const t1 = 6 / 29;
const t2 = 3 * t1 * t1;
const t3 = t1 * t1 * t1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) return hcl2lab(o);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = rgb2lrgb(o.r),
      g = rgb2lrgb(o.g),
      b = rgb2lrgb(o.b),
      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
  if (r === g && g === b) x = z = y; else {
    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
  }
  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}



function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
}

function Lab(l, a, b, opacity) {
  this.l = +l;
  this.a = +a;
  this.b = +b;
  this.opacity = +opacity;
}

define(Lab, lab, extend(Color, {
  brighter: function(k) {
    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker: function(k) {
    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb: function() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    x = Xn * lab2xyz(x);
    y = Yn * lab2xyz(y);
    z = Zn * lab2xyz(z);
    return new Rgb(
      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
      this.opacity
    );
  }
}));

function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

function lab2xyz(t) {
  return t > t1 ? t * t * t : t2 * (t - t0);
}

function lrgb2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2lrgb(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
  var h = Math.atan2(o.b, o.a) * degrees;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}



function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function Hcl(h, c, l, opacity) {
  this.h = +h;
  this.c = +c;
  this.l = +l;
  this.opacity = +opacity;
}

function hcl2lab(o) {
  if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
  var h = o.h * radians;
  return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
}

define(Hcl, hcl, extend(Color, {
  brighter: function(k) {
    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
  },
  darker: function(k) {
    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
  },
  rgb: function() {
    return hcl2lab(this).rgb();
  }
}));

var A = -0.14861;
var B = +1.78277;
var C = -0.29227;
var D = -0.90649;
var E = +1.97294;
var ED = E * D;
var EB = E * B;
var BC_DA = B * C - D * A;

function cubehelixConvert(o) {
  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
      bl = b - l,
      k = (E * (g - l) - C * bl) / D,
      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * degrees - 120 : NaN;
  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
}

function cubehelix(h, s, l, opacity) {
  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
}

function Cubehelix(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Cubehelix, cubehelix, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = isNaN(this.h) ? 0 : (this.h + 120) * radians,
        l = +this.l,
        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
        cosh = Math.cos(h),
        sinh = Math.sin(h);
    return new Rgb(
      255 * (l + a * (A * cosh + B * sinh)),
      255 * (l + a * (C * cosh + D * sinh)),
      255 * (l + a * (E * cosh)),
      this.opacity
    );
  }
}));

var constant$1 = x => () => x;

function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}



function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
}

var interpolateRgb = (function rgbGamma(y) {
  var color$$1 = gamma(y);

  function rgb$$1(start, end) {
    var r = color$$1((start = rgb(start)).r, (end = rgb(end)).r),
        g = color$$1(start.g, end.g),
        b = color$$1(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$$1.gamma = rgbGamma;

  return rgb$$1;
})(1);

var numberArray = function(a, b) {
  if (!b) b = [];
  var n = a ? Math.min(b.length, a.length) : 0,
      c = b.slice(),
      i;
  return function(t) {
    for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
    return c;
  };
};

function isNumberArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

function genericArray(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(na),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];

  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
}

var date = function(a, b) {
  var d = new Date;
  return a = +a, b = +b, function(t) {
    return d.setTime(a * (1 - t) + b * t), d;
  };
};

var interpolateNumber = function(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
};

var object = function(a, b) {
  var i = {},
      c = {},
      k;

  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};

  for (k in b) {
    if (k in a) {
      i[k] = interpolate(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }

  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
};

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
var reB = new RegExp(reA.source, "g");

function zero(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

var interpolateString = function(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: interpolateNumber(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
};

var interpolate = function(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant$1(b)
      : (t === "number" ? interpolateNumber
      : t === "string" ? ((c = color(b)) ? (b = c, rgb) : interpolateString)
      : b instanceof color ? interpolateRgb
      : b instanceof Date ? date
      : isNumberArray(b) ? numberArray
      : Array.isArray(b) ? genericArray
      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
      : interpolateNumber)(a, b);
};

var interpolateRound = function(a, b) {
  return a = +a, b = +b, function(t) {
    return Math.round(a * (1 - t) + b * t);
  };
};

var degrees$1 = 180 / Math.PI;

var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

var decompose = function(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees$1,
    skewX: Math.atan(skewX) * degrees$1,
    scaleX: scaleX,
    scaleY: scaleY
  };
};

var svgNode;

/* eslint-disable no-undef */
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}

function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule$$1 = set(this, id),
        tween = schedule$$1.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }

    schedule$$1.tween = tween1;
  };
}

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule$$1 = set(this, id),
        tween = schedule$$1.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }

    schedule$$1.tween = tween1;
  };
}

var transition_tween = function(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
};

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule$$1 = set(this, id);
    (schedule$$1.value || (schedule$$1.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

var interpolate$1 = function(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
};

function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$1(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrConstantNS$1(fullname, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrFunction$1(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function attrFunctionNS$1(fullname, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

var transition_attr = function(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate$1;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
      : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
};

function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}

function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}

function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

var transition_attrTween = function(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
};

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

var transition_delay = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
};

function durationFunction(id, value) {
  return function() {
    set(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set(this, id).duration = value;
  };
}

var transition_duration = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
};

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set(this, id).ease = value;
  };
}

var transition_ease = function(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
};

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

var transition_easeVarying = function(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
};

var transition_filter = function(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
};

var transition_merge = function(transition$$1) {
  if (transition$$1._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Transition(merges, this._parents, this._name, this._id);
};

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule$$1 = sit(this, id),
        on = schedule$$1.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule$$1.on = on1;
  };
}

var transition_on = function(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
};

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

var transition_remove = function() {
  return this.on("end.remove", removeFunction(this._id));
};

var transition_select = function(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
};

var transition_selectAll = function(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
};

var Selection$1 = selection.prototype.constructor;

var transition_selection = function() {
  return new Selection$1(this._groups, this._parents);
};

function styleNull(name, interpolate) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        string1 = (this.style.removeProperty(name), style(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}

function styleRemove$1(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function styleFunction$1(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        value1 = value(this),
        string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), style(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function styleMaybeRemove(id, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
  return function() {
    var schedule$$1 = set(this, id),
        on = schedule$$1.on,
        listener = schedule$$1.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

    schedule$$1.on = on1;
  };
}

var transition_style = function(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate$1;
  return value == null ? this
      .styleTween(name, styleNull(name, i))
      .on("end.style." + name, styleRemove$1(name))
    : typeof value === "function" ? this
      .styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value)))
      .each(styleMaybeRemove(this._id, name))
    : this
      .styleTween(name, styleConstant$1(name, i, value), priority)
      .on("end.style." + name, null);
};

function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}

function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}

var transition_styleTween = function(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
};

function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$1(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

var transition_text = function(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction$1(tweenValue(this, "text", value))
      : textConstant$1(value == null ? "" : value + ""));
};

function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}

function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}

var transition_textTween = function(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, textTween(value));
};

var transition_transition = function() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
};

var transition_end = function() {
  var on0, on1, that = this, id = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = {value: reject},
        end = {value: function() { if (--size === 0) resolve(); }};

    that.each(function() {
      var schedule$$1 = set(this, id),
          on = schedule$$1.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }

      schedule$$1.on = on1;
    });

    // The selection was empty, resolve end immediately
    if (size === 0) resolve();
  });
};

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function transition(name) {
  return selection().transition(name);
}

function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

// tpmt is two power minus ten times t scaled to [0,1]

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id} not found`);
    }
  }
  return timing;
}

var selection_transition = function(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
};

selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;

const pi$1 = Math.PI;
const tau$1 = 2 * pi$1;
const epsilon = 1e-6;
const tauEpsilon = tau$1 - epsilon;

function Path() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

function path() {
  return new Path;
}

Path.prototype = path.prototype = {
  constructor: Path,
  moveTo: function(x, y) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon));

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
      }

      this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r, ccw = !!ccw;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._ += "M" + x0 + "," + y0;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._ += "L" + x0 + "," + y0;
    }

    // Is this arc empty? We’re done.
    if (!r) return;

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) da = da % tau$1 + tau$1;

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._ += "A" + r + "," + r + ",0," + (+(da >= pi$1)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
    }
  },
  rect: function(x, y, w, h) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
  },
  toString: function() {
    return this._;
  }
};

var constant$2 = function(x) {
  return function constant() {
    return x;
  };
};

var array$2 = function(x) {
  return typeof x === "object" && "length" in x
    ? x // Array, TypedArray, NodeList, array-like
    : Array.from(x); // Map, Set, iterable, string, or anything else
};

function Linear(context) {
  this._context = context;
}

Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; // proceed
      default: this._context.lineTo(x, y); break;
    }
  }
};

var curveLinear = function(context) {
  return new Linear(context);
};

function x(p) {
  return p[0];
}

function y(p) {
  return p[1];
}

var line = function(x$$1, y$$1) {
  var defined = constant$2(true),
      context = null,
      curve = curveLinear,
      output = null;

  x$$1 = typeof x$$1 === "function" ? x$$1 : (x$$1 === undefined) ? x : constant$2(x$$1);
  y$$1 = typeof y$$1 === "function" ? y$$1 : (y$$1 === undefined) ? y : constant$2(y$$1);

  function line(data) {
    var i,
        n = (data = array$2(data)).length,
        d,
        defined0 = false,
        buffer;

    if (context == null) output = curve(buffer = path());

    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x$$1(d, i, data), +y$$1(d, i, data));
    }

    if (buffer) return output = null, buffer + "" || null;
  }

  line.x = function(_) {
    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), line) : x$$1;
  };

  line.y = function(_) {
    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), line) : y$$1;
  };

  line.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
  };

  line.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
  };

  line.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
  };

  return line;
};

var curveRadialLinear = curveRadial(curveLinear);

function Radial(curve) {
  this._curve = curve;
}

Radial.prototype = {
  areaStart: function() {
    this._curve.areaStart();
  },
  areaEnd: function() {
    this._curve.areaEnd();
  },
  lineStart: function() {
    this._curve.lineStart();
  },
  lineEnd: function() {
    this._curve.lineEnd();
  },
  point: function(a, r) {
    this._curve.point(r * Math.sin(a), r * -Math.cos(a));
  }
};

function curveRadial(curve) {

  function radial(context) {
    return new Radial(curve(context));
  }

  radial._curve = curve;

  return radial;
}

function lineRadial(l) {
  var c = l.curve;

  l.angle = l.x, delete l.x;
  l.radius = l.y, delete l.y;

  l.curve = function(_) {
    return arguments.length ? c(curveRadial(_)) : c()._curve;
  };

  return l;
}

var lineRadial$1 = function() {
  return lineRadial(line().curve(curveRadialLinear));
};

function sign(x) {
  return x < 0 ? -1 : 1;
}

// Calculate the slopes of the tangents (Hermite-type interpolation) based on
// the following paper: Steffen, M. 1990. A Simple Method for Monotonic
// Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
// NOV(II), P. 443, 1990.
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0,
      h1 = x2 - that._x1,
      s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
      s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
      p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

// Calculate a one-sided slope.
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}

// According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
// "you can express cubic Hermite interpolation in terms of cubic Bézier curves
// with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
function point$3(that, t0, t1) {
  var x0 = that._x0,
      y0 = that._y0,
      x1 = that._x1,
      y1 = that._y1,
      dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
}

function MonotoneX(context) {
  this._context = context;
}

MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 =
    this._y0 = this._y1 =
    this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2: this._context.lineTo(this._x1, this._y1); break;
      case 3: point$3(this, this._t0, slope2(this, this._t0)); break;
    }
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    var t1 = NaN;

    x = +x, y = +y;
    if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
    switch (this._point) {
      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
      case 1: this._point = 2; break;
      case 2: this._point = 3; point$3(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
      default: point$3(this, this._t0, t1 = slope3(this, x, y)); break;
    }

    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
    this._t0 = t1;
  }
};

function MonotoneY(context) {
  this._context = new ReflectContext(context);
}

(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
  MonotoneX.prototype.point.call(this, y, x);
};

function ReflectContext(context) {
  this._context = context;
}

ReflectContext.prototype = {
  moveTo: function(x, y) { this._context.moveTo(y, x); },
  closePath: function() { this._context.closePath(); },
  lineTo: function(x, y) { this._context.lineTo(y, x); },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
};

function Natural(context) {
  this._context = context;
}

Natural.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = [];
    this._y = [];
  },
  lineEnd: function() {
    var x = this._x,
        y = this._y,
        n = x.length;

    if (n) {
      this._line ? this._context.lineTo(x[0], y[0]) : this._context.moveTo(x[0], y[0]);
      if (n === 2) {
        this._context.lineTo(x[1], y[1]);
      } else {
        var px = controlPoints(x),
            py = controlPoints(y);
        for (var i0 = 0, i1 = 1; i1 < n; ++i0, ++i1) {
          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x[i1], y[i1]);
        }
      }
    }

    if (this._line || (this._line !== 0 && n === 1)) this._context.closePath();
    this._line = 1 - this._line;
    this._x = this._y = null;
  },
  point: function(x, y) {
    this._x.push(+x);
    this._y.push(+y);
  }
};

// See https://www.particleincell.com/2012/bezier-splines/ for derivation.
function controlPoints(x) {
  var i,
      n = x.length - 1,
      m,
      a = new Array(n),
      b = new Array(n),
      r = new Array(n);
  a[0] = 0, b[0] = 2, r[0] = x[0] + 2 * x[1];
  for (i = 1; i < n - 1; ++i) a[i] = 1, b[i] = 4, r[i] = 4 * x[i] + 2 * x[i + 1];
  a[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x[n - 1] + x[n];
  for (i = 1; i < n; ++i) m = a[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
  a[n - 1] = r[n - 1] / b[n - 1];
  for (i = n - 2; i >= 0; --i) a[i] = (r[i] - a[i + 1]) / b[i];
  b[n - 1] = (x[n] + a[n - 1]) / 2;
  for (i = 0; i < n - 1; ++i) b[i] = 2 * x[i + 1] - a[i + 1];
  return [a, b];
}

var natural = function(context) {
  return new Natural(context);
};

var ascending$2 = function(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
};

var bisector = function(f) {
  let delta = f;
  let compare = f;

  if (f.length === 1) {
    delta = (d, x) => f(d) - x;
    compare = ascendingComparator(f);
  }

  function left(a, x, lo, hi) {
    if (lo == null) lo = 0;
    if (hi == null) hi = a.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compare(a[mid], x) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function right(a, x, lo, hi) {
    if (lo == null) lo = 0;
    if (hi == null) hi = a.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compare(a[mid], x) > 0) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  function center(a, x, lo, hi) {
    if (lo == null) lo = 0;
    if (hi == null) hi = a.length;
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }

  return {left, center, right};
};

function ascendingComparator(f) {
  return (d, x) => ascending$2(f(d), x);
}

var number = function(x) {
  return x === null ? NaN : +x;
};

const ascendingBisect = bisector(ascending$2);
const bisectRight = ascendingBisect.right;

const bisectCenter = bisector(number).center;

// https://github.com/python/cpython/blob/a74eea238f5baba15797e2e8b570d153bc8690a7/Modules/mathmodule.c#L1423

var e10 = Math.sqrt(50);
var e5 = Math.sqrt(10);
var e2 = Math.sqrt(2);

var ticks = function(start, stop, count) {
  var reverse,
      i = -1,
      n,
      ticks,
      step;

  stop = +stop, start = +start, count = +count;
  if (start === stop && count > 0) return [start];
  if (reverse = stop < start) n = start, start = stop, stop = n;
  if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

  if (step > 0) {
    start = Math.ceil(start / step);
    stop = Math.floor(stop / step);
    ticks = new Array(n = Math.ceil(stop - start + 1));
    while (++i < n) ticks[i] = (start + i) * step;
  } else {
    step = -step;
    start = Math.ceil(start * step);
    stop = Math.floor(stop * step);
    ticks = new Array(n = Math.ceil(stop - start + 1));
    while (++i < n) ticks[i] = (start + i) / step;
  }

  if (reverse) ticks.reverse();

  return ticks;
};

function tickIncrement(start, stop, count) {
  var step = (stop - start) / Math.max(0, count),
      power = Math.floor(Math.log(step) / Math.LN10),
      error = step / Math.pow(10, power);
  return power >= 0
      ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
      : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
}

function tickStep(start, stop, count) {
  var step0 = Math.abs(stop - start) / Math.max(0, count),
      step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
      error = step0 / step1;
  if (error >= e10) step1 *= 10;
  else if (error >= e5) step1 *= 5;
  else if (error >= e2) step1 *= 2;
  return stop < start ? -step1 : step1;
}

function initRange(domain, range) {
  switch (arguments.length) {
    case 0: break;
    case 1: this.range(domain); break;
    default: this.range(range).domain(domain); break;
  }
  return this;
}

function constants(x) {
  return function() {
    return x;
  };
}

function number$1(x) {
  return +x;
}

var unit = [0, 1];

function identity$4(x) {
  return x;
}

function normalize(a, b) {
  return (b -= (a = +a))
      ? function(x) { return (x - a) / b; }
      : constants(isNaN(b) ? NaN : 0.5);
}

function clamper(a, b) {
  var t;
  if (a > b) t = a, a = b, b = t;
  return function(x) { return Math.max(a, Math.min(b, x)); };
}

// normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
// interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
function bimap(domain, range, interpolate$$1) {
  var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
  if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
  else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
  return function(x) { return r0(d0(x)); };
}

function polymap(domain, range, interpolate$$1) {
  var j = Math.min(domain.length, range.length) - 1,
      d = new Array(j),
      r = new Array(j),
      i = -1;

  // Reverse descending domains.
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range = range.slice().reverse();
  }

  while (++i < j) {
    d[i] = normalize(domain[i], domain[i + 1]);
    r[i] = interpolate$$1(range[i], range[i + 1]);
  }

  return function(x) {
    var i = bisectRight(domain, x, 1, j) - 1;
    return r[i](d[i](x));
  };
}

function copy(source, target) {
  return target
      .domain(source.domain())
      .range(source.range())
      .interpolate(source.interpolate())
      .clamp(source.clamp())
      .unknown(source.unknown());
}

function transformer() {
  var domain = unit,
      range = unit,
      interpolate$$1 = interpolate,
      transform,
      untransform,
      unknown,
      clamp = identity$4,
      piecewise,
      output,
      input;

  function rescale() {
    var n = Math.min(domain.length, range.length);
    if (clamp !== identity$4) clamp = clamper(domain[0], domain[n - 1]);
    piecewise = n > 2 ? polymap : bimap;
    output = input = null;
    return scale;
  }

  function scale(x) {
    return isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$$1)))(transform(clamp(x)));
  }

  scale.invert = function(y) {
    return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
  };

  scale.domain = function(_) {
    return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
  };

  scale.range = function(_) {
    return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
  };

  scale.rangeRound = function(_) {
    return range = Array.from(_), interpolate = interpolateRound, rescale();
  };

  scale.clamp = function(_) {
    return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity$4;
  };

  scale.interpolate = function(_) {
    return arguments.length ? (interpolate = _, rescale()) : interpolate$$1;
  };

  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };

  return function(t, u) {
    transform = t, untransform = u;
    return rescale();
  };
}

function continuous() {
  return transformer()(identity$4, identity$4);
}

var formatDecimal = function(x) {
  return Math.abs(x = Math.round(x)) >= 1e21
      ? x.toLocaleString("en").replace(/,/g, "")
      : x.toString(10);
};

// Computes the decimal coefficient and exponent of the specified number x with
// significant digits p, where x is positive and p is in [1, 21] or undefined.
// For example, formatDecimalParts(1.23) returns ["123", 0].
function formatDecimalParts(x, p) {
  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
  var i, coefficient = x.slice(0, i);

  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x.slice(i + 1)
  ];
}

var exponent$1 = function(x) {
  return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
};

var formatGroup = function(grouping, thousands) {
  return function(value, width) {
    var i = value.length,
        t = [],
        j = 0,
        g = grouping[0],
        length = 0;

    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }

    return t.reverse().join(thousands);
  };
};

var formatNumerals = function(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
};

// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  return new FormatSpecifier({
    fill: match[1],
    align: match[2],
    sign: match[3],
    symbol: match[4],
    zero: match[5],
    width: match[6],
    comma: match[7],
    precision: match[8] && match[8].slice(1),
    trim: match[9],
    type: match[10]
  });
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
  this.align = specifier.align === undefined ? ">" : specifier.align + "";
  this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
  this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
  this.zero = !!specifier.zero;
  this.width = specifier.width === undefined ? undefined : +specifier.width;
  this.comma = !!specifier.comma;
  this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
  this.trim = !!specifier.trim;
  this.type = specifier.type === undefined ? "" : specifier.type + "";
}

FormatSpecifier.prototype.toString = function() {
  return this.fill
      + this.align
      + this.sign
      + this.symbol
      + (this.zero ? "0" : "")
      + (this.width === undefined ? "" : Math.max(1, this.width | 0))
      + (this.comma ? "," : "")
      + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
      + (this.trim ? "~" : "")
      + this.type;
};

// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
var formatTrim = function(s) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
};

var prefixExponent;

var formatPrefixAuto = function(x, p) {
  var d = formatDecimalParts(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1],
      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
      n = coefficient.length;
  return i === n ? coefficient
      : i > n ? coefficient + new Array(i - n + 1).join("0")
      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
      : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
};

var formatRounded = function(x, p) {
  var d = formatDecimalParts(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
};

var formatTypes = {
  "%": (x, p) => (x * 100).toFixed(p),
  "b": (x) => Math.round(x).toString(2),
  "c": (x) => x + "",
  "d": formatDecimal,
  "e": (x, p) => x.toExponential(p),
  "f": (x, p) => x.toFixed(p),
  "g": (x, p) => x.toPrecision(p),
  "o": (x) => Math.round(x).toString(8),
  "p": (x, p) => formatRounded(x * 100, p),
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": (x) => Math.round(x).toString(16).toUpperCase(),
  "x": (x) => Math.round(x).toString(16)
};

var identity$5 = function(x) {
  return x;
};

var map$2 = Array.prototype.map;
var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

var formatLocale = function(locale) {
  var group = locale.grouping === undefined || locale.thousands === undefined ? identity$5 : formatGroup(map$2.call(locale.grouping, Number), locale.thousands + ""),
      currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
      currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
      decimal = locale.decimal === undefined ? "." : locale.decimal + "",
      numerals = locale.numerals === undefined ? identity$5 : formatNumerals(map$2.call(locale.numerals, String)),
      percent = locale.percent === undefined ? "%" : locale.percent + "",
      minus = locale.minus === undefined ? "−" : locale.minus + "",
      nan = locale.nan === undefined ? "NaN" : locale.nan + "";

  function newFormat(specifier) {
    specifier = formatSpecifier(specifier);

    var fill = specifier.fill,
        align = specifier.align,
        sign = specifier.sign,
        symbol = specifier.symbol,
        zero = specifier.zero,
        width = specifier.width,
        comma = specifier.comma,
        precision = specifier.precision,
        trim = specifier.trim,
        type = specifier.type;

    // The "n" type is an alias for ",g".
    if (type === "n") comma = true, type = "g";

    // The "" type, and any invalid type, is an alias for ".12~g".
    else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

    // If zero fill is specified, padding goes after sign and before digits.
    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = /[defgprs%]/.test(type);

    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    precision = precision === undefined ? 6
        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
        : Math.max(0, Math.min(20, precision));

    function format(value) {
      var valuePrefix = prefix,
          valueSuffix = suffix,
          i, n, c;

      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;

        // Determine the sign. -0 is not less than 0, but 1 / -0 is!
        var valueNegative = value < 0 || 1 / value < 0;

        // Perform the initial formatting.
        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

        // Trim insignificant zeros.
        if (trim) value = formatTrim(value);

        // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
        if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

        // Compute the prefix and suffix.
        valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

        // Break the formatted value into the integer “value” part that can be
        // grouped, and fractional or exponential “suffix” part that is not.
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }

      // If the fill character is not "0", grouping is applied before padding.
      if (comma && !zero) value = group(value, Infinity);

      // Compute the padding.
      var length = valuePrefix.length + value.length + valueSuffix.length,
          padding = length < width ? new Array(width - length + 1).join(fill) : "";

      // If the fill character is "0", grouping is applied after padding.
      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

      // Reconstruct the final output based on the desired alignment.
      switch (align) {
        case "<": value = valuePrefix + value + valueSuffix + padding; break;
        case "=": value = valuePrefix + padding + value + valueSuffix; break;
        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
        default: value = padding + valuePrefix + value + valueSuffix; break;
      }

      return numerals(value);
    }

    format.toString = function() {
      return specifier + "";
    };

    return format;
  }

  function formatPrefix(specifier, value) {
    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
        e = Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3,
        k = Math.pow(10, -e),
        prefix = prefixes[8 + e / 3];
    return function(value) {
      return f(k * value) + prefix;
    };
  }

  return {
    format: newFormat,
    formatPrefix: formatPrefix
  };
};

var locale;
var format;
var formatPrefix;

defaultLocale({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  format = locale.format;
  formatPrefix = locale.formatPrefix;
  return locale;
}

var precisionFixed = function(step) {
  return Math.max(0, -exponent$1(Math.abs(step)));
};

var precisionPrefix = function(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent$1(value) / 3))) * 3 - exponent$1(Math.abs(step)));
};

var precisionRound = function(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent$1(max) - exponent$1(step)) + 1;
};

function tickFormat(start, stop, count, specifier) {
  var step = tickStep(start, stop, count),
      precision;
  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
  switch (specifier.type) {
    case "s": {
      var value = Math.max(Math.abs(start), Math.abs(stop));
      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
      return formatPrefix(specifier, value);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
      break;
    }
    case "f":
    case "%": {
      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
      break;
    }
  }
  return format(specifier);
}

function linearish(scale) {
  var domain = scale.domain;

  scale.ticks = function(count) {
    var d = domain();
    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
  };

  scale.tickFormat = function(count, specifier) {
    var d = domain();
    return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
  };

  scale.nice = function(count) {
    if (count == null) count = 10;

    var d = domain();
    var i0 = 0;
    var i1 = d.length - 1;
    var start = d[i0];
    var stop = d[i1];
    var prestep;
    var step;
    var maxIter = 10;

    if (stop < start) {
      step = start, start = stop, stop = step;
      step = i0, i0 = i1, i1 = step;
    }
    
    while (maxIter-- > 0) {
      step = tickIncrement(start, stop, count);
      if (step === prestep) {
        d[i0] = start;
        d[i1] = stop;
        return domain(d);
      } else if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
      } else {
        break;
      }
      prestep = step;
    }

    return scale;
  };

  return scale;
}

function linear$2() {
  var scale = continuous();

  scale.copy = function() {
    return copy(scale, linear$2());
  };

  initRange.apply(scale, arguments);

  return linearish(scale);
}

var t0$1 = new Date;
var t1$1 = new Date;

function newInterval(floori, offseti, count, field) {

  function interval(date) {
    return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
  }

  interval.floor = function(date) {
    return floori(date = new Date(+date)), date;
  };

  interval.ceil = function(date) {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };

  interval.round = function(date) {
    var d0 = interval(date),
        d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };

  interval.offset = function(date, step) {
    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };

  interval.range = function(start, stop, step) {
    var range = [], previous;
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
    do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range;
  };

  interval.filter = function(test) {
    return newInterval(function(date) {
      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
    }, function(date, step) {
      if (date >= date) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
        } else while (--step >= 0) {
          while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
        }
      }
    });
  };

  if (count) {
    interval.count = function(start, end) {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0$1, t1$1));
    };

    interval.every = function(step) {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null
          : !(step > 1) ? interval
          : interval.filter(field
              ? function(d) { return field(d) % step === 0; }
              : function(d) { return interval.count(0, d) % step === 0; });
    };
  }

  return interval;
}

var millisecond = newInterval(function() {
  // noop
}, function(date, step) {
  date.setTime(+date + step);
}, function(start, end) {
  return end - start;
});

// An optimized implementation for this simple case.
millisecond.every = function(k) {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return newInterval(function(date) {
    date.setTime(Math.floor(date / k) * k);
  }, function(date, step) {
    date.setTime(+date + step * k);
  }, function(start, end) {
    return (end - start) / k;
  });
};

var durationSecond$1 = 1e3;
var durationMinute$1 = 6e4;
var durationHour$1 = 36e5;
var durationDay$1 = 864e5;
var durationWeek$1 = 6048e5;

var second = newInterval(function(date) {
  date.setTime(date - date.getMilliseconds());
}, function(date, step) {
  date.setTime(+date + step * durationSecond$1);
}, function(start, end) {
  return (end - start) / durationSecond$1;
}, function(date) {
  return date.getUTCSeconds();
});

var minute = newInterval(function(date) {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond$1);
}, function(date, step) {
  date.setTime(+date + step * durationMinute$1);
}, function(start, end) {
  return (end - start) / durationMinute$1;
}, function(date) {
  return date.getMinutes();
});

var hour = newInterval(function(date) {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond$1 - date.getMinutes() * durationMinute$1);
}, function(date, step) {
  date.setTime(+date + step * durationHour$1);
}, function(start, end) {
  return (end - start) / durationHour$1;
}, function(date) {
  return date.getHours();
});

var day = newInterval(
  date => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute$1) / durationDay$1,
  date => date.getDate() - 1
);

function weekday(i) {
  return newInterval(function(date) {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step * 7);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute$1) / durationWeek$1;
  });
}

var sunday = weekday(0);
var monday = weekday(1);
var tuesday = weekday(2);
var wednesday = weekday(3);
var thursday = weekday(4);
var friday = weekday(5);
var saturday = weekday(6);

var month = newInterval(function(date) {
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setMonth(date.getMonth() + step);
}, function(start, end) {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, function(date) {
  return date.getMonth();
});

var year = newInterval(function(date) {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, function(date, step) {
  date.setFullYear(date.getFullYear() + step);
}, function(start, end) {
  return end.getFullYear() - start.getFullYear();
}, function(date) {
  return date.getFullYear();
});

// An optimized implementation for this simple case.
year.every = function(k) {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step * k);
  });
};

var utcMinute = newInterval(function(date) {
  date.setUTCSeconds(0, 0);
}, function(date, step) {
  date.setTime(+date + step * durationMinute$1);
}, function(start, end) {
  return (end - start) / durationMinute$1;
}, function(date) {
  return date.getUTCMinutes();
});

var utcHour = newInterval(function(date) {
  date.setUTCMinutes(0, 0, 0);
}, function(date, step) {
  date.setTime(+date + step * durationHour$1);
}, function(start, end) {
  return (end - start) / durationHour$1;
}, function(date) {
  return date.getUTCHours();
});

var utcDay = newInterval(function(date) {
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCDate(date.getUTCDate() + step);
}, function(start, end) {
  return (end - start) / durationDay$1;
}, function(date) {
  return date.getUTCDate() - 1;
});

function utcWeekday(i) {
  return newInterval(function(date) {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, function(start, end) {
    return (end - start) / durationWeek$1;
  });
}

var utcSunday = utcWeekday(0);
var utcMonday = utcWeekday(1);
var utcTuesday = utcWeekday(2);
var utcWednesday = utcWeekday(3);
var utcThursday = utcWeekday(4);
var utcFriday = utcWeekday(5);
var utcSaturday = utcWeekday(6);

var utcMonth = newInterval(function(date) {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCMonth(date.getUTCMonth() + step);
}, function(start, end) {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, function(date) {
  return date.getUTCMonth();
});

var utcYear = newInterval(function(date) {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, function(date, step) {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, function(start, end) {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, function(date) {
  return date.getUTCFullYear();
});

// An optimized implementation for this simple case.
utcYear.every = function(k) {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};

function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date.setFullYear(d.y);
    return date;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}

function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date.setUTCFullYear(d.y);
    return date;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}

function newDate(y, m, d) {
  return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
}

function formatLocale$1(locale) {
  var locale_dateTime = locale.dateTime,
      locale_date = locale.date,
      locale_time = locale.time,
      locale_periods = locale.periods,
      locale_weekdays = locale.days,
      locale_shortWeekdays = locale.shortDays,
      locale_months = locale.months,
      locale_shortMonths = locale.shortMonths;

  var periodRe = formatRe(locale_periods),
      periodLookup = formatLookup(locale_periods),
      weekdayRe = formatRe(locale_weekdays),
      weekdayLookup = formatLookup(locale_weekdays),
      shortWeekdayRe = formatRe(locale_shortWeekdays),
      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
      monthRe = formatRe(locale_months),
      monthLookup = formatLookup(locale_months),
      shortMonthRe = formatRe(locale_shortMonths),
      shortMonthLookup = formatLookup(locale_shortMonths);

  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "g": formatYearISO,
    "G": formatFullYearISO,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "q": formatQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };

  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "g": formatUTCYearISO,
    "G": formatUTCFullYearISO,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "q": formatUTCQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };

  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "g": parseYear,
    "G": parseFullYear,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "q": parseQuarter,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };

  // These recursive directive definitions must be deferred.
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);

  function newFormat(specifier, formats) {
    return function(date) {
      var string = [],
          i = -1,
          j = 0,
          n = specifier.length,
          c,
          pad,
          format;

      if (!(date instanceof Date)) date = new Date(+date);

      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad = c === "e" ? " " : "0";
          if (format = formats[c]) c = format(date, pad);
          string.push(c);
          j = i + 1;
        }
      }

      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }

  function newParse(specifier, Z) {
    return function(string) {
      var d = newDate(1900, undefined, 1),
          i = parseSpecifier(d, specifier, string += "", 0),
          week, day$$1;
      if (i != string.length) return null;

      // If a UNIX timestamp is specified, return it.
      if ("Q" in d) return new Date(d.Q);
      if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

      // If this is utcParse, never use the local timezone.
      if (Z && !("Z" in d)) d.Z = 0;

      // The am-pm flag is 0 for AM, and 1 for PM.
      if ("p" in d) d.H = d.H % 12 + d.p * 12;

      // If the month was not specified, inherit from the quarter.
      if (d.m === undefined) d.m = "q" in d ? d.q : 0;

      // Convert day-of-week and week-of-year to day-of-year.
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
          week = day$$1 > 4 || day$$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
          week = day$$1 > 4 || day$$1 === 0 ? monday.ceil(week) : monday(week);
          week = day.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day$$1 = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$$1 + 5) % 7 : d.w + d.U * 7 - (day$$1 + 6) % 7;
      }

      // If a time zone is specified, all fields are interpreted as UTC and then
      // offset according to the specified time zone.
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }

      // Otherwise, all fields are in local time.
      return localDate(d);
    };
  }

  function parseSpecifier(d, specifier, string, j) {
    var i = 0,
        n = specifier.length,
        m = string.length,
        c,
        parse;

    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }

    return j;
  }

  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }

  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }

  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }

  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }

  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }

  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }

  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }

  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }

  function formatQuarter(d) {
    return 1 + ~~(d.getMonth() / 3);
  }

  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }

  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }

  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }

  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }

  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }

  function formatUTCQuarter(d) {
    return 1 + ~~(d.getUTCMonth() / 3);
  }

  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() { return specifier; };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", false);
      p.toString = function() { return specifier; };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() { return specifier; };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier += "", true);
      p.toString = function() { return specifier; };
      return p;
    }
  };
}

var pads = {"-": "", "_": " ", "0": "0"};
var numberRe = /^\s*\d+/;
var percentRe = /^%/;
var requoteRe = /[\\^$*+?|[\]().{}]/g;

function pad(value, fill, width) {
  var sign = value < 0 ? "-" : "",
      string = (sign ? -value : value) + "",
      length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}

function requote(s) {
  return s.replace(requoteRe, "\\$&");
}

function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}

function formatLookup(names) {
  return new Map(names.map((name, i) => [name.toLowerCase(), i]));
}

function parseWeekdayNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}

function parseWeekdayNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberISO(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}

function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}

function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
}

function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}

function parseQuarter(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
}

function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}

function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}

function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}

function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}

function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}

function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}

function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}

function parseMicroseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
}

function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}

function parseUnixTimestamp(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}

function parseUnixTimestampSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.s = +n[0], i + n[0].length) : -1;
}

function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}

function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}

function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}

function formatDayOfYear(d, p) {
  return pad(1 + day.count(year(d), d), p, 3);
}

function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}

function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}

function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}

function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}

function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}

function formatWeekdayNumberMonday(d) {
  var day$$1 = d.getDay();
  return day$$1 === 0 ? 7 : day$$1;
}

function formatWeekNumberSunday(d, p) {
  return pad(sunday.count(year(d) - 1, d), p, 2);
}

function dISO(d) {
  var day$$1 = d.getDay();
  return (day$$1 >= 4 || day$$1 === 0) ? thursday(d) : thursday.ceil(d);
}

function formatWeekNumberISO(d, p) {
  d = dISO(d);
  return pad(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
}

function formatWeekdayNumberSunday(d) {
  return d.getDay();
}

function formatWeekNumberMonday(d, p) {
  return pad(monday.count(year(d) - 1, d), p, 2);
}

function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}

function formatYearISO(d, p) {
  d = dISO(d);
  return pad(d.getFullYear() % 100, p, 2);
}

function formatFullYear(d, p) {
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatFullYearISO(d, p) {
  var day$$1 = d.getDay();
  d = (day$$1 >= 4 || day$$1 === 0) ? thursday(d) : thursday.ceil(d);
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+"))
      + pad(z / 60 | 0, "0", 2)
      + pad(z % 60, "0", 2);
}

function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}

function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}

function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}

function formatUTCDayOfYear(d, p) {
  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
}

function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}

function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}

function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}

function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}

function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}

function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function formatUTCWeekNumberSunday(d, p) {
  return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
}

function UTCdISO(d) {
  var day$$1 = d.getUTCDay();
  return (day$$1 >= 4 || day$$1 === 0) ? utcThursday(d) : utcThursday.ceil(d);
}

function formatUTCWeekNumberISO(d, p) {
  d = UTCdISO(d);
  return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}

function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}

function formatUTCWeekNumberMonday(d, p) {
  return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
}

function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCYearISO(d, p) {
  d = UTCdISO(d);
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCFullYearISO(d, p) {
  var day$$1 = d.getUTCDay();
  d = (day$$1 >= 4 || day$$1 === 0) ? utcThursday(d) : utcThursday.ceil(d);
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCZone() {
  return "+0000";
}

function formatLiteralPercent() {
  return "%";
}

function formatUnixTimestamp(d) {
  return +d;
}

function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1000);
}

var locale$1;


var utcFormat;
var utcParse;

defaultLocale$1({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});

function defaultLocale$1(definition) {
  locale$1 = formatLocale$1(definition);
  utcFormat = locale$1.utcFormat;
  utcParse = locale$1.utcParse;
  return locale$1;
}

var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

function formatIsoNative(date) {
  return date.toISOString();
}

var formatIso = Date.prototype.toISOString
    ? formatIsoNative
    : utcFormat(isoSpecifier);

function parseIsoNative(string) {
  var date = new Date(string);
  return isNaN(date) ? null : date;
}

var parseIso = +new Date("2000-01-01T00:00:00.000Z")
    ? parseIsoNative
    : utcParse(isoSpecifier);

var xhtml$1 = "http://www.w3.org/1999/xhtml";

var namespaces$1 = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml$1,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

var namespace$1 = function(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces$1.hasOwnProperty(prefix) ? {space: namespaces$1[prefix], local: name} : name;
};

function creatorInherit$1(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml$1 && document.documentElement.namespaceURI === xhtml$1
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed$1(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

var creator$1 = function(name) {
  var fullname = namespace$1(name);
  return (fullname.local
      ? creatorFixed$1
      : creatorInherit$1)(fullname);
};

function none$3() {}

var selector$1 = function(selector) {
  return selector == null ? none$3 : function() {
    return this.querySelector(selector);
  };
};

var selection_select$1 = function(select) {
  if (typeof select !== "function") select = selector$1(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection$2(subgroups, this._parents);
};

function empty$2() {
  return [];
}

var selectorAll$1 = function(selector) {
  return selector == null ? empty$2 : function() {
    return this.querySelectorAll(selector);
  };
};

var selection_selectAll$1 = function(select) {
  if (typeof select !== "function") select = selectorAll$1(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection$2(subgroups, parents);
};

var matcher$1 = function(selector) {
  return function() {
    return this.matches(selector);
  };
};

if (typeof document !== "undefined") {
  var element = document.documentElement;
  if (!element.matches) {
    var vendorMatches = element.webkitMatchesSelector
        || element.msMatchesSelector
        || element.mozMatchesSelector
        || element.oMatchesSelector;
    matcher$1 = function(selector) {
      return function() {
        return vendorMatches.call(this, selector);
      };
    };
  }
}

var matcher$2 = matcher$1;

var selection_filter$1 = function(match) {
  if (typeof match !== "function") match = matcher$2(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection$2(subgroups, this._parents);
};

var sparse$1 = function(update) {
  return new Array(update.length);
};

var selection_enter$1 = function() {
  return new Selection$2(this._enter || this._groups.map(sparse$1), this._parents);
};

function EnterNode$1(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode$1.prototype = {
  constructor: EnterNode$1,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

var constant$4 = function(x) {
  return function() {
    return x;
  };
};

var keyPrefix = "$"; // Protect against keys like “__proto__”.

function bindIndex$1(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode$1(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey$1(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = {},
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
      if (keyValue in nodeByKeyValue) {
        exit[i] = node;
      } else {
        nodeByKeyValue[keyValue] = node;
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = keyPrefix + key.call(parent, data[i], i, data);
    if (node = nodeByKeyValue[keyValue]) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue[keyValue] = null;
    } else {
      enter[i] = new EnterNode$1(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
      exit[i] = node;
    }
  }
}

var selection_data$1 = function(value, key) {
  if (!value) {
    data = new Array(this.size()), j = -1;
    this.each(function(d) { data[++j] = d; });
    return data;
  }

  var bind = key ? bindKey$1 : bindIndex$1,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant$4(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = value.call(parent, parent && parent.__data__, j, parents),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection$2(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
};

var selection_exit$1 = function() {
  return new Selection$2(this._exit || this._groups.map(sparse$1), this._parents);
};

var selection_merge$1 = function(selection) {

  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection$2(merges, this._parents);
};

var selection_order$1 = function() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
};

var selection_sort$1 = function(compare) {
  if (!compare) compare = ascending$3;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection$2(sortgroups, this._parents).order();
};

function ascending$3(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

var selection_call$1 = function() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
};

var selection_nodes$1 = function() {
  var nodes = new Array(this.size()), i = -1;
  this.each(function() { nodes[++i] = this; });
  return nodes;
};

var selection_node$1 = function() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
};

var selection_size$1 = function() {
  var size = 0;
  this.each(function() { ++size; });
  return size;
};

var selection_empty$1 = function() {
  return !this.node();
};

var selection_each$1 = function(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
};

function attrRemove$2(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$2(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$2(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS$2(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction$2(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS$2(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

var selection_attr$1 = function(name, value) {
  var fullname = namespace$1(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS$2 : attrRemove$2) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS$2 : attrFunction$2)
      : (fullname.local ? attrConstantNS$2 : attrConstant$2)))(fullname, value));
};

var defaultView$1 = function(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
};

function styleRemove$2(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$2(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction$2(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

var selection_style$1 = function(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove$2 : typeof value === "function"
            ? styleFunction$2
            : styleConstant$2)(name, value, priority == null ? "" : priority))
      : styleValue$1(this.node(), name);
};

function styleValue$1(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView$1(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove$1(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant$1(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction$1(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

var selection_property$1 = function(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove$1 : typeof value === "function"
          ? propertyFunction$1
          : propertyConstant$1)(name, value))
      : this.node()[name];
};

function classArray$1(string) {
  return string.trim().split(/^|\s+/);
}

function classList$1(node) {
  return node.classList || new ClassList$1(node);
}

function ClassList$1(node) {
  this._node = node;
  this._names = classArray$1(node.getAttribute("class") || "");
}

ClassList$1.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd$1(node, names) {
  var list = classList$1(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove$1(node, names) {
  var list = classList$1(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue$1(names) {
  return function() {
    classedAdd$1(this, names);
  };
}

function classedFalse$1(names) {
  return function() {
    classedRemove$1(this, names);
  };
}

function classedFunction$1(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd$1 : classedRemove$1)(this, names);
  };
}

var selection_classed$1 = function(name, value) {
  var names = classArray$1(name + "");

  if (arguments.length < 2) {
    var list = classList$1(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction$1 : value
      ? classedTrue$1
      : classedFalse$1)(names, value));
};

function textRemove$1() {
  this.textContent = "";
}

function textConstant$2(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$2(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

var selection_text$1 = function(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove$1 : (typeof value === "function"
          ? textFunction$2
          : textConstant$2)(value))
      : this.node().textContent;
};

function htmlRemove$1() {
  this.innerHTML = "";
}

function htmlConstant$1(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction$1(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

var selection_html$1 = function(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove$1 : (typeof value === "function"
          ? htmlFunction$1
          : htmlConstant$1)(value))
      : this.node().innerHTML;
};

function raise$1() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

var selection_raise$1 = function() {
  return this.each(raise$1);
};

function lower$1() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

var selection_lower$1 = function() {
  return this.each(lower$1);
};

var selection_append$1 = function(name) {
  var create = typeof name === "function" ? name : creator$1(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
};

function constantNull$1() {
  return null;
}

var selection_insert$1 = function(name, before) {
  var create = typeof name === "function" ? name : creator$1(name),
      select = before == null ? constantNull$1 : typeof before === "function" ? before : selector$1(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
};

function remove$1() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

var selection_remove$1 = function() {
  return this.each(remove$1);
};

function selection_cloneShallow$1() {
  return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
}

function selection_cloneDeep$1() {
  return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
}

var selection_clone$1 = function(deep) {
  return this.select(deep ? selection_cloneDeep$1 : selection_cloneShallow$1);
};

var selection_datum$1 = function(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
};

var filterEvents = {};



if (typeof document !== "undefined") {
  var element$1 = document.documentElement;
  if (!("onmouseenter" in element$1)) {
    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
  }
}

function filterContextListener(listener, index, group) {
  listener = contextListener$1(listener, index, group);
  return function(event) {
    var related = event.relatedTarget;
    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
      listener.call(this, event);
    }
  };
}

function contextListener$1(listener, index, group) {
  return function(event1) {
    try {
      listener.call(this, this.__data__, index, group);
    } finally {
      
    }
  };
}

function parseTypenames$2(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove$1(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd$1(typename, value, capture) {
  var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener$1;
  return function(d, i, group) {
    var on = this.__on, o, listener = wrap(value, i, group);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
        this.addEventListener(o.type, o.listener = listener, o.capture = capture);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, capture);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

var selection_on$1 = function(typename, value, capture) {
  var typenames = parseTypenames$2(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd$1 : onRemove$1;
  if (capture == null) capture = false;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
  return this;
};

function dispatchEvent$1(node, type, params) {
  var window = defaultView$1(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant$1(type, params) {
  return function() {
    return dispatchEvent$1(this, type, params);
  };
}

function dispatchFunction$1(type, params) {
  return function() {
    return dispatchEvent$1(this, type, params.apply(this, arguments));
  };
}

var selection_dispatch$1 = function(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction$1
      : dispatchConstant$1)(type, params));
};

var root$2 = [null];

function Selection$2(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection$2() {
  return new Selection$2([[document.documentElement]], root$2);
}

Selection$2.prototype = selection$2.prototype = {
  constructor: Selection$2,
  select: selection_select$1,
  selectAll: selection_selectAll$1,
  filter: selection_filter$1,
  data: selection_data$1,
  enter: selection_enter$1,
  exit: selection_exit$1,
  merge: selection_merge$1,
  order: selection_order$1,
  sort: selection_sort$1,
  call: selection_call$1,
  nodes: selection_nodes$1,
  node: selection_node$1,
  size: selection_size$1,
  empty: selection_empty$1,
  each: selection_each$1,
  attr: selection_attr$1,
  style: selection_style$1,
  property: selection_property$1,
  classed: selection_classed$1,
  text: selection_text$1,
  html: selection_html$1,
  raise: selection_raise$1,
  lower: selection_lower$1,
  append: selection_append$1,
  insert: selection_insert$1,
  remove: selection_remove$1,
  clone: selection_clone$1,
  datum: selection_datum$1,
  on: selection_on$1,
  dispatch: selection_dispatch$1
};

var select$1 = function(selector) {
  return typeof selector === "string"
      ? new Selection$2([[document.querySelector(selector)]], [document.documentElement])
      : new Selection$2([[selector]], root$2);
};

var method;
var verify_bounds;
var resolve_bounds;
var resolve_padding;
var pad$1;
var dimensions;
var wrap;
var textwrap;

// test for foreignObject support and determine wrapping strategy
method = typeof SVGForeignObjectElement === 'undefined' ? 'tspans' : 'foreignobject';

// accept multiple input types as boundaries
verify_bounds = function(bounds) {
    var bounds_object,
        bounds_function;
    bounds_function = typeof bounds === 'function';
    if (typeof bounds === 'object' && ! bounds.nodeType) {
        if (! bounds.height || ! bounds.width) {
            console.error('text wrapping bounds must specify height and width');
            return false;
        } else {
            return true;
        }
    }
    // convert a selection to bounds
    if (
        bounds instanceof selection$2 ||
        bounds.nodeType ||
        bounds_function ||
        bounds_object
    ) {
        return true;
    // use input as bounds directly
    } else {
        console.error('invalid bounds specified for text wrapping');
        return false;
    }
};

resolve_bounds = function(bounds) {
    var properties,
        dimensions,
        result,
        i;
    properties = ['height', 'width'];
    if (typeof bounds === 'function') {
        dimensions = bounds();
    } else if (bounds.nodeType) {
        dimensions = bounds.getBoundingClientRect();
    } else if (typeof bounds === 'object') {
        dimensions = bounds;
    }
    result = Object.create(null);
    for (i = 0; i < properties.length; i++) {
        result[properties[i]] = dimensions[properties[i]];
    }
    return result;
};

resolve_padding = function(padding) {
    var result;
    if (typeof padding === 'function') {
        result = padding();
    } else if (typeof padding === 'number') {
        result = padding;
    } else if (typeof padding === 'undefined') {
        result = 0;
    }
    if (typeof result !== 'number') {
        console.error('padding could not be converted into a number');
    } else {
        return result;
    }
};

pad$1 = function(dimensions, padding) {
    var padded;
    padded = {
        height: dimensions.height - padding * 2,
        width: dimensions.width - padding * 2
    };
    return padded;
};

dimensions = function(bounds, padding) {
    var padded;
    padded = pad$1(resolve_bounds(bounds), resolve_padding(padding));
    return padded;
};


wrap = {};

// wrap text using foreignobject html
wrap.foreignobject = function(text, dimensions, padding) {
    var content,
        parent,
        foreignobject,
        div;
    // extract our desired content from the single text element
    content = text.text();
    // remove the text node and replace with a foreign object
    parent = select$1(text.node().parentNode);
    text.remove();
    foreignobject = parent.append('foreignObject');
    // add foreign object and set dimensions, position, etc
    foreignobject
        .attr('requiredFeatures', 'http://www.w3.org/TR/SVG11/feature#Extensibility')
        .attr('width', dimensions.width)
        .attr('height', dimensions.height);
    if (typeof padding === 'number') {
        foreignobject
            .attr('x', padding)
            .attr('y', padding);
    }
    // insert an HTML div
    div = foreignobject
        .append('xhtml:div');
    // set div to same dimensions as foreign object
    div
        .style('height', dimensions.height)
        .style('width', dimensions.width)
        // insert text content
        .html(content);
    return div;
};

// wrap text using tspans
wrap.tspans = function(text, dimensions, padding) {
    var pieces,
        piece,
        line_width,
        x_offset,
        tspan,
        previous_content;
    pieces = text.text().split(' ').reverse();
    text.text('');
    tspan = text.append('tspan');
    tspan
        .attr('dx', 0)
        .attr('dy', 0);
    x_offset = 0;
    while (pieces.length > 0) {
        piece = pieces.pop();
        tspan.text(tspan.text() + ' ' + piece);
        line_width = tspan.node().getComputedTextLength() || 0;
        if (line_width > dimensions.width) {
            previous_content = tspan.text()
                .split(' ')
                .slice(0, -1)
                .join(' ');
            tspan.text(previous_content);
            x_offset = tspan.node().getComputedTextLength() * -1;
            tspan = text.append('tspan');
            tspan
                .attr('dx', x_offset)
                .attr('dy', '1em')
                .text(piece);
        }
    }
    if (typeof padding === 'number') {
        text
            .attr('y', text.attr('y') + padding)
            .attr('x', text.attr('x') + padding);
    }
};

// factory to generate text wrap functions
textwrap = function() {
    // text wrap function instance
    var wrapper,
        bounds,
        padding;
    wrapper = function(targets) {
        targets.each(function() {
            select$1(this).call(wrap[method], dimensions(bounds, padding), resolve_padding(padding));
        });
    };
    // get or set wrapping boundaries
    wrapper.bounds = function(new_bounds) {
        if (new_bounds) {
            if (verify_bounds(new_bounds)) {
                bounds = new_bounds;
                return wrapper;
            } else {
                console.error('invalid text wrapping bounds');
                return false;
            }
        } else {
            return bounds;
        }
    };
    // get or set padding applied on top of boundaries
    wrapper.padding = function(new_padding) {
        if (new_padding) {
            if (typeof new_padding === 'number' || typeof new_padding === 'function') {
                padding = new_padding;
                return wrapper;
            } else {
                console.error('text wrap padding value must be either a number or a function');
                return false;
            }
        } else {
            return padding;
        }
    };
    // get or set wrapping method
    wrapper.method = function(new_method) {
        if (new_method) {
            method = new_method;
            return wrapper;
        } else {
            return method;
        }
    };
    return wrapper;
};

var textwrap$1 = textwrap;

var maxValue = function maxValue(array) {
  var accessorFunction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (item) {
    return item;
  };
  return (array || []).reduce(function (max, value) {
    return Math.max(max, accessorFunction(value));
  }, 0);
};

var entries = function entries(map) {
  var entries = [];
  for (var key in map) {
    entries.push({
      key: key,
      value: map[key]
    });
  }
  return entries;
};

var range = function range(start, stop) {
  var rangeArray = [];
  for (var i = start; i < stop; i++) {
    rangeArray.push(i);
  }
  return rangeArray;
};

// Sliding scale of lower-upper as the width increases (starting from 500 and ending around 700)
var interpolateUsingWidth = function interpolateUsingWidth(lowerLimit, upperLimit, width) {
  var smallWidth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 500;
  var bigWidth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 700;

  var incrementFactor = (upperLimit - lowerLimit) / (bigWidth - smallWidth);
  var result = lowerLimit + incrementFactor * (width - smallWidth);
  return Math.max(Math.min(result, upperLimit), lowerLimit);
};

var pythagoras = function pythagoras(a, b) {
  return Math.sqrt(a * a + b * b);
};

// adapted from: http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
// Detects whether the collision is still possible at multiple stages to provide
// early outs and not perform additional computation unnecessarily (especially division)


function getCircleIntersectionPoint(point, circleCentre, circleRadius) {
  var lineStartPoint = {
    x: point.x + circleCentre.x,
    y: point.y + circleCentre.y
  };
  var signModifier = point.x < circleCentre.x ? -1 : 1;
  return getLineCircleIntersectionPoint(lineStartPoint, circleCentre, circleRadius, signModifier);
}

function getLineCircleIntersectionPoint(lineStartPoint, circleCentre, circleRadius, signModifier) {
  // Circle Equation: (x - p)^2 + (y - q)^2 = r^2, where (p, q) = centre, r = radius
  // Line Equation: y = mx + c
  // Merging of equations: (m^2 + 1)x^2 + 2(mc − mq − p)x + (q^2 − r^2 + p^2 − 2cq + c^2) = 0
  // where m = lineGradient, c = lineStartPoint.y, (p, q) = circleCentre
  // However as we know lineGradient = 0 always in our case: (1)x^2 + (-2p)x + (q^2 - r^2 + p^2 - 2cq + c^2) = 0
  // Quadratic Equation: x = (-B +- sqrt((B ^ 2) - 4AC)) / 2A
  // Quadratic components: A = 1, B = -2p, C = q^2 − r^2 + p^2 - 2cq + c^2
  var A = 1;
  var B = -2 * circleCentre.x;
  var C = Math.pow(circleCentre.y, 2) - Math.pow(circleRadius, 2) + Math.pow(circleCentre.x, 2) - 2 * lineStartPoint.y * circleCentre.y + Math.pow(lineStartPoint.y, 2);
  var x = quadraticSolution(A, B, C, signModifier);
  // y = mx + c, where x is derived from the above quadratic equation but when m = 0, then y = 0 * x + c = c
  var y = lineStartPoint.y;
  return { x: x, y: y };
}

function quadraticSolution(a, b, c) {
  var signModifier = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;

  // Quadratic Equation: x = (-B +- sqrt((B ^ 2) - 4AC)) / 2A
  return (-b + signModifier * Math.sqrt(Math.pow(b, 2) - 4 * a * c)) / (2 * a);
}

var isUsingForeignObject = typeof SVGForeignObjectElement !== "undefined";

// Function to add a text element + text box surrounding it to a particular node
function addTextbox(nodeContainersEnter, nodeContainersMerge, nodeContainers, nodes, width, height, mode, previousMode, radius, getTitleStringFromNode) {
  var nodeSpacingModifier = interpolateUsingWidth(17.5, 25, width);
  var textContainerEnter = nodeContainersEnter.append("g").classed("text-container", true);
  var innerTextContainerEnter = textContainerEnter.append("g").classed("inner-text-container", true);

  nodeContainersMerge.select(".text-container").merge(textContainerEnter).attr("transform", function (_ref) {
    var angle = _ref.angle,
        depth = _ref.depth;
    return depth === 1 ? "rotate(" + ((angle >= 180 ? 270 : 90) - angle) + ")" : "";
  });

  if (isUsingForeignObject) {
    innerTextContainerEnter = innerTextContainerEnter.append("g").classed("inner-inner-text", true);

    nodeContainersMerge.select(".inner-inner-text").data(nodes, function (_ref2) {
      var id = _ref2.id;
      return id;
    });
  }
  // Text is set as either a <div /> (wrapped around a <foreignObject /> element,
  // where foreignObject is supported), or as a regular SVG <text />.
  // foreignObject with <div /> is preferred is due to it naturally being able to wrap text,
  // although because foreignObject is not supported in all browsers (namely IE,
  // supported in Edge and others), the library also supports a fallback to <text />
  // with inner <tspan /> for each line.
  // So assume that <text /> is only used when displaying in IE and
  // <foreignObject><div></div></foreignObject> otherwise.
  var textSelectionEnter = innerTextContainerEnter.append(isUsingForeignObject ? "foreignObject" : "text").attr("class", function (_ref3) {
    var id = _ref3.id;
    return "node-text node-text-" + id;
  });

  // Add the view class if in view mode, or remove it if not
  nodeContainersMerge.select(".node-text").data(nodes, function (_ref4) {
    var id = _ref4.id;
    return id;
  }).classed("view", mode === VIEW_MODE).classed("map-icon-text", function (_ref5) {
    var depth = _ref5.depth;
    return depth === 0;
  }).classed("key-issues", function (_ref6) {
    var depth = _ref6.depth;
    return depth === 1;
  }).classed("insight-areas", function (_ref7) {
    var depth = _ref7.depth;
    return depth === 2;
  });

  if (isUsingForeignObject) {
    addTextUsingForeignObject(textSelectionEnter, nodeContainersMerge, radius, nodeSpacingModifier, width, height, getTitleStringFromNode);
  } else {
    addTextUsingText(nodeContainersMerge, radius, nodeSpacingModifier, width, height, mode);
  }

  // If viewing, remove the text box
  nodeContainersMerge.filter(function () {
    return mode === VIEW_MODE && previousMode !== mode;
  }).selectAll("rect.text-box").remove();

  return textContainerEnter;
}

// Handle display of text by using a <div /> wrapped in a <foreignObject />
// nghiand: cập nhật text hiển thị
function addTextUsingForeignObject(textSelectionEnter, nodeContainersMerge, radius, nodeSpacingModifier, width, height, getTitleStringFromNode) {
  textSelectionEnter.append("xhtml:div");
  var foreignObjectMerge = nodeContainersMerge.selectAll("foreignObject.node-text");
  foreignObjectMerge.select("div").style("text-align", function (_ref8) {
    var depth = _ref8.depth,
        angle = _ref8.angle;

    if (depth === 0) {
      return "center";
    } else {
      return angle < 180 ? "left" : "right";
    }
  }).attr("lang", function (_ref9) {
    var language = _ref9.language;
    return language;
  }).attr("title", getTitleStringFromNode).html(function (_ref10) {
    if(_ref10.depth == 0 || _ref10.depth == 1){
      var name = _ref10.name;
      return name;
    } else {
      return '';
    }
  });

  // In Chrome 71, there's a bug that causes things with foreignObjects to not apply the
  // transform property fully and makes elements overlap each other when they shouldn't.
  // This innerInner element was added as a workaround to this Chrome bug. The innerInner
  // element applies the transform as well as width, height, etc. while
  nodeContainersMerge.select(".inner-text-container").attr("transform", function (_ref11) {
    var depth = _ref11.depth,
        nodeSize = _ref11.nodeSize;
    return depth !== 0 ? "translate(" + nodeSize * nodeSpacingModifier + ")" : "";
  });
  var innerInnerTextContainerMerge = nodeContainersMerge.selectAll(".inner-inner-text");
  innerInnerTextContainerMerge.attr("transform", function (node) {
    if (node.depth !== 0) {
      return "";
    }
    var divWidth = getTextBoundWidth(radius, node.nodeSize * nodeSpacingModifier, node, width, height);
    return "translate(" + -divWidth / 2 + ")";
  })
  // Overwrite the x value given by the below when the node is in the centre
  .attr("x", "0").attr("y", function () {
    return getInnerDivOffsetHeight(this) / -2;
  }).attr("height", function () {
    return getInnerDivOffsetHeight(this);
  });

  // If the node is in the centre, offset the x value to adjust for long words that don't fit
  innerInnerTextContainerMerge.filter(function (_ref12) {
    var depth = _ref12.depth;
    return depth === 0;
  }).attr("x", function () {
    var div = getInnerDiv(this);
    var scrollWidth = div.scrollWidth,
        offsetWidth = div.offsetWidth;

    return (scrollWidth - offsetWidth) / -2;
  }).attr("width", function () {
    return getInnerDiv(this).scrollWidth;
  });

  foreignObjectMerge.attr("width", function (node) {
    var innerDivPadding = getInnerDivPadding(this);
    return getTextBoundWidth(radius, node.nodeSize * nodeSpacingModifier, node, width, height, innerDivPadding);
  }).attr("transform", function (_ref13) {
    var angle = _ref13.angle;

    var innerDivPadding = getInnerDivPadding(this);
    var rawElementWidth = select(this).attr("width");
    var width = parseFloat(rawElementWidth);
    var translateX = width / 2 + innerDivPadding;
    return angle >= 180 ? "translate(" + translateX + ") rotate(180) translate(" + -translateX + ")" : "";
  })
  // Overwrite the x value given by the below when the node is in the centre
  .attr("x", "0").attr("y", function () {
    return getInnerDivOffsetHeight(this) / -2;
  }).attr("height", function () {
    return getInnerDivOffsetHeight(this);
  }).each(function (node) {
    node.textHeight = getInnerDivOffsetHeight(this);
  });
  // If the node is in the centre, offset the x value to adjust for long words that don't fit
  foreignObjectMerge.filter(function (_ref14) {
    var depth = _ref14.depth;
    return depth === 0;
  }).attr("x", function () {
    var div = getInnerDiv(this);
    var scrollWidth = div.scrollWidth,
        offsetWidth = div.offsetWidth;

    return (scrollWidth - offsetWidth) / -2;
  }).attr("width", function () {
    return getInnerDiv(this).scrollWidth;
  });
}

function getInnerDiv(context) {
  return select(context).selectAll("div").node();
}

function getInnerDivOffsetHeight(context) {
  return getInnerDiv(context).offsetHeight;
}

function getInnerDivPadding(context) {
  var innerDiv = getInnerDiv(context);
  var rawPadding = getComputedStyle(innerDiv).padding;
  var padding = parseFloat(rawPadding);
  if (isNaN(padding)) {
    padding = 0;
  }
  return padding;
}

function addTextUsingText(nodeContainersMerge, radius, nodeSpacingModifier, width, height, mode) {
  // On update, update the text positions through a transition animation
  nodeContainersMerge.select("text.node-text").attr("transform", function (_ref15) {
    var depth = _ref15.depth,
        angle = _ref15.angle;
    return "" + (depth !== 1 && angle >= 180 ? "rotate(180)" : "");
  })
  // Anchor the text to the start or end depending on if it has been rotated
  .attr("text-anchor", function (_ref16) {
    var angle = _ref16.angle;
    return angle < 180 ? "left" : "right";
  });

  // Wrap the text of all text elements and adjust its positioning
  nodeContainersMerge.selectAll("text.node-text").each(function (node) {
    var _this = this;

    var textElementSelection = select(this);
    var isEndAnchor = node.depth === 0 || node.angle >= 180;
    var textBoundWidth = getTextBoundWidth(radius, node.nodeSize * nodeSpacingModifier, node, width, height);
    if (node.depth === 0 && mode === EDIT_MODE) {
      node.linesOfText = [];
    } else {
      textWrapping(textElementSelection, node, textBoundWidth, isEndAnchor);
    }
    var tspanSelection = textElementSelection.selectAll("tspan:not(.line-background)").data(node.linesOfText);
    var mergeSelectionsToAlign = [];
    if (node.depth === 1) {
      var tspanLineBackgroundViewSelection = textElementSelection.selectAll("tspan.line-background").filter(function () {
        return mode === VIEW_MODE;
      }).data(node.linesOfText);
      // Add the background to the text
      var tspanLineBackgroundViewEnterSelection = tspanLineBackgroundViewSelection.enter().insert("tspan", "tspan:not(.line-background)").order();
      var tspanLineBackgroundViewMergeSelection = tspanLineBackgroundViewEnterSelection.classed("line-background", true).merge(tspanLineBackgroundViewSelection);
      mergeSelectionsToAlign.push(tspanLineBackgroundViewMergeSelection);
      textElementSelection.selectAll("tspan.line-background").filter(function () {
        return mode === EDIT_MODE;
      }).remove();
      tspanLineBackgroundViewSelection.exit().remove();
    }
    // Add the actual text that will be displayed
    if (node.depth === 0) {
      var tspanEnterSelection = tspanSelection.enter().append("tspan");
      var tspanMergeSelection = tspanEnterSelection.merge(tspanSelection).attr("x", 0).attr("text-anchor", "middle").text(function (_ref17) {
        var text = _ref17.text;
        return text;
      });
      var textContainerHeight = this.parentNode.getBoundingClientRect().height;
      // On entering, getBoundingClientRect().height seems to only represent
      // the height of one line of text, so use this to estimate the actual textHeight
      tspanEnterSelection.each(function () {
        return node.textHeight = textContainerHeight * node.linesOfText.length;
      });
      tspanSelection.each(function () {
        return node.textHeight = textContainerHeight;
      });
      node.lineHeight = node.textHeight / node.linesOfText.length;
      tspanMergeSelection.attr("y", function (_, index) {
        return index === 0 ? -((node.textHeight - node.lineHeight) / 2) : null;
      }).attr("dy", function (_ref18) {
        var dy = _ref18.dy;
        return dy + "em";
      });

      // IE Arabic Madness
      if (node.language === ARABIC_LANGUAGE) {
        tspanMergeSelection.attr("x", function (_ref19, index) {
          var computedTextLength = _ref19.computedTextLength;

          if (index === 0) {
            // The first line's x value should be:
            // -(sum(computedTextLength _other_ than the current one))
            // Note: computedTextLength = tspan.getComputedTextLength()
            return -1 * node.linesOfText.reduce(function (sum, _ref20, index) {
              var computedTextLength = _ref20.computedTextLength;
              return sum + (index === 0) ? 0 : computedTextLength;
            }, 0);
          } else {
            // For all other lines, the result of getComputedTextLength() is fine
            return computedTextLength;
          }
        });
      }
    } else {
      var tspanSelectionEnter = tspanSelection.enter().append("tspan");
      var tspanSelectionMerge = tspanSelectionEnter.merge(tspanSelection);
      mergeSelectionsToAlign.push(tspanSelectionMerge);
      mergeSelectionsToAlign.forEach(function (selection) {
        selection.attr("x", 0).attr("text-anchor", function () {
          return isEndAnchor ? "right" : "left";
        }).text(function (_ref21) {
          var text = _ref21.text;
          return text;
        });
        // On entering, getBBox().height seems to only represent
        // the height of one line of text, so use this to estimate the actual textHeight
        var textContainerHeight = _this.getBBox().height;
        tspanSelectionEnter.each(function () {
          return node.textHeight = textContainerHeight * node.linesOfText.length;
        });
        tspanSelection.each(function () {
          return node.textHeight = textContainerHeight;
        });
        node.lineHeight = node.textHeight / node.linesOfText.length;
        if (node.linesOfText.length > 2) {
          selection.attr("y", function (_, index) {
            if (index === 0) {
              var lineHeightModifier = 1.3;
              if (node.depth !== 1) {
                lineHeightModifier = isEndAnchor ? 1 : 2;
              }
              return "" + (node.textHeight / -2 + node.lineHeight / lineHeightModifier);
            } else {
              return null;
            }
          }).attr("dy", function (_ref22, index) {
            var dy = _ref22.dy;
            return index === 0 ? null : dy + "em";
          });
        } else {
          selection.attr(mode === VIEW_MODE ? "y" : "dy", function (_ref23, index) {
            var dy = _ref23.dy;

            if (mode === VIEW_MODE) {
              return dy * index + "em";
            } else {
              return index === 0 && node.angle < 180 ? "-0.3em" : dy + "em";
            }
          }).attr(mode === VIEW_MODE ? "dy" : "y", function (_, index) {
            if (node.linesOfText.length === 1) {
              return mode === VIEW_MODE || node.angle < 180 ? "0.3em" : "0.6em";
            } else {
              return mode === VIEW_MODE || node.angle < 180 ? null : 0;
            }
          });
        }
      });

      // IE Arabic madness
      if (node.language === ARABIC_LANGUAGE) {
        mergeSelectionsToAlign[0].attr("x", function (_ref24, index) {
          var computedTextLength = _ref24.computedTextLength;

          if (index === 0) {
            // The first line's x value should be:
            // 1. sum(computedTextLength _other_ than the current one)
            // 2. multiply step1 by 2 if there is a line background, 1 otherwise
            // 3. step2 + (0 if there is a line background, computedTextLength otherwise)
            // 4. multiply step3 by -1
            // (steps 2 & 4 are combined in one step)
            // Note: computedTextLength = tspan.getComputedTextLength()
            return -mergeSelectionsToAlign.length * node.linesOfText.reduce(function (sum, _ref25, index) {
              var computedTextLength = _ref25.computedTextLength;

              var incrementor = void 0;
              if (index === 0) {
                if (mergeSelectionsToAlign.length === 1) {
                  incrementor = 0;
                } else {
                  incrementor = computedTextLength / 2;
                }
              } else {
                incrementor = computedTextLength;
              }
              return sum + incrementor;
            }, 0);
          } else {
            // For all other lines, the result of getComputedTextLength() is fine
            return computedTextLength;
          }
        });
        if (mergeSelectionsToAlign.length > 1) {
          mergeSelectionsToAlign[1].attr("x", function (_ref26) {
            var computedTextLength = _ref26.computedTextLength;
            return computedTextLength;
          });
        }
      }
    }
    tspanSelection.exit().remove();
  });
}

function getTextBoundWidth(radius, nodeSpacing, node, width, height) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (node.depth === 0) {
    return radius / 2.5;
  }

  var textBoundWidth = void 0;
  if (node.depth === 1) {
    var centre = {
      x: width / 2,
      y: height / 2
    };
    var intersection = getCircleIntersectionPoint(node, centre, radius);
    var distanceSP = {
      x: -Math.abs(node.x) + centre.x,
      y: node.y + centre.y
    };
    textBoundWidth = pythagoras(intersection.x - distanceSP.x, intersection.y - distanceSP.y) - 10 - padding * 2;
  } else {
    textBoundWidth = Math.min(width, height) / 2 - radius;
  }
  textBoundWidth -= nodeSpacing;
  return textBoundWidth;
}

function textWrapping(textElementSelection, node, textBoundWidth, isEndAnchor) {
  // For some reason our text wrapping library can't adjust text that has already been wrapped
  // So instead, we clone the text node, add the text, make it invisible and then run the
  // textwrap on that instead, and then later adjust the tspans in the actual text node we're using
  var cloneText = select(textElementSelection.node().cloneNode(false));
  cloneText.text(node.name);
  cloneText.style("opacity", 0);
  textElementSelection.node().parentNode.appendChild(cloneText.node());

  if (!EASTERN_ASIAN_LANGUAGES.some(function (asianLanguage) {
    return asianLanguage === node.language;
  })) {
    // if not an Eastern Asian language, textwrap using d3-textwrap
    var textwrapConfig = textwrap$1().bounds({
      x: 0,
      y: 0,
      width: textBoundWidth,
      height: 10000
    });
    // .method("tspans")
    cloneText.call(textwrapConfig);
  } else {
    // Eastern Asian-specific text wrapping
    // Find out how long the line is,
    // divide by number of characters to figure out "size of character"
    // then fit the amount of characters on each line that is guaranteed to fit
    var lineLength = cloneText.node().getBoundingClientRect().width;
    cloneText.text("");
    var spacePerCharacter = lineLength / node.name.length;
    var charactersPerLine = Math.floor(textBoundWidth / spacePerCharacter);
    var noOfLines = Math.ceil(lineLength / (spacePerCharacter * charactersPerLine));
    for (var lineNumber = 0; lineNumber < noOfLines; lineNumber++) {
      cloneText.append("tspan").text(node.name.substr(lineNumber * charactersPerLine, charactersPerLine));
    }
  }

  node.linesOfText = getLinesOfText(cloneText, isEndAnchor);
  cloneText.remove();
}

// Function for getting the number of lines that a text has been wrapped to
function getLinesOfText(textElement, isEndAnchor) {
  var linesOfText = [];
  var previousText = "";
  textElement.selectAll("tspan").each(function () {
    var tspan = select(this);
    var currentText = tspan.text();
    if (currentText.length > 0) {
      linesOfText.push({
        text: currentText,
        computedTextLength: this.getComputedTextLength(),
        dy: previousText.length > 0 ? 1.2 : 0
      });
    }
    previousText = currentText;
  });
  return linesOfText;
}

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};





















var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();











var toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

// Treat the graph as a relative size using these constants
var waveGraphSize = {
  inner: 7,
  outer: 12
};

function closeVolumeMap(svg, radius, animationDuration) {
  var waveGraphContainer = svg.selectAll(".wave-chart");

  // 1. Remove axis
  var circles = waveGraphContainer.selectAll(".waveAxis").data([]);
  circles.exit().transition().duration(animationDuration).attr("r", 0).remove();

  // 2. Remove axis labels
  var axisLabels = waveGraphContainer.selectAll(".waveAxisLabel").data([]);
  axisLabels.exit().transition().duration(animationDuration).attr("y", function () {
    return radius / 1.5;
  }).remove();

  // 3. Shrink wave path to 0 and remove it
  var wavePath = waveGraphContainer.selectAll(".wavePath").data([]);

  wavePath.exit().transition().duration(animationDuration).attr("transform", function () {
    var currentTransformValue = select(this).attr("transform");
    return currentTransformValue + " scale(0)";
  }).remove();
}

function applyLoadingTransition(selection, animationDuration) {
  selection.transition("loading").delay(function (_, index) {
    return (index - 1) * animationDuration * 0.15;
  }).duration(animationDuration).style("stroke", "transparent").end().then(function () {
    selection.transition("loading").delay(function (_, index) {
      return (index - 1) * animationDuration * 0.15;
    }).duration(animationDuration).style("stroke", "#ffffff").end().then(function () {
      applyLoadingTransition(selection, animationDuration);
    }).catch(function () {
      return null;
    });
  }).catch(function () {
    return null;
  });
}

// See further down where rScale is set to know what this is about
var scaleClosureObject = { rScale: null };

function drawVolumeMap(nodes, svg, radius, volumeRange, width, height, advancedModeLoading, animationDuration) {
  // If the passed in volumes is null, advanced mode isn't loading then
  // close the volume map if it's there and walk away
  var hasVolumeData = nodes.some(function (_ref) {
    var volume = _ref.volume;
    return volume !== null && volume !== undefined;
  });
  if (!hasVolumeData && !advancedModeLoading) {
    if (svg.selectAll(".wave-chart").size()) {
      closeVolumeMap(svg, radius);
    }
    return;
  }

  //
  // STEP 0
  // PRECOMPUTE DATA
  //
  var outerTopics = nodes.filter(function (node) {
    return node.depth === 2;
  });

  // If the max topic volume was not specified, then calculate it based on the available topics
  if (!volumeRange) {
    var volumeMaxValue = maxValue(outerTopics, function (topic) {
      return topic.volume;
    });
    volumeRange = [0, volumeMaxValue];
  }

  // Wrapper for the wave graph
  var waveGraphContainer = svg.selectAll(".wave-chart").data([outerTopics]);

  var waveGraphContainerEnter = waveGraphContainer.enter().insert("g", ":first-child").classed("wave-chart", true);

  waveGraphContainer.merge(waveGraphContainerEnter).attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")");

  waveGraphContainer.exit().remove();

  var waveGraph = svg.selectAll(".wave-chart");

  //
  // STEP 1
  // DRAW THE CIRCULAR AXIS
  //

  // Create an array containing the current radius, and the relative distance
  // from the centre of the Transformation Map each axis should be drawn at
  var axisRange = range(waveGraphSize.inner + 1, waveGraphSize.outer);
  var axisWithRadius = axisRange.map(function (range$$1) {
    return {
      range: range$$1,
      radius: radius
    };
  });

  var circles = waveGraph.selectAll(".waveAxis").data(axisWithRadius, function (d) {
    return d.range;
  });

  // Add new axis to the graph
  var circlesEnter = circles.enter().append("circle").attr("r", radius).attr("class", "waveAxis").style("stroke", "#eeeeee");

  // Update existing axis if the graph radius has changed
  var circlesUpdateAndEnter = circles.merge(circlesEnter);
  circlesUpdateAndEnter.transition("entering").duration(animationDuration).attr("r", function (d) {
    return d.radius / waveGraphSize.inner * d.range;
  });

  // If we're loading advanced mode, then pulsate the colour of the scale,
  // otherwise cancel that animation and return the scale to the normal colour
  if (advancedModeLoading) {
    applyLoadingTransition(circlesUpdateAndEnter, animationDuration);
    return;
  } else {
    circlesUpdateAndEnter.interrupt("loading").transition().duration(animationDuration / 2).style("stroke", "#eeeeee");
  }

  circles.exit().remove();

  //
  // STEP 2
  // ANNOTATE THE AXIS
  //

  // Scale which calculates number of topics each axis represents
  var axisAnnotationScale = linear$2().domain([waveGraphSize.inner, waveGraphSize.outer - 1]).range(volumeRange);

  var axisLabels = waveGraph.selectAll(".waveAxisLabel").data(axisWithRadius, function (_ref2) {
    var range$$1 = _ref2.range;
    return range$$1;
  });

  var axisLabelsEnter = axisLabels.enter().append("text").attr("class", "waveAxisLabel").attr("y", 0).attr("dy", "0.4em");

  axisLabels.merge(axisLabelsEnter).transition().duration(animationDuration).attr("x", function (_ref3) {
    var range$$1 = _ref3.range,
        radius = _ref3.radius;
    return -range$$1 * radius / waveGraphSize.inner;
  }).attr("transform", function (_ref4) {
    var radius = _ref4.radius,
        range$$1 = _ref4.range;
    return "rotate(-90, " + -range$$1 * radius / waveGraphSize.inner + ", " + radius / 13 + ")";
  }).text(function (_ref5) {
    var range$$1 = _ref5.range;
    return Math.floor(axisAnnotationScale(range$$1));
  });

  axisLabels.exit().remove();

  //
  // STEP 3
  // DRAW THE WAVE
  //

  // Add the first topic to the end of the ordered topic list, so when we draw
  // the wave graph the first and last points join up to close the path
  var closedOuterTopics = outerTopics.concat([_extends({}, outerTopics[0], {
    id: "fakeKeyToClosePath"
  })]);
  var wavePath = waveGraph.selectAll(".wavePath").data([{ id: nodes[0].id }], function (d) {
    return d.id;
  });

  var initialChildStartingPosition = calculateInitialChildStartingPosition(nodes);

  // The angle between each topic
  var angleBetweenTopics = Math.PI * 2 / outerTopics.length;

  // The scale used to work out where to plot the wave-chart
  // path on the SVG. The range is calculated using the current radius
  // of the graph
  var rScale = linear$2().range([radius, radius / waveGraphSize.inner * (waveGraphSize.outer - 1)]).domain(volumeRange);

  // For some reason, d3.lineRadial closure appears to hold onto an old version of the
  // radius() accessor, resulting in the line always being drawn to whatever the
  // previously set scale was (meaning it would only work properly on the next call).
  // Hence, we use a singleton object to make sure that we always point to the correct
  // scale inside the .radius() accessor and make it work properly first time.
  scaleClosureObject.rScale = rScale;
  scaleClosureObject.angleBetweenTopics = angleBetweenTopics;

  // Define how the path of the wave will be drawn
  var radarLine = lineRadial$1().curve(natural).radius(function (_ref6) {
    var volume = _ref6.volume;
    return scaleClosureObject.rScale(volume);
  }).angle(function (_, index) {
    return index * scaleClosureObject.angleBetweenTopics;
  });

  var emptyLine = closedOuterTopics.map(function (d) {
    return { id: d.id, volume: 0 };
  });

  var wavePathEnter = wavePath.enter().append("path").attr("class", "wavePath").attr("transform", "rotate(" + initialChildStartingPosition + ") scale(1)").attr("d", radarLine(emptyLine));

  wavePath.merge(wavePathEnter).transition().duration(animationDuration).attr("transform", "rotate(" + initialChildStartingPosition + ") scale(1)").attr("d", radarLine(closedOuterTopics));

  wavePath.exit().remove();
}

//
// Calculate the "initial child starting position"
//
function calculateInitialChildStartingPosition(nodes) {
  var parentNodes = nodes.filter(function (node) {
    return node.depth === 1;
  });
  var childNodes = nodes.filter(function (node) {
    return node.depth >= 2;
  });

  var parentDivision = parentNodes.length !== 1 ? 360 / parentNodes.length : 0;
  var childDivision = Math.min(40, 360 / childNodes.length);

  var firstParentWithChildren = { children: [] };
  var indexOf1stParentWC = 0;
  for (var i = 0; i < parentNodes.length; i++) {
    var parent = parentNodes[i];
    if (parent.children) {
      firstParentWithChildren = parent;
      indexOf1stParentWC = i;
      break;
    }
  }

  var midCoverageDegree = (firstParentWithChildren.children.length - 1) * childDivision / 2;
  var initialChildStartingPosition = parentDivision * indexOf1stParentWC + parentDivision / 2 - midCoverageDegree;

  return initialChildStartingPosition;
}

function highlightEvidence(insightAreaID, nodes) {
  // Remove all highlighted evidence before highlighting new evidence
  selectAll(".highlightAsEvidence").classed("highlightAsEvidence", false);

  // If no insightAreaID then no need to continue
  if (!insightAreaID) {
    return;
  }

  nodes.filter(function (_ref) {
    var id = _ref.id;
    return id === insightAreaID;
  }).forEach(function (node) {
    selectAll(node.selectorClasses.join(", ")).classed("highlightAsEvidence", true);

    node.parents.forEach(function (parent) {
      select(".node-text-" + parent.id).classed("highlightAsEvidence", true);
    });
  });
}

function treeify(data) {
  if (!data || !data.dimensions && !data.topics) {
    return _extends({}, data);
  }
  var children = (data.dimensions || data.topics || []).map(function (dimensionOrTopic) {
    return treeify(dimensionOrTopic);
  });
  return _extends({}, data, {
    children: children.length > 0 ? children : undefined,
    dimensions: undefined,
    topics: undefined
  });
}





function flattenTree(treeData, depth) {
  if (depth === undefined) {
    depth = 0;
  }
  treeData.depth = depth;
  treeData.key = treeData.id + "-" + depth;
  if (!treeData.children) {
    return [treeData];
  }
  return treeData.children.reduce(function (totalTreeList, currentChild) {
    var flattenedChild = flattenTree(currentChild, depth + 1);
    var unique = [];
    flattenedChild.forEach(function (childElement) {
      var existingChild = exists(childElement, totalTreeList);
      if (!existingChild) {
        // If it doesn't already exist in the list, prepare it to be added
        if (!childElement.parents) {
          childElement.parents = [treeData];
        }
        unique.push(childElement);
      } else {
        // Add the childElement's parents to the existingChild's parents
        // and point the childElement's parent to the existingChild
        if (childElement.parents) {
          childElement.parents.forEach(function (parent) {
            parent.children = parent.children.filter(function (element) {
              return element.key !== childElement.key;
            });
            // Given the hyper-relational data model, it can sometimes
            // happen that the root of the map can turn up as a child later on.
            // As this tends to screw with the enclosed concept of a transformation map,
            // we prevent this from occurring via the below conditional
            // (the map element is the only element that does not have a parent).
            if (existingChild.parents) {
              parent.children.push(existingChild);
            }
          });
          if (existingChild.parents) {
            existingChild.parents = existingChild.parents.concat(childElement.parents);
          }
        }
      }
    });
    return totalTreeList.concat(unique);
  }, [treeData]);
}

function addVolumesToData(flattenedTreeData, topicVolumes, dimensionVolumes) {
  // Make sorted arrays of the volumes for extracting max values later
  var topicVolumeEntries = entries(topicVolumes || {});
  topicVolumeEntries.sort(function (v1, v2) {
    return v2.value - v1.value;
  });
  var dimensionVolumeEntries = entries(dimensionVolumes || {});
  dimensionVolumeEntries.sort(function (v1, v2) {
    return v2.value - v1.value;
  });

  (flattenedTreeData || []).forEach(function (element) {
    var volumes = element.depth === 1 ? dimensionVolumes : topicVolumes;
    var volume = volumes && volumes[element.id];

    // If no data has been passed, use null as a value instead to indicate absence of data
    var defaultVolume = volumes ? 0 : null;
    element.volume = volume !== null && volume !== undefined ? volume : defaultVolume;

    var volumeEntries = element.depth === 1 ? dimensionVolumeEntries : topicVolumeEntries;
    element.volumePosition = getVolumeMaxComparisonValue(element.id, volumeEntries);
  });
}

function getVolumeMaxComparisonValue(elementId, volumeEntries) {
  for (var index = 0; index < 3; index++) {
    if (volumeEntries.length <= index) {
      break;
    }
    var key = volumeEntries[index].key;

    if (elementId === key) {
      return index + 1;
    }
  }
  return null;
}

function getLinks(flattenedTree) {
  return flattenedTree.filter(function (_ref) {
    var children = _ref.children;
    return children;
  }).reduce(function (totalLinks, node) {
    return totalLinks.concat(node.children.map(function (child) {
      return {
        source: node,
        target: child
      };
    }));
  }, []);
}

function exists(elementToCheck, data) {
  var matchingElements = data.filter(function (element) {
    return elementToCheck.key === element.key;
  });
  return matchingElements.length > 0 ? matchingElements[0] : null;
}

/**
 * Performs a naive language detection on the names of elements within
 * the flattenedTreeData by checking whether the text contains characters
 * that have a unicode representation within the ranges specified:
 *  - Arabic = 0600-06FF
 *  - Japanese
 *    - Hiragana = 3040-309F
 *    - Katakana = 30A0-30FF
 *    - Kanbun = 3190-319F
 *  - Chinese
 *    - CJK Unified Indeographs = 4E00-9FFF
 *
 * Names are usually not long enough to use a proper language detection
 * algorithm accurately; they tend to end up suggesting multiple different languages
 * even when using English, for example. Also, we only really care about these
 * 3 languages for language-specific layouts anyway, so this would be much faster
 * than a standard language detection algorithm.
 * @param {*} flattenedTreeData
 */
function naiveLanguageDetection(flattenedTreeData) {
  flattenedTreeData.forEach(function (element) {
    var foundLanguage = null;
    var name = element.name || "";
    for (var i = 0; i < name.length; i++) {
      var charCode = fixedCharCodeAt(name, i);
      if (charCode >= 0x0600 && charCode <= 0x06ff) {
        foundLanguage = ARABIC_LANGUAGE;
        break;
      } else if (charCode >= 0x3040 && charCode <= 0x309f || charCode >= 0x30a0 && charCode <= 0x30ff || charCode >= 0x3190 && charCode <= 0x319f) {
        foundLanguage = JAPANESE_LANGUAGE;
        break;
      } else if (charCode >= 0x4e00 && charCode <= 0x9fff) {
        foundLanguage = CHINESE_LANGUAGE;
        break;
      }
    }
    element.language = foundLanguage || DEFAULT_LANGUAGE;
  });
}

/**
 * Utility function referenced from:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt
 *
 * Handles non-BMP characters should they occur within charCodeAt()
 * @param {*} stringValue
 * @param {*} index
 */
function fixedCharCodeAt(stringValue) {
  var index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  // ex. fixedCharCodeAt('\uD800\uDC00', 0); // 65536
  // ex. fixedCharCodeAt('\uD800\uDC00', 1); // false
  var code = stringValue.charCodeAt(index);
  var hi = void 0,
      low = void 0;

  // High surrogate (could change last hex to 0xDB7F
  // to treat high private surrogates
  // as single characters)
  if (0xd800 <= code && code <= 0xdbff) {
    hi = code;
    low = stringValue.charCodeAt(index + 1);
    if (isNaN(low)) {
      throw new Error("High surrogate not followed by low surrogate in fixedCharCodeAt()");
    }
    return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
  }
  if (0xdc00 <= code && code <= 0xdfff) {
    // Low surrogate
    // We return false to allow loops to skip
    // this iteration since should have already handled
    // high surrogate above in the previous iteration
    return false;
    // hi = stringValue.charCodeAt(index - 1);
    // low = code;
    // return ((hi - 0xD800) * 0x400) +
    //   (low - 0xDC00) + 0x10000;
  }
  return code;
}

function verifyCorrectType(typeArray, startsWithMode) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  if (args.length > 0) {
    for (var i = 0; i < typeArray.length; i++) {
      for (var j = 0; j < args.length; j++) {
        if (startsWithMode && typeArray[i].startsWith(args[j]) || !startsWithMode && typeArray[i] === args[j]) {
          return true;
        }
      }
    }
    return false;
  }
  return true;
}

function positionNodes(nodes, radius, childNodeSize, parentRadiusDivisionFactor, maxChildDivision) {
  // Key Issues
  var parents = [];

  // Related Insight Areas
  var children = [];

  // Set the root node (i.e. the map itself) at position (0, 0) which is the centre
  if (nodes.length > 0) {
    nodes[0] = _extends({}, nodes[0], {
      x: 0,
      y: 0,
      angle: 90,
      radius: 0,
      nodeSize: radius / 30.25 // 11 (actual scaling factor) * 2.75 (image upload circle's given radius)
    });
    for (var i = 1; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.depth === 1) {
        parents.push(node);
      } else if (node.depth >= 2) {
        children.push(node);
      }
    }
  }

  // Set the spacing for all parents and children to be the maximum possible equal distance from each other
  var parentDivision = parents.length !== 1 ? 360 / parents.length : 0;
  var childDivision = Math.min(maxChildDivision, 360 / children.length);

  // Flags to check if a child has already been positioned by a previous parent
  var positionedFlags = {};

  // Position all children with equal spacing, starting by arranging the first parent's children
  // optimally around it (i.e. middle child is at the same position) to increase the chances that
  // all others are optimally arranged around their parents (with the exception of multi-parent children)
  if (parents.length > 0) {
    // Allow sensible defaults for arranging the map when no parents have children
    var firstParentWithChildren = { children: [] };
    var indexOf1stParentWC = 0;
    for (var _i = 0; _i < parents.length; _i++) {
      var parent = parents[_i];
      if (parent.children) {
        firstParentWithChildren = parent;
        indexOf1stParentWC = _i;
        break;
      }
    }
    var midCoverageDegree = (firstParentWithChildren.children.length - 1) * childDivision / 2;
    var initialChildStartingPosition = parentDivision * indexOf1stParentWC + parentDivision / 2 - midCoverageDegree;
    var childIndex = 0;
    var nodeSize = childNodeSize;
    var parentRadius = radius / parentRadiusDivisionFactor;
    var parentRadiusDouble = radius - (radius - parentRadius) / parentRadiusDivisionFactor;
    var parentRadiusWithoutNode = parentRadius - nodeSize / 2;
    var childParentRadiusDifference = parentRadius + (radius - parentRadius) / parentRadiusDivisionFactor;

    parents.forEach(function (parent, index) {
      var parentAngle = parentDivision * index + parentDivision / 2;
      if (parentAngle !== parent.angle || nodeSize !== parent.nodeSize || parentRadius !== parent.radius) {
        if (parentAngle !== parent.angle) {
          parent.angle = parentDivision * index + parentDivision / 2;
          var parentRadianAngle = (parent.angle - 90) * (Math.PI / 180);
          parent.angleCosine = Math.cos(parentRadianAngle);
          parent.angleSine = Math.sin(parentRadianAngle);
        }
        parent.radius = parentRadius;
        parent.x = parentRadiusWithoutNode * parent.angleCosine;
        parent.y = parentRadiusWithoutNode * parent.angleSine;
        parent.controlPoint = {
          x: parentRadiusDouble * parent.angleCosine,
          y: parentRadiusDouble * parent.angleSine
        };
        parent.nodeSize = nodeSize;
      }
      if (parent.children && parent.children.length > 0) {
        parent.controlPoints = {};
        parent.children.forEach(function (child) {
          // Position each parent's children if they have not been positioned
          // Required due to multiple parents possibly sharing the same child
          if (!positionedFlags[child.id]) {
            var childAngle = (initialChildStartingPosition + childIndex * childDivision + 360) % 360;
            if (childAngle !== child.angle || nodeSize !== child.nodeSize || radius !== child.radius) {
              if (childAngle !== child.angle) {
                child.angle = childAngle;
                var childRadianAngle = (childAngle - 90) * (Math.PI / 180);
                child.angleCosine = Math.cos(childRadianAngle);
                child.angleSine = Math.sin(childRadianAngle);
              }
              child.radius = radius;
              child.x = radius * child.angleCosine;
              child.y = radius * child.angleSine;
              child.controlPoint = {
                x: childParentRadiusDifference * child.angleCosine,
                y: childParentRadiusDifference * child.angleSine
              };
              child.nodeSize = nodeSize;
            }
            childIndex++;
            positionedFlags[child.id] = true;
          }
          // Set the corresponding parent control point
          // If the difference between the child and parent angles is less than 90, then converge to mid-angle
          // Else, converge completely to the child angle (prevents weird curves in the middle of the diagram)
          var parentChildAngleDiff = child.angle - parentAngle;
          if (Math.abs(360 - parentChildAngleDiff) < parentChildAngleDiff) {
            parentChildAngleDiff -= 360;
          }
          var convergedAngle = parentAngle + (Math.abs(parentChildAngleDiff) < 90 ? parentChildAngleDiff / 2 : parentChildAngleDiff);
          var moderatedParentRadianAngle = (convergedAngle + 270) % 360 * (Math.PI / 180);
          parent.controlPoints[child.id] = {
            x: parentRadiusDouble * Math.cos(moderatedParentRadianAngle),
            y: parentRadiusDouble * Math.sin(moderatedParentRadianAngle)
          };
        });
      }
    });
  }
  return nodes;
}

function getSelectorClasses(_ref2) {
  var id = _ref2.id,
      parents = _ref2.parents,
      children = _ref2.children;

  var selectorClasses = [id].concat((parents || []).filter(function (_ref3) {
    var depth = _ref3.depth;
    return depth > 0;
  }).map(function (_ref4) {
    var id = _ref4.id;
    return id;
  })).concat((children || []).map(function (_ref5) {
    var id = _ref5.id;
    return id;
  }));
  selectorClasses = selectorClasses.map(function (value) {
    return ".marker.node-" + value;
  });
  selectorClasses.push(".link.link-" + id);
  selectorClasses.push(".node-text.node-text-" + id);
  return selectorClasses;
}

// Function to set the pattern image dimensions
function setImageDimensions(imageSelection, diameter, animationDuration) {
  imageSelection.transition().duration(animationDuration * 0.75).attr("width", diameter / 1.75).attr("height", diameter / 1.75);
  return imageSelection;
}

// Function that creates a normal circle that animates with a scaling radius
function createCircleNormal(radius, graph, nodeContainers, mode, identifyingClass, animationDuration) {
  var circleContainer = graph.append("g").classed(identifyingClass, true).classed("view", mode === VIEW_MODE);
  circleContainer.append("circle").attr("r", radius).classed("holder-ring", true);
  nodeContainers.select("." + identifyingClass).classed("view", mode === VIEW_MODE).select("circle").transition().duration(animationDuration * 0.75).attr("r", radius);
  return circleContainer;
}

// Function that creates a circle with an invisible overlay slightly larger than itself to create a drop zone for items
function createCircleDropTarget(radius, isDragging, graph, regularColour, successColour, animationDuration) {
  if (isDragging && !graph.selectAll(".drop-target-ring").size()) {
    graph.append("circle").attr("r", 0).classed("drop-target-ring", true).style("fill", regularColour).style("opacity", 0.7).style("filter", "url(#glow)").on("dragover", function (event) {
      if (verifyCorrectType(event.dataTransfer.types, false, "text", "text/plain")) {
        event.preventDefault();
        select(this).style("fill", successColour).style("filter", "none");
      }
    }).on("dragleave", function (event) {
      if (verifyCorrectType(event.dataTransfer.types, false, "text", "text/plain")) {
        select(this).style("fill", regularColour).style("filter", "url(#glow)");
      }
    }).on("drop.clean-up", function (event) {
      event.preventDefault();
      select(this).style("fill", regularColour).style("filter", "url(#glow)");
    }).transition().duration(animationDuration * 0.75).attr("r", radius);
  } else if (!isDragging && graph.selectAll(".drop-target-ring").size()) {
    graph.selectAll(".drop-target-ring").transition().duration(animationDuration * 0.75).attr("r", 0).remove();
  }
}

// Function that creates a circle with background image
function createImageCircle(radius, circleContainer, nodeContainers, node, mode, clickHandler, animationDuration) {
  circleContainer.append("circle").classed("main-image", true).classed("no-image", !node.image_url).style("fill", "url(#map-image)");

  var mergeNodeContainer = nodeContainers.merge(circleContainer);

  var viewNodes = mergeNodeContainer.filter(function () {
    return mode === VIEW_MODE;
  });
  viewNodes.select(".image-button").remove();
  viewNodes.selectAll("circle.main-image").classed("view", true);

  mergeNodeContainer.selectAll("circle.main-image, .map-icon-container, image.image-button").on("click", function (event, datum) {
    event.preventDefault();
    if (clickHandler) {
      clickHandler(datum);
    }
  });
  mergeNodeContainer.select(".main-image").classed("no-image", !node.image_url).transition().duration(animationDuration * 0.75).attr("r", radius);
}

var getLinkD = function getLinkD(source, sourceControlPoint, targetControlPoint, target) {
  if (source && sourceControlPoint && targetControlPoint && target) {
    return "M" + source.x + "," + source.y + " " + "C" + sourceControlPoint.x + "," + sourceControlPoint.y + " " + targetControlPoint.x + "," + targetControlPoint.y + " " + target.x + " " + target.y;
  }
};

var css = ".transformation-map {\n  color: #5a5a5a;\n  transition: transform 500ms ease;\n  /*\n        Apply text-shadow in all directions 5 times to increase strength\n        to use as a line-background\n    */\n  /* When considering large screens (height is greater than 900px), start using vmin units for scaling text size */\n}\n.transformation-map circle.invisible-holder-ring {\n  opacity: 0;\n}\n.transformation-map circle.holder-ring {\n  stroke-width: 2px;\n}\n.transformation-map .drop-target-container circle.holder-ring {\n  stroke-width: 2px;\n}\n.transformation-map .marker {\n  stroke-width: 1.5px;\n}\n.transformation-map .text-container {\n  border: 1px solid black;\n  cursor: pointer;\n}\n.transformation-map circle.holder-ring.insight-area,\n.transformation-map .marker.insight-area,\n.transformation-map circle.holder-ring.key-issue,\n.transformation-map .marker.key-issue {\n  stroke-width: 1px;\n}\n.transformation-map .marker.insight-area.view {\n  stroke-width: 0.25px;\n}\n.transformation-map circle.holder-ring {\n  fill: none;\n  stroke: #aaaaaa;\n}\n.transformation-map .view circle.holder-ring {\n  fill: #dddddd;\n}\n.transformation-map .insight-areas-circle circle {\n  stroke-dasharray: 3 3;\n}\n.transformation-map .drop-target-container circle {\n  stroke-dasharray: 13 5;\n}\n.transformation-map .drop-target-container.view circle {\n  stroke: #437def;\n}\n.transformation-map .key-issues,\n.transformation-map .key-issues > div,\n.transformation-map .map-icon-text,\n.transformation-map .map-icon-text > div {\n  transition: opacity 500ms ease;\n}\n.transformation-map .key-issues,\n.transformation-map .key-issues > div {\n  font-size: 12px;\n}\n.transformation-map .map-icon-text,\n.transformation-map .map-icon-text > div {\n  font-size: 14px;\n  font-weight: bold;\n  fill: #437def;\n}\n.transformation-map .map-icon-text > div {\n  letter-spacing: -0.4px;\n}\n.transformation-map .key-issues > div,\n.transformation-map .insight-areas > div,\n.transformation-map .map-icon-text > div {\n  -ms-hyphens: auto;\n  -webkit-hyphens: auto;\n  hyphens: auto;\n}\n.transformation-map .key-issues.view,\n.transformation-map .key-issues.view > div {\n  font-size: 13px;\n}\n.transformation-map .key-issues > div {\n  transition: text-shadow 500ms ease;\n  text-shadow: 1px 1px 3px white, -1px 1px 3px white, 1px -1px 3px white, -1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white, 1px -1px 3px white, -1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white, 1px -1px 3px white, -1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white, 1px -1px 3px white, -1px -1px 3px white, 1px 1px 3px white, -1px 1px 3px white, 1px -1px 3px white, -1px -1px 3px white;\n}\n.transformation-map .key-issues.view > div {\n  text-shadow: 1px 1px 3px #dddddd, -1px 1px 3px #dddddd, 1px -1px 3px #dddddd, -1px -1px 3px #dddddd, 1px 1px 3px #dddddd, -1px 1px 3px #dddddd, 1px -1px 3px #dddddd, -1px -1px 3px #dddddd, 1px 1px 3px #dddddd, -1px 1px 3px #dddddd, 1px -1px 3px #dddddd, -1px -1px 3px #dddddd, 1px 1px 3px #dddddd, -1px 1px 3px #dddddd, 1px -1px 3px #dddddd, -1px -1px 3px #dddddd, 1px 1px 3px #dddddd, -1px 1px 3px #dddddd, 1px -1px 3px #dddddd, -1px -1px 3px #dddddd;\n}\n.transformation-map .insight-areas,\n.transformation-map .insight-areas > div {\n  font-size: 6px;\n  font-weight: bold;\n  transition: opacity 500ms ease;\n}\n.transformation-map .key-issues div,\n.transformation-map .insight-areas div {\n  padding: 9px;\n  border-radius: 2px;\n}\n.transformation-map .key-issues.view div,\n.transformation-map .insight-areas.view div {\n  padding: 0px;\n}\n.transformation-map .insight-areas.view,\n.transformation-map .insight-areas.view > div {\n  font-size: 8px;\n}\n.transformation-map text.key-issues.view,\n.transformation-map text.insight-areas.view {\n  opacity: 0.75;\n}\n.transformation-map text tspan.line-background {\n  stroke: #dddddd;\n  stroke-width: 5px;\n  stroke-linecap: round;\n  fill: none;\n}\n.transformation-map .key-issues,\n.transformation-map .insight-areas,\n.transformation-map .map-icon-text {\n  overflow: visible;\n}\n.transformation-map foreignobject > div {\n  width: 100%;\n}\n.transformation-map .map-icon-text tspan.line-background {\n  opacity: 0.94;\n  stroke: white;\n  stroke-width: 3px;\n}\n@media (min-height: 900px) {\n  .transformation-map .key-issues,\n.transformation-map .key-issues > div {\n    font-size: 1.6vmin;\n  }\n  .transformation-map .key-issues.view,\n.transformation-map .key-issues.view > div {\n    font-size: 1.8vmin;\n  }\n  .transformation-map .map-icon-text,\n.transformation-map .map-icon-text > div {\n    font-size: 1.9vmin;\n  }\n  .transformation-map .insight-areas,\n.transformation-map .insight-areas > div {\n    font-size: 0.8vmin;\n  }\n  .transformation-map .insight-areas.view,\n.transformation-map .insight-areas.view > div {\n    font-size: 1vmin;\n  }\n  .transformation-map circle.holder-ring {\n    stroke-width: 0.15vmin;\n  }\n  .transformation-map .drop-target-container circle.holder-ring {\n    stroke-width: 0.2vmin;\n  }\n  .transformation-map .key-issues div,\n.transformation-map .insight-areas div {\n    padding: 0.7vmin;\n    border-radius: 0.2vmin;\n  }\n  .transformation-map .key-issues.view div,\n.transformation-map .insight-areas.view div {\n    padding: 0px;\n  }\n  .transformation-map .insight-areas-circle circle {\n    stroke-dasharray: 0.3vmin 0.3vmin;\n  }\n  .transformation-map .drop-target-container circle {\n    stroke-dasharray: 1.3vmin 0.5vmin;\n  }\n}\n.transformation-map .marker {\n  fill: white;\n  stroke: #aaaaaa;\n  transition: fill 300ms ease;\n}\n.transformation-map .marker.text-box {\n  stroke: #cccccc;\n}\n.transformation-map .marker.map-icon {\n  fill: white;\n  stroke: white;\n  opacity: 0.94;\n  stroke-width: 0;\n}\n.transformation-map .bounce {\n  transition: transform 0.375s ease, fill 300ms ease;\n  transform: scale(1);\n}\n.transformation-map .bounce:hover {\n  transform: scale(1.1);\n  transition: transform 0.375s cubic-bezier(0.095, 2, 0.555, 1.475), fill 300ms ease;\n}\n.transformation-map .bounce.bounce-insight-areas:hover {\n  transform: scale(1.25);\n}\n.transformation-map .marker.view.highlight,\n.transformation-map .marker.view:hover,\n.transformation-map .map-icon-container.highlight .map-icon,\n.transformation-map .map-icon-container:hover .map-icon {\n  stroke: #437def;\n  fill: #437def;\n}\n.transformation-map .map-icon-container.highlight .map-icon-text,\n.transformation-map .map-icon-container:hover .map-icon-text,\n.transformation-map .map-icon-container.highlight .map-icon-text > div,\n.transformation-map .map-icon-container:hover .map-icon-text > div {\n  fill: white;\n  color: white;\n}\n.transformation-map path.link {\n  fill: none;\n  stroke: #dddddd;\n  stroke-width: 0.125vmin;\n  transition: opacity 300ms ease;\n}\n@supports (-ms-ime-align: auto) {\n  .transformation-map path.link {\n    stroke-width: 1.5px;\n  }\n}\n.transformation-map path.link.view {\n  stroke: white;\n}\n.transformation-map path.link.highlight,\n.transformation-map path.link:hover {\n  stroke: #999999;\n}\n.transformation-map path.link.view.highlight,\n.transformation-map path.link.view:hover {\n  stroke: #437def;\n}\n.transformation-map .insight-areas.view.highlight,\n.transformation-map .insight-areas.view:hover,\n.transformation-map .key-issues.view.highlight,\n.transformation-map .key-issues.view:hover,\n.transformation-map path.link.highlight,\n.transformation-map path.link:hover {\n  opacity: 1;\n}\n\n.wave-chart .waveAxis {\n  fill: transparent;\n  stroke: #eeeeee;\n}\n.wave-chart .wavePath {\n  fill: white;\n  fill-opacity: 0.35;\n  stroke: white;\n}\n.wave-chart .waveAxisLabel {\n  font-size: 12px;\n  fill: #999999;\n}\n@media (min-height: 900px) {\n  .wave-chart .waveAxisLabel {\n    font-size: 1vh;\n  }\n}\n\n.transformation-map .insight-areas {\n  cursor: pointer;\n}\n\n.transformation-map .insight-area.marker {\n  cursor: pointer;\n}\n\n.transformation-map .key-issue.marker,\n.remove-cross {\n  cursor: pointer;\n}\n\n.transformation-map .key-issue.marker {\n  cursor: pointer;\n  stroke: #437def;\n}\n\n.transformation-map .marker.insight-area.highlightAsEvidence {\n  fill: #437def;\n}\n.transformation-map .marker.insight-area.highlightAsEvidence[data-entity-type=\"Key Issue\"] {\n  fill: #17b05c;\n}\n.transformation-map .marker.insight-area.highlightAsEvidence[data-entity-type=\"Sub topic\"] {\n  fill: #227fbb;\n}\n.transformation-map .marker.insight-area.highlightAsEvidence[data-entity-type=Influencer] {\n  fill: #be3a21;\n}\n.transformation-map .marker.insight-area.highlightAsEvidence[data-entity-type=\"Decision Maker\"] {\n  fill: #f59d00;\n}\n.transformation-map .marker.insight-area.highlightAsEvidence[data-entity-type=\"Thought Leader\"] {\n  fill: #f59d00;\n}\n.transformation-map .marker.insight-area.highlightAsEvidence[data-entity-type=Author] {\n  fill: #52247f;\n}\n\n.transformation-map path.link.highlightAsEvidence {\n  stroke: #437def;\n}\n.transformation-map path.link.highlightAsEvidence[data-entity-type=\"Key Issue\"] {\n  stroke: #17b05c;\n}\n.transformation-map path.link.highlightAsEvidence[data-entity-type=\"Sub topic\"] {\n  stroke: #227fbb;\n}\n.transformation-map path.link.highlightAsEvidence[data-entity-type=Influencer] {\n  stroke: #be3a21;\n}\n.transformation-map path.link.highlightAsEvidence[data-entity-type=\"Decision Maker\"] {\n  stroke: #f59d00;\n}\n.transformation-map path.link.highlightAsEvidence[data-entity-type=\"Thought Leader\"] {\n  stroke: #f59d00;\n}\n.transformation-map path.link.highlightAsEvidence[data-entity-type=Author] {\n  stroke: #52247f;\n}\n\n.transformation-map .marker.key-issue.highlightAsEvidence {\n  stroke: #437def;\n  fill: #437def;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Key Issue\"] {\n  stroke: #17b05c;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Sub topic\"] {\n  stroke: #227fbb;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=Influencer] {\n  stroke: #be3a21;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Decision Maker\"] {\n  stroke: #f59d00;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Thought Leader\"] {\n  stroke: #f59d00;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=Author] {\n  stroke: #52247f;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Key Issue\"] {\n  fill: #17b05c;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Sub topic\"] {\n  fill: #227fbb;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=Influencer] {\n  fill: #be3a21;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Decision Maker\"] {\n  fill: #f59d00;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=\"Thought Leader\"] {\n  fill: #f59d00;\n}\n.transformation-map .marker.key-issue.highlightAsEvidence[data-entity-type=Author] {\n  fill: #52247f;\n}\n\n.transformation-map .marker {\n  stroke: #437def;\n}\n.transformation-map .marker[data-entity-type=\"Key Issue\"] {\n  stroke: #17b05c;\n}\n.transformation-map .marker[data-entity-type=\"Sub topic\"] {\n  stroke: #227fbb;\n}\n.transformation-map .marker[data-entity-type=Influencer] {\n  stroke: #be3a21;\n}\n.transformation-map .marker[data-entity-type=\"Decision Maker\"] {\n  stroke: #f59d00;\n}\n.transformation-map .marker[data-entity-type=\"Thought Leader\"] {\n  stroke: #f59d00;\n}\n.transformation-map .marker[data-entity-type=Author] {\n  stroke: #52247f;\n}";

function getWefLogo(color, size) {
  return "\n    <defs>\n      <style>\n        .transformation-map-wef-logo {\n          fill: " + color + ";\n        }\n      </style>\n    </defs>\n    <g transform=\"translate(8391 -9550)\">\n      <path class=\"transformation-map-wef-logo\" d=\"M404.061,256.931a3.27,3.27,0,0,1-.112-.726,1.963,1.963,0,0,1,2.067-2.067,3.3,3.3,0,0,1,.782.112c.223-.168.5-.391.726-.559a2.768,2.768,0,0,0-1.508-.391,2.919,2.919,0,0,0-2.57,4.469.558.558,0,0,1,.223-.279c.168-.223.279-.391.391-.559\" transform=\"translate(173.754 808.04)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M408.734,254.6l-.67.5a2.049,2.049,0,0,1,.726,1.676,2.027,2.027,0,0,1-2.067,2.067,1.844,1.844,0,0,1-1.62-.782c-.056.112-.168.168-.223.279a1.966,1.966,0,0,0-.279.447,2.989,2.989,0,0,0,2.179.894,2.911,2.911,0,0,0,3.017-2.905,3.138,3.138,0,0,0-1.061-2.179\" transform=\"translate(173.048 807.467)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M401.585,270.1a2.08,2.08,0,0,1-1.285,1.955v.894a2.872,2.872,0,0,0,2.235-2.793,2.984,2.984,0,0,0-1.4-2.458c-.112.279-.168.559-.279.782a1.94,1.94,0,0,1,.726,1.62\" transform=\"translate(174.946 801.685)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M396.729,271.772h-.168a2.027,2.027,0,0,1-2.067-2.067,1.963,1.963,0,0,1,2.067-2.067,2.042,2.042,0,0,1,.838.168,4.377,4.377,0,0,1,.279-.782,3.607,3.607,0,0,0-1.061-.223,2.982,2.982,0,0,0-3.017,2.9,2.911,2.911,0,0,0,3.017,2.905h.168v-.5a.709.709,0,0,1-.056-.335\" transform=\"translate(177.903 802.082)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M401.773,281.238a1.993,1.993,0,0,1,2.067,2.067,2.046,2.046,0,0,1-1.508,2.011c.168.224.279.5.447.726a2.884,2.884,0,0,0,2.011-2.737,3.047,3.047,0,0,0-4.19-2.682l.168.838a2.19,2.19,0,0,1,1.006-.224\" transform=\"translate(174.814 796.08)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M398.25,283.7a2.384,2.384,0,0,1,.559-1.508c-.056-.279-.168-.615-.223-.894a2.842,2.842,0,0,0-1.285,2.4,2.911,2.911,0,0,0,3.017,2.905h.391c-.168-.279-.335-.5-.5-.782a2.087,2.087,0,0,1-1.955-2.123\" transform=\"translate(176.27 795.683)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M428.7,296.968a15.758,15.758,0,0,1-20.056-.168l-.447.5a16.593,16.593,0,0,0,10.559,3.855,16.293,16.293,0,0,0,10.391-3.687l-.447-.5\" transform=\"translate(171.46 788.842)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M426.052,280.6v3.352c0,.782-.279,1.508-1.229,1.508-1.006,0-1.229-.726-1.229-1.508V280.6H422.7v3.52a2.179,2.179,0,1,0,4.358,0V280.6h-1.005\" transform=\"translate(165.06 795.992)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M429.294,258.2h2.514v.782H428.4V253.4h.894v4.8\" transform=\"translate(162.544 807.996)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M374.8,267h3.24v.838h-2.346v1.285h2.29v.838h-2.29v1.788h2.346v.838H374.8V267\" transform=\"translate(186.2 801.994)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M407.6,266.5l3.855,3.911v-3.631h.894v5.81l-3.8-3.911v3.687h-.95V266.5\" transform=\"translate(171.724 802.215)\"/>\n      <rect class=\"transformation-map-wef-logo\" width=\"0.894\" height=\"5.587\" transform=\"translate(602.229 1068.994)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M390.15,281.382v1.341h1.955v.838H390.15v2.626h-.95V280.6h2.961v.782H390.15\" transform=\"translate(179.845 795.992)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M393.351,256.831h0l.894-3.52h.894l-1.564,5.81-1.955-4.19-1.955,4.19-1.564-5.81h.894l.894,3.52h0l1.732-3.631,1.732,3.631\" transform=\"translate(180.33 808.085)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M434.188,268.891h0l-.894,3.52H432.4l1.564-5.81,1.955,4.19,1.955-4.19,1.564,5.81h-.894l-.894-3.52h0l-1.732,3.631-1.732-3.631\" transform=\"translate(160.779 802.171)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M435.088,282.491h0l-.894,3.52H433.3l1.564-5.81,1.955,4.19,1.955-4.19,1.564,5.81h-.894l-.894-3.52h0l-1.732,3.631-1.732-3.631\" transform=\"translate(160.382 796.168)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M413.064,280.6a3.009,3.009,0,0,1,1.564.279,1.456,1.456,0,0,1,.726,1.341,1.568,1.568,0,0,1-1.4,1.564l1.788,2.4h-1.061l-1.676-2.346h-.615v2.346H411.5V280.6h1.564m-.615,2.514h.447c.726,0,1.564,0,1.564-.894s-.95-.838-1.62-.838h-.391Z\" transform=\"translate(170.003 795.992)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M418.753,253.4a3.008,3.008,0,0,1,1.564.279,1.455,1.455,0,0,1,.726,1.341,1.568,1.568,0,0,1-1.4,1.564l1.788,2.4h-.95l-1.676-2.346h-.615v2.346H417.3V253.4h1.453m-.615,2.514h.447c.726,0,1.564,0,1.564-.894s-.95-.838-1.62-.838h-.391Z\" transform=\"translate(167.443 807.996)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M438.306,258.2h.559c1.229,0,2.4-.447,2.4-2.011,0-1.62-1.173-2.011-2.4-2.011h-.559V258.2m-.95-4.8h1.509c1.732,0,3.184.838,3.184,2.737,0,1.955-1.4,2.793-3.24,2.793H437.3V253.4Z\" transform=\"translate(158.617 807.996)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M457.878,271.549a1.914,1.914,0,0,1-1.006.223,2.027,2.027,0,0,1-2.067-2.067,1.963,1.963,0,0,1,2.067-2.067,2.669,2.669,0,0,1,1.006.224l.447-.67a3.356,3.356,0,0,0-1.508-.391,2.982,2.982,0,0,0-3.017,2.9,2.911,2.911,0,0,0,3.017,2.905,2.767,2.767,0,0,0,1.508-.391l-.447-.67\" transform=\"translate(151.334 802.082)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M387.678,271.549a1.914,1.914,0,0,1-1.006.223,2.027,2.027,0,0,1-2.067-2.067,1.963,1.963,0,0,1,2.067-2.067,2.669,2.669,0,0,1,1.006.224l.447-.67a3.356,3.356,0,0,0-1.508-.391,2.982,2.982,0,0,0-3.017,2.9,2.911,2.911,0,0,0,3.017,2.905,2.767,2.767,0,0,0,1.508-.391l-.447-.67\" transform=\"translate(182.316 802.082)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M424.563,276.6a15.6,15.6,0,0,1-20.615-.894,14.71,14.71,0,0,1-1.732-19.106,15.563,15.563,0,0,1,7.095-5.419l-.112-.279a15.719,15.719,0,0,0-7.207,5.531,14.985,14.985,0,0,0,1.788,19.5,15.6,15.6,0,0,0,11.006,4.469,15.819,15.819,0,0,0,10-3.52l-.224-.279\" transform=\"translate(175.432 809.1)\"/>\n      <path class=\"transformation-map-wef-logo\" d=\"M424.584,269.7a1.963,1.963,0,0,0-2.067-2.067,1.992,1.992,0,0,0-2.067,2.067,2.067,2.067,0,1,0,4.134,0m.95,0a3.019,3.019,0,0,1-6.034,0,2.946,2.946,0,0,1,3.017-2.9A2.982,2.982,0,0,1,425.534,269.7Z\" transform=\"translate(166.472 802.082)\"/>\n    </g>\n";
}

/*
    TOP_LEFT / BOTTOM_LEFT refers to the position of the WEF Logo, the
    copyright text always appears in the bottom left.

    i.e.

    TOP_LEFT means the WEF Logo is drawn in the top left and the copyright text
    is in the bottom left.

    BOTTOM_LEFT means the WEF Logo is draw in the bottom left and the copyright
    text is next to it, also in the bottom left.
*/

function drawCopyright(rootNode, mapHeight, mapWidth, location, logoSize, logoColour, customCopyrightText, nodesHead) {
  // Calculate new positions of logo and copyright
  var logoX = void 0,
      logoY = void 0,
      textX = void 0;
  if (location === TOP_LEFT) {
    logoX = logoY = textX = 10;
  } else if (location === TOP_RIGHT) {
    logoX = mapWidth - logoSize;
    logoY = textX = 10;
  } else if (!location || location === NO_LOGO) {
    logoY = mapHeight - logoSize;
    logoX = textX = 10;
  } else {
    logoX = 10;
    logoY = mapHeight - logoSize;
    textX = logoX + logoSize + 10;
  }

  // Create logo if there is a valid location provided
  var logoData = location && location !== NO_LOGO ? [{ x: logoX, y: logoY, size: logoSize, colour: logoColour }] : [];
  var logoSelection = rootNode.selectAll(".wef-logo").data(logoData);
  var logoEnter = logoSelection.enter().append("svg").attr("xmlns", "http://www.w3.org/2000/svg").attr("viewBox", "8952 -8490 48.659 29.999").classed("wef-logo", true);

  // Update positions of logo and copyright
  logoSelection.merge(logoEnter).attr("x", function (_ref) {
    var x = _ref.x;
    return x;
  }).attr("y", function (_ref2) {
    var y = _ref2.y;
    return y;
  }).attr("width", function (_ref3) {
    var size = _ref3.size;
    return size;
  }).attr("height", function (_ref4) {
    var size = _ref4.size;
    return size;
  }).html(function (_ref5) {
    var colour = _ref5.colour;
    return getWefLogo(colour);
  });

  drawCustomCopyrightText(customCopyrightText, nodesHead, rootNode, mapHeight, mapWidth);
  drawDefaultCopyrightText(customCopyrightText, nodesHead, rootNode, textX, mapHeight);
}

function drawCustomCopyrightText(customCopyrightText, nodesHead, rootNode, mapHeight, mapWidth) {
  // Select the data such that it only draws when there is custom copyright text
  var copyrightTextData = customCopyrightText !== null && customCopyrightText !== undefined ? [{ text: customCopyrightText }] : [];
  var copyrightSelection = rootNode.selectAll("foreignObject.copyright-mention").data(copyrightTextData, function (_ref6) {
    var text = _ref6.text;
    return text;
  });

  var copyrightEnter = copyrightSelection.enter().insert("foreignObject", ":first-child").classed("copyright-mention", true).attr("height", "100%").attr("width", "100%");

  copyrightEnter.append("xhtml:div").style("position", "absolute").style("bottom", "0");

  copyrightSelection.merge(copyrightEnter).attr("lang", nodesHead && nodesHead.language).select("div").html(function (_ref7) {
    var text = _ref7.text;
    return text;
  }).attr("width", function () {
    return mapWidth > mapHeight - this.offsetHeight - 10 ? "30%" : "100%";
  });

  copyrightSelection.exit().remove();
}

function drawDefaultCopyrightText(customCopyrightText, nodesHead, rootNode, textX, mapHeight) {
  // Select the data such that it only draws when there is no custom copyright text
  var copyrightTextData = customCopyrightText !== undefined ? [] : [nodesHead];
  var copyrightSelection = rootNode.selectAll("text.copyright-mention").data(copyrightTextData, function (_ref8) {
    var key = _ref8.key;
    return key;
  });

  var copyrightEnter = copyrightSelection.enter().append("text").classed("copyright-mention", true);

  // Add the creator <tspan> and set its text (on both enter + update selections)
  var creatorEnter = copyrightEnter.append("tspan").attr("x", 0).attr("dy", "1.4em").classed("creator", true);
  copyrightSelection.select(".creator").merge(creatorEnter).text(function (_ref9) {
    var is_custom = _ref9.is_custom,
        provider = _ref9.provider;

    if (!is_custom || !provider || !provider.name) {
      return "";
    }
    return "Created by " + provider.name;
  });

  // Add the copyright <tspan> and set its text on enter selection
  copyrightEnter.append("tspan").attr("x", 0).attr("dy", "1.4em").classed("copyright-text", true).text("© World Economic Forum");

  // Set the position of the copyright text
  copyrightSelection.merge(copyrightEnter).attr("transform", function (_ref10) {
    var is_custom = _ref10.is_custom,
        provider = _ref10.provider;

    var noOfLines = is_custom && provider && provider.name ? 2 : 1;
    return "translate(" + textX + ", " + (mapHeight - 25 * noOfLines) + ")";
  });

  copyrightSelection.exit().remove();
}

function setOrGetParameter(that, parameterName, parameterValue) {
  if (parameterValue !== undefined) {
    that[parameterName] = parameterValue;
    return that;
  } else {
    return that[parameterName];
  }
}

var leftIntersection = function leftIntersection(list1, list2) {
  return list1.filter(function (list1Item) {
    return list2.indexOf(list1Item) === -1;
  });
};

var TransformationMap = function () {
  function TransformationMap() {
    classCallCheck(this, TransformationMap);
    this._previousData = {};
    this._data = {};
    this._flattenedTreeData = [];
    this._volumes = null;
    this._volumeRange = null;
    this._dimensionVolumes = null;
    this._dimensionVolumeRange = null;
    this._advancedModeLoading = false;
    this._isUpdatingPromise = null;
    this._renderCount = 0;
    this._width = 0;
    this._height = 0;
    this._radius = 0;
    this._svg = null;
    this._graph = null;
    this._image = null;
    this._isDragging = false;
    this._mode = VIEW_MODE;
    this._previousMode = VIEW_MODE;
    this._copyrightLocation = TOP_LEFT;
    this._copyrightSize = 50;
    this._copyrightText = undefined;
    this._copyrightColour = DEFAULT_COPYRIGHT_COLOUR;
    this._entityColoursEnabled = true;
    this._activeColour = DEFAULT_ACTIVE_COLOUR;
    this._inactiveColour = DEFAULT_INACTIVE_COLOUR;
    this._successColour = DEFAULT_SUCCESS_COLOUR;
    this._animationDuration = DEFAULT_TRANSITION_DURATION;

    this._onItemDrop = function (data) {
      return null;
    };

    this._onSelectKeyIssue = function (node) {
      return null;
    };

    /*this._onMoveOverKeyIssue = function (node) {
      return null;
    };*/

    this._onSelectInsightArea = function (node) {
      return null;
    };

    this._onSelectRemoveKeyIssue = function (node) {
      return null;
    };

    this._onSelectImage = function (node) {
      return null;
    };
  }

  createClass(TransformationMap, [{
    key: "data",
    value: function data(_data) {
      this._previousData = this._data;
      if (_data === undefined) {
        return this._data;
      }
      this._data = _data;
      if (this._flattenedTreeData.length > 0 && this._graph) {
        // If there was previously data and the map has been initialised,
        // then unhighlight() immediately before the data is changed
        // (won't have access to the currently selected node otherwise)
        this.unhighlight();
      }
      this._flattenedTreeData = flattenTree(treeify(_data));
      naiveLanguageDetection(this._flattenedTreeData);
      this._flattenedTreeData.forEach(function (node, index) {
        return node.selectorClasses = index === 0 ? [".map-icon-container"] : getSelectorClasses(node);
      });
      addVolumesToData(this._flattenedTreeData, this._volumes, this._dimensionVolumes);
      return this;
    }
  }, {
    key: "volumes",
    value: function volumes(_volumes) {
      if (_volumes === undefined) {
        return this._volumes;
      }
      this._volumes = _volumes;
      addVolumesToData(this._flattenedTreeData, this._volumes, this._dimensionVolumes);
      return this;
    }
  }, {
    key: "volumeRange",
    value: function volumeRange(_volumeRange) {
      return setOrGetParameter(this, "_volumeRange", _volumeRange);
    }
  }, {
    key: "dimensionVolumes",
    value: function dimensionVolumes(_dimensionVolumes) {
      if (_dimensionVolumes === undefined) {
        return this._dimensionVolumes;
      }
      this._dimensionVolumes = _dimensionVolumes;
      addVolumesToData(this._flattenedTreeData, this._volumes, this._dimensionVolumes);
      return this;
    }
  }, {
    key: "dimensionVolumeRange",
    value: function dimensionVolumeRange(_dimensionVolumeRange) {
      return setOrGetParameter(this, "_dimensionVolumeRange", _dimensionVolumeRange);
    }
  }, {
    key: "advancedModeLoading",
    value: function advancedModeLoading(_advancedModeLoading) {
      return setOrGetParameter(this, "_advancedModeLoading", _advancedModeLoading);
    }
  }, {
    key: "width",
    value: function width(_width) {
      return setOrGetParameter(this, "_width", _width);
    }
  }, {
    key: "height",
    value: function height(_height) {
      return setOrGetParameter(this, "_height", _height);
    }
  }, {
    key: "radius",
    value: function radius(_radius) {
      return setOrGetParameter(this, "_radius", _radius);
    }
  }, {
    key: "svg",
    value: function svg(_svg) {
      if (_svg === undefined) {
        return this._svg && this._svg.node();
      }
      this._svg = select(_svg);
      return this;
    }
  }, {
    key: "isDragging",
    value: function isDragging(_isDragging) {
      return setOrGetParameter(this, "_isDragging", _isDragging);
    }
  }, {
    key: "mode",
    value: function mode(_mode) {
      if (_mode) {
        this._previousMode = this._mode;
      }
      return setOrGetParameter(this, "_mode", _mode);
    }
  }, {
    key: "copyrightLocation",
    value: function copyrightLocation(_copyrightLocation) {
      return setOrGetParameter(this, "_copyrightLocation", _copyrightLocation);
    }
  }, {
    key: "copyrightSize",
    value: function copyrightSize(_copyrightSize) {
      return setOrGetParameter(this, "_copyrightSize", _copyrightSize);
    }
  }, {
    key: "copyrightText",
    value: function copyrightText(_copyrightText) {
      return setOrGetParameter(this, "_copyrightText", _copyrightText);
    }
  }, {
    key: "copyrightColour",
    value: function copyrightColour(_copyrightColour) {
      return setOrGetParameter(this, "_copyrightColour", _copyrightColour);
    }
  }, {
    key: "entityColoursEnabled",
    value: function entityColoursEnabled(_entityColoursEnabled) {
      return setOrGetParameter(this, "_entityColoursEnabled", _entityColoursEnabled);
    }
  }, {
    key: "activeColour",
    value: function activeColour(_activeColour) {
      return setOrGetParameter(this, "_activeColour", _activeColour);
    }
  }, {
    key: "inactiveColour",
    value: function inactiveColour(_inactiveColour) {
      return setOrGetParameter(this, "_inactiveColour", _inactiveColour);
    }
  }, {
    key: "successColour",
    value: function successColour(_successColour) {
      return setOrGetParameter(this, "_successColour", _successColour);
    }
  }, {
    key: "animationDuration",
    value: function animationDuration(_animationDuration) {
      return setOrGetParameter(this, "_animationDuration", _animationDuration);
    }
  }, {
    key: "animationEnabled",
    value: function animationEnabled(_animationEnabled) {
      var animationDuration = _animationEnabled ? DEFAULT_TRANSITION_DURATION : 0;

      return setOrGetParameter(this, "_animationDuration", animationDuration);
    }
  }, {
    key: "highlight",
    value: function highlight(idOrNode, shouldNotImmediatelyUpdate) {
      if (idOrNode) {
        var id = idOrNode;
        if (typeof idOrNode !== "string" && !(idOrNode instanceof String)) {
          // if its not a string (i.e. it must be a node, so use node.id)
          id = idOrNode.id;
        }
        var currentlySelectedNode = null;
        var newSelectedNode = null;
        // Find the currentlySelectedNode and newSelectedNode and update their "selected" status,
        // applied only to the main map or key issues (not related insight areas)
        this._flattenedTreeData.filter(function (_ref) {
          var depth = _ref.depth;
          return depth === 0 || depth === 1;
        }).forEach(function (node) {
          var isNewSelection = node.id === id;
          node.previouslySelected = false;
          if (node.selected) {
            currentlySelectedNode = node;
            node.previouslySelected = !isNewSelection;
          } else if (isNewSelection) {
            newSelectedNode = node;
          }
          node.selected = isNewSelection;
        });
        // Apply highlight immediately if:
        // 1. It has not been explicitly specified to not do so
        // 2a. There isn't a node that is already selected (i.e. highlighting one when none are highlighted)
        // 2b. If there is a currentlySelectedNode, then we are not trying to apply highlight to the same one that is already highlighted
        if (!shouldNotImmediatelyUpdate && (!currentlySelectedNode || id !== currentlySelectedNode.id)) {
          if (currentlySelectedNode) {
            var disableSelectorClasses = currentlySelectedNode.selectorClasses;
            if (newSelectedNode) {
              // Find the items that are not part of the new selection (currently highlighted) that should be disabled
              disableSelectorClasses = leftIntersection(disableSelectorClasses, newSelectedNode.selectorClasses);
            }
            if (disableSelectorClasses) {
              selectAll(disableSelectorClasses.join(", ")).classed("highlight", false);
            }
          }
          if (newSelectedNode) {
            var enableSelectorClasses = newSelectedNode.selectorClasses;
            if (currentlySelectedNode) {
              // Find the items that are not part of the old selection (not already highlighted) that should be enabled
              enableSelectorClasses = leftIntersection(enableSelectorClasses, currentlySelectedNode.selectorClasses);
            }
            if (enableSelectorClasses) {
              selectAll(enableSelectorClasses.join(", ")).classed("highlight", true);
            }
          }
        }
        return this;
      } else {
        var selectedNodes = this._flattenedTreeData.filter(function (node) {
          return node.selected;
        });
        return selectedNodes.length > 0 ? selectedNodes[0] : null;
      }
    }
  }, {
    key: "highlightMap",
    value: function highlightMap(shouldNotImmediatelyUpdate) {
      return this.highlight(this._data.id, shouldNotImmediatelyUpdate);
    }
  }, {
    key: "highlightEvidence",
    value: function highlightEvidence$$1(insightAreaID) {
      return highlightEvidence(insightAreaID, this._flattenedTreeData);
    }
  }, {
    key: "unhighlight",
    value: function unhighlight(shouldNotImmediatelyUpdate) {
      var previouslySelected = null;
      this._flattenedTreeData.forEach(function (node) {
        node.previouslySelected = false;
        if (node.selected) {
          previouslySelected = node;
        }
        node.selected = false;
      });
      if (previouslySelected && previouslySelected.selectorClasses && !shouldNotImmediatelyUpdate) {
        selectAll(previouslySelected.selectorClasses.join(", ")).classed("highlight", false);
      }
    }
  }, {
    key: "onItemDrop",
    value: function onItemDrop(_onItemDrop) {
      return setOrGetParameter(this, "_onItemDrop", _onItemDrop);
    }
  }, {
    key: "onSelectKeyIssue",
    value: function onSelectKeyIssue(_onSelectKeyIssue) {
      return setOrGetParameter(this, "_onSelectKeyIssue", _onSelectKeyIssue);
    }
  }/*, {
    key: "onMoveOverKeyIssue",
    value: function onSelectKeyIssue(_onMoveOverKeyIssue) {
      return setOrGetParameter(this, "_onMoveOverKeyIssue", _onMoveOverKeyIssue);
    }
  }*/, {
    key: "onSelectInsightArea",
    value: function onSelectInsightArea(_onSelectInsightArea) {
      return setOrGetParameter(this, "_onSelectInsightArea", _onSelectInsightArea);
    }
  }, {
    key: "onSelectRemoveKeyIssue",
    value: function onSelectRemoveKeyIssue(_onSelectRemoveKeyIssue) {
      return setOrGetParameter(this, "_onSelectRemoveKeyIssue", _onSelectRemoveKeyIssue);
    }
  }, {
    key: "onSelectImage",
    value: function onSelectImage(_onSelectImage) {
      return setOrGetParameter(this, "_onSelectImage", _onSelectImage);
    }
  }, {
    key: "drawCopyright",
    value: function drawCopyright$$1(nodesHead, height, width) {
      drawCopyright(this._svg, height, width, this._copyrightLocation, this._copyrightSize, this._copyrightColour, this._copyrightText, nodesHead);
    }
  }, {
    key: "_getEntityType",
    value: function _getEntityType(entityType) {
      return this._entityColoursEnabled ? entityType : "Topic";
    }
  }, {
    key: "initialise",
    value: function initialise(svg, quickInitialisation) {
      this.svg(svg);
      // Embed styles
      var defs = this._svg.append("defs");
      defs.append("style").attr("id", "styles").text(css);

      var width = this._width || this._svg.node().clientWidth;
      var height = this._height || this._svg.node().clientHeight;

      this._image = defs.append("pattern").attr("id", "map-image").attr("x", 0).attr("y", 0).attr("width", 1).attr("height", 1).append("image").attr("x", 0).attr("y", 0).attr("preserveAspectRatio", "xMidYMid slice");

      var filter = defs.append("filter").attr("id", "glow");
      filter.append("feGaussianBlur").attr("stdDeviation", 2.5).attr("result", "coloredBlur");
      var feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
      this._graph = this._svg.append("g").classed("transformation-map", true).attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")");
      this._graph.append("g").classed("links-container", true);
      this._graph.append("g").classed("node-container", true);

      if (this._data) {
        var isSomeNodeHighlighted = this._flattenedTreeData.some(function (_ref2) {
          var selected = _ref2.selected;
          return selected;
        });
        if (this._flattenedTreeData.length) {
          var _flattenedTreeData = slicedToArray(this._flattenedTreeData, 1),
              nodesHead = _flattenedTreeData[0];

          this.drawCopyright(nodesHead, height, width);
        }
        if (isSomeNodeHighlighted && this._data.id) {
          this.highlightMap(true);
        }
      }
      if (!quickInitialisation) {
        return this.update();
      }
      return this;
    }
  }, {
    key: "update",
    value: function update(data, width, height, radius) {
      var _this = this;

      this._renderCount += 1;
      if (this._isUpdatingPromise) {
        var currentRenderCount = this._renderCount;
        this._isUpdatingPromise = this._isUpdatingPromise.then(function () {
          // We use the closure around currentRenderCount to check if more
          // update calls have come after this one.
          // If so, let's opt out of this render and only pursue the last one.
          if (currentRenderCount !== _this._renderCount) {
            return;
          }
          _this._isUpdatingPromise = null;
          return _this.update(data, width, height, radius);
        });
        return this._isUpdatingPromise;
      }

      if (data) {
        this.data(data);
      }
      if (width) {
        this.width(width);
      }
      if (height) {
        this.height(height);
      }
      if (radius) {
        this.radius(radius);
      }
      width = this._width;
      height = this._height;
      if (!this._width || !this._height) {
        var boundingBox = this._svg.node().getBoundingClientRect();
        width = this._width || boundingBox.width;
        height = this._height || boundingBox.height;
      }
      radius = this._radius || Math.min(width, height) / 2.75;

      if (this._previousData.id !== this._data.id) {
        this._previousData = this._data;
      }

      this._graph.attr("transform", "translate(" + width / 2 + ", " + height / 2 + ")");

      // Positions the nodes according to the each other (rotation degree) and radius (depth distance from centre)
      var dimensionRadiusDivisionFactor = interpolateUsingWidth(2.05, 2.25, width);
      var childNodeSizeDivisionFactor = interpolateUsingWidth(this._mode === EDIT_MODE ? 150 : 200, 300, width);
      var childNodeSize = Math.max(radius / childNodeSizeDivisionFactor, 1);
      var nodes = this._flattenedTreeData;
      // TODO: Make sure positionNodes also updates on changes to radius!
      positionNodes(this._flattenedTreeData, radius, childNodeSize, dimensionRadiusDivisionFactor, 40);

      var _nodes = toArray(nodes),
          nodesHead = _nodes[0],
          nodesTail = _nodes.slice(1);

      // Update copyright positions


      this.drawCopyright(nodesHead, height, width);

      // Join the data to the d3 graph, using the node's id to track enter, update and exit events
      var mapNodeContainer = this._graph.selectAll(".map-node").data([nodesHead], function (_ref3) {
        var key = _ref3.key;
        return key;
      });
      var mapNodeContainerEnter = mapNodeContainer.enter().insert("g", ":first-child").classed("map-node", true);
      mapNodeContainer.exit().remove();
      //nghiand: vẽ vòng tròn trong và ngoài
      // Create the 3 rings (from outer to inner, to accomodate for SVG rendering by layers):
      // 1. Insight Areas Ring
      createCircleNormal(radius, mapNodeContainerEnter, mapNodeContainer, this._mode, "insight-areas-circle", this._animationDuration);
      // 2. Key Issues Ring
      createCircleNormal(radius / dimensionRadiusDivisionFactor, mapNodeContainerEnter, mapNodeContainer, this._mode, "drop-target-container", this._animationDuration);
      //end
      this._image.attr("xlink:href", nodesHead.image_url);
      setImageDimensions(this._image, radius * 1.33, this._animationDuration); // radius * 2.75 / 2.25

      var linksContainer = this._graph.select(".links-container");

      // Setting up links between all visible nodes (i.e. all after the first in the centre)
      var links = getLinks(nodesTail).filter(function (_ref4) {
        var target = _ref4.target;
        return target.depth > 0;
      });
      var linkElements = linksContainer.selectAll("path.link").data(links, function (_ref5) {
        var source = _ref5.source,
            target = _ref5.target;
        return source.id + target.id;
      });

      // Create <path> elements for all links entering the graph and insert them first (puts them under all objects)
      var linkElementsEnter = linkElements.enter().append("path").attr("class", function (_ref6) {
        var source = _ref6.source,
            target = _ref6.target;
        return "link link-" + source.id + " link-" + target.id;
      }).attr("data-entity-type", function (_ref7) {
        var source = _ref7.source;
        return _this._getEntityType(source.display_type);
      }).attr("d", function (_ref8) {
        var source = _ref8.source,
            target = _ref8.target;

        var sourceControlPoint = source.controlPoints[target.id];
        return getLinkD(source, sourceControlPoint, target.controlPoint, target);
      }).attr("stroke-dasharray", function () {
        var totalLength = this.getTotalLength();
        return totalLength + " " + totalLength;
      }).attr("stroke-dashoffset", function () {
        return this.getTotalLength();
      });

      linkElements.transition().duration(this._animationDuration).attr("d", function (_ref9) {
        var source = _ref9.source,
            target = _ref9.target;

        var sourceControlPoint = source.controlPoints[target.id];
        return getLinkD(source, sourceControlPoint, target.controlPoint, target);
      });

      linkElementsEnter.transition().duration(this._animationDuration).attr("stroke-dashoffset", 0);

      // Unset these after 1s to prevent link sizing issues through width/height changes
      linkElementsEnter.transition().duration(0).delay(this._animationDuration).attr("stroke-dasharray", "").attr("stroke-dashoffset", "");

      linkElementsEnter.merge(linkElements).classed("view", this._mode === VIEW_MODE);

      // Remove exiting links by transitioning them back to the parent node before actually removing
      linkElements.exit().attr("stroke-dashoffset", 0).attr("stroke-dasharray", function () {
        var totalLength = this.getTotalLength();
        return totalLength + " " + totalLength;
      }).transition().duration(this._animationDuration).attr("stroke-dashoffset", function () {
        return this.getTotalLength();
      }).remove();

      var imageNodeContainer = this._graph.selectAll(".image-node").data([nodesHead], function (_ref10) {
        var id = _ref10.id;
        return id;
      });

      var imageNodeContainerEnter = imageNodeContainer.enter().insert("g", ".node-container").classed("image-node", true);
      imageNodeContainer.exit().remove();

      // 3. Map Image Selector Ring
      createImageCircle(radius / 2.75, imageNodeContainerEnter, imageNodeContainer, nodesHead, this._mode, this._onSelectImage, this._animationDuration);

      var nodeContainerContainer = this._graph.select(".node-container");

      var nodeContainers = nodeContainerContainer.selectAll(".node").data(nodes, function (_ref11) {
        var id = _ref11.id;
        return id;
      });

      // Update each node's position on enter and update through a transition animation
      nodeContainers.style("opacity", 1).transition().duration(this._animationDuration).attr("transform", nodeRotateTransform);

      // Add a container to all "nodes" (Key Issue and Insight Area) joining the graph
      var nodeContainersEnter = nodeContainers.enter().append("g").classed("node", true);
      var nodeContainersMerge = nodeContainersEnter.merge(nodeContainers).classed("map-icon-container", function (_ref12) {
        var depth = _ref12.depth;
        return depth === 0;
      });

      if (this._mode === EDIT_MODE) {
        nodeContainersMerge.filter(function (_ref13) {
          var depth = _ref13.depth;
          return depth === 0;
        }).remove();
      }

      // Move the containers for the Insight Area and Key Issue points
      // entering the graph through an animation to their correct position
      nodeContainersEnter.attr("transform", nodeRotateTransform).style("opacity", 0);
      nodeContainersEnter.filter(function (_ref14) {
        var depth = _ref14.depth;
        return depth <= 1;
      }).transition().delay(function (_, index) {
        return 5 * index;
      }).duration(this._animationDuration / 2).style("opacity", 1);
      this._isUpdatingPromise = nodeContainersEnter.filter(function (_ref15) {
        var depth = _ref15.depth;
        return depth >= 2;
      }).transition().delay(function (_, index) {
        if (_this._animationDuration > 0) {
          return _this._animationDuration / 2 + 5 * index;
        } else {
          return 0;
        }
      }).duration(this._animationDuration / 2).style("opacity", 1).end();

      // Create the circles for the Insight Area and Key Issue points
      // and actions to highlight the linked points on hovering over them
      //nghiand
      /*nodeContainersEnter.filter(function (_ref16) {
        var depth = _ref16.depth;
        return depth === 1;
      }).append("g").append("circle").attr("r", "14px").attr("class", function (_ref17) {
        var id = _ref17.id;
        return "marker key-issue node-" + id;
      }).attr("data-entity-type", function (_ref18) {
        var display_type = _ref18.display_type;
        return _this._getEntityType(display_type);
      }).append("title");

      nodeContainersEnter.filter(function (_ref19) {
        var depth = _ref19.depth;
        return depth !== 1;
      }).append("g").append("path").attr("d", "M-5.5,-8.5 h6 q6,0 6,6 v10 q0,1 -1,1 h-11 q-1,0 -1,-1 v-15 q0,-1 1,-1 Z").attr("class", function (_ref20) {
        var id = _ref20.id;
        return "marker node-" + id;
      }).attr("data-entity-type", function (_ref21) {
        var display_type = _ref21.display_type;
        return _this._getEntityType(display_type);
      }).append("title");*/
      //nghiand: cập nhật add node level 1 radius = 14px
      nodeContainersEnter.filter(function (_ref19) {
        var depth = _ref19.depth;
        return depth === 1;
      }).append("g").append("circle").attr("r", function(_ref){
          return _ref.radius_item
      }).attr("class", function (_ref17) {
        var id = _ref17.id;
        return "marker key-issue node-" + id;
      }).attr("data-entity-type", function (_ref18) {
        var display_type = _ref18.display_type;
        return _this._getEntityType(display_type);
      }).append("title");
      //nghiand: cập nhật add node level 2 radius = 2px
      nodeContainersEnter.filter(function (_ref19) {
        var depth = _ref19.depth;
        return depth === 2;
      }).append("g").append("circle").attr("r", "2px").attr("class", function (_ref17) {
        var id = _ref17.id;
        return "marker key-issue node-" + id;
      }).attr("data-entity-type", function (_ref18) {
        var display_type = _ref18.display_type;
        return _this._getEntityType(display_type);
      }).append("title");

      var getTitleStringFromNode = function getTitleStringFromNode(_ref22) {
        //var name = _ref22.name,
        //    volume = _ref22.volume;
        //return volume !== null && volume !== undefined ? name + ": " + volume : name;
        return _ref22.fullname;
      };

      var innerNodeContainersMerge = nodeContainersMerge.select("g");
      innerNodeContainersMerge.classed("bounce", function (_ref23) {
        var depth = _ref23.depth;
        return depth === 1 || depth > 0 && _this._mode !== EDIT_MODE;
      }).classed("bounce-insight-areas", function (_ref24) {
        var depth = _ref24.depth;
        return depth >= 2 && _this._mode !== EDIT_MODE;
      }).select("* > title").text(getTitleStringFromNode);

      [1, 2, 3].forEach(function (position) {
        return innerNodeContainersMerge.classed("volume-pos-" + position, function (_ref25) {
          var volumePosition = _ref25.volumePosition;
          return volumePosition === position;
        });
      });

      nodeContainersMerge.select("path").classed("insight-area", function (_ref26) {
        var depth = _ref26.depth;
        return depth === 2;
      });

      // Key issue nodes can be drawn proportional to each other based on the dimension volumes
      // if they've been provided.
      // Default radius is 14px, but with volumes it ranges from 8-17px depending on the value.
      //nghiand: cập nhật bỏ default
      /*var getDimensionRadius = function getDimensionRadius() {
        return 14;
      };
      if (this._dimensionVolumeRange && this._dimensionVolumeRange.length) {
        var dimensionVolumeScale = linear$2().domain(this._dimensionVolumeRange).range([8, 17]);

        getDimensionRadius = function getDimensionRadius(volume) {
          return volume !== null && volume !== undefined ? dimensionVolumeScale(volume) : 14;
        };
      }
      nodeContainersMerge.filter(function (_ref27) {
        var depth = _ref27.depth;
        return depth === 1;
      }).select("circle").transition().duration(this._animationDuration).attr("r", function (_ref28) {
        var volume = _ref28.volume;
        return getDimensionRadius(volume) + "px";
      });*/

      if (this._mode !== EDIT_MODE) {
        var previouslySelectedNode = null;
        var selectedNode = null;
        nodes.forEach(function (node) {
          if (node.selected) {
            selectedNode = node;
          } else if (node.previouslySelected) {
            previouslySelectedNode = node;
          }
        });
        // Remove highlight from any key issues and related insight areas that have been de-selected
        if (previouslySelectedNode) {
          var disableSelectorClasses = previouslySelectedNode.selectorClasses;
          if (selectedNode) {
            disableSelectorClasses = leftIntersection(disableSelectorClasses, selectedNode.selectorClasses);
          }
          selectAll(disableSelectorClasses.join(", ")).classed("highlight", false);
        }
        // Add highlight to any key issues and related insight areas that have been selected
        if (selectedNode) {
          var enableSelectorClasses = selectedNode.selectorClasses;
          if (previouslySelectedNode) {
            enableSelectorClasses = leftIntersection(enableSelectorClasses, previouslySelectedNode.selectorClasses);
          }
          selectAll(enableSelectorClasses.join(", ")).classed("highlight", true);
        }
      } else {
        nodes.filter(function (_ref29) {
          var depth = _ref29.depth;
          return depth === 1;
        }).forEach(function (_ref30) {
          var selectorClasses = _ref30.selectorClasses;
          return selectAll(selectorClasses.join(", ")).classed("highlight", false);
        });
      }

      // Size + Resize the nodes if the size has changed
      nodeContainersMerge.selectAll("circle.marker").attr("transform", function (_ref31) {
        var nodeSize = _ref31.nodeSize;
        return "scale(" + nodeSize + ")";
      });

      nodeContainers.select("path.marker").transition().duration(this._animationDuration).attr("transform", function (_ref32) {
        var angle = _ref32.angle,
            nodeSize = _ref32.nodeSize;
        return "rotate(" + (-angle + 90) + ") scale(" + nodeSize + ")";
      });

      nodeContainersMerge.select("path.marker").classed("map-icon", function (_ref33) {
        var depth = _ref33.depth;
        return depth === 0;
      }).on("click", function (event, datum) {
        return _this._onSelectImage && _this._onSelectImage(datum);
      });

      nodeContainersEnter.select("path.marker").attr("transform", function (_ref34) {
        var angle = _ref34.angle,
            nodeSize = _ref34.nodeSize;
        return "rotate(" + (-angle + 90) + ") scale(" + nodeSize + ")";
      });

      // If in view mode, give nodes, text and links the "view" CSS class to create the presentation mode visual effect
      nodeContainersMerge.selectAll(".marker").classed("view", this._mode === VIEW_MODE);

      // Add key issue remove cross
      var mode = this._mode;
      nodeContainersMerge.select(".bounce").filter(function (_ref35) {
        var depth = _ref35.depth;

        return mode === EDIT_MODE && depth === 1 && select(this).select(".remove-cross").empty();
      }).append("path").attr("d", "M17.2,12.29l-2.261,2.264L12.677,12.29l-.387.387,2.264,2.261L12.29,17.2l.387.387,2.261-2.264L17.2,17.586l.387-.387-2.264-2.261,2.264-2.261Z").attr("fill", "white").classed("remove-cross", true);

      // Position the remove-button in the centre of the circle
      nodeContainersMerge.select(".remove-cross").attr("transform", function (_ref36) {
        var nodeSize = _ref36.nodeSize,
            angle = _ref36.angle;
        return "rotate(" + -1 * (angle + 90) + ")\n              translate(" + -nodeSize * 30 + ", " + -nodeSize * 30 + ")\n              scale(" + nodeSize * 2 + ")";
      });

      // If viewing, remove the key issue remove cross
      nodeContainersMerge.filter(function () {
        return mode === VIEW_MODE && _this._previousMode !== _this._mode;
      }).selectAll(".remove-cross").remove();

      // Add the text elements to the Insight Area and Key Issue points
      addTextbox(nodeContainersEnter, nodeContainersMerge, nodeContainers, nodes, width, height, this._mode, this._previousMode, radius, getTitleStringFromNode);

      // Add a click listener to:
      // 1. Key issues + removal cross: remove key issue callback
      nodeContainersMerge.selectAll(".node .key-issue, .node .node-text.key-issues, .remove-cross").on("click", function (_, datum) {
        return _this._onSelectRemoveKeyIssue && _this._onSelectRemoveKeyIssue(datum);
      });

      // 2. Key issues (view mode only): select key issue callback
      nodeContainersMerge.selectAll(".node .key-issue.view, .node .node-text.view.key-issues").on("click", function (_, datum) {
        return _this._onSelectKeyIssue && _this._onSelectKeyIssue(datum);
      });

      /*nodeContainersMerge.selectAll(".node .key-issue.view, .node .node-text.view.key-issues").on("mouseover", function (_, datum) {
        return _this._onMoveOverKeyIssue && _this._onMoveOverKeyIssue(datum);
      });*/

      // 3. Insight areas: select insight area callback
      nodeContainersMerge.selectAll(".node .insight-area, .node .node-text.view.insight-areas").on("click", function (_, datum) {
        return _this._onSelectInsightArea && _this._onSelectInsightArea(datum);
      });

      // 4. Main topic: select image callback
      nodeContainersMerge.selectAll(".node > .map-icon, .node .node-text.view.map-icon-text").on("click", function (_, datum) {
        return _this._onSelectImage && _this._onSelectImage(datum);
      });

      // Create an exit animation transition for all nodes leaving the graph
      var nodeContainersExit = nodeContainers.exit();
      nodeContainersExit.filter(function (_ref37) {
        var depth = _ref37.depth;
        return depth <= 1;
      }).transition().duration(this._animationDuration / 2).style("opacity", 0).remove();
      nodeContainersExit.filter(function (_ref38) {
        var depth = _ref38.depth;
        return depth >= 2;
      }).remove();

      // Create the drop target if the dragging mode has been triggered
      createCircleDropTarget(radius, this._isDragging, this._graph, this._activeColour, this._successColour, this._animationDuration);
      this._graph.select(".drop-target-ring").on("drop.data", function (event) {
        if (_this._onItemDrop) {
          _this._onItemDrop(event.dataTransfer.getData("text"));
        }
      });

      this.mode(this._mode);

      // Draw the topic volume wave graph
      drawVolumeMap(nodes, this._svg, radius, this._volumeRange, width, height, this._advancedModeLoading, this._animationDuration);

      return this._isUpdatingPromise;
    }
  }]);
  return TransformationMap;
}();

function nodeRotateTransform(_ref39) {
  var angle = _ref39.angle,
      radius = _ref39.radius;

  return "rotate(" + (angle - 90) + ") translate(" + radius + ")";
}

export { TransformationMap, VIEW_MODE, EDIT_MODE, TOP_LEFT, BOTTOM_LEFT, TOP_RIGHT, NO_LOGO };
