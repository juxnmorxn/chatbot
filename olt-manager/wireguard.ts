import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';

export interface WireguardKeypair {
  privateKey: string;
  publicKey: string;
}

export interface WireguardPeerStats {
  publicKey: string;
  endpoint: string;
  allowedIps: string;
  latestHandshake: number;
  secondsAgo: number | null;
  transferRx: number;
  transferTx: number;
  isConnected: boolean;
}

const SERVER_PUBLIC_KEY = 'uqHcuPxy68PPholZRE6tTP7iYhfPKLPsxAjCCkTBp2E=';
const SERVER_PUBLIC_IP = '2.25.241.239';
const SERVER_PORT = 51820;

/**
 * Genera un par de llaves WireGuard (Curve25519) válido
 */
export function generateWireguardKeypair(): WireguardKeypair {
  try {
    const priv = execSync('wg genkey').toString().trim();
    const pub = execSync(`echo "${priv}" | wg pubkey`).toString().trim();
    if (priv && pub) return { privateKey: priv, publicKey: pub };
  } catch (err) {
    // Fallback nativo con Node crypto x25519
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519', {
    privateKeyEncoding: { format: 'der', type: 'pkcs8' },
    publicKeyEncoding: { format: 'der', type: 'spki' }
  });
  return {
    privateKey: privateKey.subarray(privateKey.length - 32).toString('base64'),
    publicKey: publicKey.subarray(publicKey.length - 32).toString('base64')
  };
}

/**
 * Registra o actualiza un Peer en la interfaz wg0 del VPS y crea las rutas de red
 */
export function applyWireguardPeer(publicKey: string, clientIp: string, subnets?: string): void {
  const sanitizedSubnets = (subnets || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const allowedIpsList = [`${clientIp}/32`, ...sanitizedSubnets];
  const allowedIpsStr = allowedIpsList.join(',');

  try {
    execSync(`wg set wg0 peer "${publicKey}" allowed-ips "${allowedIpsStr}"`);
    console.log(`[WireGuard] Peer ${publicKey.substring(0, 8)}... actualizado con allowed-ips: ${allowedIpsStr}`);
  } catch (err: any) {
    console.warn('[WireGuard] Advertencia al ejecutar wg set:', err.message);
  }

  // Rutas en el kernel de Linux para que el VPS pueda alcanzar la OLT a través del MikroTik
  for (const subnet of sanitizedSubnets) {
    try {
      execSync(`ip route replace ${subnet} dev wg0`);
      console.log(`[WireGuard] Ruta agregada: ${subnet} dev wg0`);
    } catch (err: any) {
      console.warn(`[WireGuard] Advertencia al agregar ruta ${subnet}:`, err.message);
    }
  }

  // Persistir en /etc/wireguard/wg0.conf si existe el archivo
  try {
    syncPeerToConfigFile(publicKey, allowedIpsStr);
  } catch (err) {
    // Silencioso si no hay acceso de escritura directo a /etc/wireguard
  }
}

/**
 * Elimina un peer de wg0 y sus rutas
 */
export function removeWireguardPeer(publicKey: string, subnets?: string): void {
  try {
    execSync(`wg set wg0 peer "${publicKey}" remove`);
  } catch (err: any) {
    console.warn('[WireGuard] Error removiendo peer:', err.message);
  }

  if (subnets) {
    for (const subnet of subnets.split(',').map(s => s.trim()).filter(Boolean)) {
      try {
        execSync(`ip route del ${subnet} dev wg0`);
      } catch {}
    }
  }
}

/**
 * Obtiene métricas en vivo de los túneles conectados
 */
export function getWireguardStats(): Map<string, WireguardPeerStats> {
  const statsMap = new Map<string, WireguardPeerStats>();
  try {
    const dump = execSync('wg show wg0 dump').toString();
    const lines = dump.trim().split('\n');
    const now = Math.floor(Date.now() / 1000);

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length >= 8) {
        const [pubKey, , endpoint, allowedIps, handshakeStr, rxStr, txStr] = parts;
        const handshake = parseInt(handshakeStr, 10) || 0;
        const rx = parseInt(rxStr, 10) || 0;
        const tx = parseInt(txStr, 10) || 0;
        const secondsAgo = handshake > 0 ? (now - handshake) : null;
        // Keepalive en MikroTik es de 25s; si no hay respuesta en 55s (más de 2 ciclos), se considera desconectado
        const isConnected = handshake > 0 && secondsAgo !== null && secondsAgo <= 55;

        statsMap.set(pubKey, {
          publicKey: pubKey,
          endpoint,
          allowedIps,
          latestHandshake: handshake,
          secondsAgo,
          transferRx: rx,
          transferTx: tx,
          isConnected
        });
      }
    }
  } catch {
    // En entorno sin wg directo
  }
  return statsMap;
}

/**
 * Genera el script RouterOS v7 para MikroTik
 */
export function buildMikrotikScript(tunnelName: string, clientIp: string, clientPriv: string): string {
  return `# ========================================================
# CLOUDOLT: Enlace MikroTik RouterOS v7 -> VPS
# Tunel: ${tunnelName}@cloudware.cloudolt.com
# ========================================================

# 1. Crear Interfaz WireGuard (remueve previa si existiera para evitar colisión de puerto)
/interface wireguard remove [find where name="wg-cloudolt"]
/interface wireguard add name=wg-cloudolt listen-port=13231 private-key="${clientPriv}" comment="CloudOLT VPN (${tunnelName})"

# 2. Asignar Direccion IP al Tunel
/ip address remove [find where interface="wg-cloudolt"]
/ip address add address=${clientIp}/24 interface=wg-cloudolt network=10.200.0.0

# 3. Registrar el Servidor VPS CloudOLT como Peer
/interface wireguard peers remove [find where interface="wg-cloudolt"]
/interface wireguard peers add interface=wg-cloudolt public-key="${SERVER_PUBLIC_KEY}" endpoint-address="${SERVER_PUBLIC_IP}" endpoint-port=${SERVER_PORT} allowed-address=10.200.0.0/24 persistent-keepalive=25s comment="CloudOLT Hostinger VPS"

# 4. Permitir Trafico de Gestion, Ping y Forward hacia la OLT
/ip firewall filter remove [find where comment~"CloudOLT"]
/ip firewall filter add chain=input in-interface=wg-cloudolt action=accept comment="CloudOLT Input y Ping"
/ip firewall filter add chain=forward in-interface=wg-cloudolt action=accept comment="CloudOLT Traffic to OLT"
`;
}

function syncPeerToConfigFile(publicKey: string, allowedIps: string): void {
  const confPath = '/etc/wireguard/wg0.conf';
  if (!fs.existsSync(confPath)) return;
  const content = fs.readFileSync(confPath, 'utf8');
  if (content.includes(publicKey)) return;

  const peerBlock = `\n[Peer]\nPublicKey = ${publicKey}\nAllowedIPs = ${allowedIps}\n`;
  fs.appendFileSync(confPath, peerBlock, 'utf8');
}
