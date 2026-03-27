import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export async function setupLighting(renderer, scene) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemisphere = new THREE.HemisphereLight(0xbad4ff, 0x2f2418, 0.5);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff2db, 2.4);
  sun.position.set(80, 130, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 300;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.bias = -0.0001;
  scene.add(sun);

  const rgbeLoader = new RGBELoader();
  const envMap = await rgbeLoader.loadAsync("/hdr/kloppenheim_06_1k.hdr");
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = envMap;

  return { sun, hemisphere };
}
