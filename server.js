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
        req.on('end', () => {
            const { prompt } = JSON.parse(body);
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                res.writeHead(500);
                return res.end(JSON.stringify({ code: "<p class='text-red-500'>შეცდომა: API Key ვერ მოიძებნა.</p>" }));
            }

            const postData = JSON.stringify({
                contents: [{ parts: [{ text: `შენ ხარ ვებ-დეველოპერი. დააბრუნე მხოლოდ HTML/CSS კოდი Tailwind-ით. მოთხოვნა: ${prompt}` }] }]
            });

            // მისამართი შეცვლილია v1-ზე სტაბილურობისთვის
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };

            const apiReq = https.request(options, (apiRes) => {
                let responseData = '';
                apiRes.on('data', d => { responseData += d; });
                apiRes.on('end', () => {
                    const json = JSON.parse(responseData);
                    
                    if (json.error) {
                        res.writeHead(500);
                        return res.end(JSON.stringify({ code: `<div class='text-red-500 p-2'><b>Gemini Error:</b> ${json.error.message}</div>` }));
                    }

                    if (json.candidates && json.candidates[0]) {
                        let aiCode = json.candidates[0].content.parts[0].text;
                        aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ code: aiCode }));
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ code: "<p class='text-red-500'>AI-მ პასუხი ვერ გასცა. სცადეთ სხვა პრომპტი.</p>" }));
                    }
                });
            });

            apiReq.on('error', (e) => {
                res.end(JSON.stringify({ code: `<p class='text-red-500'>კავშირის შეცდომა</p>` }));
            });
            apiReq.write(postData);
            apiReq.end();
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
