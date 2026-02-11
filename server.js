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
            const apiKey = process.env.GROQ_API_KEY;

            if (!apiKey) {
                res.writeHead(500);
                return res.end(JSON.stringify({ code: "<p class='text-red-500'>შეცდომა: GROQ_API_KEY ვერ მოიძებნა Koyeb-ზე.</p>" }));
            }

            const postData = JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "შენ ხარ ვებ-დეველოპერი. დააბრუნე მხოლოდ სუფთა HTML და CSS კოდი (Tailwind). არავითარი ტექსტი და განმარტება." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            });

            const options = {
                hostname: 'api.groq.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let responseData = '';
                apiRes.on('data', d => { responseData += d; });
                apiRes.on('end', () => {
                    try {
                        const json = JSON.parse(responseData);
                        if (json.choices && json.choices[0]) {
                            let aiCode = json.choices[0].message.content;
                            // კოდის გასუფთავება Markdown-ისგან
                            aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ code: aiCode }));
                        } else {
                            throw new Error("API Error");
                        }
                    } catch (e) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ code: "<p class='text-red-500'>AI-მ პასუხი ვერ გასცა. სცადეთ ისევ.</p>" }));
                    }
                });
            });

            apiReq.on('error', (e) => {
                res.end(JSON.stringify({ code: "<p class='text-red-500'>კავშირის შეცდომა.</p>" }));
            });
            apiReq.write(postData);
            apiReq.end();
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
