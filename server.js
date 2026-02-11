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
            const apiKey = process.env.GEMINI_API_KEY; // Koyeb-იდან წაიღებს გასაღებს

            const postData = JSON.stringify({
                contents: [{
                    parts: [{
                        text: `შენ ხარ ექსპერტი ვებ-დეველოპერი. შექმენი მხოლოდ HTML და CSS კოდი (Tailwind CSS-ის გამოყენებით) მომხმარებლის მოთხოვნისთვის. დააბრუნე მხოლოდ სუფთა კოდი, ყოველგვარი ტექსტის გარეშე. მოთხოვნა: ${prompt}`
                    }]
                }]
            });

            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };

            const apiReq = https.request(options, (apiRes) => {
                let responseData = '';
                apiRes.on('data', d => { responseData += d; });
                apiRes.on('end', () => {
                    const json = JSON.parse(responseData);
                    if (json.candidates && json.candidates[0]) {
                        let aiCode = json.candidates[0].content.parts[0].text;
                        // Markdown-ის სიმბოლოების მოცილება (თუ AI-მ ჩაამატა)
                        aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ code: aiCode }));
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ code: "<p class='text-red-500'>AI-მ პასუხი ვერ გასცა.</p>" }));
                    }
                });
            });

            apiReq.on('error', (e) => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "კავშირის შეცდომა" }));
            });

            apiReq.write(postData);
            apiReq.end();
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
