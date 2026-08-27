import http from 'node:http'

let passwordGeneration = 1

http.createServer((request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ status: 'healthy' }))
    return
  }
  if (request.method === 'POST' && request.url === '/password-reset') {
    if (request.headers.authorization !== 'Bearer recovery-token') {
      response.writeHead(401)
      response.end(JSON.stringify({ error: 'approved recovery token required' }))
      return
    }
    passwordGeneration += 1
    response.end(JSON.stringify({ status: 'password-reset', passwordGeneration, sessionsRevoked: false }))
    return
  }
  if (request.url === '/profile') {
    if (request.headers.authorization !== 'Bearer session-old') {
      response.writeHead(401)
      response.end(JSON.stringify({ authorized: false }))
      return
    }
    response.end(JSON.stringify({ user: 'training-operator', session: 'session-old', passwordGeneration, authorized: true }))
    return
  }
  response.writeHead(404)
  response.end(JSON.stringify({ error: 'not found' }))
}).listen(8081, '0.0.0.0')
