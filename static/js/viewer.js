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

import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";

/* ── Constants ──────────────────────────────────────────────────── */

const WARM_BROWN = 0x8b6f5e; // main model colour
const WIRE_COLOR = 0x1a1a1a; // phantom gray wire
const POINT_COLOR = 0x111111; // technical structural dots (darkened for contrast)
const DATA_COLOR = 0x9D00FF;  // Deep Electric Purple (premium requested accent)
const BG_LIGHT = 0xede8dc;    // --surface
const BG_DARK = 0x0A0A0A;     // Deep Charcoal

/* ── Shared warm material factory ───────────────────────────────── */

function warmMaterial() {
  return new THREE.MeshStandardMaterial({
    color: WARM_BROWN,
    metalness: 0.05,
    roughness: 0.6,
    vertexColors: false, // never use vertex colors in solid/default mode
  });
}

/* ── Apply warm material to EVERY child mesh ────────────────────── */
// Must traverse — setting material on the parent Group does nothing.

function applyWarmToObj(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.material = warmMaterial();
      child.visible = true;
    }
  });
}

/* ── Remove overlay objects (wireframe / point cloud) ───────────── */

function removeOverlays(scene) {
  const toRemove = [];
  scene.traverse((child) => {
    if (child.userData.isOverlay) toRemove.push(child);
  });
  toRemove.forEach((o) => scene.remove(o));
}

/* ── Helpers ────────────────────────────────────────────────────── */

function getInternalModelType(url) {
  if (!url) return null;
  if (/teapot/i.test(url)) return "teapot";
  return null;
}

/** Warm scene lighting — no neon, no purple/cyan */
function buildWarmLighting(scene) {
  const ambient = new THREE.AmbientLight(0xf5f0e8, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xfdfaf4, 1.2);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // Subtle fill from below
  const fill = new THREE.DirectionalLight(0xede8dc, 0.3);
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

function centerModel(obj, targetScale = 2) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  obj.position.sub(center);
  if (maxDim > 0) obj.scale.setScalar(targetScale / maxDim);
}

/** Return { mesh, geom } records — one per child mesh — storing original geometry */
function collectMeshRecords(obj) {
  const records = [];
  obj.traverse((child) => {
    if (child.isMesh) {
      records.push({ mesh: child, geom: child.geometry.clone() });
    }
  });
  return records;
}

/** Build a Utah Teapot group */
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
    mesh.visible = true;
  });
}

/** Wireframe: hide original meshes, add LineSegments overlays */
function applyModeWireframe(records, scene, highlightData = false) {
  records.forEach(({ mesh, geom }) => {
    mesh.visible = false;
    
    // 1. Technical Blueprint (Structural Wire)
    const wGeo = new THREE.WireframeGeometry(geom);
    const wMat = new THREE.LineBasicMaterial({ 
      color: WIRE_COLOR, 
      transparent: true, 
      opacity: 0.25
    });
    const wf = new THREE.LineSegments(wGeo, wMat);
    wf.position.copy(mesh.position);
    wf.quaternion.copy(mesh.quaternion);
    wf.scale.copy(mesh.scale);
    wf.userData.isOverlay = true;
    scene.add(wf);

    // 2. High-Precision Data Nodes (Screen-Space bits)
    if (highlightData && geom.hasAttribute("color")) {
      const positions = geom.attributes.position.array;
      const colors = geom.attributes.color.array;
      const dataPos = [];
      
      for (let i = 0; i < colors.length; i += 3) {
        if (colors[i] < 0.999 || colors[i+1] < 0.999 || colors[i+2] < 0.999) {
          dataPos.push(positions[i], positions[i+1], positions[i+2]);
        }
      }
      
      if (dataPos.length > 0) {
        const hGeom = new THREE.BufferGeometry();
        hGeom.setAttribute("position", new THREE.Float32BufferAttribute(dataPos, 3));
        
        // --- Layer A: Forensic Neon Halo ---
        const haloMat = new THREE.PointsMaterial({
          color: DATA_COLOR,
          size: 7.0,              // Increased for forensic visibility
          sizeAttenuation: false, 
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const haloPc = new THREE.Points(hGeom, haloMat);
        haloPc.userData.isOverlay = true;
        haloPc.renderOrder = 999;
        haloPc.position.copy(mesh.position);
        haloPc.quaternion.copy(mesh.quaternion);
        haloPc.scale.copy(mesh.scale).multiplyScalar(1.002);
        scene.add(haloPc);

        // --- Layer B: Focus Core ---
        const coreMat = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 2.5,            // 2.5px sharp core
          sizeAttenuation: false,
          transparent: false,
          depthTest: true
        });
        const corePc = new THREE.Points(hGeom, coreMat);
        corePc.userData.isOverlay = true;
        corePc.renderOrder = 1000;
        corePc.position.copy(mesh.position);
        corePc.quaternion.copy(mesh.quaternion);
        corePc.scale.copy(mesh.scale).multiplyScalar(1.0025);
        scene.add(corePc);
      }
    }
  });
}

/** Vertex / Point Cloud: hide meshes, add Points overlays */
function applyModeVertex(records, scene, highlightData = false) {
  records.forEach(({ mesh, geom }) => {
    mesh.visible = false;

    const positions = geom.attributes.position.array;
    const colors = geom.attributes.color.array;

    // Different arrays for sharp separation
    const dataPos = [];
    const normalPos = [];

    const hasColors = geom.hasAttribute("color");

    if (highlightData && hasColors) {
      for (let i = 0; i < colors.length; i += 3) {
        if (colors[i] < 0.999 || colors[i+1] < 0.999 || colors[i+2] < 0.999) {
          dataPos.push(positions[i], positions[i+1], positions[i+2]);
        } else {
          normalPos.push(positions[i], positions[i+1], positions[i+2]);
        }
      }
    } else {
      for (let i = 0; i < positions.length; i++) {
        normalPos.push(positions[i]);
      }
    }

    // 1. Structural Mesh Dots
    if (normalPos.length > 0) {
      const nGeom = new THREE.BufferGeometry();
      nGeom.setAttribute("position", new THREE.Float32BufferAttribute(normalPos, 3));
      const nMat = new THREE.PointsMaterial({
        color: POINT_COLOR,
        size: 1.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.5,
        depthTest: true
      });
      const nPc = new THREE.Points(nGeom, nMat);
      nPc.userData.isOverlay = true;
      nPc.position.copy(mesh.position);
      nPc.quaternion.copy(mesh.quaternion);
      nPc.scale.copy(mesh.scale);
      scene.add(nPc);
    }

    // 2. High-Tech Data Nodes
    if (dataPos.length > 0) {
      const dGeom = new THREE.BufferGeometry();
      dGeom.setAttribute("position", new THREE.Float32BufferAttribute(dataPos, 3));
      const dMat = new THREE.PointsMaterial({
        color: DATA_COLOR,
        size: 7.0,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const dPc = new THREE.Points(dGeom, dMat);
      dPc.userData.isOverlay = true;
      dPc.renderOrder = 999;
      dPc.position.copy(mesh.position);
      dPc.quaternion.copy(mesh.quaternion);
      dPc.scale.copy(mesh.scale).multiplyScalar(1.002);
      scene.add(dPc);
    }
  });
}

/* ── Core: initViewer ───────────────────────────────────────────── */

export async function initViewer(containerId, objUrl, modelName = "") {
  const container = document.getElementById(containerId);
  if (!container)
    return Promise.reject(new Error(`No element #${containerId}`));

  container.innerHTML = "";

  const renderer = buildRenderer(container);
  const scene = buildScene();
  const camera = buildCamera(container);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;

  let animId = null;

  const viewer = {
    renderer,
    scene,
    camera,
    controls,
    rootObj: null,
    meshRecords: [], // { mesh, geom } — source of truth for mode switching
    mode: "solid",
    containerId,
  };

  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  function animate() {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  viewer.dispose = () => {
    cancelAnimationFrame(animId);
    window.removeEventListener("resize", onResize);
    renderer.dispose();
  };

  return new Promise((resolve, reject) => {
    if (!objUrl) {
      resolve(viewer);
      return;
    }

    function onModelLoaded(obj) {
      const isDragon = /dragon/i.test(modelName);
      const targetScale = isDragon ? 120 : 2;
      centerModel(obj, targetScale);

      // Traverse every child mesh and apply warm material
      viewer.meshRecords = collectMeshRecords(obj);
      applyWarmToObj(obj);

      scene.add(obj);
      viewer.rootObj = obj;

      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const dim = Math.max(size.x, size.y, size.z);

      // Specialized main viewer framing for specific models
      if (/dragon/i.test(modelName)) {
        // Aggressive zoom for the dragon to make it look BIG
        camera.position.set(dim * 0.85, dim * 0.4, dim * 0.85);
      } else if (/teapot/i.test(modelName)) {
        camera.position.set(dim * 1.0, dim * 1.0, dim * 1.6);
      } else {
        // Default angled view
        camera.position.set(dim * 1.2, dim * 0.8, dim * 2.2);
      }

      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();

      animate();
      resolve(viewer);
    }

    const internalType = getInternalModelType(objUrl);
    if (internalType === "teapot") {
      try {
        onModelLoaded(createTeapotGroup());
      } catch (err) {
        console.error("Internal model error:", err);
        reject(err);
      }
    } else {
      const loader = new THREE.FileLoader();
      loader.load(
        objUrl,
        (text) => {
          try {
            const obj = parseObjWithColors(text);
            onModelLoaded(obj);
          } catch (err) {
            console.error("Custom parser error:", err);
            reject(err);
          }
        },
        undefined,
        (err) => {
          console.error("FileLoader error:", err);
          reject(err);
        },
      );
    }
  });
}

/**
 * Custom OBJ parser that supports 'v x y z r g b'
 * and returns a THREE.Group with a BufferGeometry mesh.
 */
function parseObjWithColors(text) {
  const positions = [];
  const colors = [];
  const indices = [];

  const lines = text.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/).slice(1).map(parseFloat);
      positions.push(parts[0], parts[1], parts[2]);
      if (parts.length >= 6) {
        colors.push(parts[3], parts[4], parts[5]);
      } else {
        colors.push(1, 1, 1);
      }
    } else if (line.startsWith("f ")) {
      const parts = line.split(/\s+/).slice(1);
      // Simple face parsing (assumes single index for simplicity in this vault)
      const vIndices = parts.map((p) => parseInt(p.split("/")[0]) - 1);
      for (let i = 1; i < vIndices.length - 1; i++) {
        indices.push(vIndices[0], vIndices[i], vIndices[i + 1]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  if (colors.length > 0) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }
  if (indices.length > 0) {
    geometry.setIndex(indices);
  }
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, warmMaterial());
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/* ── setRenderMode ──────────────────────────────────────────────── */

export function setRenderMode(viewer, mode) {
  if (!viewer || !viewer.rootObj) return;
  viewer.mode = mode;

  // Always clean up overlays first
  removeOverlays(viewer.scene);

  switch (mode) {
    case "solid":
      applyModeSolid(viewer.meshRecords);
      break;
    case "wireframe":
      applyModeSolid(viewer.meshRecords); // reset visibility
      // If the geometry has a color attribute, it's likely an encoded file — highlight the data bits!
      const hasDataColors = viewer.meshRecords.some(r => r.geom.hasAttribute('color'));
      applyModeWireframe(viewer.meshRecords, viewer.scene, hasDataColors);
      break;
    case "vertex":
      applyModeSolid(viewer.meshRecords);
      const hasDataVertex = viewer.meshRecords.some(r => r.geom.hasAttribute('color'));
      applyModeVertex(viewer.meshRecords, viewer.scene, hasDataVertex);
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
    const hasColor = mesh.geometry.hasAttribute("color");

    // Fallback if no colors found
    if (!hasColor) {
      applyModeVertex([{ mesh, geom: mesh.geometry }], viewer.scene);
      return;
    }

    // Amplify colors for visualization:
    const geom = mesh.geometry.clone();
    const colors = geom.attributes.color.array;
    for (let i = 0; i < colors.length; i += 3) {
      const r = colors[i],
        g = colors[i + 1],
        b = colors[i + 2];
      // If LSB is changed, it won't be exactly 1.0
      if (r < 0.999 || g < 0.999 || b < 0.999) {
        // High-visibility Deep Electric Purple
        colors[i] = 0.61;    // R: 157
        colors[i + 1] = 0.0; // G: 0
        colors[i + 2] = 1.0; // B: 255
      } else {
        // Ultra-dark background mesh for max contrast
        colors[i] = 0.02;
        colors[i + 1] = 0.02;
        colors[i + 2] = 0.03;
      }
    }
    geom.attributes.color.needsUpdate = true;

    const pMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 7.0,              // Increased forensic size
      sizeAttenuation: false, // Forensic mode: consistent pixel size
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    const pc = new THREE.Points(geom, pMat);
    pc.userData.isOverlay = true;
    pc.renderOrder = 999;
    pc.position.copy(mesh.position);
    pc.quaternion.copy(mesh.quaternion);
    pc.scale.copy(mesh.scale).multiplyScalar(1.002);

    mesh.visible = false;
    viewer.scene.add(pc);
  });

  viewer.renderer.render(viewer.scene, viewer.camera);
}

/* ── initDualViewer ─────────────────────────────────────────────── */

export async function initDualViewer(
  containerId1,
  objUrl1,
  containerId2,
  objUrl2,
  name1 = "",
  name2 = "",
  syncControls = true,
) {
  const [v1, v2] = await Promise.all([
    initViewer(containerId1, objUrl1, name1),
    initViewer(containerId2, objUrl2, name2),
  ]);

  if (syncControls && v1.controls && v2.controls) {
    let _syncing = false;
    const sync = (source, target) => {
      if (_syncing) return;
      _syncing = true;
      target.camera.position.copy(source.camera.position);
      target.camera.quaternion.copy(source.camera.quaternion);
      target.controls.target.copy(source.controls.target);
      target.controls.update();
      _syncing = false;
    };

    v1.controls.addEventListener("change", () => sync(v1, v2));
    v2.controls.addEventListener("change", () => sync(v2, v1));
    
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

  const W = 300,
    H = 200;

  const offCanvas = document.createElement("canvas");
  offCanvas.width = W;
  offCanvas.height = H;

  const renderer = new THREE.WebGLRenderer({
    canvas: offCanvas,
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: true,
  });
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0); // Transparent background

  const scene = new THREE.Scene();
  scene.background = null;
  buildWarmLighting(scene);

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);

  function finalise(obj, type) {
    const targetScale = type === "dragon" ? 120 : 2;
    centerModel(obj, targetScale);
    // Force warm material on all child meshes
    obj.traverse((child) => {
      if (child.isMesh) child.material = warmMaterial();
    });
    scene.add(obj);

    const box = new THREE.Box3().setFromObject(obj);
    const dim = Math.max(...box.getSize(new THREE.Vector3()).toArray());

    if (type === "teapot") {
      camera.position.set(2, 2, 4);
    } else if (type === "bunny") {
      camera.position.set(dim * 1.0, dim * 0.8, dim * 2.0);
    } else if (type === "dragon") {
      // Dragon is long, aggressive zoom for library view
      camera.position.set(dim * 1.1, dim * 0.5, dim * 1.0);
    } else if (type === "sphere") {
      camera.position.set(0, 0, dim * 2.4);
    } else {
      camera.position.set(dim * 0.8, dim * 0.6, dim * 1.8);
    }
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    imgElement.src = offCanvas.toDataURL("image/png");
    imgElement.style.objectFit = "cover";
    renderer.dispose();
  }

  const internalType = getInternalModelType(objUrl);
  if (internalType === "teapot") {
    finalise(createTeapotGroup(), "teapot");
  } else {
    const loader = new THREE.FileLoader();
    loader.load(objUrl, (text) => {
      try {
        const obj = parseObjWithColors(text);
        const nameType = /sphere/i.test(objUrl)
          ? "sphere"
          : /bunny/i.test(objUrl)
            ? "bunny"
            : /dragon/i.test(objUrl)
              ? "dragon"
              : "external";
        finalise(obj, nameType);
      } catch (err) {
        console.error("Thumbnail parser error:", err);
      }
    });
  }
}

/* ── syncBackground ─────────────────────────────────────────────── */

export function syncBackground(viewer) {
  if (!viewer) return;
  const isDark = document.body.classList.contains("dark-mode");
  viewer.scene.background = new THREE.Color(isDark ? BG_DARK : BG_LIGHT);
}
