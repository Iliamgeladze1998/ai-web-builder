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
                messages: [{ role: "user", content: prompt + ". Return only HTML/Tailwind." }]
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
                let data = '';
                apiRes.on('data', d => { data += d; });
                apiRes.on('end', () => {
                    // აქ არის მთავარი - ნებისმიერ პასუხს ვაბრუნებთ ეკრანზე
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    try {
                        const json = JSON.parse(data);
                        const aiResult = json.choices ? json.choices[0].message.content : JSON.stringify(json);
                        res.end(JSON.stringify({ code: aiResult }));
                    } catch(e) {
                        res.end(JSON.stringify({ code: "Raw API Response: " + data }));
                    }
                });
            });

            apiReq.on('error', (e) => { res.end(JSON.stringify({ code: "Connection Error: " + e.message })); });
            apiReq.write(postData);
            apiReq.end();
        });
    }
});

server.listen(process.env.PORT || 8080);
