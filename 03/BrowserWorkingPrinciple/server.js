/*
 * @Author: ryuusennka
 * @Date: 2021-05-05 20:05:02
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-06-11 15:52:02
 * @FilePath: /03/BrowserWorkingPrinciple/server.js
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
#container {
  width:500px;
  height:300px;
  display:flex;
  background-color:rgb(255,255,255);
}
#container #myid {
  width:200px;
  height:100px;
  background-color:rgb(255,0,0);
}
#container .c1 {
  flex:1;
  background-color:rgb(0,255,0);
}
    </style>
</head>
<body>
    <div id="container">
      <div id="myid"/>
      <div class="c1" />
    </div>
</body>
</html>`
        );
        // response.end(''); // 返回长度为0的chunk
      });
  })
  .listen(PORT);

console.log(`Server start at port ${PORT}`);
