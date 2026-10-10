/**
 * CloudWare MX Brand Identity & SVG Vector Assets
 * Slogan: "Cada segundo cuenta"
 * Provides scalable, theme-aware SVGs for the circular sphere emblem and full logo.
 */

export interface SphereSvgOptions {
  size?: number | string;
  isDark?: boolean;
  withBg?: boolean;
  className?: string;
  style?: string;
}

export interface FullLogoSvgOptions {
  width?: number | string;
  height?: number | string;
  isDark?: boolean;
  className?: string;
  style?: string;
}

/**
 * Retorna el SVG del puro círculo / esfera 3D de CloudWare con sus anillos orbitales gradientes (Cyan -> Azul -> Violeta -> Púrpura).
 * Adaptado para tema claro y tema oscuro.
 */
export function getCloudWareSphereSvg(options: SphereSvgOptions = {}): string {
  const {
    size = '100%',
    isDark = true,
    withBg = false,
    className = '',
    style = '',
  } = options;

  const bg = withBg ? (isDark ? '#090d16' : '#ffffff') : 'transparent';
  const idPrefix = `cw_${Math.random().toString(36).substring(2, 7)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" ${className ? `class="${className}"` : ''} ${style ? `style="${style}"` : ''}>
  <defs>
    <linearGradient id="${idPrefix}_grad1" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#00a8ff" />
      <stop offset="25%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="75%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#581c87" />
    </linearGradient>
    <linearGradient id="${idPrefix}_grad2" x1="85%" y1="15%" x2="15%" y2="85%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="40%" stop-color="#6366f1" />
      <stop offset="85%" stop-color="#9333ea" />
      <stop offset="100%" stop-color="#4c1d95" />
    </linearGradient>
  </defs>
  ${withBg ? `<rect width="512" height="512" rx="120" fill="${bg}"/>` : ''}
  <g transform="translate(256, 256)">
    <!-- Outer Rim -->
    <circle r="180" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="12" opacity="0.95"/>
    
    <!-- Diagonal Orbits -->
    <ellipse rx="180" ry="85" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="14" transform="rotate(-30)" opacity="0.95"/>
    <ellipse rx="180" ry="135" fill="none" stroke="url(#${idPrefix}_grad2)" stroke-width="12" transform="rotate(-30)" opacity="0.9"/>
    
    <!-- Latitude Curves (Horizontales 3D) -->
    <ellipse rx="165" ry="60" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="13" transform="translate(0, -60) rotate(-15)"/>
    <ellipse rx="178" ry="70" fill="none" stroke="url(#${idPrefix}_grad2)" stroke-width="15" transform="translate(0, 0) rotate(-15)"/>
    <ellipse rx="160" ry="60" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="14" transform="translate(0, 60) rotate(-15)"/>
    <ellipse rx="125" ry="45" fill="none" stroke="url(#${idPrefix}_grad2)" stroke-width="12" transform="translate(0, 110) rotate(-15)"/>
    <ellipse rx="125" ry="45" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="12" transform="translate(0, -110) rotate(-15)"/>
    
    <!-- Longitude Arcs (Verticales 3D) -->
    <ellipse rx="75" ry="178" fill="none" stroke="url(#${idPrefix}_grad2)" stroke-width="14" transform="rotate(25)" opacity="0.85"/>
    <ellipse rx="125" ry="176" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="13" transform="rotate(25)" opacity="0.9"/>
    <ellipse rx="155" ry="172" fill="none" stroke="url(#${idPrefix}_grad2)" stroke-width="12" transform="rotate(25)" opacity="0.75"/>
    
    <!-- Interlocking Ribbons -->
    <path d="M -160,-70 Q 0,40 160,70" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="16" stroke-linecap="round"/>
    <path d="M -170,0 Q 0,110 170,0" fill="none" stroke="url(#${idPrefix}_grad2)" stroke-width="15" stroke-linecap="round"/>
    <path d="M -140,70 Q 0,165 140,70" fill="none" stroke="url(#${idPrefix}_grad1)" stroke-width="14" stroke-linecap="round"/>
  </g>
</svg>`;
}

/**
 * Retorna el SVG completo de la marca: Esfera + CloudWare MX + "Cada segundo cuenta"
 */
export function getCloudWareFullLogoHtml(isDark = true): string {
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const sloganColor = isDark ? '#94a3b8' : '#475569';
  const sphereSvg = getCloudWareSphereSvg({ size: 68, isDark });

  return `<div class="cw-brand-logo-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center;">
    <div class="cw-brand-sphere" style="width: 68px; height: 68px; filter: drop-shadow(0 6px 16px rgba(14, 165, 233, 0.3));">
      ${sphereSvg}
    </div>
    <div class="cw-brand-text-block">
      <div style="font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; color: ${textColor}; line-height: 1.1; letter-spacing: -0.5px; display: flex; align-items: flex-start; justify-content: center; gap: 3px;">
        <span>CloudWare</span>
        <span style="font-size: 13px; font-weight: 900; color: #0284c7; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 4px; padding: 1px 4px; margin-top: 1px;">MX</span>
      </div>
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12.5px; font-weight: 600; color: ${sloganColor}; letter-spacing: 0.3px; margin-top: 3px;">
        Cada segundo cuenta
      </div>
    </div>
  </div>`;
}
