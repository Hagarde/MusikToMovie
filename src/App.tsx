import React, { useState, useEffect } from 'react';
import { Track, Proposal } from './lib/types';
import { getTracks, getProposals, deleteTrack } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { TrackList } from './components/tracks/TrackList';
import { TrackUploadModal } from './components/tracks/TrackUploadModal';
import { ProposalCreator } from './components/storyboard/ProposalCreator';
import { ProposalViewer } from './components/storyboard/ProposalViewer';
import { ProposalsGallery } from './components/storyboard/ProposalsGallery';
import { AudioPlayer } from './components/audio/AudioPlayer';

export default function App() {
  const [currentView, setCurrentView] = useState<'tracks' | 'proposals' | 'create' | 'view'>('tracks');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      if (fetchedTracks.length > 0 && !selectedTrack) {
        setSelectedTrack(fetchedTracks[0]);
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

  const handleVoteUpdated = (proposalId: string, newCount: number) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, likes_count: newCount } : p))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-slate-100">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lecteur Audio global si on est sur la vue Bibliothèque ou Galerie */}
        {(currentView === 'tracks' || currentView === 'proposals') && selectedTrack && (
          <div className="mb-8">
            <AudioPlayer track={selectedTrack} />
          </div>
        )}

        {/* Vue 1 : Bibliothèque de morceaux */}
        {currentView === 'tracks' && (
          <TrackList
            tracks={tracks}
            selectedTrack={selectedTrack}
            onSelectTrack={(t) => setSelectedTrack(t)}
            onCreateProposal={handleCreateProposal}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onDeleteTrack={handleDeleteTrack}
          />
        )}

        {/* Vue 2 : Studio de Création de Scénario & Storyboard */}
        {currentView === 'create' && selectedTrack && (
          <ProposalCreator
            track={selectedTrack}
            onBack={() => setCurrentView('tracks')}
            onProposalSaved={handleProposalSaved}
          />
        )}

        {/* Vue 3 : Visionneuse immersive du Film / Storyboard */}
        {currentView === 'view' && selectedProposal && (
          <ProposalViewer
            proposal={selectedProposal}
            track={selectedTrack}
            onBack={() => setCurrentView('proposals')}
          />
        )}

        {/* Vue 4 : Galerie des Scénarios & Storyboards */}
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
          />
        )}
      </main>

      {/* Modale d'ajout de morceau YouTube */}
      <TrackUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onTrackCreated={handleTrackCreated}
      />
    </div>
  );
}
