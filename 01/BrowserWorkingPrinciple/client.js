/*
 * @Author: ryuusennka
 * @Date: 2021-04-17 17:03:37
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-05-08 23:29:57
 * @FilePath: /projects/01/BrowserWorkingPrinciple/client.js
 * @Description:
 */

const net = require('net');
const fs = require('fs');
const PORT = 8080; // PORT 跟 server.js 配置的一样

class Request {
  constructor(options = {}) {
    this.method = options.method || 'GET';
    this.port = options.port || PORT;
    this.path = options.path || '/';
    this.body = options.body || {};
    this.headers = options.headers || {};
    this.host = options.host;

    if (!this.headers['Content-Type']) {
      // NOTE: 在HTTP协议里一定要有Content-Type这个header的，不然服务器无法解析body
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'; // 给个默认的值
    }

    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body);
    } else if (
      this.headers['Content-Type'] === 'application/x-www-form-urlencoded'
    ) {
      this.bodyText = Object.keys(this.body)
        .map(key => {
          return `${key}=${encodeURIComponent(this.body[key])}`;
        })
        .join('&');
    }
    // NOTE: 如果 Content-Length 传的不对，这个http请求会是一个非法的请求
    this.headers['Content-Length'] = this.bodyText.length;
  }

  // NOTE: connection 如果有传这个参数，我们就可以在已经建立好的TCP连接上把请求发送出去，如果没有传就会自己根据host,port去建立一个新的tcp连接
  send(connection) {
    return new Promise((resolve, reject) => {
      const responseParser = new ResponseParser();

      if (connection) {
        connection.write(this.toString());
      } else {
        connection = net.createConnection(
          { host: this.host, port: this.port },
          () => {
            connection.write(this.toString());
          }
        );
      }

      // NOTE: 'data' 事件 当接收到数据的时触发该事件,data 参数是一个 Buffer 或 String。
      let responseMessage = [];
      connection.on('data', data => {
        responseMessage.push(data);
      });
      connection.on('error', err => {
        reject(err);
        connection.end();
      });
      connection.on('end', () => {
        console.log(`接收完毕`);
        responseMessage = Buffer.concat(responseMessage).toString();
        responseParser.receive(responseMessage);
        if (responseParser.isFinished) {
          resolve(responseParser.response);
        }
      });
      connection.on('close', () => {
        console.log(`连接关闭了`);
        // console.log(Buffer.concat(responseString).toString());
        // fs.writeFileSync('./aaa.txt', responseMessage); // 把响应保存一下看看结果
      });
    });
  }
  // NOTE: toString 方法实现请求报文字符串的拼接。HTTP 报文本身是由多行（用 CR+LF 作换行符）数据构成的字符串文本。我的vscode编辑器设置的是LF换行也就是\n，所以下面换行的时候加上了\r
  toString() {
    const string = `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers)
  .map(key => {
    return `${key}: ${this.headers[key]}`;
  })
  .join('\r\n')}\r
\r
${this.bodyText}`;
    return string;
  }
}

// NOTE: 在Send的过程中会逐步的收到 response,所以要构造一个 ResponseParser 类，让这个Parser类逐步的接收response信息来构造response对象的不同的部分
class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0; // 第一行等待找到\r
    this.WAITING_STATUS_END = 1; // 第一行等待找到\n 合起来就是 \r\n 认为这是两个状态

    // 每一个 header 有四个状态
    this.WAITING_HEADER_NAME = 2; // 等待header name的输入状态
    this.WAITING_HEADER_SPACE = 3; // 这个是header name冒号后面等待空格的状态
    this.WAITING_HEADER_VALUE = 4; // 这个是header value的状态
    this.WAITING_HEADER_LINE_END = 5; // 等待一行header读完的状态

    this.WAITING_HEADER_BLOCK_END = 6; // HTTP 报文大致可分为报文首部和报文主体两块。两者由最初出现的空行（CR+LF）来划分。

    this.WAITING_BODY = 7; // 这里面就是body的状态了

    this.current = this.WAITING_STATUS_LINE; // 当前的状态

    // 用于储存
    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }
  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished;
  }
  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join(''),
    };
  }

  // 用 receive 函数来接收字符串，我们会像对这个字符串像状态机那样逐个的去处理
  receive(string) {
    for (let c of string) {
      this.receiveChar(c);
    }
  }
  // 用 receiveChar 来区分每一个状态以及保存响应报文
  // 根据 char 来判断
  receiveChar(char) {
    switch (this.current) {
      case this.WAITING_STATUS_LINE:
        if (char === '\r') {
          this.current = this.WAITING_STATUS_END;
        } else {
          this.statusLine += char;
        }
        break;

      case this.WAITING_STATUS_END:
        if (char === '\n') this.current = this.WAITING_HEADER_NAME;
        break;

      case this.WAITING_HEADER_NAME:
        if (char === ':') {
          this.current = this.WAITING_HEADER_SPACE;
        } else if (char === '\r') {
          this.current = this.WAITING_HEADER_BLOCK_END;
        } else {
          this.headerName += char;
        }
        break;

      case this.WAITING_HEADER_SPACE:
        if (char === ' ') {
          this.current = this.WAITING_HEADER_VALUE;
        }
        break;

      case this.WAITING_HEADER_VALUE:
        if (char === '\r') {
          this.current = this.WAITING_HEADER_LINE_END;
          this.headers[this.headerName] = this.headerValue;
          this.headerName = '';
          this.headerValue = '';
        } else {
          this.headerValue += char;
        }
        break;

      case this.WAITING_HEADER_LINE_END:
        if (char === '\n') this.current = this.WAITING_HEADER_NAME;
        break;

      case this.WAITING_HEADER_BLOCK_END:
        if (char === '\n') this.current = this.WAITING_BODY;
        // NOTE: 找到了报文首部和报文主体的空行
        if (this.headers['Transfer-Encoding'] === 'chunked') {
          // NOTE: Transfer-Encoding可以有不同的值，但是 node 的Transfer-Encoding默认值是chunked
          // NOTE: Transfer-Encoding 消息首部指明了将 entity 安全传递给用户所采用的编码形式。
          // 实例化 bodyParser
          this.bodyParser = new TrunkedBodyParser();
        }
        break;

      case this.WAITING_BODY:
        this.bodyParser.receiveChar(char);
        break;

      default:
        break;
    }
  }
}

class TrunkedBodyParser {
  constructor() {
    /*
      NOTE: trunked body 的结构
      它的结构是一个 长度 后面跟着一个 thunk 的内容，这样的结构被成一个 1 个 thunk
      遇到一个长度为0的 trunk，那么整个body就结束了，注意这个0后面也是有\r\n的
      如: "0\r\n\r\n", 类似于这样的:
      ```
      HTTP/1.1 200 OK
      Content-Type: text/html

      0

      ```
    */
    this.WAITING_LENGTH = 0;
    this.WAITING_LENGTH_LINE_END = 1;
    this.READING_TRUNK = 2;
    this.WAITING_NEW_LINE = 3;
    this.WAITING_NEW_LINE_END = 4;
    this.length = 0;
    this.content = [];
    this.isFinished = false;
    this.current = this.WAITING_LENGTH;
  }
  receiveChar(char) {
    switch (this.current) {
      case this.WAITING_LENGTH:
        if (char === '\r') {
          if (this.length === 0) {
            this.isFinished = true;
          }
          this.current = this.WAITING_LENGTH_LINE_END;
        } else {
          // NOTE: 循环的时候计算长度
          // NOTE: 如果已经读完一个chunk，length=0，走这里也不会有什么问题
          this.length *= 16;
          this.length += parseInt(char, 16);
        }
        break;
      case this.WAITING_LENGTH_LINE_END:
        if (char === '\n') {
          this.current = this.READING_TRUNK;
        }
        break;
      case this.READING_TRUNK:
        this.content.push(char);
        this.length--;
        if (this.length === 0) {
          this.current = this.WAITING_NEW_LINE;
        }
        break;
      case this.WAITING_NEW_LINE:
        if (char === '\r') {
          this.current = this.WAITING_NEW_LINE_END;
        }
        break;
      case this.WAITING_NEW_LINE_END:
        if (char === '\n') {
          this.current = this.WAITING_LENGTH;
        }
        break;
      default:
        break;
    }
  }
}

(async () => {
  const configObject = {
    method: 'POST', // http
    host: '127.0.0.1', // IP 层
    port: PORT, // TCP 层
    path: '/', // http 协议要求的
    headers: {
      ['X-foo2']: 'customed', // key-value 形式
    },
    body: {
      name: 'ryuusennka', // key-value 形式
    }, // 发送body
  };
  let request = new Request(configObject);
  let response = await request.send();
  console.log(response);
})();
