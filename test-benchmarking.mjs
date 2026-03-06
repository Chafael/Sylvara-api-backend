import http from 'http';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    // console.debug(`Response was not valid JSON: ${data}`);
                    parsed = data; // Keep non-json response
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(parsed);
                } else {
                    console.error(`Error on ${method} ${path}:`, res.statusCode, parsed);
                    const error = new Error(`Request failed with status ${res.statusCode}`);
                    error.response = parsed;
                    reject(error);
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function waitForServer() {
    console.log("Waiting for server to start...");
    for (let i = 0; i < 30; i++) {
        try {
            // A lightweight endpoint that should be available.
            // We expect a 401 Unauthorized, which means the server is up.
            await request("GET", "/auth/me");
        } catch (e) {
            if (e.response && e.response.statusCode === 401) {
                 console.log("Server is up!");
                 return;
            }
             if (e.message.includes('status 401')) {
                console.log("Server is up!");
                return;
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    console.error("Server did not start in time.");
    process.exit(1);
}


async function run() {
    try {
        await waitForServer();
        console.log('--- Starting Benchmarking Test ---');

        // 1. Auth
        const email = `benchmark_${Date.now()}@example.com`;
        const password = "Password123!";
        console.log('1. /auth/register');
        const authData = await request("POST", "/auth/register", {
            userName: "Benchmark",
            userLastname: "Tester",
            userBirthday: "1990-01-01",
            userEmail: email,
            userPassword: password
        });

        const token = authData.accessToken;

        // 2. Send to BigQuery
        console.log('2. POST /benchmarking/bigquery/send');
        const benchmarkResult = await request("POST", "/benchmarking/bigquery/send", null, token);
        console.log('Benchmarking result:', benchmarkResult);

        console.log('--- Benchmarking Test Passed ---');
        process.exit(0);

    } catch (err) {
        console.error('Test failed:', err.message, err.response ? err.response : '');
        process.exit(1);
    }
}

run();
