import { defineConfig } from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks(id){if(id.includes('/three/build/three.core.js'))return 'three-core';if(id.includes('/three/build/three.module.js'))return 'three-renderer';if(id.includes('/node_modules/three/'))return 'three-addons';}}}}});
