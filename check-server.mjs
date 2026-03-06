import http from 'http';

async function checkServer() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3000/api/projects', (res) => {
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

async function run() {
    const isRunning = await checkServer();
    console.log(`Server running: ${isRunning}`);
}

run();
