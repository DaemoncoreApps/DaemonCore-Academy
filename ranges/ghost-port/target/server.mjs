import http from 'node:http'
import net from 'node:net'

const bind = '0.0.0.0'

net.createServer(socket => {
  socket.end('SSH-2.0-OpenSSH_9.3 DaemonCore_Training\r\n')
}).listen(22, bind)

net.createServer(socket => {
  socket.end('SMB_SYNTHETIC_BANNER // SAMBA 4.18 // DC-LAB\r\n')
}).listen(445, bind)

http.createServer((request, response) => {
  response.setHeader('Server', 'Archive Console/0.8-training')
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('healthy')
    return
  }
  if (request.url === '/status') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      service: 'Archive Console',
      version: '0.8-training',
      authentication: false,
      classification: 'synthetic-lab-target',
      message: 'Undocumented status listener is reachable.',
    }, null, 2))
    return
  }
  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'not found' }))
}).listen(8088, bind)

console.log('DaemonCore synthetic archive target online')
