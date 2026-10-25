import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (
          req.url &&
          (req.url === '/api/gemini' || req.url.startsWith('/api/gemini?')) &&
          req.method === 'POST'
        ) {
          const handleRequest = async (body: any) => {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  error:
                    '未检测到 GEMINI_API_KEY 环境变量，请在 AI Studio Secrets 中配置。',
                })
              );
            }
            try {
              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  },
                },
              });

              const prompt = body.prompt || '';
              const systemInstruction =
                body.systemInstruction ||
                '你是一位资深系统工程规划专家、运筹学与项目管理 (PMP) 导师。精通工作分解结构(WBS)、网络计划(AON/AOA)、CPM关键路径法、PERT三点估计以及资源平衡调平。请以专业、清晰、富有工程洞察力的简体中文回答，条理分明，直击问题本质。';

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                  systemInstruction,
                },
              });

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({text: response.text}));
            } catch (err: any) {
              console.error('Gemini API Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  error: err.message || 'Gemini API 处理异常',
                })
              );
            }
          };

          if ((req as any).body) {
            return handleRequest((req as any).body);
          }

          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(bodyStr || '{}');
              handleRequest(parsed);
            } catch {
              handleRequest({});
            }
          });
          req.on('error', (err) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: err.message}));
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/Project-Planning-lab/',
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
