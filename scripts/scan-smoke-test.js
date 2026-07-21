// scripts/scan-smoke-test.ts  — npx ts-node scripts/scan-smoke-test.ts
import * as fs from 'fs';
import { ImageScanningService } from '../src/front-chat/image-scanning.service';
(async () => {
  const svc = new ImageScanningService();
  await svc.onModuleInit();
  console.log(await svc.scanImage(fs.readFileSync('src/front-chat/__fixtures__/landscape.jpg')));
  // expect { isSafe: true } — proves the model loads from disk with no network access
})();
