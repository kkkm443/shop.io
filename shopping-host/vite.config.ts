import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ base를 반드시 본인의 GitHub 레포 이름으로 바꿔주세요!
// 예: 레포 이름이 "ai-shopping-host" 이면 '/ai-shopping-host/'
export default defineConfig({
  plugins: [react()],
  base: '/shop.io/',
})
