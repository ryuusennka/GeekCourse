/*
 * @Author: ryuusennka
 * @Date: 2021-06-12 17:49:46
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-06-12 18:34:18
 * @FilePath: /projects/04/lexer.js
 * @Description:
 */
class XRegExp {
  constructor(source, flag, root = 'root') {
    this.table = new Map();
    this.regexp = new RegExp(this.compileRegExp(source, root, 0).source, flag);
    console.log(this.regexp);
    console.log(this.table);
  }
  exec(string) {
    let r = this.regexp.exec(string);
    for (let i = 1; i < r.length; i++) {
      if (r[i] !== void 0) {
        r[this.table.get(i - 1)] = r[i];
      }
    }
    return r[0];
  }

  compileRegExp(source, name, start) {
    if (source[name] instanceof RegExp)
      return {
        source: source[name].source,
        length: 0,
      };

    let length = 0;
    let regexp = source[name].replace(/\<([^>]+)\>/g, (str, $1) => {
      this.table.set(start + length, $1);
      // this.table.set($1, start + length);

      length++;
      let r = this.compileRegExp(source, $1, start + length);
      length += r.length;

      return `(${r.source})`;
    });

    return {
      source: regexp,
      length,
    };
  }

  get lastIndex() {
    return this.regexp.lastIndex;
  }

  set lastIndex(value) {
    return (this.regexp.lastIndex = value);
  }
}

function scan(str) {
  let regexp = new XRegExp(
    {
      InputElement: '<Whitespace>|<LineTerminator>|<Comments>|<Token>',
      Whitespace: / /,
      LineTerminator: /\n/,
      Comments: /\/\*(?:[^*]|\*[^\/])*\*\/|\/\/[^\n]*/,
      Token: '<Literal>|<Keywords>|<Identifer>|<Punctuator>',
      Literal:
        '<NumericLiteral>|<BooleanLiteral>|<StringLiteral>|<NullLiteral>',
      NumericLiteral: /(?:[1-9][0-9]*|0)(\.[0-9]*)?|\.[0-9]+/,
      BooleanLiteral: /true|false/,
      StringLiteral: /\"(?:[^"\n]|\\[\s\S])*\"|\'(?:[^'\n]|\\[\s\S])*\'/,
      NullLiteral: /null/,
      Identifer: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
      Keywords: /if|else|for|while|function|let/,
      Punctuator: /\.|{|}|\(|=|<|\+\+|==|=>|\)|\*|\.|\[|\]|;|\?|:|\+|\*/,
    },
    'g',
    'InputElement'
  );
  while (regexp.lastIndex < str.length) {
    let r = regexp.exec(str);

    console.log(r);

    if (!r[0].length) break;
  }
}

scan(`
  for(let i = 0; i < 3; i++) {
      for(let j = 0; j < 3; j++) {
          let cell = document.createElement("div");
          cell.classList.add("cell");
          cell.innerText = pattern[i * 3 + j] === 2 ? "*" : pattern[i * 3 + j] === 1 ? "o" : "";
          cell.addEventListener("click", () => userMove(j, i));
          board.appendChild(cell);
      }
      board.appendChild(document.createElement("br"))
  }
`);
