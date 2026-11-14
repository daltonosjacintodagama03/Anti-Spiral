import * as THREE from "three";

export interface SpiralSceneOptions {
  container: HTMLElement;
  arms?: number;
  particlesPerArm?: number;
  growthRate?: number;
  innerRadius?: number;
}

/**
 * Cena Three.js com uma espiral logaritmica de particulas.
 * A espiral usa r = r0 * exp(b * theta), a mesma familia usada pelo
 * worker para estimar o angulo de pitch.
 */
export class SpiralScene {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly galaxy: THREE.Points;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private frameId = 0;
  private disposed = false;

  constructor(options: SpiralSceneOptions) {
    this.container = options.container;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070f, 0.03);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    this.camera.position.set(0, 13, 21);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x05070f, 1);
    this.container.appendChild(this.renderer.domElement);

    this.galaxy = new THREE.Points(
      this.buildGeometry(
        options.arms ?? 4,
        options.particlesPerArm ?? 700,
        options.growthRate ?? 0.26,
        options.innerRadius ?? 1.1,
      ),
      this.buildMaterial(),
    );
    this.scene.add(this.galaxy);
    this.scene.add(new THREE.AmbientLight(0x8899ff, 0.9));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();

    this.frameId = window.requestAnimationFrame(this.animate);
  }

  private buildGeometry(
    arms: number,
    particlesPerArm: number,
    growthRate: number,
    innerRadius: number,
  ): THREE.BufferGeometry {
    const total = arms * particlesPerArm;
    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const color = new THREE.Color();

    let index = 0;

    for (let arm = 0; arm < arms; arm += 1) {
      const armOffset = (arm / arms) * Math.PI * 2;

      for (let i = 0; i < particlesPerArm; i += 1) {
        const t = i / particlesPerArm;
        const theta = t * Math.PI * 5 + armOffset;
        const radius = innerRadius * Math.exp(growthRate * theta);
        const jitter = (Math.random() - 0.5) * 0.4;
        const height = (Math.random() - 0.5) * 0.7 * (1 - t * 0.55);

        positions[index * 3] = radius * Math.cos(theta) + jitter;
        positions[index * 3 + 1] = height;
        positions[index * 3 + 2] = radius * Math.sin(theta) + jitter;

        color.setHSL(0.58 - t * 0.3, 0.85, 0.5 + Math.random() * 0.25);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        index += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  private buildMaterial(): THREE.PointsMaterial {
    return new THREE.PointsMaterial({
      size: 0.11,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
    });
  }

  private resize = (): void => {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private animate = (): void => {
    if (this.disposed) {
      return;
    }

    const elapsed = this.clock.getElapsedTime();
    this.galaxy.rotation.y = elapsed * 0.08;
    this.galaxy.rotation.z = Math.sin(elapsed * 0.15) * 0.05;
    this.galaxy.position.y = Math.sin(elapsed * 0.3) * 0.15;

    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.galaxy.geometry.dispose();
    (this.galaxy.material as THREE.Material).dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
