var http = require('http');

http.createServer((req, res) => {
    console.log(req.headers['user-agent'])
    console.log(req.url === '/')
    res.writeHead(302, {'Location': 'dat://3434e9e7e4d206d8dfbdfbb386deddb2fc667ef4f158d4dfefecf4ff9a4e771d/'})
    res.end()
}).listen(8080); 
