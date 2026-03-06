import http from 'http';

const API_BASE = "http://localhost:3000";
let token = "";

function request(method, path, body = null, authToken = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    try {
        console.log("--- Benchmarking and Dashboard Final Verification ---");

        // Login
        const loginRes = await request("POST", "/auth/login", {
            userEmail: "test@sylvara.com",
            userPassword: "password123!"
        });

        if (loginRes.status !== 200) {
            console.log("Creating test user...");
            const regRes = await request("POST", "/auth/register", {
                userName: "Test",
                userLastname: "Bench",
                userBirthday: "1990-01-01",
                userEmail: `test_bench_${Date.now()}@sylvara.com`,
                userPassword: "password123!"
            });
            token = regRes.data.accessToken;
        } else {
            token = loginRes.data.accessToken;
        }

        // 1. Test POST /benchmarking/snapshot
        console.log("\n1. Testing POST /benchmarking/snapshot (Contrato v1.4.0)");
        const snapshotRes = await request("POST", "/benchmarking/snapshot", {
            googleAccessToken: "fake-test-token-123"
        }, token);

        if (snapshotRes.status === 200 || snapshotRes.status === 201) {
            console.log("✅ Passed: Endpoint reached successfully.");
            console.log("Response:", JSON.stringify(snapshotRes.data));
        } else {
            console.error(`❌ Failed: Status ${snapshotRes.status}`);
            console.error(snapshotRes.data);
        }

        // 1.5 Create a project for the user
        console.log("\n1.5 Creating a project for dashboard verification");
        const projectRes = await request("POST", "/projects", {
            samplingPlotName: "Finca La Armonía Test",
            totalArea: 100,
            unitId: 1
        }, token);
        if (projectRes.status === 201) {
            console.log("✅ Project created.");
        } else {
            console.warn("⚠️ Could not create project, dashboard verification might skip keys.");
        }

        // 2. Test GET /dashboard structure
        console.log("\n2. Testing GET /dashboard structure");
        const dashboardRes = await request("GET", "/dashboard", null, token);
        if (dashboardRes.status === 200) {
            const keys = Object.keys(dashboardRes.data);
            if (keys.includes('user') && keys.includes('summary') && keys.includes('latestPlots')) {
                console.log("✅ Passed: Dashboard structure is correct.");
                if (dashboardRes.data.latestPlots.length > 0) {
                    const first = dashboardRes.data.latestPlots[0];
                    console.log("Plot keys found:", Object.keys(first));
                    if (first.samplingPlotId !== undefined && first.samplingPlotName !== undefined && first.samplingPlotStatus !== undefined) {
                        console.log("✅ Passed: latestPlots uses correct long keys (samplingPlotId, samplingPlotName, samplingPlotStatus).");
                    } else {
                        console.error("❌ Failed: latestPlots missing required long keys.");
                    }
                } else {
                    console.warn("⚠️ No plots found even after creation, check DB sync.");
                }
            } else {
                console.error("❌ Failed: Dashboard missing required keys.");
                console.error(dashboardRes.data);
            }
        } else {
            console.error(`❌ Failed: GET /dashboard status ${dashboardRes.status}`);
        }

        console.log("\n--- Final Verification Completed ---");
    } catch (e) {
        console.error("Error:", e);
    }
}

runTests();
