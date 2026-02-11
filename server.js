const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const { prompt } = JSON.parse(body);
            const apiKey = process.env.GROQ_API_KEY;

            const postData = JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a web developer. Return ONLY HTML and Tailwind CSS code." },
                    { role: "user", content: prompt }
                ]
            });

            const options = {
                hostname: 'api.groq.com',
                path: '/openai/v1/chat/completions', // აქ დაემატა /openai/
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', d => { data += d; });
                apiRes.on('end', () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    try {
                        const json = JSON.parse(data);
                        if (json.choices && json.choices[0]) {
                            let aiCode = json.choices[0].message.content;
                            aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                            res.end(JSON.stringify({ code: aiCode }));
                        } else {
                            res.end(JSON.stringify({ code: "<p class='text-red-500'>API Error: " + (json.error ? json.error.message : "Unknown") + "</p>" }));
                        }
                    } catch(e) {
                        res.end(JSON.stringify({ code: "Error parsing response" }));
                    }
                });
            });

            apiReq.write(postData);
            apiReq.end();
        });
    }
});

server.listen(process.env.PORT || 8080);
