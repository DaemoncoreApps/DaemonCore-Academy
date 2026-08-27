import http from 'node:http'

http.createServer((request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ status: 'healthy', classification: 'synthetic-evidence-sink' }))
    return
  }
  response.writeHead(404)
  response.end(JSON.stringify({ error: 'not found' }))
}).listen(8090, '0.0.0.0')
