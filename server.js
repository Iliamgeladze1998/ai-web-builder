const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // მთავარი გვერდი
    if (req.method === 'GET' && req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } 
    // AI მოთხოვნის დამუშავება
    else if (req.method === 'POST' && req.url === '/generate') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const { prompt } = JSON.parse(body);
            
            // აქ მოხდება GeoAI-სთან დაკავშირება. 
            // დროებით დავუბრუნოთ "ხელოვნური" პასუხი გასატესტად:
            const aiCode = `<button class="bg-red-500 p-4 rounded-full font-bold shadow-lg">შენი შექმნილი ღილაკი: ${prompt}</button>`;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: aiCode }));
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
