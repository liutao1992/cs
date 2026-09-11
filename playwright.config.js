import { defineConfig } from '@playwright/test';
const port=process.env.E2E_PORT||'3107';
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({testDir:'./tests/e2e',timeout:30000,workers:1,reporter:'list',use:{baseURL,viewport:{width:1440,height:900},launchOptions:{executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']},screenshot:'only-on-failure',trace:'retain-on-failure'},webServer:{command:'npm start',env:{PORT:port},url:baseURL+'/health',reuseExistingServer:false}});
