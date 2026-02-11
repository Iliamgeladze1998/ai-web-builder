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
                return res.end(JSON.stringify({ code: "<p class='text-red-500'>შეცდომა: HF_TOKEN ვერ მოიძებნა.</p>" }));
            }

            async function queryAI(retryCount = 0) {
                const postData = JSON.stringify({
                    inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>შენ ხარ ვებ-დეველოპერი. დააბრუნე მხოლოდ სუფთა HTML და CSS კოდი (Tailwind). არ დაწერო ტექსტი.<|eot_id|><|start_header_id|>user<|end_header_id|>${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
                    parameters: { max_new_tokens: 1500, return_full_text: false }
                });

                const options = {
                    hostname: 'api-inference.huggingface.co',
                    path: '/models/meta-llama/Llama-3.1-8B-Instruct',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                };

                const apiReq = https.request(options, (apiRes) => {
                    let responseData = '';
                    apiRes.on('data', d => { responseData += d; });
                    apiRes.on('end', () => {
                        try {
                            const json = JSON.parse(responseData);
                            
                            if (json.error && json.error.includes("loading") && retryCount < 5) {
                                // თუ მოდელი ჯერ კიდევ იტვირთება, 5 წამში ისევ ვცდით
                                return setTimeout(() => queryAI(retryCount + 1), 5000);
                            }

                            if (Array.isArray(json) && json[0].generated_text) {
                                let aiCode = json[0].generated_text;
                                aiCode = aiCode.replace(/```html|```css|```/g, "").trim();
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ code: aiCode }));
                            } else {
                                throw new Error("Invalid response structure");
                            }
                        } catch (e) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ code: "<p class='text-red-500'>AI-მ ვერ უპასუხა. სცადეთ ისევ 10 წამში.</p>" }));
                        }
                    });
                });

                apiReq.on('error', (e) => {
                    res.end(JSON.stringify({ code: "<p class='text-red-500'>კავშირის შეცდომა</p>" }));
                });
                apiReq.write(postData);
                apiReq.end();
            }
            queryAI();
        });
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
