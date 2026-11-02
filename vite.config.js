import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { roriskApi } from './server/index.js'

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, repositoryRoot, '')
  const mm2RiskEnabled = /^(?:1|true|yes|on)$/i.test(loadedEnv.MM2RISK_TOGGLE || '')
  const applicationRoot = mm2RiskEnabled
    ? path.join(repositoryRoot, 'MM2Risk')
    : repositoryRoot
  const serverEnv = Object.freeze({
    SUPABASE_URL: loadedEnv.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: loadedEnv.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: loadedEnv.SUPABASE_SECRET_KEY,
    RORISK_USER_SECRET: loadedEnv.RORISK_USER_SECRET,
    HCAPTCHA_SECRET: loadedEnv.HCAPTCHA_SECRET,
    HCAPTCHA_SITE_KEY: loadedEnv.HCAPTCHA_SITE_KEY || loadedEnv.VITE_HCAPTCHA_SITE_KEY,
    OXAPAY_MERCHANT_API_KEY: loadedEnv.OXAPAY_MERCHANT_API_KEY,
    OXAPAY_PAYOUT_API_KEY: loadedEnv.OXAPAY_PAYOUT_API_KEY,
    OXAPAY_CALLBACK_BASE_URL: loadedEnv.OXAPAY_CALLBACK_BASE_URL,
    HACKSAW_PARTNER: loadedEnv.HACKSAW_PARTNER,
    HACKSAW_CALLBACK_BASE_URL: loadedEnv.HACKSAW_CALLBACK_BASE_URL,
    HACKSAW_RGS_BASE_URL: loadedEnv.HACKSAW_RGS_BASE_URL,
    HACKSAW_STATIC_BASE_URL: loadedEnv.HACKSAW_STATIC_BASE_URL,
    HACKSAW_WEBSITE_BASE_URL: loadedEnv.HACKSAW_WEBSITE_BASE_URL,
    HACKSAW_EXTERNAL_CURRENCY: loadedEnv.HACKSAW_EXTERNAL_CURRENCY,
    HACKSAW_MAX_BET_LEVEL: loadedEnv.HACKSAW_MAX_BET_LEVEL,
  })

  return {
    root: applicationRoot,
    publicDir: path.join(applicationRoot, 'public'),
    envPrefix: 'PUBLIC_CLIENT_',
    build: {
      outDir: path.join(repositoryRoot, 'dist'),
      emptyOutDir: true,
      sourcemap: false,
    },
    plugins: [roriskApi(serverEnv), react()],
    server: {
      allowedHosts: ['rorisk-v2.onrender.com'],
      host: '0.0.0.0',
    },
    preview: {
      allowedHosts: ['rorisk-v2.onrender.com'],
      host: '0.0.0.0',
      port: 10000, 
      strictPort: true, 
    },
  }
})
