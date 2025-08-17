import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Users, Plus, Edit, X, MessageSquare, Target, Save, Clock, MapPin, CheckCircle, AlertTriangle, Eye, ChevronDown, ChevronUp } from 'lucide-react';

const MatchesView = ({ 
  matches = [], 
  students = [], 
  userType = 'player',
  selectedChampionship = 'all',
  selectedTeam = 'all',
  selectedDate = 'current',
  matchOperations = {}
}) => {
  // États pour les filtres
  const [filterChampionship, setFilterChampionship] = useState(selectedChampionship);
  const [filterTeam, setFilterTeam] = useState(selectedTeam);
  const [filterDate, setFilterDate] = useState(selectedDate);
  
  // États pour les modales
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showEditMatch, setShowEditMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  
  // États pour le formulaire de nouveau match
  const [newMatch, setNewMatch] = useState({
    date: '',
    time: '',
    opponent: '',
    championship: 'LDV2',
    team: '2',
    lieu: 'Gymnase LDV',
    status: 'upcoming'
  });
  
  // États pour la sélection de joueurs (mode coach)
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  
  // États pour le score
  const [editingScore, setEditingScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // États pour la vue joueur
  const [expandedMatches, setExpandedMatches] = useState(new Set());

  // Ordre des postes pour le tri
  const POSITION_ORDER = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot'];

  // Fonction pour trier les joueurs par équipe puis par poste
  const getSortedPlayersForMatch = (match) => {
    if (!match || !students) return [];
    
    return [...students].sort((a, b) => {
      // 1. Priorité à l'équipe du match
      if (a.team === match.team && b.team !== match.team) return -1;
      if (b.team === match.team && a.team !== match.team) return 1;
      
      // 2. Si même équipe, trier par poste
      if (a.team === b.team) {
        const aIndex = POSITION_ORDER.indexOf(a.position);
        const bIndex = POSITION_ORDER.indexOf(b.position);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        if (aIndex === -1 && bIndex !== -1) return 1;
        if (bIndex === -1 && aIndex !== -1) return -1;
        
        return a.lastName.localeCompare(b.lastName);
      }
      
      // 3. Pour les autres équipes, trier par équipe puis par poste
      if (a.team !== b.team) {
        return a.team.localeCompare(b.team);
      }
      
      return 0;
    });
  };

  // Fonction pour obtenir les joueurs sélectionnés d'un match
  const getSelectedPlayersForMatch = (match) => {
    if (!match.selectedPlayers || !students) return [];
    
    return match.selectedPlayers
      .map(playerId => students.find(s => s.id === playerId))
      .filter(Boolean)
      .sort((a, b) => {
        // Priorité à l'équipe du match
        if (a.team === match.team && b.team !== match.team) return -1;
        if (b.team === match.team && a.team !== match.team) return 1;
        
        // Tri par poste
        const aIndex = POSITION_ORDER.indexOf(a.position);
        const bIndex = POSITION_ORDER.indexOf(b.position);
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        return a.lastName.localeCompare(b.lastName);
      });
  };

  // Fonction pour basculer l'expansion d'un match (mode joueur)
  const toggleMatchExpansion = (matchId) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(matchId)) {
      newExpanded.delete(matchId);
    } else {
      newExpanded.add(matchId);
    }
    setExpandedMatches(newExpanded);
  };

  // Fonction pour ajouter un match
  const addMatch = async () => {
    if (!newMatch.opponent || !newMatch.date || !newMatch.time || !newMatch.lieu) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await matchOperations.addMatch(newMatch);
      
      setNewMatch({
        date: '',
        time: '',
        opponent: '',
        championship: 'LDV2',
        team: '2',
        lieu: 'Gymnase LDV',
        status: 'upcoming'
      });
      
      setShowAddMatch(false);
      console.log('✅ Match ajouté avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du match:', error);
      alert('Erreur lors de l\'ajout du match');
    }
  };

  // Fonction pour modifier un match
  const updateMatch = async () => {
    if (!editingMatch.opponent || !editingMatch.date || !editingMatch.time || !editingMatch.lieu) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await matchOperations.updateMatch(editingMatch);
      
      setEditingMatch(null);
      setShowEditMatch(false);
      console.log('✅ Match modifié avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de la modification du match:', error);
      alert('Erreur lors de la modification du match');
    }
  };

  // Fonction pour supprimer un match
  const deleteMatch = async (matchId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) return;

    try {
      await matchOperations.deleteMatch(matchId);
      console.log('✅ Match supprimé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du match:', error);
      alert('Erreur lors de la suppression du match');
    }
  };

  // Fonction pour compter seulement les joueurs qui existent encore
  const getActualSelectedPlayersCount = (selectedPlayerIds) => {
    if (!selectedPlayerIds || !students) return 0;
    
    return selectedPlayerIds.filter(playerId => 
      students.find(s => s.id === playerId)
    ).length;
  };

  // Fonctions pour le score
  const openScoreEditor = (match) => {
    setEditingScore(match.id);
    setShowScoreModal(true);
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setEditingScore(null);
  };

  // Fonctions pour la sélection de joueurs (mode coach)
  const togglePlayerSelection = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else if (getActualSelectedPlayersCount(selectedPlayers) < 10) {
      setSelectedPlayers([...selectedPlayers, playerId]);
    } else {
      alert('⚠️ Vous ne pouvez sélectionner que 10 joueurs maximum');
    }
  };

  const savePlayerSelection = async (matchId) => {
    try {
      await matchOperations.updateMatchPlayers(matchId, selectedPlayers);
      
      setSelectedMatch(null);
      setSelectedPlayers([]);
      console.log('✅ Sélection joueurs sauvegardée');
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la sélection:', error);
      alert('Erreur lors de la sauvegarde de la sélection');
    }
  };

  const cancelPlayerSelection = () => {
    setSelectedMatch(null);
    setSelectedPlayers([]);
  };

  // Initialiser la sélection avec les joueurs déjà sélectionnés
  useEffect(() => {
    if (selectedMatch) {
      const match = matches.find(m => m.id === selectedMatch);
      if (match && match.selectedPlayers) {
        setSelectedPlayers([...match.selectedPlayers]);
      } else {
        setSelectedPlayers([]);
      }
    }
  }, [selectedMatch, matches]);

  // Filtrage des matchs
  const filteredMatches = matches.filter(match => {
    if (!match) return false;
    
    const championshipMatch = filterChampionship === 'all' || match.championship === filterChampionship;
    const teamMatch = filterTeam === 'all' || match.team === filterTeam;
    const dateMatch = filterDate === 'all' || 
      (filterDate === 'current' && match.status === 'upcoming') ||
      (filterDate === 'past' && match.status === 'completed');
    
    return championshipMatch && teamMatch && dateMatch;
  });

  // Séparer les matchs à venir et passés
  const upcomingMatches = matches
    .filter(match => match.status === 'upcoming')
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
  
  const completedMatches = matches
    .filter(match => match.status === 'completed')
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Plus récent en premier pour l'historique
    });

  // Modale Score
  const ScoreModal = () => {
    const [localScore, setLocalScore] = useState({ 
      ourScore: '', 
      opponentScore: '', 
      comments: '' 
    });

    useEffect(() => {
      if (showScoreModal && editingScore) {
        const match = matches.find(m => m.id === editingScore);
        if (match) {
          setLocalScore({
            ourScore: match.ourScore !== null ? match.ourScore.toString() : '',
            opponentScore: match.opponentScore !== null ? match.opponentScore.toString() : '',
            comments: match.comments || ''
          });
        }
      }
    }, [showScoreModal, editingScore]);

    const handleSave = async () => {
      if (localScore.ourScore === '' || localScore.opponentScore === '') {
        alert('⚠️ Veuillez remplir les deux scores');
        return;
      }

      const ourScore = parseInt(localScore.ourScore);
      const opponentScore = parseInt(localScore.opponentScore);

      if (isNaN(ourScore) || isNaN(opponentScore) || ourScore < 0 || opponentScore < 0) {
        alert('⚠️ Veuillez saisir des scores valides');
        return;
      }

      try {
        await matchOperations.updateMatchScore(editingScore, {
          ourScore: ourScore,
          opponentScore: opponentScore,
          comments: localScore.comments.trim()
        });
        
        setShowScoreModal(false);
        setEditingScore(null);
        console.log('✅ Score sauvegardé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde du score:', error);
        alert('Erreur lors de la sauvegarde du score');
      }
    };

    if (!showScoreModal || !editingScore) return null;

    const match = matches.find(m => m.id === editingScore);
    if (!match) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Score du match</h3>
            <button 
              onClick={closeScoreModal} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-slate-700">LDV{match.team} vs {match.opponent}</h4>
            <p className="text-sm text-slate-600">
              {new Date(match.date).toLocaleDateString('fr-FR')} • {match.championship}
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notre score (LDV{match.team})
                </label>
                <input
                  type="number"
                  value={localScore.ourScore}
                  onChange={(e) => setLocalScore(prev => ({ ...prev, ourScore: e.target.value }))}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-semibold"
                  placeholder="0"
                  min="0"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Score adverse ({match.opponent})
                </label>
                <input
                  type="number"
                  value={localScore.opponentScore}
                  onChange={(e) => setLocalScore(prev => ({ ...prev, opponentScore: e.target.value }))}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-semibold"
                  placeholder="0"
                  min="0"
                  autoComplete="off"
                />
              </div>
            </div>

            {localScore.ourScore !== '' && localScore.opponentScore !== '' && (
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className={`text-lg font-bold ${
                  parseInt(localScore.ourScore) > parseInt(localScore.opponentScore) ? 'text-green-600' : 
                  parseInt(localScore.ourScore) < parseInt(localScore.opponentScore) ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {parseInt(localScore.ourScore) > parseInt(localScore.opponentScore) ? '🏆 Victoire !' : 
                   parseInt(localScore.ourScore) < parseInt(localScore.opponentScore) ? '😞 Défaite' : '🤝 Match nul'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Commentaires du match (optionnel)
              </label>
              <textarea
                value={localScore.comments}
                onChange={(e) => setLocalScore(prev => ({ ...prev, comments: e.target.value }))}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
                placeholder="Commentaires sur le match, performances, incidents..."
                maxLength="500"
                autoComplete="off"
              />
              <div className="text-xs text-slate-500 mt-1">
                {localScore.comments.length}/500 caractères
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              Sauvegarder le score
            </button>
            <button
              onClick={closeScoreModal}
              className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-3 rounded-lg"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Composant carte de match pour joueurs
  const PlayerMatchCard = ({ match, isUpcoming = true }) => {
    const matchDate = new Date(match.date);
    const hasScore = match.ourScore !== null && match.opponentScore !== null;
    const selectedPlayers = getSelectedPlayersForMatch(match);
    const isExpanded = expandedMatches.has(match.id);

    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border transition-all hover:shadow-md ${
        match.team === '2' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'
      }`}>
        {/* En-tête du match */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                match.team === '2' ? 'bg-green-600' : 'bg-blue-600'
              }`}>
                {match.team}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">LDV{match.team} vs {match.opponent}</h3>
                <p className="text-sm text-slate-600">{match.championship}</p>
              </div>
            </div>
            
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              match.status === 'upcoming' 
                ? 'bg-blue-100 text-blue-800' 
                : match.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {match.status === 'upcoming' ? 'À venir' : 
               match.status === 'completed' ? 'Terminé' : 'Annulé'}
            </span>
          </div>

          {/* Informations du match */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={14} />
              <span className="font-medium">{matchDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
              <Clock size={14} className="ml-2" />
              <span>{match.time}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={14} />
              <span>{match.lieu}</span>
            </div>
          </div>

          {/* Score pour les matchs terminés */}
          {!isUpcoming && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-700 flex items-center gap-2">
                  <Target size={14} />
                  Score final
                </h4>
              </div>

              {hasScore ? (
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    match.ourScore > match.opponentScore ? 'text-green-600' : 
                    match.ourScore < match.opponentScore ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {match.ourScore} - {match.opponentScore}
                  </div>
                  <div className={`text-base font-medium mb-2 ${
                    match.ourScore > match.opponentScore ? 'text-green-600' : 
                    match.ourScore < match.opponentScore ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {match.ourScore > match.opponentScore ? '🏆 Victoire !' : 
                     match.ourScore < match.opponentScore ? '😞 Défaite' : '🤝 Match nul'}
                  </div>
                  {match.comments && (
                    <div className="text-sm text-slate-600 italic bg-white p-2 rounded border">
                      <MessageSquare size={12} className="inline mr-1" />
                      "{match.comments}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 bg-orange-50 rounded">
                  <AlertTriangle size={16} className="mx-auto mb-1 text-orange-600" />
                  <p className="text-sm text-orange-700 font-medium">Score en attente</p>
                </div>
              )}
            </div>
          )}

          {/* Bouton pour voir la composition */}
          {selectedPlayers.length > 0 && (
            <button
              onClick={() => toggleMatchExpansion(match.id)}
              className="w-full mt-4 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between text-blue-800 font-medium"
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>Composition d'équipe ({selectedPlayers.length} joueur{selectedPlayers.length > 1 ? 's' : ''})</span>
              </div>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}

          {/* Affichage de la composition si étendue */}
          {isExpanded && selectedPlayers.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Users size={16} />
                Joueurs sélectionnés pour ce match
              </h4>
              
              <div className="space-y-3">
                {/* Joueurs de l'équipe du match en premier */}
                {selectedPlayers.filter(player => player.team === match.team).length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      Équipe {match.team} ({selectedPlayers.filter(player => player.team === match.team).length})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedPlayers
                        .filter(player => player.team === match.team)
                        .map(player => (
                          <div key={player.id} className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-slate-800">
                                  {player.firstName} {player.lastName}
                                </p>
                                <p className="text-sm text-slate-600">{player.position}</p>
                              </div>
                              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Titulaire
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Joueurs des autres équipes */}
                {selectedPlayers.filter(player => player.team !== match.team).length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      Renfort d'autres équipes ({selectedPlayers.filter(player => player.team !== match.team).length})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedPlayers
                        .filter(player => player.team !== match.team)
                        .map(player => (
                          <div key={player.id} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-slate-800">
                                  {player.firstName} {player.lastName}
                                </p>
                                <p className="text-sm text-slate-600">{player.position}</p>
                              </div>
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Éq. {player.team}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message si aucun joueur sélectionné */}
          {selectedPlayers.length === 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg text-center">
              <Users className="mx-auto mb-2 text-orange-400" size={20} />
              <p className="text-sm text-orange-700 font-medium">Composition non définie</p>
              <p className="text-xs text-orange-600">L'équipe sera annoncée prochainement</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Composant carte de match pour coach (version simplifiée de l'original)
  const CoachMatchCard = ({ match, isUpcoming = true }) => {
    const matchDate = new Date(match.date);
    const isSelecting = selectedMatch === match.id;
    const hasScore = match.ourScore !== null && match.opponentScore !== null;

    return (
      <div className={`bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 transition-all hover:shadow-md ${
        match.team === '2' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'
      }`}>
        {/* En-tête du match */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              match.team === '2' ? 'bg-green-600' : 'bg-blue-600'
            }`}>
              {match.team}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">vs {match.opponent}</h3>
              <p className="text-xs text-slate-600">{match.championship}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              match.status === 'upcoming' 
                ? 'bg-blue-100 text-blue-800' 
                : match.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {match.status === 'upcoming' ? 'À venir' : 
               match.status === 'completed' ? 'Terminé' : 'Annulé'}
            </span>
            
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingMatch(match);
                  setShowEditMatch(true);
                }}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="Modifier"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => deleteMatch(match.id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Supprimer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Informations du match */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={12} />
            <span>{matchDate.toLocaleDateString('fr-FR')}</span>
            <Clock size={12} className="ml-2" />
            <span>{match.time}</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin size={12} />
            <span>{match.lieu}</span>
          </div>

          {match.selectedPlayers && match.selectedPlayers.length > 0 && (
            <div className="flex items-center gap-2 text-slate-600">
              <Users size={12} />
              <span>
                {getActualSelectedPlayersCount(match.selectedPlayers)} joueur
                {getActualSelectedPlayersCount(match.selectedPlayers) > 1 ? 's' : ''}
              </span>
              {isUpcoming && (
                <span className="text-xs bg-green-100 text-green-800 px-1 rounded">sélectionnés</span>
              )}
            </div>
          )}
        </div>

        {/* Section score pour les matchs terminés */}
        {!isUpcoming && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-slate-700 flex items-center gap-1">
                <Target size={12} />
                Score final
              </h4>
              
              <button
                onClick={() => openScoreEditor(match)}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                  hasScore 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
                title={hasScore ? 'Modifier le score' : 'Ajouter le score'}
              >
                <Edit size={10} />
                {hasScore ? 'Modifier' : 'Ajouter'}
              </button>
            </div>

            {hasScore ? (
              <div className="text-center">
                <div className={`text-xl font-bold mb-1 ${
                  match.ourScore > match.opponentScore ? 'text-green-600' : 
                  match.ourScore < match.opponentScore ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {match.ourScore} - {match.opponentScore}
                </div>
                <div className={`text-sm mb-2 ${
                  match.ourScore > match.opponentScore ? 'text-green-600' : 
                  match.ourScore < match.opponentScore ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {match.ourScore > match.opponentScore ? '🏆 Victoire !' : 
                   match.ourScore < match.opponentScore ? '😞 Défaite' : '🤝 Match nul'}
                </div>
                {match.comments && (
                  <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
                    <MessageSquare size={10} className="inline mr-1" />
                    "{match.comments}"
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-3 bg-orange-50 rounded-lg">
                <AlertTriangle size={16} className="mx-auto mb-1 text-orange-600" />
                <p className="text-sm text-orange-700 font-medium">Score non saisi</p>
                <p className="text-xs text-orange-600">Match terminé sans résultat</p>
              </div>
            )}
          </div>
        )}

        {/* Joueurs sélectionnés pour les matchs à venir */}
        {isUpcoming && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            {match.selectedPlayers && match.selectedPlayers.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={12} />
                  Joueurs sélectionnés ({getActualSelectedPlayersCount(match.selectedPlayers)})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {match.selectedPlayers.map(playerId => {
                    const player = students.find(s => s.id === playerId);
                    return player ? (
                      <span 
                        key={playerId}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          player.team === match.team 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {player.firstName} {player.lastName[0]}.
                        {player.team !== match.team && (
                          <span className="ml-1 text-xs opacity-75">(Éq.{player.team})</span>
                        )}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <Users className="mx-auto mb-2 text-slate-400" size={20} />
                <p className="text-sm text-slate-500 italic">Aucun joueur sélectionné</p>
                <p className="text-xs text-slate-400">Cliquez sur "Sélectionner joueurs" ci-dessous</p>
              </div>
            )}
          </div>
        )}

        {/* Actions pour les matchs à venir (mode coach) */}
        {isUpcoming && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <button
              onClick={() => setSelectedMatch(selectedMatch === match.id ? null : match.id)}
              className={`w-full px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors ${
                selectedMatch === match.id 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : (!match.selectedPlayers || match.selectedPlayers.length === 0)
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Users size={14} />
              {selectedMatch === match.id ? 'Annuler sélection' : 
               (!match.selectedPlayers || match.selectedPlayers.length === 0) ? 'Sélectionner joueurs ⚠️' :
               'Modifier la sélection'}
            </button>
            
            <button
              onClick={() => openScoreEditor(match)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2"
            >
              <Target size={14} />
              Saisir le score
            </button>
          </div>
        )}

        {/* Modal de sélection de joueurs intégrée (mode coach) */}
        {isSelecting && (
          <div className="mt-3 pt-3 border-t border-slate-200 bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-blue-800 text-sm">
                Joueurs ({getActualSelectedPlayersCount(selectedPlayers)}/10)
              </h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => savePlayerSelection(match.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                >
                  <Save size={10} />
                  Sauver
                </button>
                <button 
                  onClick={cancelPlayerSelection}
                  className="bg-slate-400 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
              {getSortedPlayersForMatch(match).slice(0, 12).map(player => {
                const isSelected = selectedPlayers.includes(player.id);
                const isFromMatchTeam = player.team === match.team;
                
                return (
                  <div
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id)}
                    className={`p-2 rounded cursor-pointer transition-all text-xs ${
                      isSelected 
                        ? 'bg-green-600 text-white' 
                        : isFromMatchTeam
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {player.firstName} {player.lastName}
                        {isSelected && <span className="ml-1">✓</span>}
                      </span>
                      <span className="text-xs opacity-75">
                        {player.position} • Éq.{player.team}
                        {isFromMatchTeam && <span className="ml-1">🎯</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Modal Component pour ajouter/modifier un match
  const MatchModal = ({ isOpen, mode, match = null }) => {
    const [formData, setFormData] = useState(newMatch);

    useEffect(() => {
      if (mode === 'edit' && match) {
        setFormData({
          date: match.date || '',
          time: match.time || '',
          opponent: match.opponent || '',
          championship: match.championship || 'LDV2',
          team: match.team || '2',
          lieu: match.lieu || 'Gymnase LDV',
          status: match.status || 'upcoming'
        });
      } else {
        setFormData(newMatch);
      }
    }, [mode, match, isOpen]);

    const handleSubmit = () => {
      if (mode === 'edit') {
        setEditingMatch({ ...match, ...formData });
        updateMatch();
      } else {
        setNewMatch(formData);
        addMatch();
      }
    };

    const closeModal = () => {
      if (mode === 'edit') {
        setShowEditMatch(false);
        setEditingMatch(null);
      } else {
        setShowAddMatch(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {mode === 'add' ? 'Ajouter un nouveau match' : 'Modifier le match'}
          </h3>
          
          <div className="space-y-4">
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({...formData, time: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="text"
              placeholder="Équipe adverse"
              value={formData.opponent}
              onChange={(e) => setFormData({...formData, opponent: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={formData.championship}
              onChange={(e) => setFormData({...formData, championship: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="LDV2">LDV2</option>
              <option value="LDV3">LDV3</option>
              <option value="Coupe">Coupe</option>
              <option value="Amical">Amical</option>
            </select>
            
            <select
              value={formData.team}
              onChange={(e) => setFormData({...formData, team: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="2">Équipe 2</option>
              <option value="3">Équipe 3</option>
            </select>
            
            <input
              type="text"
              placeholder="Lieu"
              value={formData.lieu}
              onChange={(e) => setFormData({...formData, lieu: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="upcoming">À venir</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              {mode === 'add' ? 'Ajouter' : 'Sauvegarder'}
            </button>
            <button
              onClick={closeModal}
              className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Choix du composant en fonction du type d'utilisateur
  const MatchCard = userType === 'coach' ? CoachMatchCard : PlayerMatchCard;

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <Trophy className="text-orange-600" size={28} />
            {userType === 'coach' ? 'Gestion des matchs' : 'Calendrier des matchs'}
          </h2>
          
          {userType === 'coach' && (
            <button
              onClick={() => setShowAddMatch(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Nouveau match
            </button>
          )}
        </div>

        {/* Message pour les joueurs */}
        {userType === 'player' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <Eye size={14} className="inline mr-1" />
              Consultez les compositions d'équipe pour chaque match en cliquant sur "Composition d'équipe"
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <select
            value={filterChampionship}
            onChange={(e) => setFilterChampionship(e.target.value)}
            className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les championnats</option>
            <option value="LDV2">LDV2</option>
            <option value="LDV3">LDV3</option>
            <option value="Coupe">Coupe</option>
            <option value="Amical">Amical</option>
          </select>
          
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les équipes</option>
            <option value="2">Équipe 2</option>
            <option value="3">Équipe 3</option>
          </select>
          
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les matchs</option>
            <option value="current">À venir</option>
            <option value="past">Terminés</option>
          </select>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{upcomingMatches.length}</div>
            <div className="text-sm text-blue-700">Matchs à venir</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {completedMatches.filter(m => m.ourScore > m.opponentScore).length}
            </div>
            <div className="text-sm text-green-700">Victoires</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {completedMatches.filter(m => m.ourScore < m.opponentScore).length}
            </div>
            <div className="text-sm text-red-700">Défaites</div>
          </div>
        </div>
      </div>

      {/* Matchs à venir */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            Prochains matchs ({upcomingMatches.length})
          </h3>
        </div>
        
        <div className="p-4">
          {upcomingMatches.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Trophy className="mx-auto mb-4 opacity-50" size={48} />
              <p>Aucun match programmé</p>
              {userType === 'coach' && (
                <button
                  onClick={() => setShowAddMatch(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Programmer le premier match
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} isUpcoming={true} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historique des matchs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Trophy className="text-green-600" size={20} />
              Historique des matchs ({completedMatches.length})
            </h3>
            {userType === 'coach' && completedMatches.some(m => m.ourScore === null || m.opponentScore === null) && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                ⚠️ {completedMatches.filter(m => m.ourScore === null || m.opponentScore === null).length} score(s) manquant(s)
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4">
          {completedMatches.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Trophy className="mx-auto mb-4 opacity-50" size={48} />
              <p>Aucun match terminé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {completedMatches.map(match => (
                <MatchCard key={match.id} match={match} isUpcoming={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales (uniquement pour les coachs) */}
      {userType === 'coach' && (
        <>
          <MatchModal 
            isOpen={showAddMatch} 
            mode="add" 
          />
          <MatchModal 
            isOpen={showEditMatch} 
            mode="edit" 
            match={editingMatch} 
          />
          <ScoreModal />
        </>
      )}
    </div>
  );
};

export default MatchesView;