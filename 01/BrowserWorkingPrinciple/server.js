/*
 * @Author: ryuusennka
 * @Date: 2021-04-17 16:41:58
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-04-18 20:26:09
 * @FilePath: /JiKeShiJian/projects/01/BrowserWorkingPrinciple/server.js
 * @Description:
 */

const http = require('http');
const PORT = 8080;
http
  .createServer((request, response) => {
    let body = [];
    request
      .on('error', err => {
        console.log(error);
      })
      .on('data', chunk => {
        // 接受数据
        console.log(`on data: `, chunk.toString());

        body.push(chunk);
      })
      .on('end', () => {
        body = Buffer.concat(body).toString(); // 接收body
        console.log(`body: `, body);
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end(`<h1>Hello World!</h1>`);
      });
  })
  .listen(PORT);

console.log(`server start on port ${PORT}`);
