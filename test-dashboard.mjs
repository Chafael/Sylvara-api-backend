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
                    parsed = data;
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
        console.log('--- Starting Dashboard Test with Data ---');

        // 1. Auth
        const email = `dashboard_data_${Date.now()}@example.com`;
        const password = "Password123!";
        console.log('1. /auth/register');
        const authData = await request("POST", "/auth/register", {
            userName: "DashboardData",
            userLastname: "Tester",
            userBirthday: "1990-01-01",
            userEmail: email,
            userPassword: password
        });

        const token = authData.accessToken;

        // 2. Create Project
        console.log("2. Create POST /projects");
        const plotData = await request("POST", "/projects", {
            samplingPlotName: "Finca La Armonía",
            description: "Proyecto de prueba con datos",
            totalArea: 150.0,
            unitId: 1
        }, token);
        const plotId = plotData.samplingPlotId;

        // 3. Create Zone
        console.log("3. Create POST /projects/:id/zones");
        const zoneData = await request("POST", `/projects/${plotId}/zones`, {
            nameStudyZone: "Zona de prueba",
            subArea: 20.0,
            unitId: 1
        }, token);
        const zoneId = zoneData.studyZoneId;

        // 4. Create Species
        console.log("4. Create POST /projects/:id/zones/:zid/species");
        await request("POST", `/projects/${plotId}/zones/${zoneId}/species`, {
            speciesName: "Cedrela odorata",
            functionalTypeId: 1,
            individualCount: 15,
            heightStratumMin: 1.0,
            heightStratumMax: 5.0
        }, token);


        // 5. Get Dashboard
        console.log('5. GET /dashboard');
        const dashboardResult = await request("GET", "/dashboard", null, token);
        console.log('Dashboard result:', JSON.stringify(dashboardResult, null, 2));

        console.log('--- Dashboard Test with Data Passed ---');
        process.exit(0);

    } catch (err) {
        console.error('Test failed:', err.message, err.response ? err.response : '');
        process.exit(1);
    }
}

run();
