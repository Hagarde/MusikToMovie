import React from 'react';
import { 
  Film, 
  Music, 
  Sparkles, 
  Clapperboard, 
  Layers, 
  Compass, 
  Play, 
  HelpCircle, 
  Eye, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Lightbulb,
  Heart,
  Palette
} from 'lucide-react';

interface ConceptPageProps {
  onExploreTracks: () => void;
  onExploreProposals: () => void;
  onOpenUpload: () => void;
}

export const ConceptPage: React.FC<ConceptPageProps> = ({
  onExploreTracks,
  onExploreProposals,
  onOpenUpload,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16 animate-in fade-in duration-200">
      {/* 🌟 1. BANNIÈRE HÉRO MANIFESTE */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-8 sm:p-12 shadow-gallery text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold font-mono">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span>Le Manifeste MusikToMovie</span>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 font-display tracking-tight leading-tight">
            Et si la musique devenait le{' '}
            <span className="text-rose-600 font-serif italic">point de départ</span> du film ?
          </h1>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed font-sans">
            À Hollywood, la musique est traditionnellement composée à la toute fin du montage pour habiller les images. 
            <strong> MusikToMovie renverse totalement ce processus :</strong> la musique est ici la muse primitive. Ses montées d'accords, ses silences et ses textures sonores dictent le scénario, le cadrage et l'émotion d'une scène originale.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExploreTracks}
            className="px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs transition-all hover:scale-105 shadow-md flex items-center gap-2"
          >
            <Music className="w-4 h-4" />
            <span>Choisir une musique & créer</span>
          </button>

          <button
            type="button"
            onClick={onExploreProposals}
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-xs transition-all shadow-sm flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Voir les créations de la communauté</span>
          </button>
        </div>
      </div>

      {/* 🎬 2. LE PROCESSUS EN 5 ÉTAPES PAS-À-PAS */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">
            Le Processus Créatif en 5 Étapes
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            De la première écoute au storyboard animé en projection cinéma, voici comment donner vie à votre vision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Étape 1 */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-gallery space-y-3.5 relative overflow-hidden group hover:border-stone-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-2xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shadow-sm">
                01
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                Immersion Sonore
              </span>
            </div>

            <h3 className="font-bold text-stone-900 text-lg font-display flex items-center gap-2">
              <Music className="w-5 h-5 text-rose-600" />
              <span>Choisir un Morceau & Poser la Boucle</span>
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Explorez la bibliothèque ou importez n'importe quel morceau YouTube. Utilisez le lecteur en boucle pour isoler l'extrait clé (15 à 45 secondes) où la tension culmine. Fermez les yeux, écoutez le rythme et laissez les premières images émerger.
            </p>
          </div>

          {/* Étape 2 */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-gallery space-y-3.5 relative overflow-hidden group hover:border-stone-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-2xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shadow-sm">
                02
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                Dramaturgie
              </span>
            </div>

            <h3 className="font-bold text-stone-900 text-lg font-display flex items-center gap-2">
              <Film className="w-5 h-5 text-rose-600" />
              <span>L'Univers & le Logline du Film</span>
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Définissez le genre cinématographique (Thriller, Film Noir, Sci-Fi, Drame...), donnez un titre fort à votre projet et écrivez un <strong>pitch en une phrase (Logline)</strong> qui résume le cœur dramatique de l'histoire.
            </p>
          </div>

          {/* Étape 3 */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-gallery space-y-3.5 relative overflow-hidden group hover:border-stone-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-2xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shadow-sm">
                03
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                Structure en 3 Actes
              </span>
            </div>

            <h3 className="font-bold text-stone-900 text-lg font-display flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-rose-600" />
              <span>Les 3 Blocs Narratifs</span>
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Structurez votre récit autour du climax :
              <br />• <strong>Ce qui précède</strong> : La mèche qui s'allume, l'ambiance et la montée de la tension.
              <br />• <strong>La Scène Clé</strong> : Le moment précis où la musique explose.
              <br />• <strong>Ce qui succède</strong> : Le souffle qui retombe, les retombées et le dénouement.
            </p>
          </div>

          {/* Étape 4 */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-gallery space-y-3.5 relative overflow-hidden group hover:border-stone-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-2xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shadow-sm">
                04
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                Studio Flipanim
              </span>
            </div>

            <h3 className="font-bold text-stone-900 text-lg font-display flex items-center gap-2">
              <Palette className="w-5 h-5 text-rose-600" />
              <span>Dessiner le Storyboard Animé</span>
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Esquissez vos plans sur le canvas 16:9. Utilisez le <strong>pot de peinture</strong>, les <strong>formes</strong>, les <strong>flèches de caméra</strong> et la <strong>pelure d'oignon</strong> pour animer le mouvement. Ajustez la cadence de défilement (de <strong>1/4 fps</strong> pour contempler à 4 fps pour l'action).
            </p>
          </div>
        </div>

        {/* Étape 5 - Pleine Largeur : L'Indicible */}
        <div className="bg-white rounded-3xl border-2 border-stone-900 p-6 sm:p-8 shadow-gallery space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="w-9 h-9 rounded-2xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shadow-sm">
              05
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full">
              L'Âme du Film
            </span>
          </div>

          <h3 className="font-bold text-stone-900 text-xl font-display flex items-center gap-2">
            <Eye className="w-6 h-6 text-rose-600" />
            <span>Dire l'Indicible & Poser les Intentions de Réalisation</span>
          </h3>

          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed max-w-3xl">
            Donnez une profondeur invisible au dessin. C'est ici que vous décrivez ce qui ne se voit pas au premier regard : 
            les regards échangés, les silences pesants, la lumière crépusculaire à contre-jour, les intentions de découpage (travelling lent, cadrage serré) et la résonance intime avec les instruments de musique.
          </p>
        </div>
      </div>

      {/* 💡 3. CONSEILS POUR DÉBUTER & FAQ */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-gallery space-y-8">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 font-display">
              Foire Aux Questions & Idées Reçues
            </h2>
            <p className="text-xs text-stone-500">Tout ce que vous devez savoir avant de poser votre premier trait</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 bg-stone-50 p-5 rounded-2xl border border-stone-200/80">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>« Je ne sais pas dessiner, est-ce un obstacle ? »</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>Pas du tout !</strong> Un storyboard n'a pas besoin d'être une œuvre d'art finie. Des silhouettes simples, des traits expressifs, des cadres et des flèches de caméra suffisent amplement à communiquer une intention de réalisation puissante.
            </p>
          </div>

          <div className="space-y-2 bg-stone-50 p-5 rounded-2xl border border-stone-200/80">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <span>« Combien de frames faut-il créer ? »</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Vous êtes totalement libre : <strong>1 seule frame forte</strong> suffit pour poser un plan fixe marquant. Si vous souhaitez animer un geste, une silhouette ou un travelling, vous pouvez ajouter 2 à 10+ frames avec la cadence de votre choix.
            </p>
          </div>

          <div className="space-y-2 bg-stone-50 p-5 rounded-2xl border border-stone-200/80">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Layers className="w-4 h-4 text-purple-500 shrink-0" />
              <span>« Puis-je importer mes propres croquis ou photos ? »</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Oui ! Le bouton <strong>Image</strong> du studio vous permet d'importer instantanément un croquis réalisé sur papier, une photo de repérage ou une texture comme calque de référence sur votre frame.
            </p>
          </div>

          <div className="space-y-2 bg-stone-50 p-5 rounded-2xl border border-stone-200/80">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2 font-display">
              <Heart className="w-4 h-4 text-rose-500 shrink-0" />
              <span>« Pourquoi confronter plusieurs visions sur une même musique ? »</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              C'est la magie de MusikToMovie : sur un même morceau de Hans Zimmer ou d'Ennio Morricone, une personne imaginera une course-poursuite cyberpunk sous la pluie, tandis qu'une autre imaginera un adieu mélancolique dans une gare du 19ème siècle.
            </p>
          </div>
        </div>
      </div>

      {/* 🚀 4. CALL TO ACTION FINAL */}
      <div className="rounded-3xl bg-stone-900 text-white p-8 sm:p-10 shadow-2xl text-center space-y-5">
        <h3 className="text-2xl sm:text-3xl font-extrabold font-display">
          Prêt à réaliser votre premier storyboard ?
        </h3>
        <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Choisissez une musique parmi notre sélection ou importez le morceau de votre choix pour démarrer votre scénario.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onExploreTracks}
            className="px-7 py-3.5 rounded-2xl bg-white text-stone-900 font-black text-xs transition-transform hover:scale-105 shadow-md flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Explorer les Musiques</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition-colors flex items-center gap-2"
          >
            <span>+ Ajouter un Morceau YouTube</span>
          </button>
        </div>
      </div>
    </div>
  );
};
