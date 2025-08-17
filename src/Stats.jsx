import React, { useState, useMemo } from 'react';
import { BarChart3, Users, Trophy, Calendar, TrendingUp, Award, Star, User, FileText, Flag, Shirt, Flame, Target, Zap } from 'lucide-react';

const Stats = ({ 
  students = [], 
  matches = [], 
  trainings = [], 
  trainingAttendances = [], 
  userType = 'player',
  selectedTeam = 'all',
  playerRoles = {}
}) => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // 🎯 MAPPING DES RÔLES AVEC ICÔNES LUCIDE UNIQUEMENT (emojis supprimés)
  const roleIcons = {
    'responsable_tenue': { icon: Shirt, label: 'Tenue', color: 'bg-blue-500' },
    'responsable_arbitrage': { icon: Flag, label: 'Arbitre', color: 'bg-yellow-500' },
    'responsable_table': { icon: FileText, label: 'Table', color: 'bg-green-500' },
    'coach_match': { icon: User, label: 'Coach', color: 'bg-purple-500' },
    'capitaine': { icon: Star, label: 'Capitaine', color: 'bg-orange-500' }
  };

  // 🔢 FONCTION POUR COMPTER LES RÔLES D'UN JOUEUR
  const getPlayerRoleStats = (studentId) => {
    const roles = playerRoles[studentId] || [];
    const roleCount = {};
    
    roles.forEach(role => {
      roleCount[role.type] = (roleCount[role.type] || 0) + 1;
    });
    
    return roleCount;
  };

  // 🎨 FONCTION POUR GÉNÉRER LES BADGES DE RÔLES (modifiée pour utiliser seulement les icônes Lucide)
  const renderRoleBadges = (studentId) => {
    const roleStats = getPlayerRoleStats(studentId);
    
    if (Object.keys(roleStats).length === 0) {
      return <span className="text-sm text-slate-500 italic">Aucun rôle assigné</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {Object.entries(roleStats).map(([roleType, count]) => {
          const roleInfo = roleIcons[roleType];
          if (!roleInfo) return null;
          
          const Icon = roleInfo.icon;
          
          return (
            <div
              key={roleType}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white ${roleInfo.color}`}
              title={`${roleInfo.label}${count > 1 ? ` (${count}x)` : ''}`}
            >
              <Icon size={12} />
              {count > 1 && <span>{count}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  // Calculer les statistiques générales
  const calculateStats = useMemo(() => {
    const filteredStudents = selectedTeam === 'all' 
      ? students 
      : students.filter(s => s.team === selectedTeam);

    const totalStudents = filteredStudents.length;
    const totalMatches = matches.filter(match => match.ourScore !== null && match.opponentScore !== null).length;
    const totalTrainings = trainings.length;
    
    // Calculer la présence moyenne
    const avgAttendance = filteredStudents.length > 0
      ? filteredStudents.reduce((acc, student) => {
          const studentAttendances = trainingAttendances.filter(ta => 
            ta.attendances.some(att => att.studentId === student.id)
          );
          
          if (studentAttendances.length === 0) return acc + 100;
          
          let totalPresent = 0;
          let totalSessions = 0;
          
          studentAttendances.forEach(ta => {
            const studentAtt = ta.attendances.find(att => att.studentId === student.id);
            if (studentAtt) {
              totalSessions++;
              if (studentAtt.status === 'present') totalPresent++;
            }
          });
          
          return acc + (totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 100);
        }, 0) / filteredStudents.length
      : 0;

    // 🎯 CALCULER LE TOTAL DES RÔLES ASSIGNÉS
    const totalRoles = Object.values(playerRoles).reduce((acc, roles) => acc + roles.length, 0);

    return {
      totalStudents,
      totalMatches,
      totalTrainings,
      avgAttendance: Math.round(avgAttendance),
      totalRoles
    };
  }, [students, matches, trainings, trainingAttendances, selectedTeam, playerRoles]);

  // 📊 FONCTION POUR CALCULER LES STATISTIQUES D'UN JOUEUR
  const getPlayerStats = (student) => {
    // Calcul du taux de présence
    const studentAttendances = trainingAttendances.filter(ta => 
      ta.attendances.some(att => att.studentId === student.id)
    );
    
    let attendanceRate = 100;
    if (studentAttendances.length > 0) {
      let totalPresent = 0;
      let totalSessions = 0;
      
      studentAttendances.forEach(ta => {
        const studentAtt = ta.attendances.find(att => att.studentId === student.id);
        if (studentAtt) {
          totalSessions++;
          if (studentAtt.status === 'present') totalPresent++;
        }
      });
      
      attendanceRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 100;
    }

    // Calcul des matchs joués
    const matchesPlayed = matches.filter(match => 
      match.selectedPlayers && match.selectedPlayers.includes(student.id)
    ).length;

    // Calcul du nombre total de rôles
    const totalRoles = (playerRoles[student.id] || []).length;

    return {
      attendanceRate,
      matchesPlayed,
      totalRoles
    };
  };

  // 🏆 TRI DES JOUEURS PAR ÉQUIPE (2 puis 3) ET PAR NOM
  const sortedStudents = useMemo(() => {
    const filteredStudents = selectedTeam === 'all' 
      ? students 
      : students.filter(s => s.team === selectedTeam);

    return filteredStudents.sort((a, b) => {
      // D'abord trier par équipe (2 avant 3)
      if (a.team !== b.team) {
        return a.team.localeCompare(b.team);
      }
      // Puis par nom de famille
      return a.lastName.localeCompare(b.lastName);
    });
  }, [students, selectedTeam]);

  // Vue d'ensemble
  const OverviewView = () => (
    <div className="space-y-6">
      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Joueurs</p>
              <p className="text-2xl font-bold text-slate-900">{calculateStats.totalStudents}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Présence Moyenne</p>
              <p className="text-2xl font-bold text-green-600">{calculateStats.avgAttendance}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Matchs Programmés</p>
              <p className="text-2xl font-bold text-purple-600">{calculateStats.totalMatches}</p>
            </div>
            <Trophy className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Rôles Assignés</p>
              <p className="text-2xl font-bold text-orange-600">{calculateStats.totalRoles}</p>
            </div>
            <Award className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Répartition par équipe */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Répartition par équipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Équipe 2</h4>
            <div className="text-2xl font-bold text-green-600">
              {students.filter(s => s.team === '2').length} joueurs
            </div>
            <p className="text-sm text-green-600">
              {Math.round((students.filter(s => s.team === '2').length / students.length) * 100)}% de l'effectif
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Équipe 3</h4>
            <div className="text-2xl font-bold text-blue-600">
              {students.filter(s => s.team === '3').length} joueurs
            </div>
            <p className="text-sm text-blue-600">
              {Math.round((students.filter(s => s.team === '3').length / students.length) * 100)}% de l'effectif
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // 🎯 VUE PAR JOUEUR AMÉLIORÉE AVEC ICÔNES LUCIDE UNIQUEMENT
  const PlayerView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">
          Statistiques par joueur ({sortedStudents.length} joueurs)
        </h3>
        <div className="text-sm text-slate-600">
          🔄 Tri : Équipe 2 → Équipe 3 → Nom
        </div>
      </div>

      {/* 🗂️ LÉGENDE DES ICÔNES (mise à jour sans emojis) */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="font-medium text-slate-700 mb-3">🏷️ Légende des rôles :</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(roleIcons).map(([key, roleInfo]) => {
            const Icon = roleInfo.icon;
            return (
              <div key={key} className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white ${roleInfo.color}`}>
                  <Icon size={12} />
                </div>
                <span className="text-sm text-slate-600">{roleInfo.label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          💡 Astuce : Le chiffre à côté indique le nombre de fois qu'un rôle a été assigné
        </p>
      </div>

      {/* 📋 CARTES DES JOUEURS ORGANISÉES PAR ÉQUIPE */}
      <div className="space-y-8">
        {['2', '3'].map(teamNumber => {
          const teamPlayers = sortedStudents.filter(s => s.team === teamNumber);
          
          if (teamPlayers.length === 0) return null;

          return (
            <div key={teamNumber}>
              <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${
                teamNumber === '2' 
                  ? 'bg-green-100 border-2 border-green-300' 
                  : 'bg-blue-100 border-2 border-blue-300'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  teamNumber === '2' ? 'bg-green-600' : 'bg-blue-600'
                }`}>
                  {teamNumber}
                </div>
                <h4 className={`text-lg font-semibold ${
                  teamNumber === '2' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  Équipe {teamNumber} ({teamPlayers.length} joueur{teamPlayers.length > 1 ? 's' : ''})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamPlayers.map(student => {
                  const stats = getPlayerStats(student);
                  
                  return (
                    <div key={student.id} className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow">
                      {/* En-tête du joueur */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                          student.team === '2' ? 'from-green-400 to-green-600' : 'from-blue-400 to-blue-600'
                        } flex items-center justify-center text-white font-bold`}>
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                            {student.firstName} {student.lastName}
                            {student.isCaptain && <Star className="text-yellow-500" size={16} />}
                          </h4>
                          <p className="text-sm text-slate-600">{student.position}</p>
                          <p className="text-xs text-slate-500">Équipe {student.team}</p>
                        </div>
                      </div>

                      {/* Statistiques */}
                      <div className="space-y-3">
                        {/* Présence entraînements */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-700">Présence entraînements</span>
                            <span className={`text-sm font-bold ${
                              stats.attendanceRate >= 80 ? 'text-green-600' : 
                              stats.attendanceRate >= 60 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {stats.attendanceRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                stats.attendanceRate >= 80 ? 'bg-green-500' : 
                                stats.attendanceRate >= 60 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stats.attendanceRate}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {trainingAttendances.filter(ta => ta.attendances.some(att => att.studentId === student.id)).length} entraînements
                          </p>
                        </div>

                        {/* Matchs joués */}
                        <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                          <span className="text-sm font-medium text-orange-800">Matchs joués</span>
                          <span className="text-lg font-bold text-orange-600">{stats.matchesPlayed}</span>
                        </div>

                        {/* 🎯 RÔLES AVEC ICÔNES LUCIDE UNIQUEMENT */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">Responsabilités</span>
                            <span className="text-sm font-bold text-purple-600">{stats.totalRoles} rôle{stats.totalRoles > 1 ? 's' : ''}</span>
                          </div>
                          <div className="min-h-[2rem] flex items-center">
                            {renderRoleBadges(student.id)}
                          </div>
                        </div>
                      </div>

                      {/* Badge d'engagement */}
                      {stats.totalRoles > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            stats.totalRoles >= 5 ? 'bg-purple-100 text-purple-800' :
                            stats.totalRoles >= 3 ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            <Award size={12} />
                            {stats.totalRoles >= 5 ? 'Très engagé' :
                             stats.totalRoles >= 3 ? 'Engagé' : 'Impliqué'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Vue par équipe
  const TeamView = () => {
    
    // Fonction pour calculer les statistiques avancées d'une équipe
    const calculateTeamAdvancedStats = (teamNumber) => {
      const teamStudents = students.filter(s => s.team === teamNumber);
      
      // Calculs des présences - utilisation des VRAIES données
      const avgAttendance = teamStudents.length > 0
        ? teamStudents.reduce((acc, student) => {
            const stats = getPlayerStats(student);
            return acc + stats.attendanceRate;
          }, 0) / teamStudents.length
        : 0;

      // Calculs des matchs - utilisation de la VRAIE structure
      const teamMatches = matches.filter(match => {
        // Un match appartient à l'équipe si des joueurs de cette équipe y participent
        return match.selectedPlayers?.some(playerId => {
          const player = students.find(s => s.id === playerId);
          return player && player.team === teamNumber;
        });
      });

      // Calculer victoires et défaites avec la VRAIE structure (ourScore/opponentScore)
      let victories = 0;
      let defeats = 0;
      let draws = 0;
      let totalPointsScored = 0;
      let totalPointsConceded = 0;

      teamMatches.forEach(match => {
        // Seulement les matchs terminés avec scores renseignés
        if (match.ourScore !== null && match.opponentScore !== null) {
          totalPointsScored += match.ourScore;
          totalPointsConceded += match.opponentScore;
          
          if (match.ourScore > match.opponentScore) {
            victories++;
          } else if (match.ourScore < match.opponentScore) {
            defeats++;
          } else {
            draws++;
          }
        }
      });

      const totalMatches = victories + defeats + draws;
      const averageScored = totalMatches > 0 ? (totalPointsScored / totalMatches).toFixed(1) : 0;
      const averageConceded = totalMatches > 0 ? (totalPointsConceded / totalMatches).toFixed(1) : 0;

      // Calcul de la série actuelle avec les VRAIES données
      let currentStreak = { type: 'none', count: 0 };
      if (teamMatches.length > 0) {
        // Filtrer et trier les matchs terminés par date
        const completedMatches = teamMatches
          .filter(m => m.ourScore !== null && m.opponentScore !== null)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (completedMatches.length > 0) {
          // Déterminer le résultat du dernier match
          const lastMatch = completedMatches[0];
          let lastResult;
          if (lastMatch.ourScore > lastMatch.opponentScore) {
            lastResult = 'victory';
          } else if (lastMatch.ourScore < lastMatch.opponentScore) {
            lastResult = 'defeat';
          } else {
            lastResult = 'draw';
          }
          
          // Compter la série
          let streakCount = 1;
          for (let i = 1; i < completedMatches.length; i++) {
            const match = completedMatches[i];
            let currentResult;
            if (match.ourScore > match.opponentScore) {
              currentResult = 'victory';
            } else if (match.ourScore < match.opponentScore) {
              currentResult = 'defeat';
            } else {
              currentResult = 'draw';
            }
            
            if (currentResult === lastResult) {
              streakCount++;
            } else {
              break;
            }
          }
          
          currentStreak = { type: lastResult, count: streakCount };
        }
      }

      // Calcul du joueur le plus engagé (excluant le capitaine)
      let mostEngagedPlayer = null;
      let maxRoles = 0;
      
      teamStudents.forEach(student => {
        if (!student.isCaptain) {
          const studentRoles = playerRoles[student.id] || [];
          const nonCaptainRoles = studentRoles.filter(role => role.type !== 'capitaine');
          
          if (nonCaptainRoles.length > maxRoles) {
            maxRoles = nonCaptainRoles.length;
            mostEngagedPlayer = {
              name: `${student.firstName} ${student.lastName}`,
              rolesCount: nonCaptainRoles.length,
              roles: nonCaptainRoles
            };
          }
        }
      });

      return {
        teamStudents,
        avgAttendance: Math.round(avgAttendance),
        victories,
        defeats,
        draws,
        totalMatches,
        currentStreak,
        totalPointsScored,
        totalPointsConceded,
        averageScored: parseFloat(averageScored),
        averageConceded: parseFloat(averageConceded),
        mostEngagedPlayer,
        winRate: totalMatches > 0 ? Math.round((victories / totalMatches) * 100) : 0
      };
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-800">Comparaison des équipes</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['2', '3'].map(teamNumber => {
            const teamStats = calculateTeamAdvancedStats(teamNumber);
            const { 
              teamStudents, 
              avgAttendance, 
              victories, 
              defeats, 
              totalMatches, 
              currentStreak,
              totalPointsScored,
              totalPointsConceded,
              averageScored,
              averageConceded,
              mostEngagedPlayer,
              winRate
            } = teamStats;

            return (
              <div key={teamNumber} className={`bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border-2 ${
                teamNumber === '2' ? 'border-green-300' : 'border-blue-300'
              }`}>
                
                {/* Header équipe */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-full ${
                    teamNumber === '2' ? 'bg-green-600' : 'bg-blue-600'
                  } flex items-center justify-center text-white font-bold text-lg`}>
                    {teamNumber}
                  </div>
                  <div>
                    <h4 className={`text-xl font-semibold ${
                      teamNumber === '2' ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      Équipe {teamNumber}
                    </h4>
                    <p className="text-sm text-slate-600">{teamStudents.length} joueur{teamStudents.length > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Grille métriques principales */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Présence */}
                  <div className={`p-3 rounded-lg ${teamNumber === '2' ? 'bg-green-50' : 'bg-blue-50'}`}>
                    <p className="text-sm text-slate-600 mb-1">Présence moy.</p>
                    <p className={`text-2xl font-bold ${teamNumber === '2' ? 'text-green-600' : 'text-blue-600'}`}>
                      {avgAttendance}%
                    </p>
                  </div>

                  {/* Bilan victoires/défaites */}
                  <div className={`p-3 rounded-lg ${teamNumber === '2' ? 'bg-green-50' : 'bg-blue-50'}`}>
                    <p className="text-sm text-slate-600 mb-1">Bilan saison</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold ${teamNumber === '2' ? 'text-green-600' : 'text-blue-600'}`}>
                        {victories}V
                      </span>
                      <span className="text-slate-500 text-sm">/ {defeats}D</span>
                    </div>
                    <p className="text-xs text-slate-500">{winRate}% de réussite</p>
                  </div>
                </div>

                {/* Série actuelle */}
                {currentStreak.type !== 'none' && (
                  <div className={`p-3 rounded-lg mb-4 border ${
                    currentStreak.type === 'victory' 
                      ? 'bg-green-100 border-green-300' 
                      : 'bg-red-100 border-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Flame className={currentStreak.type === 'victory' ? 'text-green-600' : 'text-red-600'} size={18} />
                      <span className={`font-medium ${
                        currentStreak.type === 'victory' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Série actuelle : {currentStreak.count} {currentStreak.type === 'victory' ? 'victoire' : 'défaite'}{currentStreak.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Statistiques points */}
                <div className="mb-4">
                  <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Trophy size={16} />
                    Statistiques offensives/défensives
                  </h5>
                  
                  {/* Points totaux */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <div className="text-lg font-bold text-green-600">{totalPointsScored}</div>
                      <div className="text-xs text-slate-600">Points marqués</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <div className="text-lg font-bold text-red-600">{totalPointsConceded}</div>
                      <div className="text-xs text-slate-600">Points encaissés</div>
                    </div>
                  </div>

                  {/* Moyennes par match */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <div className="text-lg font-bold text-green-600">{averageScored}</div>
                      <div className="text-xs text-slate-600">Moy./match (att.)</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <div className="text-lg font-bold text-red-600">{averageConceded}</div>
                      <div className="text-xs text-slate-600">Moy./match (déf.)</div>
                    </div>
                  </div>

                  {/* Différentiel */}
                  <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className={`text-lg font-bold ${
                      (averageScored - averageConceded) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(averageScored - averageConceded) > 0 ? '+' : ''}{(averageScored - averageConceded).toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-600">Différentiel/match</div>
                  </div>
                </div>

                {/* Joueur le plus engagé */}
                {mostEngagedPlayer && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="text-yellow-600" size={16} />
                      <span className="font-medium text-yellow-800 text-sm">Joueur le plus engagé</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-900">{mostEngagedPlayer.name}</span>
                      <span className="text-sm text-yellow-700">
                        {mostEngagedPlayer.rolesCount} rôle{mostEngagedPlayer.rolesCount > 1 ? 's' : ''} occupé{mostEngagedPlayer.rolesCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Affichage des rôles */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mostEngagedPlayer.roles.slice(0, 3).map((role, index) => {
                        const roleInfo = roleIcons[role.type];
                        if (!roleInfo) return null;
                        const Icon = roleInfo.icon;
                        
                        return (
                          <div key={index} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${roleInfo.color}`}>
                            <Icon size={10} />
                          </div>
                        );
                      })}
                      {mostEngagedPlayer.roles.length > 3 && (
                        <span className="text-xs text-yellow-600">+{mostEngagedPlayer.roles.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section de comparaison globale */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Comparaison globale LDV
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              const team2Stats = calculateTeamAdvancedStats('2');
              const team3Stats = calculateTeamAdvancedStats('3');
              
              return (
                <>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{team2Stats.avgAttendance}%</div>
                    <div className="text-sm text-green-700">Présence Équipe 2</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{team3Stats.avgAttendance}%</div>
                    <div className="text-sm text-blue-700">Présence Équipe 3</div>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {team2Stats.victories + team3Stats.victories}
                    </div>
                    <div className="text-sm text-yellow-700">Victoires LDV</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((team2Stats.averageScored + team3Stats.averageScored) / 2)}
                    </div>
                    <div className="text-sm text-purple-700">Points moy. LDV</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Message motivant */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-blue-400 rounded">
            <p className="text-sm text-slate-700">
              <strong>🎯 Analyse :</strong> 
              {(() => {
                const team2Stats = calculateTeamAdvancedStats('2');
                const team3Stats = calculateTeamAdvancedStats('3');
                
                return (
                  <>
                    {team2Stats.avgAttendance > team3Stats.avgAttendance 
                      ? ' Équipe 2 en tête sur la présence' 
                      : ' Équipe 3 en tête sur la présence'}, 
                    {team2Stats.victories > team3Stats.victories 
                      ? ' Équipe 2 domine les victoires' 
                      : ' Équipe 3 domine les victoires'}. 
                    Continuez cette belle émulation ! 💪
                  </>
                );
              })()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={28} />
            Statistiques et analyses
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded transition-colors ${
                activeView === 'overview' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveView('players')}
              className={`px-4 py-2 rounded transition-colors ${
                activeView === 'players' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Par joueur
            </button>
            <button
              onClick={() => setActiveView('teams')}
              className={`px-4 py-2 rounded transition-colors ${
                activeView === 'teams' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Par équipe
            </button>
          </div>
        </div>
        <p className="text-slate-600 mt-2">Suivi des performances, matchs et responsabilités</p>
      </div>

      {/* Contenu selon la vue active */}
      {activeView === 'overview' && <OverviewView />}
      {activeView === 'players' && <PlayerView />}
      {activeView === 'teams' && <TeamView />}
    </div>
  );
};

export default Stats;