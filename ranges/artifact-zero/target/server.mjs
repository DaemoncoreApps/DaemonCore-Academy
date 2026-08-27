import http from 'node:http'

http.createServer((request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ status: 'healthy', release: '042', digest: 'sha256:dc042' }))
    return
  }
  response.writeHead(404)
  response.end(JSON.stringify({ error: 'not found' }))
}).listen(8083, '0.0.0.0')
