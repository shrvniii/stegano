/**
 * viewer.js — Three.js 3D Viewer Module
 * ES Module. Import from page-specific scripts.
 *
 * Exports:
 *   initViewer(containerId, objUrl)  → viewer object
 *   setRenderMode(viewer, mode)      → mode: "solid" | "wireframe" | "vertex"
 *   setVertexColorMode(viewer)
 *   initDualViewer(id1, url1, id2, url2) → { v1, v2 }
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ── Helpers ────────────────────────────────────────────────────── */

function buildRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth || 400, container.clientHeight || 380);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  return renderer;
}

function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f18);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const dir1 = new THREE.DirectionalLight(0x7c3aed, 1.6);
  dir1.position.set(5, 8, 5);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0x06b6d4, 1.0);
  dir2.position.set(-5, -4, -5);
  scene.add(dir2);

  const point = new THREE.PointLight(0xec4899, 0.6, 20);
  point.position.set(0, 5, 0);
  scene.add(point);

  return scene;
}

function buildCamera(container) {
  const aspect = (container.clientWidth || 400) / (container.clientHeight || 380);
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1000);
  camera.position.set(0, 0, 4);
  return camera;
}

function centerModel(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  obj.position.sub(center);
  if (maxDim > 0) {
    const scale = 2 / maxDim;
    obj.scale.setScalar(scale);
  }
}

/** Extract all mesh geometries from an OBJ group */
function getMeshes(obj) {
  const meshes = [];
  obj.traverse(child => {
    if (child.isMesh) meshes.push(child);
  });
  return meshes;
}

/** Clone a geometry so we can rebuild multiple render modes */
function cloneGeometry(mesh) {
  return mesh.geometry.clone();
}

/* ── Render Mode Builders ───────────────────────────────────────── */

function applySolid(mesh) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x9b59b6,
    metalness: 0.15,
    roughness: 0.4,
  });

  // If vertex colors exist in geometry, use them
  if (mesh.geometry.hasAttribute('color')) {
    mat.vertexColors = true;
    mat.color.set(0xffffff);
  }

  mesh.material = mat;
  mesh.visible = true;
}

function buildWireframe(geometry) {
  const wGeo    = new THREE.WireframeGeometry(geometry);
  const wMat    = new THREE.LineBasicMaterial({ color: 0x7c3aed, linewidth: 1 });
  return new THREE.LineSegments(wGeo, wMat);
}

function buildPointCloud(geometry) {
  // Use vertex colors if present, else colour by position
  const hasColor = geometry.hasAttribute('color');
  const mat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: hasColor,
    color: hasColor ? 0xffffff : 0x06b6d4,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, mat);
}

/* ── Core: initViewer ───────────────────────────────────────────── */

/**
 * @param {string} containerId - DOM id of the container div
 * @param {string} objUrl      - URL of the .OBJ file to load
 * @returns {Promise<Object>}  - viewer handle
 */
export function initViewer(containerId, objUrl) {
  const container = document.getElementById(containerId);
  if (!container) return Promise.reject(new Error(`No element #${containerId}`));

  container.innerHTML = ''; // Clear placeholder

  const renderer = buildRenderer(container);
  const scene    = buildScene();
  const camera   = buildCamera(container);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate    = true;
  controls.autoRotateSpeed = 0.8;

  let animId = null;
  let currentOverlay = null; // wireframe or point cloud overlay group

  const viewer = {
    renderer, scene, camera, controls,
    rootObj: null,
    baseGeometries: [],   // { mesh, geom } pairs for mode switching
    mode: 'solid',
    containerId,
  };

  // Resize handler
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // Render loop
  function animate() {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  viewer.dispose = () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  };

  // Load OBJ
  return new Promise((resolve, reject) => {
    if (!objUrl) { resolve(viewer); return; }

    const loader = new OBJLoader();
    loader.load(
      objUrl,
      (obj) => {
        centerModel(obj);

        // Capture base geometries before any mode transformation
        getMeshes(obj).forEach(mesh => {
          viewer.baseGeometries.push({
            mesh,
            geom: cloneGeometry(mesh),
          });
          applySolid(mesh);
        });

        scene.add(obj);
        viewer.rootObj = obj;

        // Pull camera back based on model size
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(0, 0, maxDim * 2.2);
        controls.update();

        animate();
        resolve(viewer);
      },
      undefined,
      (err) => {
        console.error('OBJLoader error:', err);
        reject(err);
      }
    );
  });
}

/* ── setRenderMode ──────────────────────────────────────────────── */

/**
 * @param {Object} viewer  - from initViewer
 * @param {'solid'|'wireframe'|'vertex'} mode
 */
export function setRenderMode(viewer, mode) {
  if (!viewer || !viewer.rootObj) return;
  viewer.mode = mode;

  // Remove any previous overlay objects
  const toRemove = [];
  viewer.scene.traverse(child => {
    if (child.userData.isOverlay) toRemove.push(child);
  });
  toRemove.forEach(o => viewer.scene.remove(o));

  viewer.baseGeometries.forEach(({ mesh, geom }) => {
    switch (mode) {
      case 'solid': {
        mesh.visible = true;
        applySolid(mesh);
        break;
      }

      case 'wireframe': {
        mesh.visible = false;
        const wf = buildWireframe(geom);
        wf.userData.isOverlay = true;
        // Inherit mesh transform
        wf.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
        viewer.scene.add(wf);
        break;
      }

      case 'vertex': {
        mesh.visible = false;
        const pc = buildPointCloud(geom);
        pc.userData.isOverlay = true;
        viewer.scene.add(pc);
        break;
      }
    }
  });
}

/* ── setVertexColorMode ─────────────────────────────────────────── */

/**
 * Renders the model using vertex colors from the OBJ.
 * Uses MeshBasicMaterial with vertexColors: true.
 */
export function setVertexColorMode(viewer) {
  if (!viewer || !viewer.rootObj) return;

  // Remove overlays
  const toRemove = [];
  viewer.scene.traverse(c => { if (c.userData.isOverlay) toRemove.push(c); });
  toRemove.forEach(o => viewer.scene.remove(o));

  viewer.baseGeometries.forEach(({ mesh }) => {
    mesh.visible = true;
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    if (!mesh.geometry.hasAttribute('color')) {
      // Fallback: colour by position
      mat.vertexColors = false;
      mat.color.set(0x7c3aed);
    }
    mesh.material = mat;
  });
}

/* ── initDualViewer ─────────────────────────────────────────────── */

/**
 * Creates two side-by-side viewers. Optionally syncs OrbitControls.
 * @returns {Promise<{v1, v2}>}
 */
export async function initDualViewer(
  containerId1, objUrl1,
  containerId2, objUrl2,
  syncControls = true
) {
  const [v1, v2] = await Promise.all([
    initViewer(containerId1, objUrl1),
    initViewer(containerId2, objUrl2),
  ]);

  if (syncControls && v1.controls && v2.controls) {
    // Mirror camera/target changes from v1 → v2
    v1.controls.addEventListener('change', () => {
      if (v2.camera) {
        v2.camera.position.copy(v1.camera.position);
        v2.camera.quaternion.copy(v1.camera.quaternion);
        v2.controls.target.copy(v1.controls.target);
        v2.controls.update();
      }
    });
    v1.controls.autoRotate = false;
    v2.controls.autoRotate = false;
  }

  return { v1, v2 };
}

/* ── Utility export ─────────────────────────────────────────────── */

/** Set scene background to match current theme */
export function syncBackground(viewer) {
  if (!viewer) return;
  const isLight = document.body.classList.contains('light-mode');
  viewer.scene.background = new THREE.Color(isLight ? 0xeeeef8 : 0x0f0f18);
}
