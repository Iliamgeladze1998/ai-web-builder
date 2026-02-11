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
            try {
                const { prompt } = JSON.parse(body);
                const token = process.env.HF_TOKEN;

                if (!token) {
                    res.writeHead(500);
                    return res.end(JSON.stringify({ code: "<p class='text-red-500'>Error: HF_TOKEN missing in Koyeb!</p>" }));
                }

                const postData = JSON.stringify({
                    inputs: `Clean HTML/CSS code with Tailwind for: ${prompt}. Return ONLY code, no text.`,
                    parameters: { max_new_tokens: 1500 }
                });

                const options = {
                    hostname: 'api-inference.huggingface.co',
                    path: '/models/Qwen/Qwen2.5-Coder-32B-Instruct', // ყველაზე სწრაფი მოდელი კოდისთვის
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                };

                const apiReq = https.request(options, (apiRes) => {
                    let responseData = '';
                    apiRes.on('data', d => { responseData += d; });
                    apiRes.on('end', () => {
                        try {
                            const json = JSON.parse(responseData);
                            
                            // თუ მოდელი იტვირთება, მომხმარებელს ვეუბნებით
                            if (json.error && json.error.includes("loading")) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                return res.end(JSON.stringify({ code: "<p class='text-blue-500'>AI 'იღვიძებს'... სცადეთ ისევ 5 წამში.</p>" }));
                            }

                            if (Array.isArray(json) && json[0].generated_text) {
                                let aiCode = json[0].generated_text;
                                aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ code: aiCode }));
                            } else {
                                throw new Error("API error");
                            }
                        } catch (e) {
                            res.end(JSON.stringify({ code: "<p class='text-red-500'>AI დაკავებულია. სცადეთ ისევ.</p>" }));
                        }
                    });
                });
                apiReq.write(postData);
                apiReq.end();
            } catch (err) {
                res.end(JSON.stringify({ code: "Error" }));
            }
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
