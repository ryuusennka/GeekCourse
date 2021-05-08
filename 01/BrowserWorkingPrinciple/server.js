/*
 * @Author: ryuusennka
 * @Date: 2021-05-05 20:05:02
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-05-08 23:25:03
 * @FilePath: /projects/01/BrowserWorkingPrinciple/server.js
 * @Description:
 */

const http = require('http');

const PORT = 8080;

http
  .createServer((request, response) => {
    let body = [];
    request
      .on('error', err => {
        console.error(err);
      })
      .on('data', chunk => {
        // NOTE: 接收 body， get 请求也能发送 body
        body.push(chunk);
      })
      .on('end', () => {
        body = Buffer.concat(body).toString();
        console.log('body: ', body);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        // const string = Array(1024 * 1024 * 10)
        //   .fill(0)
        //   .join('');
        // response.end(string);
        response.end(
          `<h1>Hello World!</h1><p>TMD,hanziyouwenti!!!!${body}</p>` // TODO: 汉字有问题，如何解决？汉字有问题导致parser那里的this.length--出问题
        );
        // response.end(''); // 返回长度为0的chunk
      });
  })
  .listen(PORT);

console.log(`Server start at port ${PORT}`);
