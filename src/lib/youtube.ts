export type PlatformSource = 'youtube' | 'youtube_music' | 'spotify' | 'deezer' | 'soundcloud' | 'unknown';

export function detectPlatform(url: string): PlatformSource {
  if (!url || typeof url !== 'string') return 'unknown';
  const trimmed = url.trim().toLowerCase();

  if (trimmed.includes('music.youtube.com')) return 'youtube_music';
  if (trimmed.includes('youtu.be') || trimmed.includes('youtube.com')) return 'youtube';
  if (trimmed.includes('spotify.com')) return 'spotify';
  if (trimmed.includes('deezer.com')) return 'deezer';
  if (trimmed.includes('soundcloud.com')) return 'soundcloud';

  return 'unknown';
}

export function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
}

export interface UniversalTrackInfo {
  platform: PlatformSource;
  title: string;
  artist: string;
  thumbnail_url?: string;
  youtubeId?: string;
  searchQuery?: string;
  requiresYouTubeLink: boolean;
  message?: string;
}

export async function resolveUniversalTrack(url: string): Promise<UniversalTrackInfo> {
  const platform = detectPlatform(url);
  const trimmed = url.trim();

  // 1. YouTube & YouTube Music (Support natif direct)
  if (platform === 'youtube' || platform === 'youtube_music') {
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      const meta = await fetchYouTubeMetadata(ytId);
      return {
        platform,
        title: meta.title,
        artist: meta.artist,
        thumbnail_url: meta.thumbnail_url,
        youtubeId: ytId,
        requiresYouTubeLink: false,
      };
    }
  }

  // 2. Spotify (Extraction des métadonnées via oEmbed)
  if (platform === 'spotify') {
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const rawTitle = data.title || '';
        // Souvent le titre Spotify est au format "Titre" ou "Titre - Artiste"
        return {
          platform: 'spotify',
          title: rawTitle,
          artist: '',
          thumbnail_url: data.thumbnail_url,
          searchQuery: rawTitle,
          requiresYouTubeLink: true,
          message: 'Morceau Spotify détecté ! Les liens YouTube sont à privilégier pour garantir la synchronisation intégrale.',
        };
      }
    } catch (e) {
      console.warn('Erreur oEmbed Spotify:', e);
    }
  }

  // 3. Deezer (Extraction des métadonnées via oEmbed)
  if (platform === 'deezer') {
    try {
      const res = await fetch(`https://api.deezer.com/oembed?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          platform: 'deezer',
          title: data.title || '',
          artist: data.author_name || '',
          thumbnail_url: data.thumbnail_url,
          searchQuery: `${data.title || ''} ${data.author_name || ''}`.trim(),
          requiresYouTubeLink: true,
          message: 'Morceau Deezer détecté ! Les liens YouTube sont à privilégier pour garantir la synchronisation intégrale.',
        };
      }
    } catch (e) {
      console.warn('Erreur oEmbed Deezer:', e);
    }
  }

  // 4. SoundCloud (Extraction des métadonnées via oEmbed)
  if (platform === 'soundcloud') {
    try {
      const res = await fetch(`https://soundcloud.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        return {
          platform: 'soundcloud',
          title: data.title || '',
          artist: data.author_name || '',
          thumbnail_url: data.thumbnail_url,
          searchQuery: `${data.title || ''} ${data.author_name || ''}`.trim(),
          requiresYouTubeLink: true,
          message: 'Morceau SoundCloud détecté ! Les liens YouTube sont à privilégier pour garantir la lecture intégrale et les timecodes.',
        };
      }
    } catch (e) {
      console.warn('Erreur oEmbed SoundCloud:', e);
    }
  }

  return {
    platform: 'unknown',
    title: '',
    artist: '',
    requiresYouTubeLink: true,
    message: 'Lien non reconnu. Privilégiez un lien YouTube direct pour une synchronisation optimale.',
  };
}

export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  
  // Si c'est déjà un ID brut valide de 11 caractères
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const regExp = /(?:youtu\.be\/|(?:music\.)?youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  const safeId = encodeURIComponent(videoId.trim());
  return `https://img.youtube.com/vi/${safeId}/hqdefault.jpg`;
}

export interface YouTubeMetadata {
  title: string;
  artist: string;
  thumbnail_url: string;
  duration?: number;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumb = getYouTubeThumbnail(videoId);

  try {
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'Musique YouTube',
        artist: data.author_name || 'Artiste YouTube',
        thumbnail_url: data.thumbnail_url || defaultThumb,
      };
    }
  } catch (err) {
    console.warn('Erreur récupération oEmbed YouTube:', err);
  }

  return {
    title: 'Musique YouTube',
    artist: 'Artiste YouTube',
    thumbnail_url: defaultThumb,
  };
}

let ytApiPromise: Promise<any> | null = null;

export function loadYouTubeAPI(): Promise<any> {
  const win = window as any;
  if (win.YT && win.YT.Player) {
    return Promise.resolve(win.YT);
  }

  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      
      tag.onerror = () => reject(new Error('Failed to load YouTube API'));
      
      const timeoutId = setTimeout(() => {
        reject(new Error('YouTube API load timeout'));
      }, 10000);

      (document.head || document.body).appendChild(tag);

      win.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeoutId);
        resolve(win.YT);
      };
    });
  }

  return ytApiPromise;
}
