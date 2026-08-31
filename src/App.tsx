import React, { useState, useEffect, Suspense } from 'react';
import { Track, Proposal, MovieToMusikProject, MusikToMusikProject } from './lib/types';
import { 
  getTracks, 
  getProposals, 
  deleteTrack, 
  deleteProposal,
  getMovieToMusikProjects,
  deleteMovieToMusikProject
} from './lib/supabase';
import { Navbar, AppView, AppMode } from './components/Navbar';
import { TrackList } from './components/tracks/TrackList';
import { TrackUploadModal } from './components/tracks/TrackUploadModal';
const ProposalCreator = React.lazy(() => import('./components/storyboard/ProposalCreator').then(m => ({ default: m.ProposalCreator })));
import { ProposalViewer } from './components/storyboard/ProposalViewer';
import { ProposalsGallery } from './components/storyboard/ProposalsGallery';
import { ConceptPage } from './components/about/ConceptPage';
import { AdminModal } from './components/admin/AdminModal';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { CineClippy } from './components/clippy/CineClippy';
const MovieToMusikStudio = React.lazy(() => import('./components/movietomusik/MovieToMusikStudio').then(m => ({ default: m.MovieToMusikStudio })));
import { MovieToMusikGallery } from './components/movietomusik/MovieToMusikGallery';
const MusikToMusikStudio = React.lazy(() => import('./components/musiktomusik/MusikToMusikStudio').then(m => ({ default: m.MusikToMusikStudio })));
import { MusikToMusikGallery } from './components/musiktomusik/MusikToMusikGallery';

export default function App() {
  // Mode actif : MusikToMovie (Classique), MovieToMusik (Studio Inversé) ou MusikToMusik (Mashup & Stems)
  const [appMode, setAppMode] = useState<AppMode>('musiktomovie');
  const [currentView, setCurrentView] = useState<AppView>('concept');

  // Données MusikToMovie
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  // Données MovieToMusik
  const [m2mProjects, setM2mProjects] = useState<MovieToMusikProject[]>([]);

  // Données MusikToMusik
  const [targetMashupId, setTargetMashupId] = useState<string | null>(null);

  // Modales & Chargement
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Authentification Mode Admin (persistance en session)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('m2m_admin_session') === 'true';
    }
    return false;
  });

  const hashString = async (str: string) => {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    const checkAdminUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const adminParam = urlParams.get('admin');
      if (adminParam) {
        const hash = await hashString(adminParam.toLowerCase());
        const validHashes = [
          'dc9e13c28ba0b4445a61469f02185bbd02a7eec2ee2238d23a85e9ea74673a97',
          '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
          '6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6',
          '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
          'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b'
        ];
        if (validHashes.includes(hash)) {
          setIsAdmin(true);
          sessionStorage.setItem('m2m_admin_session', 'true');
        }
      }
    };
    checkAdminUrl();
  }, []);

  const handleAuthenticateAdmin = async (passcode: string): Promise<boolean> => {
    const hash = await hashString(passcode.toLowerCase());
    const validHashes = [
      'dc9e13c28ba0b4445a61469f02185bbd02a7eec2ee2238d23a85e9ea74673a97',
      '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      '6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6',
      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
    ];
    if (validHashes.includes(hash)) {
      setIsAdmin(true);
      sessionStorage.setItem('m2m_admin_session', 'true');
      return true;
    }
    return false;
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('m2m_admin_session');
  };

  // Chargement initial des données & Résolution automatique des deep-links
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedTracks, fetchedProposals, fetchedM2m] = await Promise.all([
        getTracks(),
        getProposals(),
        getMovieToMusikProjects(),
      ]);
      setTracks(fetchedTracks);
      setProposals(fetchedProposals);
      setM2mProjects(fetchedM2m);

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);

        // Deep link MusikToMusik (?mashup=ID ou ?mode=musiktomusik)
        const mashupId = urlParams.get('mashup') || urlParams.get('remix');
        if (mashupId || urlParams.get('mode') === 'musiktomusik') {
          setAppMode('musiktomusik');
          setTargetMashupId(mashupId);
          setCurrentView('m2m_mashup_gallery');
          return;
        }

        // Deep link MovieToMusik (?m2m_story=ID ou ?mode=movietomusik)
        const m2mStoryId = urlParams.get('m2m_story') || urlParams.get('m2m');
        if (m2mStoryId || urlParams.get('mode') === 'movietomusik') {
          setAppMode('movietomusik');
          setCurrentView('m2m_gallery');
          return;
        }

        // Deep link MusikToMovie (?story=ID)
        const storyId = urlParams.get('story') || urlParams.get('p') || urlParams.get('proposal');
        if (storyId) {
          const matched = fetchedProposals.find((p) => p.id === storyId);
          if (matched) {
            const matchedTrack = fetchedTracks.find((t) => t.id === matched.track_id) || null;
            setSelectedProposal(matched);
            setSelectedTrack(matchedTrack);
            setCurrentView('view');
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Support des boutons Précédent / Suivant du navigateur (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);

      const mashupId = urlParams.get('mashup') || urlParams.get('remix');
      if (mashupId || urlParams.get('mode') === 'musiktomusik') {
        setAppMode('musiktomusik');
        setTargetMashupId(mashupId);
        setCurrentView('m2m_mashup_gallery');
        return;
      }

      const m2mStoryId = urlParams.get('m2m_story') || urlParams.get('m2m');
      if (m2mStoryId || urlParams.get('mode') === 'movietomusik') {
        setAppMode('movietomusik');
        setCurrentView('m2m_gallery');
        return;
      }

      const storyId = urlParams.get('story') || urlParams.get('p') || urlParams.get('proposal');
      if (storyId && proposals.length > 0) {
        const matched = proposals.find((p) => p.id === storyId);
        if (matched) {
          const matchedTrack = tracks.find((t) => t.id === matched.track_id) || null;
          setSelectedProposal(matched);
          setSelectedTrack(matchedTrack);
          setAppMode('musiktomovie');
          setCurrentView('view');
          return;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [proposals, tracks]);

  const updateUrlParam = (key: string, value: string | null) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
      window.history.pushState(null, '', url.toString());
    }
  };

  // Basculer de mode (MusikToMovie <-> MovieToMusik <-> MusikToMusik)
  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    setEditingProposal(null);

    if (mode === 'musiktomovie') {
      updateUrlParam('m2m_story', null);
      updateUrlParam('mashup', null);
      updateUrlParam('mode', null);
      setCurrentView('concept');
    } else if (mode === 'movietomusik') {
      updateUrlParam('story', null);
      updateUrlParam('mashup', null);
      updateUrlParam('mode', 'movietomusik');
      setCurrentView('m2m_gallery');
    } else {
      updateUrlParam('story', null);
      updateUrlParam('m2m_story', null);
      updateUrlParam('mode', 'musiktomusik');
      setCurrentView('m2m_mashup_gallery');
    }
  };

  // ------------------------------------
  // Handlers MusikToMovie
  // ------------------------------------
  const handleCreateProposal = (track: Track) => {
    setSelectedTrack(track);
    setEditingProposal(null);
    setCurrentView('create');
  };

  const handleSelectProposal = (proposal: Proposal) => {
    const track = tracks.find((t) => t.id === proposal.track_id) || null;
    setSelectedProposal(proposal);
    setSelectedTrack(track);
    updateUrlParam('story', proposal.id);
    setCurrentView('view');
  };

  const handleEditProposal = (proposal: Proposal) => {
    const track = tracks.find((t) => t.id === proposal.track_id) || null;
    setSelectedTrack(track);
    setEditingProposal(proposal);
    setCurrentView('create');
  };

  const handleProposalSaved = (savedProposal: Proposal) => {
    setProposals((prev) => {
      const index = prev.findIndex((p) => p.id === savedProposal.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedProposal;
        return next;
      }
      return [savedProposal, ...prev];
    });

    setSelectedProposal(savedProposal);
    setEditingProposal(null);
    updateUrlParam('story', savedProposal.id);
    setCurrentView('view');
  };

  const handleDeleteProposal = async (proposalId: string) => {
    if (!isAdmin) return;
    const ok = await deleteProposal(proposalId);
    if (ok) {
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      if (selectedProposal?.id === proposalId) {
        setSelectedProposal(null);
        updateUrlParam('story', null);
        setCurrentView('proposals');
      }
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!isAdmin) return;
    const ok = await deleteTrack(trackId);
    if (ok) {
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (selectedTrack?.id === trackId) {
        setSelectedTrack(null);
      }
    }
  };

  const handleVoteUpdated = (proposalId: string, newVotesCount: number) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, votes_count: newVotesCount } : p
      )
    );
  };

  const handleTrackCreated = (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev]);
    setSelectedTrack(newTrack);
    setCurrentView('tracks');
  };

  // ------------------------------------
  // Handlers MovieToMusik
  // ------------------------------------
  const handleM2mProjectSaved = (newProj: MovieToMusikProject) => {
    setM2mProjects((prev) => [newProj, ...prev]);
    setCurrentView('m2m_gallery');
  };

  const handleDeleteM2mProject = async (projectId: string) => {
    if (!isAdmin) return;
    const ok = await deleteMovieToMusikProject(projectId);
    if (ok) {
      setM2mProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  // ------------------------------------
  // Handlers MusikToMusik
  // ------------------------------------
  const handleMashupSaved = () => {
    setCurrentView('m2m_mashup_gallery');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
      {/* 🧭 Barre de Navigation Globale */}
      <Navbar
        currentView={currentView}
        appMode={appMode}
        onSelectMode={handleSelectMode}
        onNavigate={(view) => {
          if (view !== 'view' && view !== 'create') {
            updateUrlParam('story', null);
          }
          setCurrentView(view);
        }}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        isAdmin={isAdmin}
        onToggleAdminModal={() => setIsAdminModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================= */}
        {/* 🎬 MODE 1 : MUSIK TO MOVIE (Musique -> Scénario/Storyboard) */}
        {/* ========================================================= */}
        {appMode === 'musiktomovie' && (
          <>
            {/* Lecteur Audio global si sur vue Bibliothèque ou Galerie */}
            {(currentView === 'tracks' || currentView === 'proposals') && selectedTrack && (
              <div className="mb-8">
                <AudioPlayer track={selectedTrack} autoPlay={autoPlayAudio} />
              </div>
            )}

            {/* Vue 1 : Manifeste & Concept */}
            {currentView === 'concept' && (
              <ConceptPage
                onExploreTracks={() => {
                  updateUrlParam('story', null);
                  setCurrentView('tracks');
                }}
                onExploreProposals={() => {
                  updateUrlParam('story', null);
                  setCurrentView('proposals');
                }}
                onOpenUpload={() => setIsUploadModalOpen(true)}
              />
            )}

            {/* Vue 2 : Bibliothèque de morceaux */}
            {currentView === 'tracks' && (
              <TrackList
                tracks={tracks}
                selectedTrack={selectedTrack}
                onSelectTrack={(t) => {
                  setSelectedTrack(t);
                  setAutoPlayAudio(true);
                }}
                onCreateProposal={handleCreateProposal}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onDeleteTrack={handleDeleteTrack}
                isAdmin={isAdmin}
              />
            )}

            {/* Vue 3 : Studio de Création de Storyboard */}
            {currentView === 'create' && selectedTrack && (
              <Suspense fallback={<div>Chargement...</div>}>
                <ProposalCreator
                  track={selectedTrack}
                  existingProposal={editingProposal}
                  onBack={() => {
                    if (editingProposal) {
                      setCurrentView('view');
                    } else {
                      updateUrlParam('story', null);
                      setCurrentView('tracks');
                    }
                  }}
                  onProposalSaved={handleProposalSaved}
                />
              </Suspense>
            )}

            {/* Vue 4 : Visionneuse immersive de film */}
            {currentView === 'view' && selectedProposal && (
              <ProposalViewer
                proposal={selectedProposal}
                track={selectedTrack}
                onBack={() => {
                  updateUrlParam('story', null);
                  setCurrentView('proposals');
                }}
                isAdmin={isAdmin}
                onDeleteProposal={handleDeleteProposal}
                onEditProposal={handleEditProposal}
              />
            )}

            {/* Vue 5 : Galerie de Storyboards */}
            {currentView === 'proposals' && (
              <ProposalsGallery
                proposals={proposals}
                tracks={tracks}
                onSelectProposal={handleSelectProposal}
                onCreateNew={() => setCurrentView('tracks')}
                onVoteUpdated={handleVoteUpdated}
                isAdmin={isAdmin}
                onDeleteProposal={handleDeleteProposal}
                onEditProposal={handleEditProposal}
              />
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* 🎙️ MODE 2 : MOVIE TO MUSIK (Visuel -> Bruitage & Musique) */}
        {/* ========================================================= */}
        {appMode === 'movietomusik' && (
          <>
            {currentView === 'm2m_gallery' && (
              <MovieToMusikGallery
                projects={m2mProjects}
                onCreateNew={() => setCurrentView('m2m_studio')}
                isAdmin={isAdmin}
                onDeleteProject={handleDeleteM2mProject}
              />
            )}

            {currentView === 'm2m_studio' && (
              <Suspense fallback={<div>Chargement...</div>}>
                <MovieToMusikStudio
                  onBack={() => setCurrentView('m2m_gallery')}
                  onProjectSaved={handleM2mProjectSaved}
                />
              </Suspense>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* 🎛️ MODE 3 : MUSIK TO MUSIK (Stems Splitter & Mashup Lab)  */}
        {/* ========================================================= */}
        {appMode === 'musiktomusik' && (
          <>
            {currentView === 'm2m_mashup_gallery' && (
              <MusikToMusikGallery
                onOpenStudio={() => setCurrentView('m2m_mashup_studio')}
                targetMashupId={targetMashupId}
              />
            )}

            {currentView === 'm2m_mashup_studio' && (
              <Suspense fallback={<div>Chargement...</div>}>
                <MusikToMusikStudio
                  onBack={() => setCurrentView('m2m_mashup_gallery')}
                  onProjectSaved={handleMashupSaved}
                  libraryTracks={tracks}
                />
              </Suspense>
            )}
          </>
        )}
      </main>

      {/* Modale d'ajout de morceau */}
      <TrackUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onTrackCreated={handleTrackCreated}
      />

      {/* Modale d'authentification Administrateur */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onAuthenticate={handleAuthenticateAdmin}
      />

      {/* 🎬 Mascotte Ciné-Clippy (Anecdotes & Hot Takes) */}
      <CineClippy />
    </div>
  );
}
