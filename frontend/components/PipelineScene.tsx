"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// Scroll-driven WebGL backdrop for the landing page — a literal render of the
// Netpost pipeline: four source clusters (Hacker News, Reddit, RSS, News API)
// stream raw items down a corridor, converge through a scoring core that
// dedupes and ranks them, and resolve into five post panels whose stacked bars
// echo the Netpost mark. The camera flies a slow keyframed path as the page
// scrolls. Restrained palette and gentle bloom so it reads cinematic, not toy.

// Kept clear of the cluster field (z -216…-140) at both ends so the establishing
// shot frames the sources rather than sitting inside them.
const CAM: { pos: [number, number, number]; tgt: [number, number, number] }[] = [
  { pos: [0, 46, -302], tgt: [0, 17, -172] }, // 0 — establishing, framing the sources
  { pos: [42, 27, -152], tgt: [-6, 12, -56] }, // 1 — bank into the streams
  { pos: [-48, 18, -62], tgt: [0, 10, -28] }, // 2 — arc around the scoring core
  { pos: [-20, 54, -6], tgt: [0, 12, 24] }, // 3 — climb, reveal the five panels
  { pos: [0, 22, 130], tgt: [0, 28, 24] } // 4 — settle, panels low in frame under the closing copy
];

const CORE = new THREE.Vector3(0, 10, -30);
const PANEL_Z = 30;
const PANEL_X = [-46, -23, 0, 23, 46];

const SOURCES: { name: string; color: number; at: [number, number, number]; count: number }[] = [
  { name: "Hacker News", color: 0xffb27a, at: [-58, 20, -160], count: 26 },
  { name: "Reddit", color: 0xff9182, at: [58, 16, -168], count: 26 },
  { name: "RSS", color: 0x89e5e2, at: [-30, 32, -196], count: 40 },
  { name: "News API", color: 0xc7d8ff, at: [34, 34, -190], count: 32 }
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function sampleCam(p: number) {
  const seg = Math.min(CAM.length - 2, Math.floor(p * (CAM.length - 1)));
  const local = smooth(clamp01(p * (CAM.length - 1) - seg));
  const a = CAM[seg];
  const b = CAM[seg + 1];
  return {
    pos: [0, 1, 2].map((i) => lerp(a.pos[i], b.pos[i], local)),
    tgt: [0, 1, 2].map((i) => lerp(a.tgt[i], b.tgt[i], local))
  };
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return new THREE.Texture();
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.28, "rgba(255,255,255,0.62)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

type Stream = {
  curve: THREE.CatmullRomCurve3;
  points: THREE.Points;
  offsets: Float32Array;
  speeds: Float32Array;
};

export default function PipelineScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      mount.classList.add("scene-failed");
      return undefined;
    }

    const W = () => mount.clientWidth || window.innerWidth;
    const H = () => mount.clientHeight || window.innerHeight;
    const small = window.innerWidth < 820;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
    renderer.setSize(W(), H());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080f);
    scene.fog = new THREE.FogExp2(0x070c19, 0.0078);

    const camera = new THREE.PerspectiveCamera(48, W() / H(), 0.1, 2000);
    camera.position.set(...CAM[0].pos);

    const TEAL = 0x5bc0be;
    const HIGHLIGHT = 0xc7d8ff;
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x);
      return x;
    };

    const glow = track(glowTexture());

    // ---- sky dome — near-black with the faintest horizon lift ---------------
    const skyGeo = track(new THREE.SphereGeometry(1000, 32, 16));
    const skyMat = track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(0x03060d) },
          hz: { value: new THREE.Color(0x0c1530) }
        },
        vertexShader:
          "varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `varying vec3 vp; uniform vec3 top; uniform vec3 hz;
          void main(){ float h = clamp(normalize(vp).y * 2.0, 0.0, 1.0); gl_FragColor = vec4(mix(hz, top, h), 1.0); }`
      })
    );
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    scene.add(new THREE.HemisphereLight(0x2b4160, 0x02040a, 0.55));
    const key = new THREE.DirectionalLight(0x9fc4d4, 0.5);
    key.position.set(-40, 80, 30);
    scene.add(key);

    // ---- ground plane + corridor grid --------------------------------------
    const groundGeo = track(new THREE.CircleGeometry(700, 64));
    const groundMat = track(
      new THREE.MeshStandardMaterial({ color: 0x060a14, roughness: 1, metalness: 0 })
    );
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    scene.add(ground);

    const grid = new THREE.GridHelper(460, 46, TEAL, 0x16233f);
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.075;
    scene.add(grid);
    track(grid.geometry);
    track(gridMat);

    // ---- high dust for parallax depth --------------------------------------
    const dustCount = small ? 220 : 420;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 620;
      dustPos[i * 3 + 1] = 20 + Math.random() * 190;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 620;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = track(
      new THREE.PointsMaterial({
        size: 1.5,
        map: glow,
        color: HIGHLIGHT,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    scene.add(new THREE.Points(dustGeo, dustMat));

    // ---- source clusters — raw trend items before dedupe --------------------
    const clusterNodes: THREE.Points[] = [];
    for (const src of SOURCES) {
      const n = small ? Math.round(src.count * 0.6) : src.count;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = src.at[0] + (Math.random() - 0.5) * 46;
        pos[i * 3 + 1] = src.at[1] + (Math.random() - 0.5) * 30;
        pos[i * 3 + 2] = src.at[2] + (Math.random() - 0.5) * 40;
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = track(
        new THREE.PointsMaterial({
          size: 3.6,
          map: glow,
          color: src.color,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      clusterNodes.push(pts);
    }

    // ---- ingest streams — sources converge into the scoring core ------------
    const streams: Stream[] = [];
    const mkStream = (from: THREE.Vector3, to: THREE.Vector3, color: number, count: number) => {
      const mid = from.clone().lerp(to, 0.5);
      mid.y += 16;
      mid.x *= 0.45;
      const curve = new THREE.CatmullRomCurve3([
        from.clone(),
        from.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, 5, 0)),
        mid,
        mid.clone().lerp(to, 0.6),
        to.clone()
      ]);
      const pos = new Float32Array(count * 3);
      const offsets = new Float32Array(count);
      const speeds = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        offsets[i] = Math.random();
        speeds[i] = 0.035 + Math.random() * 0.05;
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = track(
        new THREE.PointsMaterial({
          size: 2.6,
          map: glow,
          color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      scene.add(points);
      const stream: Stream = { curve, points, offsets, speeds };
      streams.push(stream);
      return stream;
    };

    for (const src of SOURCES) {
      mkStream(
        new THREE.Vector3(...src.at),
        CORE.clone(),
        src.color,
        small ? 40 : 80
      );
    }

    // ---- scoring core — dedupe + relevance ranking --------------------------
    const core = new THREE.Group();
    core.position.copy(CORE);
    scene.add(core);

    const ringGeo = track(new THREE.TorusGeometry(21, 0.34, 12, 128));
    const ringMat = track(
      new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.82 })
    );
    const ringA = new THREE.Mesh(ringGeo, ringMat);
    ringA.rotation.x = Math.PI / 2;
    core.add(ringA);

    const ringGeoB = track(new THREE.TorusGeometry(14.5, 0.2, 12, 96));
    const ringMatB = track(
      new THREE.MeshBasicMaterial({ color: HIGHLIGHT, transparent: true, opacity: 0.5 })
    );
    const ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.rotation.x = Math.PI / 2.4;
    core.add(ringB);

    const coreGlow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glow,
          color: TEAL,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    );
    coreGlow.scale.set(46, 46, 1);
    core.add(coreGlow);

    // ---- five post panels — bars echo the Netpost mark ----------------------
    const barWidths = [11, 8.4, 9.6, 7.2, 5.6];
    const panelGeo = track(new THREE.BoxGeometry(15, 25, 0.6));
    const panelMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x0d1730,
        roughness: 0.35,
        metalness: 0.5,
        transparent: true,
        opacity: 0.88
      })
    );
    const edgeGeo = track(new THREE.EdgesGeometry(panelGeo));
    const barGeo = track(new THREE.PlaneGeometry(1, 0.62));

    const panels: { group: THREE.Group; bars: THREE.Mesh[]; dot: THREE.Sprite; phase: number }[] = [];

    PANEL_X.forEach((x, idx) => {
      const group = new THREE.Group();
      group.position.set(x, 14, PANEL_Z);
      group.rotation.y = -x * 0.006;

      group.add(new THREE.Mesh(panelGeo, panelMat));

      const edgeMat = track(
        new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.55 })
      );
      group.add(new THREE.LineSegments(edgeGeo, edgeMat));

      const bars: THREE.Mesh[] = [];
      barWidths.forEach((w, i) => {
        const mat = track(
          new THREE.MeshBasicMaterial({
            color: i === 0 ? HIGHLIGHT : TEAL,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            blending: THREE.AdditiveBlending
          })
        );
        const bar = new THREE.Mesh(barGeo, mat);
        bar.scale.set(w, 1, 1);
        bar.position.set(-1.4 + w / 2 - 4.2, 8 - i * 3.4, 0.42);
        group.add(bar);
        bars.push(bar);
      });

      const dot = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: glow,
            color: TEAL,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending
          })
        )
      );
      dot.scale.set(3.4, 3.4, 1);
      dot.position.set(5.2, -4.4, 0.6);
      group.add(dot);

      scene.add(group);
      panels.push({ group, bars, dot, phase: idx * 0.34 });

      // core → panel delivery stream
      mkStream(CORE.clone(), new THREE.Vector3(x, 14, PANEL_Z - 1), TEAL, small ? 16 : 30);
    });

    // ---- post-processing ----------------------------------------------------
    let composer: EffectComposer | null = null;
    if (!small) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.72, 0.85, 0.22);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    // ---- scroll progress + pointer parallax ---------------------------------
    let targetP = 0;
    let curP = 0;
    let px = 0;
    let py = 0;
    let tpx = 0;
    let tpy = 0;

    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      targetP = max > 0 ? clamp01(window.scrollY / max) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tpx = (e.clientX / window.innerWidth - 0.5) * 2;
      tpy = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
      composer?.setSize(W(), H());
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (!reduce) window.addEventListener("pointermove", onMove);
    onScroll();

    const applyCamera = (p: number) => {
      const { pos, tgt } = sampleCam(p);
      camera.position.set(pos[0] + px * 3, pos[1] - py * 1.6, pos[2]);
      camera.lookAt(tgt[0], tgt[1], tgt[2]);
    };

    const draw = () => {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    };

    const v = new THREE.Vector3();
    const writeStreams = (t: number) => {
      for (const s of streams) {
        const arr = s.points.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < s.offsets.length; i++) {
          const prog = (s.offsets[i] + t * s.speeds[i]) % 1;
          s.curve.getPoint(prog, v);
          arr[i * 3] = v.x;
          arr[i * 3 + 1] = v.y;
          arr[i * 3 + 2] = v.z;
        }
        s.points.geometry.attributes.position.needsUpdate = true;
      }
    };

    // Reduced motion: compose one static frame and stop.
    if (reduce) {
      curP = 0;
      writeStreams(0);
      applyCamera(0);
      draw();

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        for (const d of disposables) d.dispose();
        composer?.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    }

    let raf = 0;
    let t0 = performance.now();
    let elapsed = 0;
    let running = true;

    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
    }, { threshold: 0 });
    io.observe(mount);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!running || document.hidden) {
        t0 = now;
        return;
      }
      const dt = Math.min((now - t0) / 1000, 0.05);
      t0 = now;
      elapsed += dt;

      curP += (targetP - curP) * 0.045;
      px += (tpx - px) * 0.03;
      py += (tpy - py) * 0.03;
      applyCamera(curP);

      writeStreams(elapsed);

      ringA.rotation.z += dt * 0.22;
      ringB.rotation.z -= dt * 0.34;
      coreGlow.material.opacity = 0.42 + Math.sin(elapsed * 1.4) * 0.1;

      for (const cluster of clusterNodes) {
        const mat = cluster.material as THREE.PointsMaterial;
        mat.opacity = 0.66 + Math.sin(elapsed * 0.9 + cluster.id) * 0.16;
      }

      // Panels resolve line by line, like a post being written.
      for (const panel of panels) {
        const cycle = (elapsed * 0.34 + panel.phase) % 2;
        panel.bars.forEach((bar, i) => {
          const on = clamp01((cycle - i * 0.16) * 3.2);
          const mat = bar.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.16 + smooth(Math.min(on, 1)) * 0.68;
        });
        const dotMat = panel.dot.material as THREE.SpriteMaterial;
        dotMat.opacity = 0.5 + Math.sin(elapsed * 2 + panel.phase * 3) * 0.35;
      }

      draw();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      for (const d of disposables) d.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div aria-hidden="true" className="scene3d" ref={mountRef} />;
}
