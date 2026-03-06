import http from 'http';

const API_BASE = "http://localhost:3000";
let token = "";
let plotId = 0;
let zoneId1 = 0;
let zoneId2 = 0;

function request(method, path, body = null, authToken = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
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
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                if (data) {
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {
                        parsed = data;
                    }
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', (err) => { reject(err); });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

function rand() {
    return Math.floor(Math.random() * 10000);
}

async function runTests() {
    try {
        console.log("--- Initializing Test Setup ---");
        // Login
        const loginRes = await request("POST", "/auth/login", {
            userEmail: "test@sylvara.com",
            userPassword: "password123!"
        });

        if (loginRes.status !== 200) {
            // Register if not exists
            const email = `test_edge_${rand()}@sylvara.com`;
            const regRes = await request("POST", "/auth/register", {
                userName: "Test",
                userLastname: "Edge",
                userBirthday: "1990-01-01",
                userEmail: email,
                userPassword: "password123!"
            });
            token = regRes.data.accessToken;
        } else {
            token = loginRes.data.accessToken;
        }

        // 1. Create Plot with totalArea = 100
        const plotRes = await request("POST", "/projects", {
            samplingPlotName: `Edge Plot ${rand()}`,
            description: "Testing edge cases",
            totalArea: 100.0,
            unitId: 1
        }, token);
        plotId = plotRes.data.samplingPlotId || plotRes.data.id;
        console.log(`Plot created: ${plotId} (Total Area: 100)`);
        console.log("Plot data:", JSON.stringify(plotRes.data));

        // ==========================================
        // Test 1: Exceso de Área (422)
        // ==========================================
        console.log("\\n1. Prueba de 'Exceso de Área' (Validación 422)");
        const zoneResFail = await request("POST", `/projects/${plotId}/zones`, {
            nameStudyZone: "Zona Excesiva",
            subArea: 150.0, // Exceeds 100
            unitId: 1
        }, token);

        if (zoneResFail.status === 422) {
            console.log("✅ Passed: Status 422 Unprocessable Entity");
            console.log(`   Message: ${zoneResFail.data.message}`);
        } else {
            console.error(`❌ Failed: Expected 422, got ${zoneResFail.status}`);
            console.error(zoneResFail.data);
        }

        // ==========================================
        // Test 2: Alturas Inválidas (422)
        // ==========================================
        console.log("\\n2. Prueba de 'Alturas Inválidas' (Validación 422)");
        // Create a valid zone first
        const zoneResOk = await request("POST", `/projects/${plotId}/zones`, {
            nameStudyZone: "Zona Normal",
            subArea: 50.0,
            unitId: 1
        }, token);
        zoneId1 = zoneResOk.data.studyZoneId;

        const speciesResFail = await request("POST", `/projects/${plotId}/zones/${zoneId1}/species`, {
            speciesName: "Arbol Prueba",
            functionalTypeId: 1,
            individualCount: 10,
            heightStratumMin: 15.0, // Mayor que max
            heightStratumMax: 10.0
        }, token);

        if (speciesResFail.status === 422) {
            console.log("✅ Passed: Status 422 Unprocessable Entity");
            console.log(`   Message: ${speciesResFail.data.message}`);
        } else {
            console.error(`❌ Failed: Expected 422, got ${speciesResFail.status}`);
            console.error(speciesResFail.data);
        }

        // ==========================================
        // Test 3: Especie Duplicada (Lógica 200/409)
        // ==========================================
        console.log("\\n3. Prueba de 'Especie Duplicada' (Lógica 200/409)");

        // Registrar especie válida
        const sName = `Pino ${rand()}`;
        console.log(`   Registrando especie: ${sName} en Zona ${zoneId1}`);
        await request("POST", `/projects/${plotId}/zones/${zoneId1}/species`, {
            speciesName: sName,
            functionalTypeId: 1,
            individualCount: 5,
            heightStratumMin: 1.0,
            heightStratumMax: 5.0
        }, token);

        // Acción A: Misma zona
        const dupZone1 = await request("POST", `/projects/${plotId}/zones/${zoneId1}/species`, {
            speciesName: sName,
            functionalTypeId: 1,
            individualCount: 2,
            heightStratumMin: 1.0,
            heightStratumMax: 5.0
        }, token);

        if (dupZone1.status === 409) {
            console.log("✅ Passed Acción A: Status 409 Conflict (Misma zona)");
            console.log(`   Code: ${dupZone1.data.code}`);
        } else {
            console.error(`❌ Failed Acción A: Expected 409, got ${dupZone1.status}`);
            console.error(dupZone1.data);
        }

        // Acción B: En otra zona
        const zoneRes2Ok = await request("POST", `/projects/${plotId}/zones`, {
            nameStudyZone: "Zona Secundaria",
            subArea: 30.0,
            unitId: 1
        }, token);
        zoneId2 = zoneRes2Ok.data.studyZoneId;

        const dupZone2 = await request("POST", `/projects/${plotId}/zones/${zoneId2}/species`, {
            speciesName: sName,
            functionalTypeId: 1,
            individualCount: 8,
            heightStratumMin: 2.0,
            heightStratumMax: 6.0
        }, token);

        if (dupZone2.status === 200) {
            console.log("✅ Passed Acción B: Status 200 OK (En otra zona)");
            console.log(`   Code: ${dupZone2.data.code}`);
            console.log(`   Reused speciesId: ${dupZone2.data.speciesId || dupZone2.data.existingRecord?.speciesId || 'Yes'}`);
        } else {
            console.error(`❌ Failed Acción B: Expected 200, got ${dupZone2.status}`);
            console.error(dupZone2.data);
        }

        // Wait a small delay for async Mongo sync to finish calculating indicies
        await new Promise(r => setTimeout(r, 1000));

        // ==========================================
        // Test 4: Verificación de Índices de Biodiversidad
        // ==========================================
        console.log("\\n4. Verificación de Índices de Biodiversidad (MongoDB)");

        // Add another different species to guarantee diversity > 0
        await request("POST", `/projects/${plotId}/zones/${zoneId1}/species`, {
            speciesName: `Roble ${rand()}`,
            functionalTypeId: 2,
            individualCount: 15,
            heightStratumMin: 5.0,
            heightStratumMax: 10.0
        }, token);

        // Wait for sync again
        await new Promise(r => setTimeout(r, 1000));

        const metricsRes = await request("GET", `/projects/${plotId}/zones`, null, token);

        if (metricsRes.status === 200) {
            const gm = metricsRes.data.globalMetrics;
            if (gm && gm.indices) {
                console.log("✅ Passed: globalMetrics recuperados exitosamente.");
                console.log(`   -> Shannon:  ${gm.indices.shannon}`);
                console.log(`   -> Simpson:  ${gm.indices.simpson}`);
                console.log(`   -> Margalef: ${gm.indices.margalef}`);
                console.log(`   -> Pielou:   ${gm.indices.pielou}`);

                const ok = gm.indices.shannon >= 0 && gm.indices.simpson >= 0 && gm.indices.margalef >= 0 && gm.indices.pielou >= 0;
                if (ok && (gm.indices.margalef > 0 || gm.indices.shannon > 0)) {
                    console.log("✅ Passed: Los índices muestran valores calculados (mayores a cero).");
                } else {
                    console.log("⚠️ Advertencia: Algunos índices están en 0. Verifica la fórmula.");
                }
            } else {
                console.error("❌ Failed: globalMetrics o indices no encontrados en la respuesta.");
                console.error(metricsRes.data);
            }
        } else {
            console.error(`❌ Failed: Expected 200 on GET zones, got ${metricsRes.status}`);
        }

        console.log("\\n--- Pruebas de Logica de Negocio Finalizadas ---");
    } catch (e) {
        console.error("Error running tests:", e);
    }
}

runTests();
