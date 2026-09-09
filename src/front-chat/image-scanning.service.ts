import { Injectable, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import { load, NSFWJS } from 'nsfwjs/core';
import { MobileNetV2Model } from 'nsfwjs/models/mobilenet_v2';
import { Logger } from 'src/logger/logger';

const logger = new Logger('ImageScanningService');
const EXPLICIT_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']); // model also returns Neutral / Drawing
const THRESHOLD = 0.6; // 60% confidence; tune later if we see false positives/negatives

@Injectable()
export class ImageScanningService implements OnModuleInit {
  private model: NSFWJS;

  async onModuleInit() {
    // Model ships inside the nsfwjs package (loaded from node_modules), so nothing is
    // committed to the repo and no network call is made at runtime.
    this.model = await load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] });
    logger.log('Bundled NSFW model loaded');
  }
  async scanImage(buffer: Buffer): Promise<{ isSafe: boolean; reason?: string }> {
    let tensor: tf.Tensor3D | undefined;
    try {
      tensor = tf.node.decodeImage(buffer, 3) as tf.Tensor3D;
      const predictions = await this.model.classify(tensor);
      for (const p of predictions) {
        if (EXPLICIT_CLASSES.has(p.className) && p.probability > THRESHOLD) {
          return { isSafe: false, reason: `${p.className} ${(p.probability * 100).toFixed(1)}%` };
        }
      }
      return { isSafe: true };
    } catch (error) {
      // Fail-open: if the scanner breaks, let the image through so chat doesn't halt for everyone.
      logger.error(`Image scanning failed: ${(error as Error)?.message}`);
      return { isSafe: true, reason: 'Scanner error' };
    } finally {
      tensor?.dispose(); // Critical: tensors aren't garbage-collected — leaks memory otherwise.
    }
  }
}
