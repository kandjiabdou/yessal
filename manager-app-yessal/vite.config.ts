import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number.parseInt(env.VITE_APP_PORT || "4510", 10);

  return {
    server: {
      host: "::",
      port: port,
    },
    preview: {
      host: "::",
      port: port,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Configuration PWA
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          sw: path.resolve(__dirname, 'public/sw.js')
        },
        output: {
          entryFileNames: (assetInfo) => {
            return assetInfo.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js';
          }
        }
      }
    }
  };
});
