import React, { useState, useEffect } from 'react';
import { Track, Proposal, MovieToMusikProject } from './lib/types';
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
import { ProposalCreator } from './components/storyboard/ProposalCreator';
import { ProposalViewer } from './components/storyboard/ProposalViewer';
import { ProposalsGallery } from './components/storyboard/ProposalsGallery';
import { ConceptPage } from './components/about/ConceptPage';
import { AdminModal } from './components/admin/AdminModal';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { CineClippy } from './components/clippy/CineClippy';
import { MovieToMusikStudio } from './components/movietomusik/MovieToMusikStudio';
import { MovieToMusikGallery } from './components/movietomusik/MovieToMusikGallery';

export default function App() {
  // Mode actif : MusikToMovie (Classique) ou MovieToMusik (Studio Inversé)
  const [appMode, setAppMode] = useState<AppMode>('musiktomovie');
  const [currentView, setCurrentView] = useState<AppView>('concept');

  // Données MusikToMovie
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  // Données MovieToMusik
  const [m2mProjects, setM2mProjects] = useState<MovieToMusikProject[]>([]);

  // Modales & Chargement
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Authentification Mode Admin (persistance en session)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'cineaste' || urlParams.get('admin') === 'true' || urlParams.get('admin') === '1234') {
        sessionStorage.setItem('m2m_admin_session', 'true');
        return true;
      }
      return sessionStorage.getItem('m2m_admin_session') === 'true';
    }
    return false;
  });

  const handleAuthenticateAdmin = (passcode: string): boolean => {
    const validCodes = ['cineaste', 'admin', 'admin2026', '1234'];
    if (validCodes.includes(passcode.toLowerCase())) {
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

  // Basculer de mode (MusikToMovie <-> MovieToMusik)
  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    setEditingProposal(null);
    if (mode === 'musiktomovie') {
      updateUrlParam('m2m_story', null);
      updateUrlParam('mode', null);
      setCurrentView('concept');
    } else {
      updateUrlParam('story', null);
      updateUrlParam('mode', 'movietomusik');
      setCurrentView('m2m_gallery');
    }
  };

  // ------------------------------------
  // Handlers MusikToMovie
  // ------------------------------------
  const handleCreateProposal = (track: Track) => {
    setSelectedTrack(track);
    setEditingProposal(null);
    updateUrlParam('story', null);
    setCurrentView('create');
  };

  const handleEditProposal = (proposal: Proposal) => {
    const matchedTrack = tracks.find((t) => t.id === proposal.track_id) || selectedTrack;
    setSelectedProposal(proposal);
    setEditingProposal(proposal);
    setSelectedTrack(matchedTrack);
    updateUrlParam('story', proposal.id);
    setCurrentView('create');
  };

  const handleSelectProposal = (proposal: Proposal) => {
    const matchedTrack = tracks.find((t) => t.id === proposal.track_id) || null;
    setSelectedProposal(proposal);
    setSelectedTrack(matchedTrack);
    updateUrlParam('story', proposal.id);
    setCurrentView('view');
  };

  const handleProposalSaved = (newProposal: Proposal) => {
    setProposals((prev) => {
      const exists = prev.some((p) => p.id === newProposal.id);
      if (exists) {
        return prev.map((p) => (p.id === newProposal.id ? newProposal : p));
      }
      return [newProposal, ...prev];
    });
    setSelectedProposal(newProposal);
    setEditingProposal(null);
    updateUrlParam('story', newProposal.id);
    setCurrentView('view');
  };

  const handleProposalUpdated = (updatedProposal: Proposal) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === updatedProposal.id ? updatedProposal : p))
    );
    setSelectedProposal(updatedProposal);
  };

  const handleTrackCreated = (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev]);
    setSelectedTrack(newTrack);
    setEditingProposal(null);
    updateUrlParam('story', null);
    setCurrentView('create');
  };

  const handleDeleteTrack = async (trackId: string) => {
    await deleteTrack(trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (selectedTrack?.id === trackId) {
      setSelectedTrack(null);
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    await deleteProposal(proposalId);
    setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    if (selectedProposal?.id === proposalId) {
      setSelectedProposal(null);
      updateUrlParam('story', null);
      setCurrentView('proposals');
    }
  };

  const handleVoteUpdated = (proposalId: string, newCount: number) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, likes_count: newCount } : p))
    );
  };

  // ------------------------------------
  // Handlers MovieToMusik
  // ------------------------------------
  const handleM2mProjectSaved = (newProject: MovieToMusikProject) => {
    setM2mProjects((prev) => [newProject, ...prev]);
    updateUrlParam('m2m_story', newProject.id);
    setCurrentView('m2m_gallery');
  };

  const handleDeleteM2mProject = async (projectId: string) => {
    await deleteMovieToMusikProject(projectId);
    setM2mProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gallery-canvas text-stone-900 transition-colors">
      <Navbar
        currentView={currentView}
        appMode={appMode}
        onSelectMode={handleSelectMode}
        onNavigate={(view) => {
          if (view === 'tracks' || view === 'concept' || view === 'proposals') {
            setEditingProposal(null);
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
                <AudioPlayer track={selectedTrack} autoPlay={false} />
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
                onSelectTrack={(t) => setSelectedTrack(t)}
                onCreateProposal={handleCreateProposal}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onDeleteTrack={handleDeleteTrack}
                isAdmin={isAdmin}
              />
            )}

            {/* Vue 3 : Studio de Création de Storyboard */}
            {currentView === 'create' && selectedTrack && (
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
                onUpdateProposal={handleProposalUpdated}
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
                onUpdateProposal={handleProposalUpdated}
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
              <MovieToMusikStudio
                onBack={() => setCurrentView('m2m_gallery')}
                onProjectSaved={handleM2mProjectSaved}
              />
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
