const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // 1. საიტის მთავარი გვერდის გახსნა (GET)
    if (req.method === 'GET' && req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } 
    // 2. ღილაკზე დაჭერის დამუშავება (POST)
    else if (req.method === 'POST' && req.url === '/generate') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const { prompt } = JSON.parse(body);
            
            // ჯერჯერობით ვაბრუნებთ ლამაზ "სატესტო" პასუხს კავშირის შესამოწმებლად
            const mockResponse = {
                code: `<div class="p-6 bg-blue-900/50 border border-blue-500 rounded-2xl text-center">
                        <h2 class="text-xl font-bold text-blue-400 mb-2">თქვენი იდეა: ${prompt}</h2>
                        <p class="text-white italic text-sm">კავშირი დამყარებულია! საიტი მზადაა AI-სთვის. 🚀</p>
                       </div>`
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(mockResponse));
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
