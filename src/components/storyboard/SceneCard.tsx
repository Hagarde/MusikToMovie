import React from 'react';
import { Clock, Film, Sparkles, ChevronRight, PenTool } from 'lucide-react';
import { Scene, SectionType } from '../../lib/types';
import { StoryboardCanvas } from '../canvas/StoryboardCanvas';

interface SceneCardProps {
  scene: Scene;
  currentAudioTime?: number;
  onChange: (updated: Partial<Scene>) => void;
  onPreviewTimeRange?: (start: number, end: number) => void;
}

const SECTION_CONFIG: Record<SectionType, { label: string; badge: string; color: string; desc: string }> = {
  preceding: {
    label: '1. Éléments Précédents (Avant la scène)',
    badge: 'Introduction / Contexte',
    color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    desc: 'Que se passe-t-il juste avant ? Contexte, tension montante, mise en place des personnages.'
  },
  main: {
    label: '2. La Scène Clé (Synchronisée avec la Musique)',
    badge: 'Scène Principale',
    color: 'border-brand-500/60 text-brand-400 bg-brand-500/10 ring-1 ring-brand-500/30',
    desc: 'L\'instant pivot où la musique prend tout son sens : action, révélation, émotion intense.'
  },
  succeeding: {
    label: '3. Éléments Succédants (Après la scène)',
    badge: 'Résolution / Conséquences',
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    desc: 'Quelles sont les répercussions immédiates ? Transition narrative, silence, suite de l\'histoire.'
  }
};

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  currentAudioTime = 0,
  onChange,
  onPreviewTimeRange
}) => {
  const config = SECTION_CONFIG[scene.section_type];

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  return (
    <div className="bg-cinema-850 rounded-2xl border border-cinema-700/70 p-5 shadow-xl space-y-4 transition-all hover:border-cinema-600">
      {/* En-tête de la section */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cinema-700/50 pb-3">
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
            {config.label}
          </div>
        </div>

        {/* Timecodes de la scène */}
        <div className="flex items-center gap-2 text-xs font-mono bg-cinema-900/80 px-3 py-1.5 rounded-xl border border-cinema-700/40">
          <Clock className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-slate-400">Timecode :</span>
          
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={formatSeconds(scene.start_time)}
              onChange={(e) => onChange({ start_time: parseTime(e.target.value) })}
              className="w-12 bg-cinema-800 text-center rounded text-brand-300 font-semibold px-1 py-0.5 border border-cinema-700 text-xs"
              placeholder="00:00"
              title="Début"
            />
            <span className="text-slate-500">→</span>
            <input
              type="text"
              value={formatSeconds(scene.end_time)}
              onChange={(e) => onChange({ end_time: parseTime(e.target.value) })}
              className="w-12 bg-cinema-800 text-center rounded text-brand-300 font-semibold px-1 py-0.5 border border-cinema-700 text-xs"
              placeholder="01:30"
              title="Fin"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (scene.start_time === 0) {
                onChange({ start_time: Math.floor(currentAudioTime) });
              } else {
                onChange({ end_time: Math.floor(currentAudioTime) });
              }
            }}
            className="text-[10px] bg-cinema-700 hover:bg-brand-500 hover:text-cinema-900 text-slate-300 px-2 py-0.5 rounded transition-colors"
            title="Caler sur le lecteur audio actuel"
          >
            Prendre timecode ({formatSeconds(currentAudioTime)})
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 italic">{config.desc}</p>

      {/* Grille principale : Canevas de dessin & Description textuelle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonne Dessin Storyboard (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-brand-300">
              <PenTool className="w-3.5 h-3.5" />
              Storyboard Visuel (Croquis / Esquisse)
            </span>
            <span className="text-[11px] text-slate-500">Dessinez directement dans le cadre</span>
          </div>

          <StoryboardCanvas
            initialImage={scene.image_data}
            onSave={(imageData) => onChange({ image_data: imageData })}
          />
        </div>

        {/* Colonne Scénario & Textes (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Titre du Plan / Séquence
              </label>
              <input
                type="text"
                value={scene.scene_title}
                onChange={(e) => onChange({ scene_title: e.target.value })}
                placeholder="Ex: Plan large sur la ville sous la pluie..."
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description de l'action & intentions de mise en scène
              </label>
              <textarea
                rows={7}
                value={scene.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Détaillez le cadrage de caméra, les mouvements des personnages, les effets visuels, la relation entre l'intensité de la musique et l'image..."
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed resize-none"
              />
            </div>
          </div>

          {onPreviewTimeRange && (
            <button
              type="button"
              onClick={() => onPreviewTimeRange(scene.start_time, scene.end_time)}
              className="w-full py-2 px-3 rounded-xl bg-cinema-800 hover:bg-cinema-700 text-xs font-medium text-slate-300 hover:text-brand-300 border border-cinema-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Écouter la musique pour cette séquence ({formatSeconds(scene.start_time)} - {formatSeconds(scene.end_time)})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
