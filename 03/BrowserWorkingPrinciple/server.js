/*
 * @Author: ryuusennka
 * @Date: 2021-05-05 20:05:02
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-06-10 15:21:40
 * @FilePath: /projects/02/BrowserWorkingPrinciple/server.js
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
          `<html maaa=a>
          <head>
              <style>
          body div #myid{
              width: 100px;
              background-color: #ff5000;
          }
          body div img{
              width: 30px;
              background-color: #ff1111;
          }
              </style>
          </head>
          <body>
              <div>
                  <img id="myid"/>
                  <img />
              </div>
          </body>
          </html>`
        );
        // response.end(''); // 返回长度为0的chunk
      });
  })
  .listen(PORT);

console.log(`Server start at port ${PORT}`);
