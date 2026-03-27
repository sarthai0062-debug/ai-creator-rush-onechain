import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";

export function createLake() {
  // Radius tuned so the lake is visible near the player and the nearby board.
  const lakeGeometry = new THREE.CircleGeometry(26, 128);
  const waterNormals = new THREE.TextureLoader().load("/textures/waternormals.jpg");
  waterNormals.wrapS = THREE.RepeatWrapping;
  waterNormals.wrapT = THREE.RepeatWrapping;

  const water = new Water(lakeGeometry, {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals,
    sunDirection: new THREE.Vector3(1, 1, 0),
    sunColor: 0xffffff,
    waterColor: 0x2d82a8,
    distortionScale: 2.5,
    fog: false,
  });

  water.rotation.x = -Math.PI / 2;
  // Lake center moved closer to the player for visibility.
  water.position.set(18, 0.12, -8);
  water.receiveShadow = true;
  water.material.uniforms.size.value = 1.1;
  water.material.uniforms.alpha.value = 0.9;
  // Ensure objects behind/within the water plane remain visible.
  water.material.transparent = true;
  water.material.depthWrite = false;

  return {
    water,
    update(delta) {
      water.material.uniforms.time.value += delta * 0.35;
    },
  };
}
