/*
 * @Author: ryuusennka
 * @Date: 2021-05-09 00:03:53
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-06-10 16:00:48
 * @FilePath: /projects/02/BrowserWorkingPrinciple/parser.js
 * @Description:
 */

/*
NOTE: EOF
因为HTML最后有一个文件终结的(符号?)
而在这个文件终结的位置，比如说有一些文本节点，它可能是仍然面临着没有结束的状态，
所以我们必须最后额外给它一个字符，但是这个字符又不能是有意义(有效)的字符
把这个Symbol作为状态机的最后一个输入，这样状态机就会强迫一些节点最后完成截止的标志

EOF是一个计算机术语，为End Of File的缩写，在操作系统中表示资料源无更多的资料可读取。
资料源通常称为档案或串流。通常在文本的最后存在此字符表示资料结束。
*/
const EOF = Symbol('EOF'); // EOF: end of line
const css = require('css');

let currentToken = null; // 这个是标签
let currentAttribute = null;
let stack = [{ type: 'document', children: [] }];
let currentTextNode = null;
// 加入一个新的函数， addCSSRules 这里我们把CSS规则暂存到一个数组里
let rules = [];
function addCSSRules(text) {
  let ast = css.parse(text);
  // console.log(JSON.stringify(ast, null, '    ')); // 4个空格
  rules.push(...ast.stylesheet.rules);
}

function match(element, selector) {
  if (!selector || !element.attributes) return false;
  if (selector.charAt(0) === '#') {
    var attr = element.attributes.filter(attr => attr.name === 'id')[0];
    if (attr && attr.value === selector.replace('#', '')) return true;
  } else if (selector.charAt(0) === '.') {
    var attr = element.attributes.filter(attr => attr.name === 'class')[0];
    if (attr && attr.value === selector.replace('.', '')) return true;
  } else {
    if (element.tagName === selector) return true;
  }
  return false;
}

function specificity(selector) {
  var p = [0, 0, 0, 0];
  var selectorParts = selector.split(' ');
  for (var part of selectorParts) {
    if (part.charAt(0) === '#') {
      p[1] += 1;
    } else if (part.charAt(0) === '.') {
      p[2] += 1;
    } else {
      p[3] += 1;
    }
  }
  return p;
}
function compare(sp1, sp2) {
  if (sp1[0] - sp2[0]) return sp1[0] - sp2[0];
  if (sp1[1] - sp2[1]) return sp1[1] - sp2[1];
  if (sp1[2] - sp2[2]) return sp1[2] - sp2[2];
  return sp1[3] - sp2[3];
}

function computeCSS(element) {
  // console.log(rules);
  // console.log(`compute CSS for Element`, element);
  let elements = stack.slice().reverse();
  if (!element.computedStyle) {
    element.computedStyle = {};
  }
  for (let rule of rules) {
    var selectorParts = rule.selectors[0].split(' ').reverse();
    if (!match(element, selectorParts[0])) {
      continue;
    }
    let matched = false;
    var j = 1;
    for (var i = 0; i < elements.length; i++) {
      if (match(elements[i], selectorParts[j])) {
        j++;
      }
    }
    if (j >= selectorParts.length) {
      matched = true;
    }
    if (matched) {
      var sp = specificity(rule.selectors[0]);
      var computedStyle = element.computedStyle;
      for (var declaration of rule.declarations) {
        if (!computedStyle[declaration.property])
          computedStyle[declaration.property] = {};
        if (!computedStyle[declaration.property].specificity) {
          computedStyle[declaration.property].value = declaration.value;
          computedStyle[declaration.property].specificity = sp;
        } else if (
          compare(computedStyle[declaration.property].specificity, sp) < 0
        ) {
          computedStyle[declaration.property].value = declaration.value;
          computedStyle[declaration.property].specificity = sp;
        }
        computedStyle[declaration.property].value = declaration.value;
      }
      console.log(element.computedStyle);
    }
  }
}

function emit(token) {
  if (token.type === 'text') return; // 如果是文本节点，暂时忽略掉
  let top = stack[stack.length - 1];
  if (token.type === 'startTag') {
    // NOTE： 文本带尖括号的就是 tag ，而 tag 背后的东西就是 element,DOM 树里面只有 node 和 element，而不会有 tag
    // 不过是 startTag 和 endTag 对应的都是同一个 element
    let element = { type: 'element', children: [], attributes: [] };
    element.tagName = token.tagName;
    for (let p in token) {
      if (p !== 'type' && p !== 'tagName') {
        element.attributes.push({
          name: p,
          value: token[p],
        });
      }
    }
    computeCSS(element);

    top.children.push(element);
    element.parent = top;
    if (!token.isSelfClosing) {
      stack.push(element);
    }
    currentTextNode = null;
  } else if (token.type === 'endTag') {
    if (top.tagName != token.tagName) {
      throw new Error(`Tag start end doesn't match!`);
    } else {
      // ++++遇到style标签时，执行添加css规则的操作++
      if (top.tagName === 'style') {
        addCSSRules(top.children[0].content);
      }
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type === 'text') {
    if (currentTextNode == null) {
      currentTextNode = { type: 'text', content: '' };
      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
}

// NOTE: html 标准里把初始状态叫做data
function data(c) {
  if (c === '<') {
    // 标签开始，不是开始标签，还不知道是3中标签的哪一种
    return tagOpen;
  } else if (c === EOF) {
    emit({ type: 'EOF' });
    return;
  } else {
    // NOTE: 除了 < 我们把其它字符理解为文本节点
    emit({ type: 'text', content: c });
    return data;
  }
}

function tagOpen(c) {
  if (c === '/') {
    // 说明是结束标签，结束标签的特点就是左边是左尖括号 </...
    return endTagOpen;
  } else if (c.match(/^[a-zA-Z]$/)) {
    // 如果是一个英文字母，那么这个tag要么是开始标签，要么是自封闭标签
    // 当前结构是 <abcd... 要么是开始标签要么是自封闭标签
    currentToken = {
      type: 'startTag',
      tagName: '',
    };
    return tagName(c); // 收集tagName
  } else {
    emit({
      type: 'text',
      content: c,
    });
    return;
  }
}
function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: '',
    };
    return tagName(c);
  } else if (c === '>') {
  } else if (c === EOF) {
  } else {
  }
}
function tagName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    // NOTE: 在 HTML 中有效的空白符有四种 \t 制表符 \n 换行符 \f 禁止符 还有空格 例: <html prop, 在这些符号后面一般就要跟属性了
    // 在这个状态遇到这些字符的时候，就进入到一个新的状态 beforeAttributeName
    return beforeAttributeName;
  } else if (c === '/') {
    // 遇到了自封闭标签
    return selfClosingStartTag;
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c; // .toLowerCase()
    return tagName;
  } else if (c === '>') {
    // <html>
    emit(currentToken);
    return data;
  } else {
    currentToken.tagName += c;
    return tagName;
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c === '/' || c === '>' || c == EOF) {
    // 进到 afterAttributeName 的状态并且 reconsume(再次消费) 当前字符
    return afterAttributeName(c);
  } else if (c === '=') {
    return beforeAttributeName;
  } else {
    // 字符
    // 创建一个 attribute
    currentAttribute = {
      name: '',
      value: '',
    };
    return attributeName(c);
  }
}
function attributeName(c) {
  if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
    return afterAttributeName(c);
  } else if (c === '=') {
    return beforeAttributeValue;
  } else if (c === '\u0000') {
  } else if (c === '"' || c === "'" || c === '<') {
  } else {
    currentAttribute.name += c;
    return attributeName;
  }
}
function beforeAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
    return beforeAttributeValue;
  } else if (c === '"') {
    return doubleQuotedAttributeValue;
  } else if (c === "'") {
    return singleQuotedAttributeValue;
  } else if (c === '>') {
    // return data;
  } else {
    return UnquotedAttributeValue(c);
  }
}

function doubleQuotedAttributeValue(c) {
  if (c === '"') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c === '\u0000') {
  } else if (c === EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}
function singleQuotedAttributeValue(c) {
  if (c === "'") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c === '\u0000') {
  } else if (c === EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}
// 以引号结束
function afterQuotedAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c === '/') {
    return selfClosingStartTag;
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}
function UnquotedAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    // 这些符号对于 maaa=a 来说是一种结束的标志，就会把 name:value 赋值给 currentToken 也就是标签
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if (c === '/') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === '\u0000') {
  } else if (c === '"' || c === "'" || c === '<' || c === '=' || c === '`') {
  } else if (c === EOF) {
  } else {
    currentAttribute.value += c;
    return UnquotedAttributeValue;
  }
}

function afterAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return afterAttributeName;
  } else if (c === '/') {
    return selfClosingStartTag;
  } else if (c === '=') {
    return beforeAttributeValue;
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {
  } else {
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = { name: '', value: '' };
    return attributeName(c);
  }
}

function selfClosingStartTag(c) {
  if (c === '>') {
    currentToken.isSelfClosing = true;
    return data;
  } else if (c === EOF) {
  } else {
  }
}

exports.parserHTML = function (html) {
  let state = data;
  for (let c of html) {
    state = state(c);
  }
  state = state(EOF);
  return stack[0];
};
