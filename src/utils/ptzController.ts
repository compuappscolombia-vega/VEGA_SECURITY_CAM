/**
 * VEGA SECURITY CAM - Virtual PTZ (Pan-Tilt-Zoom) Controller
 * Handles digital camera stream panning, tilting, digital zoom levels,
 * boundary clamping, and ONVIF PTZ command formatting.
 */

export interface PtzState {
  pan: number; // Horizontal offset in percentage (-50% to +50%)
  tilt: number; // Vertical offset in percentage (-50% to +50%)
  zoom: number; // Zoom multiplier (1.0x to 5.0x)
  step: number; // Step increment per button press (e.g., 5%)
}

export const DEFAULT_PTZ_STATE: PtzState = {
  pan: 0,
  tilt: 0,
  zoom: 1.0,
  step: 5,
};

/**
 * Applies a PTZ directional movement with boundary clamping based on current zoom level.
 */
export function applyPtzMovement(
  current: PtzState,
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ZOOM_IN' | 'ZOOM_OUT' | 'RESET'
): PtzState {
  if (direction === 'RESET') {
    return { ...DEFAULT_PTZ_STATE };
  }

  const maxOffset = Math.max(0, (current.zoom - 1) * 25);

  let newPan = current.pan;
  let newTilt = current.tilt;
  let newZoom = current.zoom;

  switch (direction) {
    case 'UP':
      newTilt = Math.max(-maxOffset, current.tilt - current.step);
      break;
    case 'DOWN':
      newTilt = Math.min(maxOffset, current.tilt + current.step);
      break;
    case 'LEFT':
      newPan = Math.max(-maxOffset, current.pan - current.step);
      break;
    case 'RIGHT':
      newPan = Math.min(maxOffset, current.pan + current.step);
      break;
    case 'ZOOM_IN':
      newZoom = Math.min(5.0, Number((current.zoom + 0.25).toFixed(2)));
      break;
    case 'ZOOM_OUT':
      newZoom = Math.max(1.0, Number((current.zoom - 0.25).toFixed(2)));
      // Re-clamp pan and tilt to new max offset
      const updatedMax = Math.max(0, (newZoom - 1) * 25);
      newPan = Math.max(-updatedMax, Math.min(updatedMax, newPan));
      newTilt = Math.max(-updatedMax, Math.min(updatedMax, newTilt));
      break;
  }

  return {
    ...current,
    pan: Number(newPan.toFixed(1)),
    tilt: Number(newTilt.toFixed(1)),
    zoom: newZoom,
  };
}

/**
 * Computes CSS transform string for smooth digital PTZ stream rendering.
 */
export function getPtzCssTransform(ptz: PtzState): string {
  // Translate is scaled inversely so panning is intuitive at higher zoom
  return `scale(${ptz.zoom}) translate(${-ptz.pan}%, ${-ptz.tilt}%)`;
}

/**
 * Generates standard ONVIF PTZ HTTP command payload for physical PTZ IP cameras (e.g. Tapo, Dahua).
 */
export function formatOnvifPtzCommand(camIp: string, ptz: PtzState): {
  url: string;
  payload: Record<string, number>;
} {
  return {
    url: `http://${camIp}/onvif/ptz_service`,
    payload: {
      panNormalized: Number((ptz.pan / 50).toFixed(2)),
      tiltNormalized: Number((ptz.tilt / 50).toFixed(2)),
      zoomLevel: ptz.zoom,
    },
  };
}
