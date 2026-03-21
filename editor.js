import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// --- CONFIGURAÇÃO DA CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111112);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(50, 50, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Gizmo de Transformação
const transformControl = new TransformControls(camera, renderer.domElement);
scene.add(transformControl);

transformControl.addEventListener('dragging-changed', (e) => {
    controls.enabled = !e.value;
    if (!e.value) syncUI(); 
});

// --- VARIÁVEIS DE ESTADO ---
let objectsInScene = new Map();
let selectedObjectId = null;
const objectListUI = document.getElementById('object-list');

// --- SISTEMA DE MODOS E INCREMENTO ---
window.setEditorMode = (mode) => {
    transformControl.setMode(mode);
    
    // Atualiza visibilidade dos painéis
    document.getElementById('panel-move').style.display = (mode === 'translate') ? 'block' : 'none';
    document.getElementById('panel-rotate').style.display = (mode === 'rotate') ? 'block' : 'none';
    document.getElementById('panel-scale').style.display = (mode === 'scale') ? 'block' : 'none';

    // Estilo dos botões
    document.querySelectorAll('.rotation-grid .tool-btn').forEach(btn => btn.style.borderColor = 'var(--border-color)');
    const activeBtn = document.getElementById(`btn-${mode === 'translate' ? 'move' : mode === 'rotate' ? 'rotate' : 'scale'}`);
    if(activeBtn) activeBtn.style.borderColor = 'var(--accent)';
};

window.updateSnap = () => {
    const val = parseFloat(document.getElementById('snap-value').value) || 0.1;
    transformControl.setTranslationSnap(val);
    transformControl.setRotationSnap(THREE.MathUtils.degToRad(val * 10)); // Ajuste proporcional para rotação
    transformControl.setScaleSnap(val);
};

// --- CARREGAMENTO DE ARQUIVOS ---
const fileInput = document.getElementById('file-import');
fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'obj') {
            const text = await file.text();
            const obj = new OBJLoader().parse(text);
            obj.name = file.name;
            setupObject(obj);
        } else {
            // Aqui entraria sua lógica de .mesh vinda do Worker
            // Por enquanto, placeholder para evitar erro
            const geo = new THREE.BoxGeometry(5,5,5);
            const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color: 0x888888}));
            mesh.name = file.name;
            setupObject(mesh);
        }
    }
};

function setupObject(obj) {
    const id = THREE.MathUtils.generateUUID();
    obj.userData.id = id;
    scene.add(obj);
    objectsInScene.set(id, obj);
    updateUIList();
    selectObject(id);
}

// --- SELEÇÃO E INTERFACE ---
function selectObject(id) {
    selectedObjectId = id;
    const obj = objectsInScene.get(id);
    if(!obj) return;

    transformControl.attach(obj);
    syncUI();
    updateUIList();
}

window.deleteObject = (id) => {
    const obj = objectsInScene.get(id);
    if(obj) {
        if(selectedObjectId === id) transformControl.detach();
        scene.remove(obj);
        objectsInScene.delete(id);
        updateUIList();
    }
};

function updateUIList() {
    objectListUI.innerHTML = '';
    objectsInScene.forEach((obj, id) => {
        const div = document.createElement('div');
        div.className = `object-item ${selectedObjectId === id ? 'selected' : ''}`;
        div.innerHTML = `<span>${obj.name}</span><span class="delete-btn" onclick="deleteObject('${id}')">✕</span>`;
        div.onclick = () => selectObject(id);
        objectListUI.appendChild(div);
    });
}

// Sincroniza os inputs quando movemos com o mouse
function syncUI() {
    const obj = objectsInScene.get(selectedObjectId);
    if (!obj) return;
    
    document.getElementById('pos-x').value = obj.position.x.toFixed(2);
    document.getElementById('pos-y').value = obj.position.y.toFixed(2);
    document.getElementById('pos-z').value = obj.position.z.toFixed(2);

    document.getElementById('rot-x').value = THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(0);
    document.getElementById('rot-y').value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(0);
    document.getElementById('rot-z').value = THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(0);

    document.getElementById('scale-x').value = obj.scale.x.toFixed(2);
    document.getElementById('scale-y').value = obj.scale.y.toFixed(2);
    document.getElementById('scale-z').value = obj.scale.z.toFixed(2);
}

// Atualiza o objeto quando digitamos nos números
window.updateFromInputs = () => {
    const obj = objectsInScene.get(selectedObjectId);
    if(!obj) return;

    obj.position.set(
        parseFloat(document.getElementById('pos-x').value || 0),
        parseFloat(document.getElementById('pos-y').value || 0),
        parseFloat(document.getElementById('pos-z').value || 0)
    );

    obj.rotation.set(
        THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-x').value || 0)),
        THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-y').value || 0)),
        THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-z').value || 0))
    );

    obj.scale.set(
        parseFloat(document.getElementById('scale-x').value || 1),
        parseFloat(document.getElementById('scale-y').value || 1),
        parseFloat(document.getElementById('scale-z').value || 1)
    );
};

window.updateObjectColor = (hex) => {
    const obj = objectsInScene.get(selectedObjectId);
    if(!obj) return;
    obj.traverse(child => {
        if(child.isMesh) child.material.color.set(hex);
    });
};

// --- EXPORTAÇÃO ---
window.mergeAndExport = (format) => {
    const group = new THREE.Group();
    objectsInScene.forEach(obj => group.add(obj.clone()));
    const fileName = document.getElementById('file-name-input').value || "model_bundle";

    if(format === 'obj') {
        const exporter = new OBJExporter();
        save(exporter.parse(group), `${fileName}.obj`);
    } else {
        const exporter = new GLTFExporter();
        exporter.parse(group, (gltf) => save(JSON.stringify(gltf), `${fileName}.gltf`));
    }
};

function save(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([blob]));
    link.download = name;
    link.click();
}

// --- RENDER LOOP ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.GridHelper(100, 100, 0x333333, 0x222222));

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Inicializa no modo Move
window.updateSnap();
setEditorMode('translate');
