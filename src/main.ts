/**
 * Boot adapt shell, then 6×6 board + swipe + clear/drop (phase C).
 * Keep: adapt/*, create-renderer, DOM contract.
 */

import * as THREE from 'three';
import {
  applyStageTransform,
  computeStageLayout,
  watchStageLayout,
  type StageLayout,
} from './adapt/design';
import { mountDevicePreview } from './adapt/devicePreview';
import { lockWebGestures } from './adapt/lockGestures';
import { applyNativeClass, applySafeAreaCssVars } from './adapt/safeArea';
import { createRenderer, resizeToDesign } from './create-renderer';
import { mountBoard } from './game/mount';

const shell = document.getElementById('shell')!;
const viewportEl = document.getElementById('viewport')!;
const stage = document.getElementById('stage')!;
const uiRoot = document.getElementById('ui-root')!;

async function boot(): Promise<void> {
  lockWebGestures();
  applyNativeClass();
  applySafeAreaCssVars();

  const renderer = await createRenderer({ container: stage });
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const onLayout = (layout: StageLayout) => {
    applyStageTransform(stage, layout);
    applySafeAreaCssVars();
    resizeToDesign(renderer);
  };

  let preview: ReturnType<typeof mountDevicePreview>;
  preview = mountDevicePreview(shell, viewportEl, () => {
    const size = preview.getViewSize();
    onLayout(computeStageLayout(size.width, size.height));
  });

  const unwatch = watchStageLayout(onLayout, {
    getViewSize: () => preview.getViewSize(),
  });

  const game = mountBoard(uiRoot);

  /* Empty scene: do not submit GPU frames every tick on device. */
  renderer.setAnimationLoop(null);
  renderer.render(scene, camera);

  window.addEventListener(
    'pagehide',
    () => {
      unwatch();
      preview.dispose();
      game.dispose();
      renderer.setAnimationLoop(null);
      renderer.dispose();
    },
    { once: true },
  );
}

boot().catch((err) => {
  console.error(err);
});
