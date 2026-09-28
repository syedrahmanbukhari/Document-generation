import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { previewDocument } from './server/documents.js'

function localPreviewApi() {
  return {
    name: 'local-preview-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        if (req.url.split('?')[0] === '/preview') previewDocument(req, res)
        else next()
      })
    },
  }
}

export default defineConfig({ plugins: [react(), localPreviewApi()] })
