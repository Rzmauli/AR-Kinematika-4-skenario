// --- LOGIKA EFEK HUJAN ---
if (!AFRAME.components['custom-rain']) {
    AFRAME.registerComponent('custom-rain', {
        init: function () {
            this.drops = [];
            for (let i = 0; i < 350; i++) {
                const geometry = new THREE.BoxGeometry(0.02, 0.6, 0.02);
                const material = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3 });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set((Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40);
                this.el.object3D.add(mesh);
                this.drops.push(mesh);
            }
        },
        tick: function (time, timeDelta) {
            const dt = Math.min(timeDelta, 100) / 1000;
            const fallSpeed = 22 * dt; 
            for (let i = 0; i < this.drops.length; i++) {
                this.drops[i].position.y -= fallSpeed;
                if (this.drops[i].position.y < 0) this.drops[i].position.y = 20;
            }
        }
    });
}

// ==========================================
// KONTROL UI & SELEKTOR SKENARIO
// ==========================================
const toggleBtn = document.getElementById("toggleBtn");
const panel = document.getElementById("panel");
if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", () => {
        panel.classList.toggle("hidden");
        toggleBtn.innerHTML = panel.classList.contains("hidden") ? "☰ Tampilkan Panel" : "✖ Sembunyikan Panel";
        toggleBtn.style.background = panel.classList.contains("hidden") ? "#2ecc71" : "#34495e";
    });
}

const scenarioSelector = document.getElementById("scenarioSelector");
const uis = document.querySelectorAll(".scenario-ui");
let activeScenario = 1;

const carRed = document.getElementById("carRed") || document.querySelector("#mobilA");
const carBlue = document.getElementById("carBlue") || document.querySelector("#mobilB");
const cameraRig = document.getElementById("cameraRig");
const vectorObj = document.getElementById("velocityVector");
const gate1 = document.getElementById("gate1");
const gate2 = document.getElementById("gate2");
const skidMarks = document.getElementById("skidMarks");
const statusText = document.getElementById("statusText") || document.getElementById("status");
const dataDisplay = document.getElementById("dataDisplay") || document.getElementById("speedometer");
const timerDisplay = document.getElementById("timerDisplay");
const brakeSound = document.getElementById("brakeSound");

// --- CANVAS GRAFIK TUNGGAL ---
const chartCanvas = document.getElementById("velocityChart");

Chart.defaults.font.size = 10;
let simulationChart = null;

// Fungsi membangun ulang grafik sesuai kebutuhan Skenario
function initChartForScenario(scenario) {
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext("2d");
    
    // Jika grafik lama ada, hancurkan terlebih dahulu untuk mencegah tumpang tindih (glitch visual)
    if (simulationChart) {
        simulationChart.destroy();
    }

    let config = {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: { title: { display: true, text: 'Waktu (s)' } },
                y: { beginAtZero: true, title: { display: true, text: 'Nilai' } }
            }
        }
    };

    // Konfigurasi dinamis sumbu Y dan garis berdasarkan nomor skenario yang aktif
    if (scenario === 1) {
        config.data.datasets = [{
            label: 'Kecepatan (km/jam)',
            data: [],
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            borderWidth: 2,
            fill: true,
            pointRadius: 0
        }];
        config.options.scales.y.title.text = 'Kec (km/jam)';
    } else if (scenario === 2) {
        config.data.datasets = [{
            label: 'Jarak Tempuh Total (m)',
            data: [],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            fill: true,
            pointRadius: 0
        }];
        config.options.scales.y.title.text = 'Jarak (m)';
    } else if (scenario === 3) {
        config.data.datasets = [{
            label: 'Kecepatan Pengereman (km/jam)',
            data: [],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderWidth: 2,
            fill: true,
            pointRadius: 0
        }];
        config.options.scales.y.title.text = 'Kec (km/jam)';
    } else if (scenario === 4) {
        config.data.datasets = [
            {
                label: 'Mobil Merah (m)',
                data: [],
                borderColor: '#e74c3c',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            },
            {
                label: 'Mobil Biru (m)',
                data: [],
                borderColor: '#2980b9',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            }
        ];
        config.options.scales.y.title.text = 'Posisi Koordinat Z (m)';
    }

    simulationChart = new Chart(ctx, config);
}

if (scenarioSelector) {
    scenarioSelector.addEventListener("change", (e) => {
        activeScenario = parseInt(e.target.value);
        uis.forEach(ui => ui.classList.remove("active"));
        const activeUi = document.getElementById(`ui-sc${activeScenario}`);
        if (activeUi) activeUi.classList.add("active");
        
        initChartForScenario(activeScenario); // Muat template grafik baru
        resetSimulation();
    });
}

// --- VARIABLES ---
let running = false, timeElapsed = 0, lastTime = 0;
let zRed = 0, zBlue = 0, xRed = 0;
let vRed = 0, vBlue = 0, aRed = 0; 
let sc2_t1 = 0, sc2_t2 = 0;
let sc3_braking = false, sc3_skidLength = 0;
let sc4_overtaking = false;

// --- SLIDERS EVENT LISTENERS ---
const accelSlider = document.getElementById("accelSlider");
if (accelSlider) {
    accelSlider.oninput = (e) => {
        const valEl = document.getElementById("accelValue");
        if (valEl) valEl.innerText = e.target.value;
    };
}

const speedSc2Slider = document.getElementById("speedSc2Slider");
if (speedSc2Slider) {
    speedSc2Slider.oninput = (e) => {
        const valEl = document.getElementById("speedSc2Value");
        if (valEl) valEl.innerText = e.target.value;
    };
}

const speedSc3Slider = document.getElementById("speedSc3Slider");
if (speedSc3Slider) {
    speedSc3Slider.oninput = (e) => {
        let v = e.target.value / 3.6;
        const valEl = document.getElementById("speedSc3Value");
        if (valEl) valEl.innerText = e.target.value;
        let d_r = v * 1.5; 
        let d_b = (v * v) / (2 * 0.35 * 9.81); 
        const stopDistEl = document.getElementById("stoppingDistance");
        if (stopDistEl) stopDistEl.innerText = (d_r + d_b).toFixed(2);
    };
}

const speedRedSlider = document.getElementById("speedRedSlider");
if (speedRedSlider) {
    speedRedSlider.oninput = (e) => {
        const valEl = document.getElementById("speedRedValue");
        if (valEl) valEl.innerText = e.target.value;
        updateRelSpeed();
    };
}

const speedBlueSlider = document.getElementById("speedBlueSlider");
if (speedBlueSlider) {
    speedBlueSlider.oninput = (e) => {
        const valEl = document.getElementById("speedBlueValue");
        if (valEl) valEl.innerText = e.target.value;
        updateRelSpeed();
    };
}

function updateRelSpeed() {
    const sRed = document.getElementById("speedRedSlider");
    const sBlue = document.getElementById("speedBlueSlider");
    const relSpeedVal = document.getElementById("relSpeedValue");
    if (sRed && sBlue && relSpeedVal) {
        let vR = sRed.value; 
        let vB = sBlue.value;
        relSpeedVal.innerText = Math.max(0, vR - vB);
    }
}

// --- START SIMULATION ---
const startBtn = document.getElementById("startBtn");
if (startBtn) {
    startBtn.onclick = () => {
        if (running) return;
        resetSimulation();
        running = true;
        lastTime = performance.now();
        if (statusText) statusText.innerText = "Status: Berjalan...";
        
        if (activeScenario === 1) {
            vRed = 0;
            const accSl = document.getElementById("accelSlider");
            aRed = accSl ? parseFloat(accSl.value) : 2;
        } else if (activeScenario === 2) {
            const spSc2 = document.getElementById("speedSc2Slider");
            vRed = spSc2 ? (spSc2.value / 3.6) : (60 / 3.6);
            const t1V = document.getElementById("t1Value");
            const t2V = document.getElementById("t2Value");
            const avgV = document.getElementById("avgSpeedValue");
            if (t1V) t1V.innerText = "-";
            if (t2V) t2V.innerText = "-";
            if (avgV) avgV.innerText = "-";
        } else if (activeScenario === 3) {
            const spSc3 = document.getElementById("speedSc3Slider");
            vRed = spSc3 ? (spSc3.value / 3.6) : (50 / 3.6);
            zRed = 0; 
            
            let d_r = vRed * 1.5; 
            let d_b = (vRed * vRed) / (2 * 0.35 * 9.81);
            let total_ds = d_r + d_b;

            zBlue = -(total_ds + 30); 
            if (carBlue) carBlue.setAttribute("position", `0 -0.4 ${zBlue}`);
            
        } else if (activeScenario === 4) {
            const spRed = document.getElementById("speedRedSlider");
            const spBlue = document.getElementById("speedBlueSlider");
            vRed = spRed ? (spRed.value / 3.6) : (80 / 3.6);
            vBlue = spBlue ? (spBlue.value / 3.6) : (60 / 3.6);
            zRed = 0; 
            zBlue = -60;
        }
        animate();
    };
}

// --- RESET SIMULATION ---
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
    resetBtn.onclick = resetSimulation;
}

function resetSimulation() {
    running = false; timeElapsed = 0;
    zRed = 0; zBlue = -50; xRed = 0;
    vRed = 0; vBlue = 0;
    sc2_t1 = 0; sc2_t2 = 0; sc3_braking = false; sc3_skidLength = 0; sc4_overtaking = false;

    if (carRed) {
        carRed.setAttribute("position", "0 -0.4 0");
        carRed.setAttribute("rotation", "0 180 0");
    }
    if (cameraRig) cameraRig.setAttribute("position", "0 2 6");
    
    if (carBlue) carBlue.setAttribute("visible", (activeScenario === 3 || activeScenario === 4) ? "true" : "false");
    if (vectorObj) vectorObj.setAttribute("visible", activeScenario === 1 ? "true" : "false");
    if (gate1) gate1.setAttribute("visible", activeScenario === 2 ? "true" : "false");
    if (gate2) gate2.setAttribute("visible", activeScenario === 2 ? "true" : "false");
    if (skidMarks) skidMarks.setAttribute("visible", "false");
    
    if ((activeScenario === 3 || activeScenario === 4) && carBlue) {
        carBlue.setAttribute("position", `0 -0.4 ${zBlue}`);
    }

    // Bersihkan data lama pada grafik tunggal saat menekan tombol reset
    if (simulationChart) {
        simulationChart.data.labels = [];
        simulationChart.data.datasets.forEach(dataset => dataset.data = []);
        simulationChart.update();
    }

    if (statusText) statusText.innerText = "Status: Direset";
    if (dataDisplay) dataDisplay.innerText = "0 km/jam";
    if (timerDisplay) timerDisplay.innerText = "Waktu: 0.00 s";
    if (brakeSound) { brakeSound.pause(); brakeSound.currentTime = 0; }
}

// --- ANIMATION LOOP ---
function animate() {
    if (!running) return;
    let now = performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    timeElapsed += dt;

    if (activeScenario === 1) {
        vRed += aRed * dt; zRed -= vRed * dt; 
        if (vectorObj) {
            let arrowScale = Math.max(0.1, vRed * 0.2);
            vectorObj.setAttribute("scale", `1 1 ${arrowScale}`);
            vectorObj.setAttribute("position", `0 1.5 ${zRed}`);
        }
        
        // Update grafik Skenario 1 (Kecepatan GLBB)
        if (simulationChart) {
            simulationChart.data.labels.push(timeElapsed.toFixed(1));
            simulationChart.data.datasets[0].data.push((vRed * 3.6).toFixed(1));
            simulationChart.update('none');
        }
        
        if (vRed * 3.6 >= 140) running = false;
    }
    else if (activeScenario === 2) {
        zRed -= vRed * dt;
        
        // Update grafik Skenario 2 (Jarak Tempuh Kamera Kecepatan)
        if (simulationChart) {
            simulationChart.data.labels.push(timeElapsed.toFixed(1));
            simulationChart.data.datasets[0].data.push(Math.abs(zRed).toFixed(1));
            simulationChart.update('none');
        }

        if (zRed <= -50 && sc2_t1 === 0) { 
            sc2_t1 = timeElapsed; 
            const t1V = document.getElementById("t1Value");
            if (t1V) t1V.innerText = sc2_t1.toFixed(2); 
        }
        if (zRed <= -150 && sc2_t2 === 0) {
            sc2_t2 = timeElapsed; 
            const t2V = document.getElementById("t2Value");
            if (t2V) t2V.innerText = sc2_t2.toFixed(2);
            let dt_gate = sc2_t2 - sc2_t1; 
            let v_avg_ms = 100 / dt_gate;
            const avgV = document.getElementById("avgSpeedValue");
            if (avgV) avgV.innerText = (v_avg_ms * 3.6).toFixed(1);
            if (statusText) statusText.innerText = "Status: Melewati Gate 2!"; 
            running = false;
        }
    }
    else if (activeScenario === 3) {
        if (timeElapsed >= 1.5) { 
            if (!sc3_braking) {
                sc3_braking = true;
                if (statusText) statusText.innerText = "Status: Rem Diinjak!";
                if (skidMarks) skidMarks.setAttribute("visible", "true");
                if (brakeSound) brakeSound.play();
            }
            vRed -= (0.35 * 9.81) * dt;
            if (vRed < 0) vRed = 0;
            
            sc3_skidLength += (vRed * dt);
            if (skidMarks) {
                skidMarks.setAttribute("height", sc3_skidLength);
                skidMarks.setAttribute("position", `0 -0.98 ${zRed + sc3_skidLength/2}`);
            }
        }
        zRed -= vRed * dt;
        
        // Update grafik Skenario 3 (Dekelerasi Pengereman)
        if (simulationChart) {
            simulationChart.data.labels.push(timeElapsed.toFixed(1));
            simulationChart.data.datasets[0].data.push((vRed * 3.6).toFixed(1));
            simulationChart.update('none');
        }

        if (zRed <= zBlue + 28) { 
            zRed = zBlue + 28; 
            if (statusText) statusText.innerText = "Status: Tabrakan (Gagal Berhenti)!"; 
            running = false;
        } else if (vRed === 0 && sc3_braking) {
            let jarakSisa = Math.abs(zRed - zBlue) - 28;
            if (statusText) statusText.innerText = `Status: Berhenti Aman (Sisa Gap: ${Math.max(0, jarakSisa).toFixed(1)} m)`; 
            running = false;
        }
    }
    else if (activeScenario === 4) {
        zRed -= vRed * dt; zBlue -= vBlue * dt;
        if (carBlue) carBlue.setAttribute("position", `0 -0.4 ${zBlue}`);

        // Update grafik Skenario 4 (Dua Garis: Posisi Mobil Merah vs Mobil Biru)
        if (simulationChart) {
            simulationChart.data.labels.push(timeElapsed.toFixed(1));
            simulationChart.data.datasets[0].data.push(Math.abs(zRed).toFixed(1)); 
            simulationChart.data.datasets[1].data.push(Math.abs(zBlue).toFixed(1)); 
            simulationChart.update('none');
        }

        let jarak = zRed - zBlue; 
        if (jarak < 20 && jarak > -15) {
            sc4_overtaking = true;
            xRed += (-3.5 - xRed) * 0.05; 
        } else if (jarak <= -15) {
            xRed += (0 - xRed) * 0.05; 
            if (Math.abs(xRed) < 0.1) { 
                if (statusText) statusText.innerText = "Status: Berhasil Menyalip!"; 
                running = false; 
            }
        }
    }

    if (carRed) carRed.setAttribute("position", `${xRed} -0.4 ${zRed}`);
    if (cameraRig) cameraRig.setAttribute("position", `${xRed} 2 ${zRed + 6}`); 
    if (dataDisplay) dataDisplay.innerText = Math.round(vRed * 3.6) + " km/jam";
    if (timerDisplay) timerDisplay.innerText = "Waktu: " + timeElapsed.toFixed(2) + " s";
    if (running) requestAnimationFrame(animate);
}

// --- BUAT MARKA JALAN 3D ---
const container = document.getElementById("markaContainer");
if (container) {
    for (let i = 0; i < 5000; i += 15) {
        let marka = document.createElement("a-box");
        marka.setAttribute("position", `0 -0.97 ${-10 - i}`);
        marka.setAttribute("width", "0.4");
        marka.setAttribute("height", "0.02");
        marka.setAttribute("depth", "6");
        marka.setAttribute("color", "white");
        container.appendChild(marka);
    }
}

// Jalankan inisialisasi awal saat pertama kali web dimuat
initChartForScenario(1);
resetSimulation();
