import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// --- AMBIENTE E CENA ---
const scene = new THREE.Scene();

// 🌌 CÉU ESTILO BLENDER (SHADER WORLD)
// Criamos uma esfera gigante que envolve tudo e brilha sozinha
const skyVertex = `
    varying vec3 vWorldPosition;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const skyFragment = `
    varying vec3 vWorldPosition;
    void main() {
        vec3 dir = normalize(vWorldPosition);
        // Gradiente entre a cor do Horizonte e a cor do Topo (Zenith)
        float skyGrad = max(0.0, dot(dir, vec3(0.0, 1.0, 0.0)));
        vec3 skyColor = mix(vec3(0.1, 0.12, 0.15), vec3(0.02, 0.2, 0.5), skyGrad);
        gl_FragColor = vec4(skyColor, 1.0);
    }
`;

const skyGeo = new THREE.SphereGeometry(50000, 32, 32);
const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide, // Importante: renderiza o lado de DENTRO da esfera
    depthWrite: false     // Garante que o céu fique sempre atrás de tudo
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// --- CONFIGURAÇÃO DA CÂMERA ---
// Aumentamos o "far" (1000000) para o céu não sumir
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- ILUMINAÇÃO ESTILO ENGINE ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(200, 500, 200);
scene.add(sun);

// Grid de Referência (Chão)
const grid = new THREE.GridHelper(2000, 100, 0x00a8ff, 0x222222);
grid.material.opacity = 0.15;
grid.material.transparent = true;
scene.add(grid);

// --- LÓGICA DE UI ---
const statusMsg = document.getElementById('status-msg');
const progressBar = document.getElementById('progress-bar');
const fileInput = document.getElementById('file');

let currentMesh = null;
let rotateStep = 90;

// Exportando funções para o HTML
window.changeModelColor = (c) => { if(currentMesh) currentMesh.material.color.set(c); };
window.toggleWireframe = () => { if(currentMesh) currentMesh.material.wireframe = !currentMesh.material.wireframe; };
window.updateRotateStep = (v) => { rotateStep = parseFloat(v) || 0; };
window.rotateModel = (a) => { if(currentMesh) currentMesh.rotation[a] += THREE.MathUtils.degToRad(rotateStep); };

// --- WORKER DE PROCESSAMENTO ---
const workerCode = `
    self.onmessage = function(e) {
        const { buffer } = e.data;
        const decoder = new TextDecoder();
        const header = decoder.decode(buffer.slice(0, 15));
        
        try {
            if (header.includes("version 2") || header.includes("version 4")) {
                const view = new DataView(buffer);
                const headerSize = view.getUint16(13, true);
                const vertSize = view.getUint8(15);
                const numVerts = view.getUint32(17, true);
                const numFaces = view.getUint32(21, true);
                
                let offset = 13 + headerSize;
                const pos = new Float32Array(numVerts * 3);
                const norm = new Float32Array(numVerts * 3);
                const idx = new Uint32Array(numFaces * 3);

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
                self.postMessage({ type: 'done', pos, norm, idx, version: header });
            } else {
                self.postMessage({ type: 'error', msg: 'RBXM/MESH V1 detectado. Extraindo via fallback...' });
            }
        } catch(err) { self.postMessage({ type: 'error', msg: err.message }); }
    };
`;

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
let meshWorker = new Worker(URL.createObjectURL(workerBlob));

fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusMsg.innerText = `ENGINE_READING: ${file.name.toUpperCase()}`;
    progressBar.style.width = "40%";

    const buffer = await file.arrayBuffer();
    meshWorker.terminate();
    meshWorker = new Worker(URL.createObjectURL(workerBlob));
    
    meshWorker.onmessage = (m) => {
        if (m.data.type === 'done') renderModel(m.data);
        else statusMsg.innerText = m.data.msg;
    };
    meshWorker.postMessage({ buffer }, [buffer]);
};

function renderModel(data) {
    if (currentMesh) scene.remove(currentMesh);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(data.norm, 3));
    if (data.idx) geo.setIndex(new THREE.BufferAttribute(data.idx, 1));
    geo.center();

    // Shader View Model: Brilhante e nítido
    const mat = new THREE.MeshPhysicalMaterial({
        color: 0x999999, metalness: 0.8, roughness: 0.1,
        reflectivity: 1.0, clearcoat: 1.0, side: THREE.DoubleSide
    });

    currentMesh = new THREE.Mesh(geo, mat);
    currentMesh.rotation.x = -Math.PI / 2;
    scene.add(currentMesh);

    geo.computeBoundingSphere();
    const r = geo.boundingSphere.radius;
    camera.position.set(r*2, r*1.5, r*2);
    controls.target.set(0, 0, 0);
    
    progressBar.style.width = "100%";
    statusMsg.innerText = `READY: ${data.version.toUpperCase()}`;
}

// Animação Loop
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
