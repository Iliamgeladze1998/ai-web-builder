const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } 
    else if (req.method === 'POST' && req.url === '/generate') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const { prompt } = JSON.parse(body);
            const token = process.env.HF_TOKEN;

            if (!token) {
                res.writeHead(500);
                return res.end(JSON.stringify({ code: "<p class='text-red-500'>Error: HF_TOKEN missing!</p>" }));
            }

            const postData = JSON.stringify({
                inputs: `Task: Create high-quality HTML/Tailwind CSS code for: ${prompt}. Return code only.`,
                parameters: { max_new_tokens: 1500, return_full_text: false }
            });

            const options = {
                hostname: 'api-inference.huggingface.co',
                path: '/models/Qwen/Qwen2.5-Coder-7B-Instruct', // შეცვლილია უფრო სწრაფ მოდელზე
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            };

            const apiReq = https.request(options, (apiRes) => {
                let responseData = '';
                apiRes.on('data', d => { responseData += d; });
                apiRes.on('end', () => {
                    try {
                        const json = JSON.parse(responseData);
                        
                        if (json.error && json.error.includes("loading")) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ code: "<p class='text-blue-500'>AI იტვირთება... სცადეთ ისევ 5 წამში.</p>" }));
                        }

                        if (Array.isArray(json) && json[0].generated_text) {
                            let aiCode = json[0].generated_text;
                            aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ code: aiCode }));
                        } else {
                            throw new Error();
                        }
                    } catch (e) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ code: "<p class='text-red-500'>AI დაკავებულია. კიდევ ერთხელ დააჭირეთ ღილაკს.</p>" }));
                    }
                });
            });

            apiReq.write(postData);
            apiReq.end();
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
