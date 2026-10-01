"use client";

import React, { useEffect, useRef, useState } from 'react';
import { getGithubLoginUrl } from '@/lib/api';

export default function ModernLoginSignup() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    let active = true;
    let renderer: any;
    let geometry: any;
    let material: any;
    let scene: any;
    let camera: any;
    let animationId: number;

    const initThree = (THREE: any) => {
      if (!canvasRef.current || !active) return;
      const canvas = canvasRef.current;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth * 2, window.innerHeight * 2) },
        u_opacities: { value: [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0] },
        u_colors: { value: [
          new THREE.Vector3(1, 0, 0.1),       // Red tint for Git Whisper
          new THREE.Vector3(0.8, 0, 0.2),
          new THREE.Vector3(1, 0.2, 0.2),
          new THREE.Vector3(0.9, 0.1, 0.1),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0.7, 0, 0.1)
        ] },
        u_total_size: { value: 20.0 },
        u_dot_size: { value: 6.0 },
        u_reverse: { value: 0 }
      };

      material = new THREE.ShaderMaterial({
        vertexShader: `
          precision mediump float;
          uniform vec2 u_resolution;
          out vec2 fragCoord;
          void main() {
            gl_Position = vec4(position, 1.0);
            fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
            fragCoord.y = u_resolution.y - fragCoord.y;
          }
        `,
        fragmentShader: `
          precision mediump float;
          in vec2 fragCoord;

          uniform float u_time;
          uniform float u_opacities[10];
          uniform vec3 u_colors[6];
          uniform float u_total_size;
          uniform float u_dot_size;
          uniform vec2 u_resolution;
          uniform int u_reverse;

          out vec4 fragColor;

          float PHI = 1.61803398874989484820459;
          float random(vec2 xy) {
              return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
          }

          void main() {
              vec2 st = fragCoord.xy;
              st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
              st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

              float opacity = step(0.0, st.x) * step(0.0, st.y);

              vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

              float frequency = 5.0;
              float show_offset = random(st2);
              float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
              opacity *= u_opacities[int(rand * 10.0)];
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

              vec3 color = u_colors[int(show_offset * 6.0)];

              float animation_speed_factor = 3.0;
              vec2 center_grid = u_resolution / 2.0 / u_total_size;
              float dist_from_center = distance(center_grid, st2);

              float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

              float current_timing_offset = timing_offset_intro;
              opacity *= step(current_timing_offset, u_time * animation_speed_factor);
              opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);

              fragColor = vec4(color, opacity);
              fragColor.rgb *= fragColor.a;
          }
        `,
        uniforms: uniforms,
        glslVersion: THREE.GLSL3,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        transparent: true
      });

      geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const startTime = performance.now();
      const animate = () => {
        if (!active) return;
        animationId = requestAnimationFrame(animate);
        uniforms.u_time.value = (performance.now() - startTime) / 1000.0;
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(window.innerWidth * 2, window.innerHeight * 2);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    // Dynamically load Three.js via script tag to avoid bundler import errors
    if ((window as any).THREE) {
      const cleanUp = initThree((window as any).THREE);
      return () => {
        active = false;
        if (cleanUp) cleanUp();
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer) renderer.dispose();
        if (geometry) geometry.dispose();
        if (material) material.dispose();
      };
    } else {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).THREE) {
          const cleanUp = initThree((window as any).THREE);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) renderer.dispose();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
    };
  }, []);

  /* ─── shared button styles ─── */
  const socialBtn: React.CSSProperties = {
    width:"100%", padding:"0.75rem", borderRadius:6,
    border:"1px solid #333", background:"#fff", color:"#000",
    fontWeight:600, fontSize:"0.875rem", cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem",
    marginBottom:"0.4rem", transition:"background 0.2s"
  };

  /* ─── GitHub SVG ─── */
  const GitHubIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:18,height:18,flexShrink:0}}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );

  const Logo = (
    <div style={{background:"#111",width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"1.15rem",marginBottom:"0.75rem",border:"1px solid #333"}}>
        <svg viewBox="0 0 24 24" fill="white" style={{width:24,height:24,flexShrink:0}}>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
        </svg>
    </div>
  );
  
  const Footer = (
    <div style={{marginTop:"0.85rem",fontSize:"0.75rem",color:"#666",lineHeight:1.5,textAlign:"center"}}>
      By continuing, you agree to our{" "}
      <a href="#" style={{color:"#888"}}>Terms of Service</a> and <a href="#" style={{color:"#888"}}>Privacy Policy</a>.
    </div>
  );

  return (
    <div style={{position:"relative",width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"#000",color:"#fff",fontFamily:"'Inter',-apple-system,sans-serif"}}>

      {/* WebGL Dot canvas */}
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,zIndex:0}}/>

      {/* Vignette */}
      <div style={{position:"absolute",inset:0,zIndex:1,background:"radial-gradient(circle at center,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0) 100%)",pointerEvents:"none"}}/>

      {/* Modal card */}
      <div style={{position:"relative",zIndex:2,background:"#121212",borderRadius:12,padding:"2rem",width:"100%",maxWidth:400,boxShadow:"0 10px 40px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column",alignItems:"center",border:"1px solid #222"}}>

        <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
            {Logo}
            <h1 style={{fontSize:"1.35rem",fontWeight:600,marginBottom:"0.25rem",letterSpacing:"-0.025em"}}>GIT_WHISPER</h1>
            <p style={{fontSize:"0.85rem",color:"#888",marginBottom:"1.5rem",lineHeight:1.5}}>Connect GitHub to chat with your repositories.</p>

            <a href={getGithubLoginUrl()} style={{...socialBtn, textDecoration: "none"}}>
              {GitHubIcon} Continue with GitHub
            </a>

            {Footer}
        </div>
      </div>
    </div>
  );
}
