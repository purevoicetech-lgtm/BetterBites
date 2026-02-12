
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This allows the browser code to access process.env.API_KEY as required by the SDK guidelines
      // It looks for GEMINI_API_KEY (from your .env.local) or other standard names
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    }
  };
});
