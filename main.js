import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// --- CONFIGURAÇÃO DE AMBIENTE ---
const scene = new THREE.Scene();

// Céu de Dia
const canvas = document.createElement('canvas');
canvas.width = 2; canvas.height = 512;
const context = canvas.getContext('2d');
const gradient = context.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, '#5da2ff');   
gradient.addColorStop(1, '#e0f0ff');   
context.fillStyle = gradient;
context.fillRect(0, 0, 2, 512);
scene.background = new THREE.CanvasTexture(canvas);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Auxiliares
const grid = new THREE.GridHelper(1000, 100, 0x888888, 0xbbbbbb);
scene.add(grid);
scene.add(new THREE.AxesHelper(5));

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(50, 100, 50);
scene.add(sun);

// --- SISTEMA DE COR E MATERIAL ---
window.changeModelColor = (colorHex) => {
    if (currentMesh) {
        currentMesh.material.color.set(colorHex);
    }
};

// --- SISTEMA DE EXPORTAÇÃO ---
window.exportModel = (format) => {
    if (!currentMesh) {
        alert("Carregue um modelo primeiro!");
        return;
    }

    statusText.innerText = `EXPORTANDO ${format.toUpperCase()}...`;
    
    if (format === 'obj') {
        const exporter = new OBJExporter();
        const result = exporter.parse(currentMesh);
        saveString(result, 'model.obj');
    } 
    else if (format === 'gltf') {
        const exporter = new GLTFExporter();
        exporter.parse(currentMesh, (result) => {
            const output = JSON.stringify(result, null, 2);
            saveString(output, 'model.gltf');
        }, { binary: false });
    }
    
    statusText.innerText = "EXPORTAÇÃO CONCLUÍDA";
};

function saveString(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// --- LÓGICA DE ROTAÇÃO ---
let rotateStep = 90;
window.updateRotateStep = (val) => { rotateStep = parseFloat(val) || 0; };

window.rotateModel = (axis) => {
    if (!currentMesh) return;
    const rad = THREE.MathUtils.degToRad(rotateStep);
    if (axis === 'x') currentMesh.rotation.x += rad;
    if (axis === 'y') currentMesh.rotation.y += rad;
    if (axis === 'z') currentMesh.rotation.z += rad;
};

// --- WORKER E CARREGAMENTO ---
const workerCode = `
    self.onmessage = function(e) {
        try {
            const buffer = e.data;
            const view = new DataView(buffer);
            const decoder = new TextDecoder();
            const header = decoder.decode(buffer.slice(0, 12));

            if (header.includes("version 2") || header.includes("version 4")) {
                const numVerts = view.getUint32(17, true);
                const numFaces = view.getUint32(21, true);
                const headerSize = view.getUint16(13, true);
                const vertSize = view.getUint8(15);
                const pos = new Float32Array(numVerts * 3);
                const norm = new Float32Array(numVerts * 3);
                const idx = new Uint32Array(numFaces * 3);
                let offset = 13 + headerSize;
                for(let i=0; i<numVerts; i++) {
                    let p = offset + (i * vertSize);
                    pos[i*3] = view.getFloat32(p, true);
                    pos[i*3+1] = view.getFloat32(p+4, true);
                    pos[i*3+2] = view.getFloat32(p+8, true);
                    norm[i*3] = view.getFloat32(p+12, true);
                    norm[i*3+1] = view.getFloat32(p+16, true);
                    norm[i*3+2] = view.getFloat32(p+20, true);
                }
                let fOffset = offset + (numVerts * vertSize);
                for(let i=0; i<numFaces; i++) {
                    let f = fOffset + (i * 12);
                    idx[i*3] = view.getUint32(f, true);
                    idx[i*3+1] = view.getUint32(f+4, true);
                    idx[i*3+2] = view.getUint32(f+8, true);
                }
                self.postMessage({type: 'done', pos, norm, idx}, [pos.buffer, norm.buffer, idx.buffer]);
            } else if (header.includes("version 1.")) {
                const text = decoder.decode(buffer);
                const blockRegex = /\\[(.*?)\\]/g;
                const allValues = [];
                let match;
                while ((match = blockRegex.exec(text)) !== null) {
                    allValues.push(...match[1].split(',').map(v => parseFloat(v.trim())));
                }
                const vertCount = Math.floor(allValues.length / 9);
                const pos = new Float32Array(vertCount * 3);
                const norm = new Float32Array(vertCount * 3);
                for(let i=0; i<vertCount; i++) {
                    const base = i * 9;
                    pos[i*3]=allValues[base]; pos[i*3+1]=allValues[base+1]; pos[i*3+2]=allValues[base+2];
                    norm[i*3]=allValues[base+3]; norm[i*3+1]=allValues[base+4]; norm[i*3+2]=allValues[base+5];
                }
                self.postMessage({type: 'done', pos, norm}, [pos.buffer, norm.buffer]);
            }
        } catch(e) { self.postMessage({type: 'error', msg: e.message}); }
    };
`;

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
let worker, currentMesh;

const fileInput = document.getElementById('file');
const statusText = document.getElementById('status');
const progressBar = document.getElementById('progress-bar');

fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    statusText.innerText = `LOADING: ${file.name}`;
    progressBar.style.width = "40%";
    const buffer = await file.arrayBuffer();
    if (worker) worker.terminate();
    worker = new Worker(URL.createObjectURL(workerBlob));
    worker.onmessage = (msg) => {
        if(msg.data.type === 'done') renderMesh(msg.data);
    };
    worker.postMessage(buffer, [buffer]);
};

function renderMesh(data) {
    if(currentMesh) scene.remove(currentMesh);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    if(data.norm) geometry.setAttribute('normal', new THREE.BufferAttribute(data.norm, 3));
    if(data.idx) geometry.setIndex(new THREE.BufferAttribute(data.idx, 1));
    if(!data.norm) geometry.computeVertexNormals();
    geometry.center();

    const material = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
    currentMesh = new THREE.Mesh(geometry, material);
    currentMesh.rotation.x = -Math.PI / 2; 
    scene.add(currentMesh);

    geometry.computeBoundingSphere();
    const r = geometry.boundingSphere.radius;
    camera.position.set(r*2, r*2, r*2);
    controls.target.set(0,0,0);
    progressBar.style.width = "100%";
    statusText.innerText = "RENDER READY";
}

window.toggleWireframe = () => { if(currentMesh) currentMesh.material.wireframe = !currentMesh.material.wireframe; };

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
