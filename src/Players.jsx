import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Grid, List, MoreVertical, Edit, X, Trophy, Calendar, BarChart3, Star, Award, UserCheck, Loader } from 'lucide-react';

const Players = ({ 
  students = [], 
  matches = [],
  trainingAttendances = [],
  selectedTeam = 'all',
  userType = 'player',
  studentOperations = {},
  roleOperations = {}, // ✅ NOUVELLES PROPS POUR LES RÔLES
  playerRoles = {},     // ✅ ÉTAT DES RÔLES DEPUIS APP.JSX
  setPlayerRoles = () => {}, // ✅ SETTER POUR LES RÔLES
  onModalOpen = () => {}
}) => {
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterAttendance, setFilterAttendance] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  
  // États pour les modales
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedPlayerForRole, setSelectedPlayerForRole] = useState(null);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  // État pour la sélection de match dans les rôles
  const [selectedMatchForRole, setSelectedMatchForRole] = useState('');
  
  // ✅ NOUVEL ÉTAT POUR L'INTERFACE UTILISATEUR
  const [isAssigningRole, setIsAssigningRole] = useState(false);

  // Positions disponibles
  const POSITIONS = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot'];

  // Statuts de présence
  const ATTENDANCE_STATUSES = [
    { key: 'present', label: 'Présent', color: 'bg-green-600', textColor: 'text-green-600', code: 'P' },
    { key: 'absent', label: 'Absent', color: 'bg-red-600', textColor: 'text-red-600', code: 'A' },
    { key: 'absent-warned', label: 'Absent Prévenu', color: 'bg-orange-500', textColor: 'text-orange-500', code: 'AP' },
    { key: 'injured', label: 'Blessé', color: 'bg-purple-600', textColor: 'text-purple-600', code: 'B' },
    { key: 'excused', label: 'Excusé', color: 'bg-blue-600', textColor: 'text-blue-600', code: 'E' },
    { key: 'stage', label: 'En Stage', color: 'bg-teal-600', textColor: 'text-teal-600', code: 'S' },
  ];

  // Rôles sociaux disponibles
  const socialRoles = [
    { 
      key: 'responsable_tenue', 
      label: 'Responsable Tenue', 
      description: 'Gère les équipements et tenues de l\'équipe', 
      color: 'bg-blue-500', 
      icon: Users 
    },
    { 
      key: 'responsable_arbitrage', 
      label: 'Responsable Arbitrage', 
      description: 'Assiste l\'arbitre et connaît les règles', 
      color: 'bg-yellow-500', 
      icon: UserCheck 
    },
    { 
      key: 'responsable_table', 
      label: 'Responsable Table de Marque', 
      description: 'Tient la feuille de match et les statistiques', 
      color: 'bg-green-500', 
      icon: BarChart3 
    },
    { 
      key: 'coach_match', 
      label: 'Coach de Match', 
      description: 'Aide à coacher une équipe pendant un match', 
      color: 'bg-purple-500', 
      icon: Trophy 
    },
    { 
      key: 'capitaine', 
      label: 'Capitaine', 
      description: 'Leader de l\'équipe, responsabilité continue', 
      color: 'bg-orange-500', 
      icon: Star 
    }
  ];

  // ✅ NOUVELLE FONCTION - Calculer le nombre de matchs joués par un joueur
  const getPlayerMatchesCount = (playerId) => {
    // ✅ Vérifier que le joueur existe encore
    const player = students.find(s => s.id === playerId);
    if (!player) {
      return 0; // Joueur supprimé = 0 matchs
    }
    
    return matches.filter(match => 
      match.selectedPlayers && match.selectedPlayers.includes(playerId) && match.status === 'completed'
    ).length;
  };

  // ✅ NOUVEAU COMPOSANT - Jauge de progression pour la présence
  const ProgressBar = ({ percentage, size = 'normal' }) => {
    const height = size === 'small' ? 'h-2' : 'h-3';
    const bgColor = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    
    return (
      <div className={`w-full ${height} bg-slate-200 rounded-full overflow-hidden`}>
        <div 
          className={`${height} ${bgColor} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    );
  };

  // ✅ NOUVEAU COMPOSANT - Badge du nombre de matchs joués
  const MatchesBadge = ({ playerId }) => {
    const matchesCount = getPlayerMatchesCount(playerId);
    return (
      <div 
        className="inline-flex items-center gap-1 bg-slate-600 text-white px-2 py-1 rounded text-xs font-medium"
        title={`${matchesCount} match${matchesCount > 1 ? 's' : ''} joué${matchesCount > 1 ? 's' : ''}`}
      >
        <Trophy size={12} />
        {matchesCount}
      </div>
    );
  };

  // Filtrage des joueurs
  const filteredPlayers = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = filterTeam === 'all' || student.team === filterTeam;
    const matchesPosition = filterPosition === 'all' || student.position === filterPosition;
    const matchesAttendance = filterAttendance === 'all' || student.lastAttendance === filterAttendance;
    
    return matchesSearch && matchesTeam && matchesPosition && matchesAttendance;
  });

  // ✅ NOUVELLE FONCTION - Organiser les joueurs par équipe
  const getPlayersByTeam = () => {
    return {
      '2': filteredPlayers.filter(p => p.team === '2'),
      '3': filteredPlayers.filter(p => p.team === '3')
    };
  };

  // Calculer l'âge d'un joueur
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age > 0 ? age : age - 1;
  };

  // ✅ NOUVELLE FONCTION - Assigner un rôle avec persistance Supabase
  const assignRole = async (studentId, roleType, matchId) => {
    try {
      setIsAssigningRole(true);
      console.log('📤 Attribution de rôle via Supabase:', { studentId, roleType, matchId });

      // Vérifier que roleOperations est disponible
      if (!roleOperations.assignRole) {
        console.error('❌ roleOperations.assignRole non disponible');
        alert('❌ Fonctionnalité non disponible. Vérifiez la configuration.');
        return;
      }

      // Appel à l'API Supabase
      await roleOperations.assignRole(studentId, roleType, matchId);

      // Mise à jour de l'état local après succès
      setPlayerRoles(prev => ({
        ...prev,
        [studentId]: [
          ...(prev[studentId] || []).filter(r => r.matchId !== matchId || r.type !== roleType),
          { 
            type: roleType, 
            matchId, 
            assignedAt: new Date().toISOString() 
          }
        ]
      }));

      console.log('✅ Rôle assigné et sauvegardé dans Supabase');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'assignation du rôle:', error);
      alert('❌ Erreur lors de l\'assignation du rôle: ' + error.message);
    } finally {
      setIsAssigningRole(false);
    }
  };

  // ✅ NOUVELLE FONCTION - Supprimer un rôle avec persistance Supabase
  const removeRole = async (studentId, roleType, matchId) => {
    try {
      setIsAssigningRole(true);
      console.log('🗑️ Suppression de rôle via Supabase:', { studentId, roleType, matchId });

      // Vérifier que roleOperations est disponible
      if (!roleOperations.removeRole) {
        console.error('❌ roleOperations.removeRole non disponible');
        alert('❌ Fonctionnalité non disponible. Vérifiez la configuration.');
        return;
      }

      // Appel à l'API Supabase
      await roleOperations.removeRole(studentId, roleType, matchId);

      // Mise à jour de l'état local après succès
      setPlayerRoles(prev => ({
        ...prev,
        [studentId]: (prev[studentId] || []).filter(r => 
          !(r.matchId === matchId && r.type === roleType)
        )
      }));

      console.log('✅ Rôle supprimé et sauvegardé dans Supabase');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du rôle:', error);
      alert('❌ Erreur lors de la suppression du rôle: ' + error.message);
    } finally {
      setIsAssigningRole(false);
    }
  };

  // ✅ FONCTION AMÉLIORÉE - Obtenir les rôles d'un joueur
  const getPlayerRoles = (studentId) => {
    return playerRoles[studentId] || [];
  };

  // ✅ NOUVELLE FONCTION - Calculer l'engagement avec données persistantes
  const calculateEngagementCount = (studentId) => {
    const roles = getPlayerRoles(studentId);
    return roles.length;
  };

  // ✅ NOUVELLE FONCTION - Obtenir le rôle le plus fréquent
  const getMostFrequentRole = (studentId) => {
    const roles = getPlayerRoles(studentId);
    if (roles.length === 0) return null;
    
    const roleCount = {};
    roles.forEach(role => {
      roleCount[role.type] = (roleCount[role.type] || 0) + 1;
    });
    
    const mostFrequent = Object.entries(roleCount).reduce((a, b) => 
      roleCount[a[0]] > roleCount[b[0]] ? a : b
    );
    
    const roleInfo = socialRoles.find(sr => sr.key === mostFrequent[0]);
    return {
      role: roleInfo,
      count: mostFrequent[1]
    };
  };

  // Calculer le taux de présence d'un joueur
  const calculateAttendanceRate = (studentId) => {
    const studentAttendances = trainingAttendances.filter(ta => 
      ta.attendances.some(att => att.studentId === studentId)
    );
    
    if (studentAttendances.length === 0) return 100;
    
    let totalPresent = 0;
    let totalSessions = 0;
    
    studentAttendances.forEach(ta => {
      const studentAtt = ta.attendances.find(att => att.studentId === studentId);
      if (studentAtt) {
        totalSessions++;
        if (studentAtt.status === 'present') totalPresent++;
      }
    });
    
    return totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 100;
  };

  // ✅ COMPOSANT MODIFIÉ - PlayerCard sans badge de présence, avec matchs joués et jauge
  const PlayerCard = ({ player }) => {
    const playerRolesList = getPlayerRoles(player.id);
    const currentRoles = playerRolesList.length;
    const attendanceRate = calculateAttendanceRate(player.id);
    const matchesCount = getPlayerMatchesCount(player.id);

    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 transition-all hover:shadow-md">
        {/* Avatar */}
        <div className="w-16 h-16 mx-auto mb-3">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
            player.team === '2' ? 'from-green-400 to-green-600' : 'from-blue-400 to-blue-600'
          } flex items-center justify-center text-white font-bold text-lg`}>
            {player.firstName[0]}{player.lastName[0]}
          </div>
        </div>

        {/* Informations */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 text-lg">
              {player.firstName} {player.lastName}
            </h3>
            {player.isCaptain && <Star className="text-yellow-500" size={16} />}
          </div>
          
          <div className="text-sm text-slate-600 space-y-1 mb-3">
            <p>{player.position}</p>
            <p>{calculateAge(player.birthDate)} ans</p>
            <p>#{player.licenseNumber}</p>
          </div>

          {/* ✅ NOUVELLES MÉTRIQUES - Matchs joués */}
          <div className="mb-3">
            <MatchesBadge playerId={player.id} />
          </div>

          {/* ✅ NOUVELLE SECTION - Taux de présence avec jauge */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>Présence</span>
              <span className="font-medium">{attendanceRate}%</span>
            </div>
            <ProgressBar percentage={attendanceRate} size="small" />
          </div>

          {/* Badges de rôles */}
          {currentRoles > 0 && (
            <div className="mb-3">
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                {currentRoles} rôle{currentRoles > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {userType === 'coach' && (
          <div className="flex gap-2 mt-3 justify-center">
            <button
              onClick={() => {
                setSelectedPlayerForStats(player.id);
                setShowStatsModal(true);
              }}
              className="text-green-600 hover:text-green-800 p-1"
              title="Voir les statistiques"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => {
                console.log('🔍 Ouverture modale rôles pour joueur:', player.id);
                setSelectedPlayerForRole(player.id); // Pré-sélectionner ce joueur
                setShowRoleModal(true);
              }}
              className="text-purple-600 hover:text-purple-800 p-1"
              title="Assigner des rôles à ce joueur"
            >
              <Award size={16} />
            </button>
            <button
              onClick={() => setEditingPlayer(player)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Modifier"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => {
                if (confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) {
                  studentOperations.deleteStudent(player.id);
                }
              }}
              className="text-red-600 hover:text-red-800 p-1"
              title="Supprimer"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ✅ NOUVEAU COMPOSANT - Section équipe
  const TeamSection = ({ teamNumber, players, teamName, bgColor, borderColor }) => {
    if (players.length === 0) return null;

    return (
      <div className="mb-8">
        <div className={`${bgColor} text-white px-4 py-3 rounded-t-lg border-2 ${borderColor} border-b-0`}>
          <h3 className="text-xl font-semibold flex items-center justify-between">
            <span>{teamName} ({players.length} joueur{players.length > 1 ? 's' : ''})</span>
            <div className="text-sm opacity-90">
              {players.reduce((total, player) => total + getPlayerMatchesCount(player.id), 0)} participations
            </div>
          </h3>
        </div>
        
        <div className={`bg-white/60 backdrop-blur-sm rounded-b-lg border-2 ${borderColor} border-t-0 p-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map(player => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ✅ MODALE GLOBALE D'ASSIGNATION DE RÔLES (POUR TOUS LES JOUEURS)
  const GlobalRoleAssignmentModal = () => {
    const [selectedMatchForGlobalRole, setSelectedMatchForGlobalRole] = useState('');
    const [selectedPlayerForGlobalRole, setSelectedPlayerForGlobalRole] = useState('');
    
    if (!showRoleModal) return null;

    // 🔧 Si un joueur spécifique est pré-sélectionné (depuis une carte joueur)
    const isPlayerPreselected = selectedPlayerForRole !== null;
    const preselectedPlayer = isPlayerPreselected ? students.find(s => s.id === selectedPlayerForRole) : null;

    // Utiliser le joueur pré-sélectionné s'il existe, sinon utiliser la sélection globale
    const currentSelectedPlayerId = isPlayerPreselected ? selectedPlayerForRole : parseInt(selectedPlayerForGlobalRole);
    const selectedMatch = matches.find(m => m.id === parseInt(selectedMatchForGlobalRole));
    const selectedPlayer = students.find(s => s.id === currentSelectedPlayerId);
    const playerCurrentRoles = currentSelectedPlayerId ? getPlayerRoles(currentSelectedPlayerId) : [];

    const closeModal = () => {
      setShowRoleModal(false);
      setSelectedMatchForGlobalRole('');
      setSelectedPlayerForGlobalRole('');
      setSelectedMatchForRole('');
      setSelectedPlayerForRole(null);
    };

    const handleRoleToggle = async (role) => {
      if (!selectedMatchForGlobalRole || (!selectedPlayerForGlobalRole && !isPlayerPreselected)) {
        alert('⚠️ Veuillez sélectionner un match ET un joueur');
        return;
      }

      const matchId = parseInt(selectedMatchForGlobalRole);
      const playerId = currentSelectedPlayerId;
      const hasRole = playerCurrentRoles.some(
        r => r.type === role.key && r.matchId === matchId
      );

      if (hasRole) {
        // Supprimer le rôle
        await removeRole(playerId, role.key, matchId);
      } else {
        // Assigner le rôle
        await assignRole(playerId, role.key, matchId);
      }
    };

    // 🔧 NOUVELLE FONCTION : Obtenir tous les rôles assignés pour ce match
    const getMatchRoles = (matchId) => {
      const matchRoles = {};
      Object.entries(playerRoles).forEach(([studentId, roles]) => {
        const studentMatchRoles = roles.filter(r => r.matchId === matchId);
        if (studentMatchRoles.length > 0) {
          const student = students.find(s => s.id === parseInt(studentId));
          
          // ✅ Inclure seulement si le joueur existe encore
          if (student) {
            matchRoles[studentId] = {
              student,
              roles: studentMatchRoles
            };
          }
          // Les rôles d'anciens joueurs sont maintenant ignorés
        }
      });
      return matchRoles;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              {isPlayerPreselected 
                ? `🎯 Rôles pour ${preselectedPlayer?.firstName} ${preselectedPlayer?.lastName}`
                : '🎯 Gestion des rôles pour un match'
              }
            </h3>
            <button 
              onClick={closeModal}
              disabled={isAssigningRole}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* Loading indicator */}
          {isAssigningRole && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Loader className="animate-spin text-blue-600" size={16} />
              <span className="text-blue-800 text-sm">Sauvegarde en cours...</span>
            </div>
          )}

          {/* Sélection du match et du joueur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Sélection du match */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                1️⃣ Sélectionner un match
              </label>
              <select
                value={selectedMatchForGlobalRole}
                onChange={(e) => {
                  setSelectedMatchForGlobalRole(e.target.value);
                  if (!isPlayerPreselected) {
                    setSelectedPlayerForGlobalRole(''); // Reset player selection only in global mode
                  }
                }}
                disabled={isAssigningRole}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Choisir un match...</option>
                {matches && matches.length > 0 ? (
                  matches.map(match => (
                    <option key={match.id} value={match.id}>
                      Équipe {match.team} vs {match.opponent} - {new Date(match.date).toLocaleDateString('fr-FR')}
                    </option>
                  ))
                ) : (
                  <option disabled>Aucun match disponible</option>
                )}
              </select>
            </div>

            {/* Sélection du joueur (seulement si pas de pré-sélection) */}
            {!isPlayerPreselected && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  2️⃣ Sélectionner un joueur (tous disponibles)
                </label>
                <select
                  value={selectedPlayerForGlobalRole}
                  onChange={(e) => setSelectedPlayerForGlobalRole(e.target.value)}
                  disabled={isAssigningRole || !selectedMatchForGlobalRole}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Choisir un joueur...</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} (Équipe {student.team})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Affichage du joueur pré-sélectionné */}
            {isPlayerPreselected && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  2️⃣ Joueur sélectionné
                </label>
                <div className="w-full p-3 border border-green-300 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">
                    {preselectedPlayer?.firstName} {preselectedPlayer?.lastName} (Équipe {preselectedPlayer?.team})
                  </div>
                  <div className="text-sm text-green-600">
                    Joueur pré-sélectionné - Peut jouer dans n'importe quel match
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Informations sur la sélection */}
          {selectedMatch && selectedPlayer && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-green-700">Match sélectionné:</span>
                  <div className="font-medium text-green-800">
                    Équipe {selectedMatch.team} vs {selectedMatch.opponent}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-green-700">Joueur sélectionné:</span>
                  <div className="font-medium text-green-800">
                    {selectedPlayer.firstName} {selectedPlayer.lastName} (Équipe {selectedPlayer.team})
                  </div>
                </div>
                {selectedPlayer.team !== selectedMatch.team && (
                  <div className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
                    ⚠️ Rôle non-joueur (arbitrage, table...)
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assignation de rôles */}
            <div>
              <h4 className="font-medium text-slate-800 mb-4">
                {isPlayerPreselected ? '3️⃣ Assigner un rôle' : '3️⃣ Assigner un rôle'}
              </h4>
              
              <div className="space-y-3">
                {socialRoles.map(role => {
                  const Icon = role.icon;
                  const hasRole = selectedMatchForGlobalRole && currentSelectedPlayerId && playerCurrentRoles.some(
                    r => r.type === role.key && r.matchId === parseInt(selectedMatchForGlobalRole)
                  );

                  const canAssign = selectedMatchForGlobalRole && (selectedPlayerForGlobalRole || isPlayerPreselected);

                  return (
                    <div
                      key={role.key}
                      className={`p-4 border rounded-lg transition-colors ${
                        hasRole 
                          ? 'border-green-500 bg-green-50' 
                          : canAssign && !isAssigningRole
                            ? 'border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                            : 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-60'
                      }`}
                      onClick={() => {
                        if (!isAssigningRole && canAssign) {
                          handleRoleToggle(role);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${role.color}`}>
                          <Icon size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-slate-800">{role.label}</h5>
                          <p className="text-sm text-slate-600">{role.description}</p>
                        </div>
                        {hasRole && (
                          <div className="text-green-600 font-medium">
                            ✓ Assigné
                          </div>
                        )}
                        {isAssigningRole && (
                          <Loader className="animate-spin text-blue-600" size={16} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vue d'ensemble des rôles du match */}
            <div>
              <h4 className="font-medium text-slate-800 mb-4">📋 Rôles assignés pour ce match</h4>
              
              {selectedMatchForGlobalRole ? (
                <div className="space-y-3">
                  {(() => {
                    const matchRoles = getMatchRoles(parseInt(selectedMatchForGlobalRole));
                    return Object.keys(matchRoles).length > 0 ? (
                      Object.values(matchRoles).map(({ student, roles }) => (
                        <div key={student.id} className="p-3 bg-slate-50 rounded border">
                          <div className="font-medium text-slate-800">
                            {student.firstName} {student.lastName} (Équipe {student.team})
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {roles.map(role => {
                              const roleInfo = socialRoles.find(sr => sr.key === role.type);
                              return roleInfo ? roleInfo.label : role.type;
                            }).join(', ')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic">Aucun rôle assigné pour ce match</p>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-slate-500 italic">Sélectionnez un match pour voir les rôles</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={closeModal}
              disabled={isAssigningRole}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ MODALE DE STATISTIQUES D'UN JOUEUR
  const PlayerStatsModal = () => {
    if (!showStatsModal || !selectedPlayerForStats) return null;

    const player = students.find(s => s.id === selectedPlayerForStats);
    const attendanceRate = calculateAttendanceRate(selectedPlayerForStats);
    const engagementCount = calculateEngagementCount(selectedPlayerForStats);
    const mostFrequentRole = getMostFrequentRole(selectedPlayerForStats);
    const roles = getPlayerRoles(selectedPlayerForStats);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              Statistiques - {player?.firstName} {player?.lastName}
            </h3>
            <button 
              onClick={() => {
                setShowStatsModal(false);
                setSelectedPlayerForStats(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Infos de base */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-800 mb-2">Informations générales</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">Équipe:</span>
                  <span className="ml-2 font-medium">Équipe {player?.team}</span>
                </div>
                <div>
                  <span className="text-slate-600">Position:</span>
                  <span className="ml-2 font-medium">{player?.position}</span>
                </div>
                <div>
                  <span className="text-slate-600">Âge:</span>
                  <span className="ml-2 font-medium">{calculateAge(player?.birthDate)} ans</span>
                </div>
                <div>
                  <span className="text-slate-600">Licence:</span>
                  <span className="ml-2 font-medium">#{player?.licenseNumber}</span>
                </div>
              </div>
            </div>

            {/* Statistiques de présence */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Présence aux entraînements</h4>
              <div className="text-2xl font-bold text-green-600">{attendanceRate}%</div>
              <p className="text-sm text-green-700">Taux de présence</p>
            </div>

            {/* Statistiques d'engagement */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Engagement citoyen</h4>
              <div className="text-2xl font-bold text-purple-600">{engagementCount}</div>
              <p className="text-sm text-purple-700">Rôles assignés au total</p>
              
              {mostFrequentRole && (
                <div className="mt-3">
                  <p className="text-sm text-purple-700">
                    Rôle le plus fréquent: <span className="font-medium">{mostFrequentRole.role.label}</span> ({mostFrequentRole.count}x)
                  </p>
                </div>
              )}

              {roles.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <h5 className="font-medium text-slate-700">Détail des rôles:</h5>
                  {roles.map((role, index) => {
                    const roleInfo = socialRoles.find(sr => sr.key === role.type);
                    const match = matches.find(m => m.id === role.matchId);
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm font-medium">{roleInfo?.label}</span>
                        <span className="text-sm text-slate-600">
                          {match?.opponent || 'Match supprimé'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-3">Aucun rôle assigné</p>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                setShowStatsModal(false);
                setSelectedPlayerForStats(null);
              }}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal d'édition d'un joueur
  const PlayerEditModal = () => {
    if (!editingPlayer) return null;

    const [playerData, setPlayerData] = useState({
      firstName: editingPlayer.firstName || '',
      lastName: editingPlayer.lastName || '',
      birthDate: editingPlayer.birthDate || '',
      licenseNumber: editingPlayer.licenseNumber || '',
      position: editingPlayer.position || 'Meneur',
      team: editingPlayer.team || '2',
      isCaptain: editingPlayer.isCaptain || false
    });

    const handleSave = () => {
      if (studentOperations.updateStudent) {
        studentOperations.updateStudent({ ...editingPlayer, ...playerData });
        setEditingPlayer(null);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Modifier le joueur</h3>
            <button 
              onClick={() => setEditingPlayer(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Prénom"
                value={playerData.firstName}
                onChange={(e) => setPlayerData({...playerData, firstName: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Nom"
                value={playerData.lastName}
                onChange={(e) => setPlayerData({...playerData, lastName: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <input
              type="date"
              value={playerData.birthDate}
              onChange={(e) => setPlayerData({...playerData, birthDate: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="text"
              placeholder="Numéro de licence"
              value={playerData.licenseNumber}
              onChange={(e) => setPlayerData({...playerData, licenseNumber: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <select
                value={playerData.position}
                onChange={(e) => setPlayerData({...playerData, position: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
              <select
                value={playerData.team}
                onChange={(e) => setPlayerData({...playerData, team: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="2">Équipe 2</option>
                <option value="3">Équipe 3</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={playerData.isCaptain}
                onChange={(e) => setPlayerData({...playerData, isCaptain: e.target.checked})}
              />
              <span className="text-sm">Capitaine</span>
            </label>
          </div>
          
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => setEditingPlayer(null)}
              className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  const playersByTeam = getPlayersByTeam();

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" size={28} />
            Gestion des joueurs
          </h2>
          
          <div className="flex items-center gap-2">
            {userType === 'coach' && (
              <button
                onClick={() => {
                  setSelectedPlayerForRole(null); // Mode global
                  setShowRoleModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                title="Assigner des rôles à tous les joueurs pour un match"
              >
                <Award size={16} />
                Gérer les rôles
              </button>
            )}
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800">{filteredPlayers.length}</div>
            <div className="text-sm text-slate-600">Total joueurs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{filteredPlayers.filter(p => p.team === '2').length}</div>
            <div className="text-sm text-slate-600">Équipe 2</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredPlayers.filter(p => p.team === '3').length}</div>
            <div className="text-sm text-slate-600">Équipe 3</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{filteredPlayers.filter(p => p.isCaptain).length}</div>
            <div className="text-sm text-slate-600">Capitaines</div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom ou numéro de licence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les équipes</option>
            <option value="2">Équipe 2</option>
            <option value="3">Équipe 3</option>
          </select>
          
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les postes</option>
            {POSITIONS.map(position => (
              <option key={position} value={position}>{position}</option>
            ))}
          </select>
          
          <select
            value={filterAttendance}
            onChange={(e) => setFilterAttendance(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les présences</option>
            {ATTENDANCE_STATUSES.map(status => (
              <option key={status.key} value={status.key}>{status.label}</option>
            ))}
          </select>
        </div>

        {/* ✅ NOUVELLE LÉGENDE */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-blue-600" size={16} />
            <h3 className="font-medium text-blue-800">Légende</h3>
          </div>
          <div className="flex items-center gap-6 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-slate-600 text-white px-2 py-1 rounded text-xs font-medium">
                <Trophy size={12} />
                5
              </div>
              <span>Nombre de matchs joués par le joueur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-2 bg-green-500" style={{ width: '80%' }}></div>
              </div>
              <span>Jauge de présence aux entraînements</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="text-yellow-500" size={16} />
              <span>Capitaine d'équipe</span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ AFFICHAGE PAR ÉQUIPES */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun joueur trouvé</h3>
          <p className="text-slate-600">
            {searchTerm ? 'Essayez de modifier vos critères de recherche.' : 'Commencez par ajouter des joueurs à votre équipe.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <TeamSection 
            teamNumber="2"
            players={playersByTeam['2']}
            teamName="Équipe 2 - LDV2"
            bgColor="bg-green-600"
            borderColor="border-green-300"
          />
          
          <TeamSection 
            teamNumber="3"
            players={playersByTeam['3']}
            teamName="Équipe 3 - LDV3"
            bgColor="bg-blue-600"
            borderColor="border-blue-300"
          />
        </div>
      )}

      {/* Modales */}
      <GlobalRoleAssignmentModal />
      <PlayerStatsModal />
      <PlayerEditModal />
    </div>
  );
};

export default Players;