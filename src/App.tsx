import React, { useState, useEffect } from 'react';
import { Track, Proposal } from './lib/types';
import { getTracks, getProposals, deleteTrack, deleteProposal } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { TrackList } from './components/tracks/TrackList';
import { TrackUploadModal } from './components/tracks/TrackUploadModal';
import { ProposalCreator } from './components/storyboard/ProposalCreator';
import { ProposalViewer } from './components/storyboard/ProposalViewer';
import { ProposalsGallery } from './components/storyboard/ProposalsGallery';
import { ConceptPage } from './components/about/ConceptPage';
import { AdminModal } from './components/admin/AdminModal';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { CineClippy } from './components/clippy/CineClippy';

export default function App() {
  // L'onglet de base par défaut est 'concept'
  const [currentView, setCurrentView] = useState<'concept' | 'tracks' | 'proposals' | 'create' | 'view'>('concept');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
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
    // Mots de passe valides
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

  // Chargement initial des données
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedTracks, fetchedProposals] = await Promise.all([
        getTracks(),
        getProposals(),
      ]);
      setTracks(fetchedTracks);
      setProposals(fetchedProposals);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProposal = (track: Track) => {
    setSelectedTrack(track);
    setCurrentView('create');
  };

  const handleSelectProposal = (proposal: Proposal) => {
    const matchedTrack = tracks.find((t) => t.id === proposal.track_id) || null;
    setSelectedProposal(proposal);
    setSelectedTrack(matchedTrack);
    setCurrentView('view');
  };

  const handleProposalSaved = (newProposal: Proposal) => {
    setProposals((prev) => [newProposal, ...prev]);
    setSelectedProposal(newProposal);
    setCurrentView('view');
  };

  const handleTrackCreated = (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev]);
    setSelectedTrack(newTrack);
    setCurrentView('create'); // Ouverture immédiate du studio de storyboard pour cette musique
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
      setCurrentView('proposals');
    }
  };

  const handleVoteUpdated = (proposalId: string, newCount: number) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, likes_count: newCount } : p))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gallery-canvas text-stone-900 transition-colors">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        isAdmin={isAdmin}
        onToggleAdminModal={() => setIsAdminModalOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lecteur Audio global si on est sur la vue Bibliothèque ou Galerie */}
        {(currentView === 'tracks' || currentView === 'proposals') && selectedTrack && (
          <div className="mb-8">
            <AudioPlayer track={selectedTrack} />
          </div>
        )}

        {/* Vue 1 (Onglet de base) : Le Concept & Manifeste MusikToMovie */}
        {currentView === 'concept' && (
          <ConceptPage
            onExploreTracks={() => setCurrentView('tracks')}
            onExploreProposals={() => setCurrentView('proposals')}
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

        {/* Vue 3 : Studio de Création de Scénario & Storyboard */}
        {currentView === 'create' && selectedTrack && (
          <ProposalCreator
            track={selectedTrack}
            onBack={() => setCurrentView('tracks')}
            onProposalSaved={handleProposalSaved}
          />
        )}

        {/* Vue 4 : Visionneuse immersive du Film / Storyboard */}
        {currentView === 'view' && selectedProposal && (
          <ProposalViewer
            proposal={selectedProposal}
            track={selectedTrack}
            onBack={() => setCurrentView('proposals')}
            isAdmin={isAdmin}
            onDeleteProposal={handleDeleteProposal}
          />
        )}

        {/* Vue 5 : Galerie des Scénarios & Storyboards */}
        {currentView === 'proposals' && (
          <ProposalsGallery
            proposals={proposals}
            tracks={tracks}
            onSelectProposal={handleSelectProposal}
            onCreateNew={() => {
              if (tracks.length > 0) {
                handleCreateProposal(tracks[0]);
              } else {
                setIsUploadModalOpen(true);
              }
            }}
            onVoteUpdated={handleVoteUpdated}
            isAdmin={isAdmin}
            onDeleteProposal={handleDeleteProposal}
          />
        )}
      </main>

      {/* Modale d'ajout de morceau YouTube */}
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
