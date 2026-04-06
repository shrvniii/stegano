/**
 * viewer.js — Three.js 3D Viewer Module
 * ES Module. Import from page-specific scripts.
 *
 * Design system: warm brown-grey materials (#8B6F5E), warm lighting only.
 * No vertex colors, no rainbow, no neon accents — anywhere.
 *
 * Exports:
 *   initViewer(containerId, objUrl)        → viewer object
 *   setRenderMode(viewer, mode)            → 'solid' | 'wireframe' | 'vertex'
 *   setVertexColorMode(viewer)             → vertex color visualiser (result page only)
 *   initDualViewer(id1,url1,id2,url2)      → { v1, v2 }
 *   renderThumbnail(imgElement, objUrl)    → warm static thumbnail
 *   syncBackground(viewer)                 → match theme bg
 */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js';

/* ── Constants ──────────────────────────────────────────────────── */

const WARM_BROWN   = 0x8B6F5E;  // main model colour
const WIRE_COLOR   = 0x1C1A17;  // near-black wire
const POINT_COLOR  = 0xB5451B;  // rust points
const BG_LIGHT     = 0xEDE8DC;  // --surface
const BG_DARK      = 0x252320;  // --surface dark

/* ── Shared warm material factory ───────────────────────────────── */

function warmMaterial() {
  return new THREE.MeshStandardMaterial({
    color: WARM_BROWN,
    metalness: 0.05,
    roughness: 0.6,
    vertexColors: false,   // never use vertex colors in solid/default mode
  });
}

/* ── Apply warm material to EVERY child mesh ────────────────────── */
// Must traverse — setting material on the parent Group does nothing.

function applyWarmToObj(obj) {
  obj.traverse(child => {
    if (child.isMesh) {
      child.material = warmMaterial();
      child.visible = true;
    }
  });
}

/* ── Remove overlay objects (wireframe / point cloud) ───────────── */

function removeOverlays(scene) {
  const toRemove = [];
  scene.traverse(child => { if (child.userData.isOverlay) toRemove.push(child); });
  toRemove.forEach(o => scene.remove(o));
}

/* ── Helpers ────────────────────────────────────────────────────── */

function isTeapotUrl(url) {
  return url && /teapot/i.test(url);
}

/** Warm scene lighting — no neon, no purple/cyan */
function buildWarmLighting(scene) {
  const ambient = new THREE.AmbientLight(0xF5F0E8, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xFDFAF4, 1.2);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // Subtle fill from below
  const fill = new THREE.DirectionalLight(0xEDE8DC, 0.3);
  fill.position.set(-4, -6, -4);
  scene.add(fill);
}

function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_LIGHT);
  buildWarmLighting(scene);
  return scene;
}

function buildRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 400, container.clientHeight || 380);
  container.appendChild(renderer.domElement);
  return renderer;
}

function buildCamera(container) {
  const w = container.clientWidth || 400;
  const h = container.clientHeight || 380;
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
  camera.position.set(0, 0, 4);
  return camera;
}

function centerModel(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  obj.position.sub(center);
  if (maxDim > 0) obj.scale.setScalar(2 / maxDim);
}

/** Return { mesh, geom } records — one per child mesh — storing original geometry */
function collectMeshRecords(obj) {
  const records = [];
  obj.traverse(child => {
    if (child.isMesh) {
      records.push({ mesh: child, geom: child.geometry.clone() });
    }
  });
  return records;
}

/** Build a Utah Teapot group with NO vertex colors — plain geometry only */
function createTeapotGroup() {
  const geom = new TeapotGeometry(1.5, 15, true, true, true, true, true);
  const mesh = new THREE.Mesh(geom, warmMaterial());
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/* ── Render mode helpers ────────────────────────────────────────── */

/** Solid: warm material on every child mesh */
function applyModeSolid(records) {
  records.forEach(({ mesh }) => {
    mesh.material = warmMaterial();
    mesh.visible  = true;
  });
}

/** Wireframe: hide original meshes, add LineSegments overlays */
function applyModeWireframe(records, scene) {
  records.forEach(({ mesh, geom }) => {
    mesh.visible = false;
    const wGeo = new THREE.WireframeGeometry(geom);
    const wMat = new THREE.LineBasicMaterial({ color: WIRE_COLOR });
    const wf   = new THREE.LineSegments(wGeo, wMat);

    // World-space transform of the original mesh
    wf.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
    wf.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
    wf.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
    wf.userData.isOverlay = true;
    scene.add(wf);
  });
}

/** Vertex / Point Cloud: hide meshes, add Points overlays */
function applyModeVertex(records, scene) {
  records.forEach(({ mesh, geom }) => {
    mesh.visible = false;
    const pMat = new THREE.PointsMaterial({
      color: POINT_COLOR,
      size: 0.05,
      sizeAttenuation: true,
    });
    const pc = new THREE.Points(geom, pMat);
    pc.userData.isOverlay = true;
    scene.add(pc);
  });
}

/* ── Core: initViewer ───────────────────────────────────────────── */

export function initViewer(containerId, objUrl) {
  const container = document.getElementById(containerId);
  if (!container) return Promise.reject(new Error(`No element #${containerId}`));

  container.innerHTML = '';

  const renderer = buildRenderer(container);
  const scene    = buildScene();
  const camera   = buildCamera(container);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.07;
  controls.autoRotate       = true;
  controls.autoRotateSpeed  = 0.8;

  let animId = null;

  const viewer = {
    renderer, scene, camera, controls,
    rootObj: null,
    meshRecords: [],   // { mesh, geom } — source of truth for mode switching
    mode: 'solid',
    containerId,
  };

  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

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

  return new Promise((resolve, reject) => {
    if (!objUrl) { resolve(viewer); return; }

    function onModelLoaded(obj) {
      centerModel(obj);

      // Traverse every child mesh and apply warm material
      viewer.meshRecords = collectMeshRecords(obj);
      applyWarmToObj(obj);

      scene.add(obj);
      viewer.rootObj = obj;

      const box = new THREE.Box3().setFromObject(obj);
      const dim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      camera.position.set(0, 0, dim * 2.2);
      controls.update();

      animate();
      resolve(viewer);
    }

    if (isTeapotUrl(objUrl)) {
      try { onModelLoaded(createTeapotGroup()); }
      catch (err) { console.error('Teapot error:', err); reject(err); }
    } else {
      new OBJLoader().load(objUrl, onModelLoaded, undefined, err => {
        console.error('OBJLoader error:', err);
        reject(err);
      });
    }
  });
}

/* ── setRenderMode ──────────────────────────────────────────────── */

export function setRenderMode(viewer, mode) {
  if (!viewer || !viewer.rootObj) return;
  viewer.mode = mode;

  // Always clean up overlays first
  removeOverlays(viewer.scene);

  switch (mode) {
    case 'solid':
      applyModeSolid(viewer.meshRecords);
      break;
    case 'wireframe':
      applyModeSolid(viewer.meshRecords);      // reset visibility
      removeOverlays(viewer.scene);            // remove any previous
      applyModeWireframe(viewer.meshRecords, viewer.scene);
      break;
    case 'vertex':
      applyModeSolid(viewer.meshRecords);
      removeOverlays(viewer.scene);
      applyModeVertex(viewer.meshRecords, viewer.scene);
      break;
  }

  // Force frame render
  viewer.renderer.render(viewer.scene, viewer.camera);
}

/* ── setVertexColorMode (result page "encoded" viewer only) ─────── */

/**
 * Shows raw vertex colors embedded in the geometry — only meaningful
 * when the OBJ actually contains vertex color data from steganography.
 * Falls back to rust accent if no vertex color attribute is present.
 */
export function setVertexColorMode(viewer) {
  if (!viewer || !viewer.rootObj) return;
  removeOverlays(viewer.scene);

  viewer.meshRecords.forEach(({ mesh }) => {
    mesh.visible = true;
    const hasColor = mesh.geometry.hasAttribute('color');
    mesh.material = new THREE.MeshBasicMaterial({
      vertexColors: hasColor,
      color: hasColor ? 0xffffff : POINT_COLOR,
    });
  });

  viewer.renderer.render(viewer.scene, viewer.camera);
}

/* ── initDualViewer ─────────────────────────────────────────────── */

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
    v1.controls.addEventListener('change', () => {
      v2.camera.position.copy(v1.camera.position);
      v2.camera.quaternion.copy(v1.camera.quaternion);
      v2.controls.target.copy(v1.controls.target);
      v2.controls.update();
    });
    v1.controls.autoRotate = false;
    v2.controls.autoRotate = false;
  }

  return { v1, v2 };
}

/* ── renderThumbnail ────────────────────────────────────────────── */

/**
 * Off-screen render → replaces <img> src.
 * Always uses warm flat material — no vertex colors, no rainbow.
 */
export async function renderThumbnail(imgElement, objUrl) {
  if (!imgElement || !objUrl) return;

  const W = 300, H = 200;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = W; offCanvas.height = H;

  const renderer = new THREE.WebGLRenderer({
    canvas: offCanvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(W, H);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_LIGHT);
  buildWarmLighting(scene);

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);

  function finalise(obj, isTeapot) {
    centerModel(obj);
    // Force warm material on all child meshes
    obj.traverse(child => {
      if (child.isMesh) child.material = warmMaterial();
    });
    scene.add(obj);

    const box = new THREE.Box3().setFromObject(obj);
    const dim = Math.max(...box.getSize(new THREE.Vector3()).toArray());

    if (isTeapot) {
      camera.position.set(2, 2, 4);
    } else {
      camera.position.set(dim * 0.8, dim * 0.6, dim * 1.8);
    }
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    imgElement.src = offCanvas.toDataURL('image/png');
    imgElement.style.objectFit = 'cover';
    renderer.dispose();
  }

  if (isTeapotUrl(objUrl)) {
    finalise(createTeapotGroup(), true);
  } else {
    return new Promise(resolve => {
      new OBJLoader().load(objUrl, obj => {
        finalise(obj, false);
        resolve();
      }, undefined, () => resolve());
    });
  }
}

/* ── syncBackground ─────────────────────────────────────────────── */

export function syncBackground(viewer) {
  if (!viewer) return;
  const isDark = document.body.classList.contains('dark-mode');
  viewer.scene.background = new THREE.Color(isDark ? BG_DARK : BG_LIGHT);
}
