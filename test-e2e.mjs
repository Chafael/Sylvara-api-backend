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
                    reject(new Error(`Request failed with status ${res.statusCode}`));
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

function checkKeys(obj, requiredKeys, optionalKeys, path) {
    if (!obj) throw new Error(`${path} is undefined or null`);
    const allKeys = [...requiredKeys, ...optionalKeys];
    for (const key of Object.keys(obj)) {
        if (!allKeys.includes(key)) {
            console.warn(`Unexpected key found in ${path}: ${key}`);
        }
    }
    for (const key of requiredKeys) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            throw new Error(`Missing required key in ${path}: ${key}`);
        }
    }
}

async function runTests() {
    let token = '';
    try {
        console.log("--- Starting E2E Contract Tests ---");

        // 1. Auth Setup
        const email = `test_${Date.now()}@example.com`;
        const password = "Password123!";
        console.log("1. /auth/register");
        let authData = await request("POST", "/auth/register", {
            userName: "Test",
            userLastname: "User",
            userBirthday: "1990-01-01",
            userEmail: email,
            userPassword: password
        });

        checkKeys(authData, ['accessToken', 'refreshToken', 'user'], [], 'AuthResponse');
        checkKeys(authData.user, ['userId', 'userName', 'userLastname', 'userBirthday', 'userEmail', 'profilePictureUrl', 'userRole'], [], 'AuthUser');

        token = authData.accessToken;

        console.log("2. /auth/me");
        const meData = await request("GET", "/auth/me", null, token);
        checkKeys(meData, ['userId', 'userName', 'userLastname', 'userBirthday', 'userEmail', 'profilePictureUrl', 'userRole'], [], 'AuthUser (me)');

        // 3. Projects
        console.log("3. Create POST /projects");
        const plotData = await request("POST", "/projects", {
            samplingPlotName: "Test Plot",
            description: "Test description",
            totalArea: 100.0,
            unitId: 1
        }, token);

        const reqPlotKeys = ['samplingPlotId', 'userId', 'samplingPlotName', 'totalArea', 'unitId', 'unitName', 'samplingPlotStatus', 'currentCycleNumber'];
        const optPlotKeys = ['description', 'startDate', 'endDate', 'globalMetrics', 'zonesDetails'];
        checkKeys(plotData, reqPlotKeys, optPlotKeys, 'Plot');

        const plotId = plotData.samplingPlotId;

        console.log("4. List GET /projects");
        const projectsList = await request("GET", "/projects", null, token);
        if (!Array.isArray(projectsList)) throw new Error("GET /projects should return an array");
        if (projectsList.length > 0) {
            checkKeys(projectsList[0], reqPlotKeys, optPlotKeys, 'Plot in list');
        }

        console.log("5. Get specific GET /projects/:id");
        const singlePlot = await request("GET", `/projects/${plotId}`, null, token);
        checkKeys(singlePlot, reqPlotKeys, optPlotKeys, 'Plot Detail');

        // 6. Zones
        console.log("6. Create POST /projects/:id/zones");
        const zoneData = await request("POST", `/projects/${plotId}/zones`, {
            nameStudyZone: "Test Zone",
            subArea: 10.0,
            unitId: 1
        }, token);
        checkKeys(zoneData, ['studyZoneId', 'nameStudyZone', 'subArea', 'unitId', 'unitName', 'cycleNumber'], ['indices', 'counts', 'speciesRecords'], 'StudyZone');
        const zoneId = zoneData.studyZoneId;

        console.log("7. List GET /projects/:id/zones");
        const zonesList = await request("GET", `/projects/${plotId}/zones`, null, token);
        checkKeys(zonesList, ['samplingPlotId', 'cycleNumber', 'globalMetrics', 'zones'], [], 'ZonesResponse');

        // 8. Species
        console.log("8. Create POST /projects/:id/zones/:zid/species");
        const speciesData = await request("POST", `/projects/${plotId}/zones/${zoneId}/species`, {
            speciesName: "Cedrela odorata",
            functionalTypeId: 1,
            individualCount: 5,
            heightStratumMin: 1.0,
            heightStratumMax: 5.0
        }, token);
        checkKeys(speciesData, ['speciesZoneId', 'speciesId', 'speciesName', 'functionalTypeId', 'functionalTypeName', 'individualCount', 'heightStratumMin', 'heightStratumMax', 'unitId', 'unitName', 'cycleNumber'], ['speciesImageUrl', 'createdAt', 'updatedAt'], 'SpeciesZoneRecord');

        console.log("9. List GET /projects/:id/zones/:zid/species");
        const speciesList = await request("GET", `/projects/${plotId}/zones/${zoneId}/species`, null, token);
        if (!Array.isArray(speciesList)) throw new Error("GET species should return an array");
        if (speciesList.length > 0) {
            checkKeys(speciesList[0], ['speciesZoneId', 'speciesId', 'speciesName', 'functionalTypeId', 'functionalTypeName', 'individualCount', 'heightStratumMin', 'heightStratumMax', 'unitId', 'unitName', 'cycleNumber'], ['speciesImageUrl', 'createdAt', 'updatedAt'], 'SpeciesZone in list');
        }

        console.log("10. Catalog GET /projects/:id/zones/:zid/species/catalog");
        const catalogList = await request("GET", `/projects/${plotId}/zones/${zoneId}/species/catalog`, null, token);
        if (!Array.isArray(catalogList)) throw new Error("GET catalog should return an array");
        if (catalogList.length > 0) {
            checkKeys(catalogList[0], ['speciesId', 'speciesName', 'functionalTypeName', 'totalIndividuals'], ['speciesImageUrl', 'createdAt', 'updatedAt'], 'CatalogItem');
        }

        // Dashboard
        console.log("11. GET /dashboard");
        const dashboard = await request("GET", "/dashboard", null, token);
        checkKeys(dashboard, ['user', 'summary', 'latestPlots'], [], 'DashboardResponse');
        checkKeys(dashboard.user, ['userName', 'profilePictureUrl'], [], 'DashboardResponse_user');
        checkKeys(dashboard.summary, ['totalHistoricalPlots', 'currentMonthPlots'], [], 'DashboardResponse_summary');
        if (dashboard.latestPlots.length > 0) {
            checkKeys(dashboard.latestPlots[0], ['samplingPlotId', 'samplingPlotName', 'description', 'totalArea', 'areaUnit', 'samplingPlotStatus', 'startDate'], ['endDate'], 'LatestPlotView');
        }

        console.log("12. GET /export/report-data/:id");
        const exportData = await request("GET", `/export/report-data/${plotId}`, null, token);
        checkKeys(exportData, ['projectName', 'totalArea', 'status', 'researcherName', 'researcherLastname', 'zonesDetails'], ['description', 'startDate', 'endDate'], 'ReportDataResponse');
        if (exportData.zonesDetails && exportData.zonesDetails.length > 0) {
            checkKeys(exportData.zonesDetails[0], ['zoneName', 'riqueza', 'totalIndividuos', 'indices', 'speciesRecords'], [], 'ZoneBiodiversity');
            if (exportData.zonesDetails[0].speciesRecords.length > 0) {
                checkKeys(exportData.zonesDetails[0].speciesRecords[0], ['speciesName', 'commonName', 'functionalTypeName', 'individualCount', 'heightStratumMin', 'heightStratumMax'], [], 'ReportSpeciesRecord');
            }
        }

        console.log("--- All tests passed! Contract compliance verified. ---");
        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err.message);
        process.exit(1);
    }
}

async function waitForServer() {
    console.log("Waiting for server to start...");
    for (let i = 0; i < 30; i++) {
        try {
            await request("GET", "/projects");
            console.log("Server is up!");
            return;
        } catch (e) {
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

waitForServer().then(runTests);
