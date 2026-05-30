/* =========================================
   CUSTOM RAIN
========================================= */

if (!AFRAME.components['custom-rain']) {

AFRAME.registerComponent('custom-rain', {

    init: function () {

        this.drops = [];

        for (let i = 0; i < 350; i++) {

            const geometry =
            new THREE.BoxGeometry(
                0.02,
                0.6,
                0.02
            );

            const material =
            new THREE.MeshBasicMaterial({

                color: '#ffffff',

                transparent: true,

                opacity: 0.3
            });

            const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

            mesh.position.set(

                (Math.random() - 0.5) * 40,

                Math.random() * 20,

                (Math.random() - 0.5) * 40
            );

            this.el.object3D.add(mesh);

            this.drops.push(mesh);
        }
    },

    tick: function (time, timeDelta) {

        const dt =
        Math.min(timeDelta, 100) / 1000;

        const fallSpeed = 22 * dt;

        for (let i = 0; i < this.drops.length; i++) {

            this.drops[i].position.y -= fallSpeed;

            if (this.drops[i].position.y < 0) {

                this.drops[i].position.y = 20;
            }
        }
    }
});
}

/* =========================================
   PANEL TOGGLE
========================================= */

const toggleBtn =
document.getElementById(
'toggleBtn'
);

const panel =
document.getElementById(
'panel'
);

toggleBtn.onclick = () => {

    panel.classList.toggle(
        'hidden'
    );

    toggleBtn.innerText =

    panel.classList.contains('hidden')

    ? '☰ Tampilkan Panel'

    : '✖ Sembunyikan Panel';
};

/* =========================================
   UI SCENARIO
========================================= */

const scenarioSelector =
document.getElementById(
'scenarioSelector'
);

const scenarioUIs =
document.querySelectorAll(
'.scenario-ui'
);

let activeScenario = 1;

scenarioSelector.onchange = () => {

    activeScenario =
    parseInt(
        scenarioSelector.value
    );

    scenarioUIs.forEach(ui => {

        ui.classList.remove(
            'active'
        );
    });

    document
    .getElementById(
        `ui-sc${activeScenario}`
    )
    .classList.add(
        'active'
    );

    resetSimulation();
};

/* =========================================
   SLIDER VALUE
========================================= */

function bindSliderValue(
sliderId,
textId,
suffix = ''
){

    const slider =
    document.getElementById(
        sliderId
    );

    const text =
    document.getElementById(
        textId
    );

    slider.oninput = () => {

        text.innerText =
        slider.value + suffix;
    };
}

bindSliderValue(
'accelSlider',
'accelValue'
);

bindSliderValue(
'speedSc2Slider',
'speedSc2Value'
);

bindSliderValue(
'speedSc3Slider',
'speedSc3Value'
);

bindSliderValue(
'speedRedSlider',
'speedRedValue'
);

bindSliderValue(
'speedBlueSlider',
'speedBlueValue'
);

/* =========================================
   CHART
========================================= */

const ctx =
document
.getElementById(
'velocityChart'
)
.getContext('2d');

const velocityChart =
new Chart(ctx, {

    type: 'line',

    data: {

        labels: [],

        datasets: [

        {
            label: 'Mobil Merah',

            data: [],

            borderColor: '#e74c3c',

            backgroundColor:
            'rgba(231,76,60,0.1)',

            borderWidth: 2,

            fill: false,

            pointRadius: 0
        },

        {
            label: 'Mobil Biru',

            data: [],

            borderColor: '#3498db',

            backgroundColor:
            'rgba(52,152,219,0.1)',

            borderWidth: 2,

            fill: false,

            pointRadius: 0
        }
        ]
    },

    options: {

        responsive: true,

        animation: false,

        scales: {

            x: {

                title: {

                    display: true,

                    text: 'Waktu (s)'
                }
            },

            y: {

                beginAtZero: true,

                title: {

                    display: true,

                    text: 'Kecepatan (km/jam)'
                }
            }
        }
    }
});

/* =========================================
   UPDATE GRAPH
========================================= */

function updateGraph(
speedRed,
speedBlue = 0
){

    velocityChart.data.labels.push(
        timeElapsed.toFixed(2)
    );

    velocityChart.data.datasets[0]
    .data.push(speedRed);

    velocityChart.data.datasets[1]
    .data.push(speedBlue);

    if (
        velocityChart.data.labels.length
        > 100
    ){

        velocityChart.data.labels.shift();

        velocityChart.data.datasets[0]
        .data.shift();

        velocityChart.data.datasets[1]
        .data.shift();
    }

    velocityChart.update('none');
}

/* =========================================
   OBJECT
========================================= */

const carRed =
document.getElementById(
'carRed'
);

const carBlue =
document.getElementById(
'carBlue'
);

const velocityVector =
document.getElementById(
'velocityVector'
);

const gate1 =
document.getElementById(
'gate1'
);

const gate2 =
document.getElementById(
'gate2'
);

const skidMarks =
document.getElementById(
'skidMarks'
);

const brakeSound =
document.getElementById(
'brakeSound'
);

const cameraRig =
document.getElementById(
'cameraRig'
);

/* =========================================
   UI
========================================= */

const dataDisplay =
document.getElementById(
'dataDisplay'
);

const timerDisplay =
document.getElementById(
'timerDisplay'
);

const statusText =
document.getElementById(
'statusText'
);

/* =========================================
   VARIABLE
========================================= */

let running = false;

let scenarioFinished = false;

let timeElapsed = 0;

let lastTime = 0;

let zRed = 0;

let zBlue = -50;

let xRed = 0;

let vRed = 0;

let vBlue = 0;

let aRed = 0;

let braking = false;

let sc2_gate1 = false;

let sc2_gate2 = false;

let sc2_t1 = 0;

let sc4_overtaking = false;

/* =========================================
   START
========================================= */

document
.getElementById(
'startBtn'
)
.onclick = () => {

    if (running) return;

    resetSimulation();

    running = true;

    scenarioFinished = false;

    lastTime = performance.now();

    statusText.innerText =
    'Status: Simulasi Berjalan';

    /* =========================
       SCENARIO 1
    ========================= */

    if (activeScenario === 1) {

        vRed = 0;

        aRed =
        parseFloat(
            document
            .getElementById(
                'accelSlider'
            ).value
        );

        velocityVector.setAttribute(
            'visible',
            true
        );
    }

    /* =========================
       SCENARIO 2
    ========================= */

    else if (activeScenario === 2) {

        vRed =
        document
        .getElementById(
            'speedSc2Slider'
        ).value / 3.6;

        gate1.setAttribute(
            'visible',
            true
        );

        gate2.setAttribute(
            'visible',
            true
        );
    }

    /* =========================
       SCENARIO 3
    ========================= */

    else if (activeScenario === 3) {

        vRed =
        document
        .getElementById(
            'speedSc3Slider'
        ).value / 3.6;

        const reactionTime = 1.5;

        const mu = 0.35;

        const reactionDistance =
        vRed * reactionTime;

        const brakingDistance =
        (vRed * vRed)
        /
        (2 * mu * 9.81);

        const totalStoppingDistance =
        reactionDistance
        +
        brakingDistance;

        document
        .getElementById(
            'stoppingDistance'
        )
        .innerText =
        totalStoppingDistance.toFixed(1);

        /* jarak realistis */

        const carLength = 6;

        zBlue =
        -(totalStoppingDistance
        + carLength);

        carBlue.setAttribute(
            'visible',
            true
        );
    }

    /* =========================
       SCENARIO 4
    ========================= */

    else if (activeScenario === 4) {

        vRed =
        document
        .getElementById(
            'speedRedSlider'
        ).value / 3.6;

        vBlue =
        document
        .getElementById(
            'speedBlueSlider'
        ).value / 3.6;

        carBlue.setAttribute(
            'visible',
            true
        );
    }

    animate();
};

/* =========================================
   RESET
========================================= */

document
.getElementById(
'resetBtn'
)
.onclick = resetSimulation;

function resetSimulation(){

    running = false;

    scenarioFinished = false;

    timeElapsed = 0;

    zRed = 0;

    zBlue = -50;

    xRed = 0;

    vRed = 0;

    vBlue = 0;

    aRed = 0;

    braking = false;

    sc2_gate1 = false;

    sc2_gate2 = false;

    sc2_t1 = 0;

    sc4_overtaking = false;

    carRed.setAttribute(
        'position',
        '0 -0.4 0'
    );

    carBlue.setAttribute(
        'position',
        '0 -0.4 -50'
    );

    carBlue.setAttribute(
        'visible',
        false
    );

    velocityVector.setAttribute(
        'visible',
        false
    );

    gate1.setAttribute(
        'visible',
        false
    );

    gate2.setAttribute(
        'visible',
        false
    );

    skidMarks.setAttribute(
        'visible',
        false
    );

    velocityChart.data.labels = [];

    velocityChart.data.datasets[0]
    .data = [];

    velocityChart.data.datasets[1]
    .data = [];

    velocityChart.update();

    dataDisplay.innerText =
    '0 km/jam';

    timerDisplay.innerText =
    'Waktu: 0.00 s';

    statusText.innerText =
    'Status: Siap';
}

/* =========================================
   ANIMATION
========================================= */

function animate(){

    if (!running) return;

    let now =
    performance.now();

    let dt =
    (now - lastTime) / 1000;

    lastTime = now;

    if (dt > 0.1)
    dt = 0.1;

    timeElapsed += dt;

    /* =====================================
       SCENARIO 1
    ===================================== */

    if (activeScenario === 1) {

        vRed += aRed * dt;

        zRed -= vRed * dt;

        velocityVector.setAttribute(
            'position',
            `0 1 ${zRed}`
        );

        velocityVector.setAttribute(
            'scale',
            `1 1 ${vRed * 0.3}`
        );

        updateGraph(
            vRed * 3.6
        );
    }

    /* =====================================
       SCENARIO 2
    ===================================== */

    else if (activeScenario === 2) {

        zRed -= vRed * dt;

        updateGraph(
            vRed * 3.6
        );

        if (
            !sc2_gate1
            &&
            zRed <= -50
        ){

            sc2_gate1 = true;

            sc2_t1 =
            timeElapsed;

            document
            .getElementById(
                't1Value'
            )
            .innerText =
            sc2_t1.toFixed(2)
            + ' s';
        }

        if (
            !sc2_gate2
            &&
            zRed <= -150
        ){

            sc2_gate2 = true;

            const t2 =
            timeElapsed;

            document
            .getElementById(
                't2Value'
            )
            .innerText =
            t2.toFixed(2)
            + ' s';

            const avgSpeed =
            100 /
            (t2 - sc2_t1);

            document
            .getElementById(
                'avgSpeedValue'
            )
            .innerText =
            (avgSpeed * 3.6)
            .toFixed(1);

            statusText.innerText =
            'Status: Kecepatan Terukur';

            scenarioFinished = true;
        }
    }

    /* =====================================
       SCENARIO 3
    ===================================== */

    else if (activeScenario === 3) {

        const distance =
        Math.abs(
            zBlue - zRed
        );

        if (
            distance <= 25
            &&
            !braking
        ){

            braking = true;

            brakeSound
            .play()
            .catch(()=>{});

            skidMarks.setAttribute(
                'visible',
                true
            );
        }

        if (braking) {

            vRed -=
            (0.35 * 9.81)
            * dt;

            if (vRed < 0)
            vRed = 0;
        }

        zRed -= vRed * dt;

        updateGraph(
            vRed * 3.6
        );

        skidMarks.setAttribute(
            'position',
            `0 -0.98 ${zRed + 3}`
        );

        if (
            zRed <= zBlue + 6
            &&
            vRed > 0
        ){

            statusText.innerText =
            'Status: Tabrakan!';

            scenarioFinished = true;
        }

        if (
            vRed <= 0
            &&
            braking
        ){

            statusText.innerText =
            'Status: Mobil Berhenti';

            scenarioFinished = true;
        }
    }

    /* =====================================
       SCENARIO 4
    ===================================== */

    else if (activeScenario === 4) {

        zRed -= vRed * dt;

        zBlue -= vBlue * dt;

        updateGraph(
            vRed * 3.6,
            vBlue * 3.6
        );

        const relativeSpeed =
        (vRed - vBlue) * 3.6;

        document
        .getElementById(
            'relSpeedValue'
        )
        .innerText =
        relativeSpeed.toFixed(1);

        const distance =
        zRed - zBlue;

        if (
            distance < 20
            &&
            distance > -15
        ){

            sc4_overtaking = true;

            xRed +=
            (-3.5 - xRed)
            * 0.05;
        }

        else if (
            distance <= -15
        ){

            xRed +=
            (0 - xRed)
            * 0.05;

            if (
                Math.abs(xRed)
                < 0.1
            ){

                statusText.innerText =
                'Status: Berhasil Menyalip!';

                scenarioFinished = true;
            }
        }
    }

    /* =====================================
       UPDATE POSITION
    ===================================== */

    carRed.setAttribute(
        'position',
        `${xRed} -0.4 ${zRed}`
    );

    carBlue.setAttribute(
        'position',
        `0 -0.4 ${zBlue}`
    );

    cameraRig.setAttribute(
        'position',
        `${xRed} 2 ${zRed + 6}`
    );

    dataDisplay.innerText =

    Math.round(vRed * 3.6)

    + ' km/jam';

    timerDisplay.innerText =

    'Waktu: '

    + timeElapsed.toFixed(2)

    + ' s';

    if(!scenarioFinished){

        requestAnimationFrame(
            animate
        );
    }
}