import React, { useState, useEffect } from 'react';
import { Settings, UserCheck, Calendar, Trophy, Users, BarChart3, Plus, Edit, Save, X, History, ArrowLeft, Trash2, CheckCircle, XCircle, Heart, Mountain, Phone, Star, ClipboardCheck, Building } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import TrainingsView from './TrainingsView.jsx';
import Players from './Players.jsx';
import Stats from './Stats.jsx';
import MatchesView from './MatchesView.jsx';
import ProtectedHeader from './ProtectedHeader.jsx';
import Attendance from './Attendance.jsx';

// Configuration Supabase
const supabaseUrl = 'https://loamfkojtxothevemetn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYW1ma29qdHhvdGhldmVtZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzY2MDMsImV4cCI6MjA2OTY1MjYwM30.Zaf2b9c3Y_NHWixIPvmsXLgVxuMCBu-bloWmrs-ULiY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Constantes
const POSITIONS = ['Meneur', 'Arrière', 'Ailier', 'Ailier fort', 'Pivot'];
const ATTENDANCE_STATUSES = [
  { key: 'present', label: 'Présent', color: 'bg-green-600', textColor: 'text-green-600', code: 'P' },
  { key: 'absent', label: 'Absent', color: 'bg-red-600', textColor: 'text-red-600', code: 'A' },
  { key: 'absent-warned', label: 'Absent Prévenu WhatsApp', color: 'bg-orange-500', textColor: 'text-orange-500', code: 'AP' },
  { key: 'injured', label: 'Blessé', color: 'bg-purple-600', textColor: 'text-purple-600', code: 'B' },
  { key: 'excused', label: 'Excusé', color: 'bg-blue-600', textColor: 'text-blue-600', code: 'E' },
  { key: 'stage', label: 'En Stage', color: 'bg-teal-600', textColor: 'text-teal-600', code: 'S' },
];

// Données statiques complètement vides
const staticStudents = [];
const staticMatches = [];
const staticTrainings = [];
const staticTrainingAttendances = [];

// Fonction de gestion d'erreurs
const handleSupabaseError = (error, operation) => {
  console.error(`❌ Erreur ${operation}:`, error);
  
  if (error.message.includes('relation') && error.message.includes('does not exist')) {
    alert('⚠️ Tables manquantes dans Supabase. Veuillez exécuter le script SQL de création des tables.');
  } else if (error.message.includes('Invalid API key')) {
    alert('⚠️ Clé API Supabase invalide. Vérifiez votre configuration.');
  } else {
    alert(`Erreur ${operation}: ${error.message}`);
  }
};

// Composant StatusBadge
const StatusBadge = ({ status, size = 'normal' }) => {
  const statusInfo = ATTENDANCE_STATUSES.find(s => s.key === status);
  if (!statusInfo) return null;

  const sizeClasses = size === 'small' ? 'w-4 h-4 text-xs' : 'w-6 h-6 text-sm';

  return (
    <div 
      className={`${sizeClasses} rounded flex items-center justify-center text-white font-bold ${statusInfo.color}`}
      title={statusInfo.label}
    >
      {statusInfo.code}
    </div>
  );
};

// Composant LoadingSpinner
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full border-4 border-blue-500 border-t-transparent h-12 w-12 mx-auto mb-4"></div>
      <p className="text-slate-600">Chargement des données...</p>
    </div>
  </div>
);

// Hook personnalisé pour les données
const useBasketballData = () => {
  const [students, setStudents] = useState([]);
  const [matches, setMatches] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [trainingAttendances, setTrainingAttendances] = useState([]);
  const [playerRoles, setPlayerRoles] = useState({});
  const [newsLinks, setNewsLinks] = useState([]); // ✅ AJOUTÉ
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [supabaseMode, setSupabaseMode] = useState(true);

  // 🎯 FONCTIONS DE GESTION DES RÔLES POUR SUPABASE
  const roleOperations = {
    // Charger tous les rôles depuis Supabase
    loadPlayerRoles: async () => {
      try {
        console.log('📥 Chargement des rôles depuis Supabase...');
        
        const { data, error } = await supabase
          .from('player_roles')
          .select('*')
          .order('assigned_at', { ascending: false });

        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.warn('⚠️ Table player_roles non trouvée, création nécessaire');
            return {};
          }
          throw error;
        }

        // Convertir en format attendu par l'interface
        const rolesGrouped = {};
        data.forEach(role => {
          if (!rolesGrouped[role.student_id]) {
            rolesGrouped[role.student_id] = [];
          }
          rolesGrouped[role.student_id].push({
            type: role.role_type,
            matchId: role.match_id,
            assignedAt: role.assigned_at,
            id: role.id
          });
        });

        console.log('✅ Rôles chargés:', rolesGrouped);
        return rolesGrouped;
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        return {};
      }
    },

    // Assigner un rôle à un joueur
    assignRole: async (studentId, roleType, matchId) => {
      try {
        console.log('📤 Attribution de rôle:', { studentId, roleType, matchId });

        // Vérifier si ce rôle existe déjà pour ce match
        const { data: existingRole, error: checkError } = await supabase
          .from('player_roles')
          .select('id')
          .eq('student_id', studentId)
          .eq('role_type', roleType)
          .eq('match_id', matchId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingRole) {
          console.log('⚠️ Rôle déjà assigné');
          return existingRole;
        }

        // Insérer le nouveau rôle
        const { data, error } = await supabase
          .from('player_roles')
          .insert({
            student_id: studentId,
            role_type: roleType,
            match_id: matchId
          })
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Rôle assigné avec succès:', data);
        return data;
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'attribution du rôle:', error);
        throw error;
      }
    },

    // Supprimer un rôle
    removeRole: async (studentId, roleType, matchId) => {
      try {
        console.log('🗑️ Suppression de rôle:', { studentId, roleType, matchId });

        const { error } = await supabase
          .from('player_roles')
          .delete()
          .eq('student_id', studentId)
          .eq('role_type', roleType)
          .eq('match_id', matchId);

        if (error) throw error;

        console.log('✅ Rôle supprimé avec succès');
        
      } catch (error) {
        console.error('❌ Erreur lors de la suppression du rôle:', error);
        throw error;
      }
    },

    // Obtenir les rôles d'un joueur
    getPlayerRoles: async (studentId) => {
      try {
        const { data, error } = await supabase
          .from('player_roles')
          .select('*')
          .eq('student_id', studentId)
          .order('assigned_at', { ascending: false });

        if (error) throw error;
        return data || [];
        
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des rôles:', error);
        return [];
      }
    },

    // Obtenir les statistiques de rôles d'un joueur
    getPlayerRoleStats: async (studentId) => {
      try {
        const { data, error } = await supabase
          .from('player_roles')
          .select('role_type')
          .eq('student_id', studentId);

        if (error) throw error;

        // Compter les occurrences de chaque rôle
        const roleCount = {};
        data.forEach(role => {
          roleCount[role.role_type] = (roleCount[role.role_type] || 0) + 1;
        });

        return {
          totalRoles: data.length,
          roleBreakdown: roleCount,
          mostFrequentRole: Object.entries(roleCount).reduce((a, b) => 
            roleCount[a[0]] > roleCount[b[0]] ? a : b, ['', 0]
          )
        };
        
      } catch (error) {
        console.error('❌ Erreur lors du calcul des stats de rôles:', error);
        return { totalRoles: 0, roleBreakdown: {}, mostFrequentRole: ['', 0] };
      }
    }
  };

  // ✅ NOUVELLES OPÉRATIONS POUR LES ACTUALITÉS
  const newsOperations = {
    // Charger tous les liens d'actualités depuis Supabase
    loadNewsLinks: async () => {
      try {
        console.log('📥 Chargement des actualités depuis Supabase...');
        
        const { data, error } = await supabase
          .from('news_links')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.warn('⚠️ Table news_links non trouvée, création nécessaire');
            return [];
          }
          throw error;
        }

        console.log('✅ Actualités chargées:', data);
        return data || [];
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des actualités:', error);
        return [];
      }
    },

    // Sauvegarder tous les liens d'actualités
    saveNewsLinks: async (linksToSave) => {
      try {
        console.log('📤 Sauvegarde des actualités:', linksToSave);

        // Désactiver tous les liens existants
        const { error: deactivateError } = await supabase
          .from('news_links')
          .update({ is_active: false })
          .eq('is_active', true);

        if (deactivateError) throw deactivateError;

        // Insérer les nouveaux liens actifs
        if (linksToSave.length > 0) {
          const linksToInsert = linksToSave
            .filter(link => link.title && link.url) // Filtrer les liens valides
            .map((link, index) => ({
              title: link.title,
              url: link.url,
              type: link.type || 'web',
              display_order: index,
              is_active: true
            }));

          if (linksToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('news_links')
              .insert(linksToInsert);

            if (insertError) throw insertError;
          }
        }

        console.log('✅ Actualités sauvegardées avec succès');
        
        // Recharger les actualités
        const updatedLinks = await newsOperations.loadNewsLinks();
        setNewsLinks(updatedLinks);
        
        return true;
        
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des actualités:', error);
        handleSupabaseError(error, 'sauvegarde actualités');
        return false;
      }
    },

    // Ajouter un lien d'actualité
    addNewsLink: async (linkData) => {
      try {
        const { data, error } = await supabase
          .from('news_links')
          .insert({
            title: linkData.title,
            url: linkData.url,
            type: linkData.type || 'web',
            display_order: newsLinks.length,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        setNewsLinks([...newsLinks, data]);
        console.log('✅ Actualité ajoutée:', data);
        return data;
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de l\'actualité:', error);
        throw error;
      }
    },

    // Supprimer un lien d'actualité
    deleteNewsLink: async (linkId) => {
      try {
        const { error } = await supabase
          .from('news_links')
          .update({ is_active: false })
          .eq('id', linkId);

        if (error) throw error;

        setNewsLinks(newsLinks.filter(link => link.id !== linkId));
        console.log('✅ Actualité supprimée');
        
      } catch (error) {
        console.error('❌ Erreur lors de la suppression de l\'actualité:', error);
        throw error;
      }
    }
  };

  // 🔄 FONCTION DE CHARGEMENT DES DONNÉES AVEC RÔLES ET ACTUALITÉS
  const loadSupabaseData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Chargement des données depuis Supabase...');

      // Charger toutes les données en parallèle - ✅ ACTUALITÉS AJOUTÉES
      const [studentsData, matchesData, trainingsData, attendancesData, rolesData, newsData] = await Promise.all([
        supabase.from('students').select('*').order('last_name'),
        supabase.from('matches').select('*').order('date', { ascending: false }),
        supabase.from('trainings').select('*').order('date', { ascending: false }),
        supabase.from('training_attendances').select('*').order('date', { ascending: false }),
        roleOperations.loadPlayerRoles(),
        newsOperations.loadNewsLinks() // ✅ AJOUTÉ
      ]);

      // Traitement des erreurs
      [studentsData, matchesData, trainingsData, attendancesData].forEach((result, index) => {
        if (result.error) {
          const entities = ['students', 'matches', 'trainings', 'training_attendances'];
          throw new Error(`Erreur ${entities[index]}: ${result.error.message}`);
        }
      });

      // Mapper les étudiants
      if (studentsData.data) {
        const mappedStudents = studentsData.data.map(student => ({
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          birthDate: student.birth_date,
          licenseNumber: student.license_number,
          position: student.position,
          team: student.team,
          isCaptain: student.is_captain,
          lastAttendance: student.last_attendance
        }));
        setStudents(mappedStudents);
        console.log(`📊 ${mappedStudents.length} joueurs chargés`);
      }

      // Mapper les matchs
      if (matchesData.data) {
        const mappedMatches = matchesData.data.map(match => ({
          id: match.id,
          date: match.date,
          time: match.time,
          opponent: match.opponent,
          championship: match.championship,
          championshipFull: match.championship_full || match.championship,
          team: match.team,
          lieu: match.lieu,
          status: match.status,
          tenues: match.tenues,
          arbitrage: match.arbitrage,
          tableMarque: match.table_marque,
          selectedPlayers: match.selected_players || [],
          ourScore: match.our_score,
          opponentScore: match.opponent_score,
          comments: match.comments || ''
        }));
        setMatches(mappedMatches);
        console.log(`🏀 ${mappedMatches.length} matchs chargés`);
      }

      // Mapper les entraînements
      if (trainingsData.data) {
        setTrainings(trainingsData.data);
        console.log(`🏃 ${trainingsData.data.length} entraînements chargés`);
      }

      // Mapper les présences
      if (attendancesData.data) {
        const mappedAttendances = attendancesData.data.map(attendance => ({
          id: attendance.id,
          trainingId: attendance.training_id,
          date: attendance.date,
          attendances: attendance.attendances
        }));
        setTrainingAttendances(mappedAttendances);
        console.log(`📋 ${mappedAttendances.length} présences chargées`);
      }

      // Charger les rôles
      setPlayerRoles(rolesData);
      console.log('✅ Rôles chargés dans l\'état');

      // ✅ Charger les actualités
      setNewsLinks(newsData);
      console.log('✅ Actualités chargées dans l\'état');

      console.log('✅ Toutes les données chargées avec succès');
      
    } catch (error) {
      handleSupabaseError(error, 'chargement des données');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setConnectionStatus('connecting');
      
      try {
        // Test de connexion Supabase
        const { data: testData, error: testError } = await supabase
          .from('students')
          .select('id')
          .limit(1);

        if (testError) throw testError;

        console.log('✅ Connexion Supabase réussie');
        setConnectionStatus('online');
        setSupabaseMode(true);
        
        // Charger toutes les données
        await loadSupabaseData();

      } catch (error) {
        console.warn('⚠️ Échec de la connexion Supabase, mode local activé:', error.message);
        setConnectionStatus('local');
        setSupabaseMode(false);

        // Utiliser des données complètement vides
        setStudents([]);
        setMatches([]);
        setTrainings([]);
        setTrainingAttendances([]);
        setPlayerRoles({});
        setNewsLinks([]); // ✅ AJOUTÉ
        console.log('📱 Mode local activé - Données vides');
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const studentOperations = {
    addStudent: async (studentData) => {
      try {
        if (supabaseMode) {
          const { data, error } = await supabase
            .from('students')
            .insert({
              first_name: studentData.firstName,
              last_name: studentData.lastName,
              birth_date: studentData.birthDate,
              license_number: studentData.licenseNumber,
              position: studentData.position,
              team: studentData.team,
              is_captain: studentData.isCaptain,
              last_attendance: 'present'
            })
            .select()
            .single();

          if (error) throw error;

          const newStudent = {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            birthDate: data.birth_date,
            licenseNumber: data.license_number,
            position: data.position,
            team: data.team,
            isCaptain: data.is_captain,
            lastAttendance: data.last_attendance
          };

          setStudents([...students, newStudent]);
        } else {
          // Mode local
          const newId = Math.max(...students.map(s => s.id), 0) + 1;
          const addedStudent = { id: newId, ...studentData, lastAttendance: 'present' };
          setStudents([...students, addedStudent]);
        }

        alert('✅ Joueur ajouté avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'ajout joueur');
      }
    },

    updateStudent: async (updatedStudent) => {
      try {
        if (supabaseMode) {
          const { error } = await supabase
            .from('students')
            .update({
              first_name: updatedStudent.firstName,
              last_name: updatedStudent.lastName,
              birth_date: updatedStudent.birthDate,
              license_number: updatedStudent.licenseNumber,
              position: updatedStudent.position,
              team: updatedStudent.team,
              is_captain: updatedStudent.isCaptain,
              last_attendance: updatedStudent.lastAttendance
            })
            .eq('id', updatedStudent.id);

          if (error) throw error;
        }

        setStudents(students.map(student => 
          student.id === updatedStudent.id ? updatedStudent : student
        ));

        alert('✅ Joueur modifié avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'modification joueur');
      }
    },

    deleteStudent: async (playerId) => {
      if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) return;

      try {
        if (supabaseMode) {
          const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', playerId);

          if (error) throw error;
        }

        setStudents(students.filter(student => student.id !== playerId));
        alert('✅ Joueur supprimé avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'suppression joueur');
      }
    },

    updateAttendance: async (studentId, newAttendance) => {
      try {
        if (supabaseMode) {
          const { error } = await supabase
            .from('students')
            .update({ last_attendance: newAttendance })
            .eq('id', studentId);

          if (error) throw error;
        }

        setStudents(students.map(s => 
          s.id === studentId ? { ...s, lastAttendance: newAttendance } : s
        ));
      } catch (error) {
        handleSupabaseError(error, 'mise à jour présence');
      }
    }
  };

  const trainingOperations = {
    addTraining: async (trainingData) => {
      try {
        if (supabaseMode) {
          const { data, error } = await supabase
            .from('trainings')
            .insert({
              date: trainingData.date,
              time: trainingData.time,
              type: trainingData.type || 'entrainement',
              theme: trainingData.theme,
              lieu: trainingData.lieu,
              team: trainingData.team || 'all',
              status: 'upcoming',
              description: trainingData.description || ''
            })
            .select()
            .single();

          if (error) throw error;
          setTrainings([...trainings, data]);
        } else {
          const newId = Math.max(...trainings.map(t => t.id), 0) + 1;
          const addedTraining = { 
            id: newId, 
            ...trainingData, 
            status: 'upcoming',
            type: trainingData.type || 'entrainement'
          };
          setTrainings([...trainings, addedTraining]);
        }

        alert('✅ Entraînement ajouté avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'ajout entraînement');
      }
    },

    updateTraining: async (updatedTraining) => {
      try {
        if (supabaseMode) {
          const { error } = await supabase
            .from('trainings')
            .update({
              date: updatedTraining.date,
              time: updatedTraining.time,
              type: updatedTraining.type,
              theme: updatedTraining.theme,
              lieu: updatedTraining.lieu,
              team: updatedTraining.team,
              status: updatedTraining.status,
              description: updatedTraining.description
            })
            .eq('id', updatedTraining.id);

          if (error) throw error;
        }

        setTrainings(trainings.map(training => 
          training.id === updatedTraining.id ? updatedTraining : training
        ));

        alert('✅ Entraînement modifié avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'modification entraînement');
      }
    },

    deleteTraining: async (trainingId) => {
      if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet entraînement et toutes ses données de présence ?')) return;

      try {
        if (supabaseMode) {
          await supabase
            .from('training_attendances')
            .delete()
            .eq('training_id', trainingId);

          const { error } = await supabase
            .from('trainings')
            .delete()
            .eq('id', trainingId);

          if (error) throw error;
        }

        setTrainings(trainings.filter(training => training.id !== trainingId));
        setTrainingAttendances(trainingAttendances.filter(ta => ta.trainingId !== trainingId));
        
        alert('✅ Entraînement supprimé avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'suppression entraînement');
      }
    },

    saveTrainingAttendance: async (trainingId, attendancesData) => {
      try {
        if (supabaseMode) {
          const { data: existing } = await supabase
            .from('training_attendances')
            .select('id')
            .eq('training_id', trainingId)
            .single();

          if (existing) {
            const { error } = await supabase
              .from('training_attendances')
              .update({
                attendances: attendancesData,
                date: new Date().toISOString().split('T')[0]
              })
              .eq('training_id', trainingId);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('training_attendances')
              .insert({
                training_id: trainingId,
                date: new Date().toISOString().split('T')[0],
                attendances: attendancesData
              });

            if (error) throw error;
          }

          const { error: updateError } = await supabase
            .from('trainings')
            .update({ status: 'completed' })
            .eq('id', trainingId);

          if (updateError) throw updateError;

          // Recharger les données
          const { data: trainingsData } = await supabase
            .from('trainings')
            .select('*')
            .order('date', { ascending: false });

          if (trainingsData) setTrainings(trainingsData);

          const { data: attendancesDataReload } = await supabase
            .from('training_attendances')
            .select('*')
            .order('date', { ascending: false });

          if (attendancesDataReload) {
            const mappedAttendances = attendancesDataReload.map(attendance => ({
              id: attendance.id,
              trainingId: attendance.training_id,
              date: attendance.date,
              attendances: attendance.attendances
            }));
            setTrainingAttendances(mappedAttendances);
          }

        } else {
          const newAttendance = {
            id: Math.max(...trainingAttendances.map(ta => ta.id || 0), 0) + 1,
            trainingId: trainingId,
            date: new Date().toISOString().split('T')[0],
            attendances: attendancesData
          };

          const existingIndex = trainingAttendances.findIndex(ta => ta.trainingId === trainingId);
          if (existingIndex >= 0) {
            const updatedAttendances = [...trainingAttendances];
            updatedAttendances[existingIndex] = newAttendance;
            setTrainingAttendances(updatedAttendances);
          } else {
            setTrainingAttendances([...trainingAttendances, newAttendance]);
          }

          setTrainings(trainings.map(t => 
            t.id === trainingId ? { ...t, status: 'completed' } : t
          ));
        }

        alert('✅ Présences sauvegardées avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'sauvegarde présences');
      }
    }
  };

  const matchOperations = {
    addMatch: async (matchData) => {
      console.log('🔍 Tentative d\'ajout de match:', matchData);
      
      // Validation des champs obligatoires
      if (!matchData.opponent || !matchData.date || !matchData.time || !matchData.lieu) {
        alert('⚠️ Veuillez remplir tous les champs obligatoires (Adversaire, Date, Heure, Lieu)');
        return false;
      }

      try {
        if (supabaseMode) {
          console.log('📤 Ajout via Supabase...');
          
          // Préparer les données à insérer avec tous les champs de la table
          const insertData = {
            date: matchData.date,
            time: matchData.time,
            opponent: matchData.opponent,
            championship: matchData.championship,
            team: matchData.team,
            lieu: matchData.lieu,
            status: matchData.status || 'upcoming',
            tenues: matchData.tenues || null,
            arbitrage: matchData.arbitrage || null,
            table_marque: matchData.tableMarque || null,
            selected_players: matchData.selectedPlayers || [],
            our_score: matchData.ourScore || null,
            opponent_score: matchData.opponentScore || null,
            comments: matchData.comments || ''
          };

          console.log('📝 Données à insérer dans Supabase:', insertData);
          
          const { data, error } = await supabase
            .from('matches')
            .insert(insertData)
            .select()
            .single();

          if (error) {
            console.error('❌ Erreur Supabase détaillée:', error);
            throw error;
          }

          console.log('✅ Match créé dans Supabase:', data);

          // Transformer les données pour l'affichage dans l'app
          const newMatch = {
            id: data.id,
            date: data.date,
            time: data.time,
            opponent: data.opponent,
            championship: data.championship,
            championshipFull: data.championship_full || `Championnat ${data.championship}`,
            team: data.team,
            lieu: data.lieu,
            status: data.status,
            tenues: data.tenues,
            arbitrage: data.arbitrage,
            tableMarque: data.table_marque,
            selectedPlayers: data.selected_players || [],
            ourScore: data.our_score,
            opponentScore: data.opponent_score,
            comments: data.comments || ''
          };

          // Ajouter le match à l'état local
          setMatches(prevMatches => [...prevMatches, newMatch]);
          console.log('✅ Match ajouté à l\'état local');
          
        } else {
          // Mode local
          console.log('📱 Ajout en mode local...');
          const newId = Math.max(...matches.map(m => m.id), 0) + 1;
          const addedMatch = { 
            id: newId, 
            ...matchData, 
            championshipFull: `Championnat ${matchData.championship}`,
            selectedPlayers: matchData.selectedPlayers || [],
            ourScore: matchData.ourScore || null,
            opponentScore: matchData.opponentScore || null,
            comments: matchData.comments || ''
          };
          setMatches(prevMatches => [...prevMatches, addedMatch]);
        }

        alert('✅ Match ajouté avec succès !');
        return true;
        
      } catch (error) {
        console.error('💥 Erreur lors de l\'ajout du match:', error);
        handleSupabaseError(error, 'ajout match');
        return false;
      }
    },

    updateMatch: async (updatedMatch) => {
      try {
        if (supabaseMode) {
          const { error } = await supabase
            .from('matches')
            .update({
              date: updatedMatch.date,
              time: updatedMatch.time,
              opponent: updatedMatch.opponent,
              championship: updatedMatch.championship,
              championship_full: updatedMatch.championshipFull,
              team: updatedMatch.team,
              lieu: updatedMatch.lieu,
              status: updatedMatch.status,
              tenues: updatedMatch.tenues,
              arbitrage: updatedMatch.arbitrage,
              table_marque: updatedMatch.tableMarque,
              selected_players: updatedMatch.selectedPlayers,
              our_score: updatedMatch.ourScore,
              opponent_score: updatedMatch.opponentScore,
              comments: updatedMatch.comments
            })
            .eq('id', updatedMatch.id);

          if (error) throw error;
        }

        setMatches(matches.map(match => 
          match.id === updatedMatch.id ? updatedMatch : match
        ));

        alert('✅ Match modifié avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'modification match');
      }
    },

    updateMatchPlayers: async (matchId, selectedPlayers) => {
      try {
        const updatedMatch = {
          ...matches.find(m => m.id === matchId),
          selectedPlayers: selectedPlayers
        };

        if (supabaseMode) {
          const { error } = await supabase
            .from('matches')
            .update({
              selected_players: selectedPlayers
            })
            .eq('id', matchId);

          if (error) throw error;
          console.log(`✅ Joueurs sauvegardés pour match ${matchId}:`, selectedPlayers);
        }

        setMatches(matches.map(match => 
          match.id === matchId ? updatedMatch : match
        ));

        return true;
      } catch (error) {
        handleSupabaseError(error, 'sauvegarde joueurs match');
        return false;
      }
    },

    deleteMatch: async (matchId) => {
      if (!confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) return;

      try {
        if (supabaseMode) {
          const { error } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId);

          if (error) throw error;
        }

        setMatches(matches.filter(match => match.id !== matchId));
        alert('✅ Match supprimé avec succès !');
      } catch (error) {
        handleSupabaseError(error, 'suppression match');
      }
    },

    updateMatchScore: async (matchId, scoreData) => {
      try {
        const updatedMatch = {
          ...matches.find(m => m.id === matchId),
          ourScore: parseInt(scoreData.ourScore),
          opponentScore: parseInt(scoreData.opponentScore),
          comments: scoreData.comments,
          status: 'completed'
        };

        if (supabaseMode) {
          const { error } = await supabase
            .from('matches')
            .update({
              our_score: updatedMatch.ourScore,
              opponent_score: updatedMatch.opponentScore,
              comments: updatedMatch.comments,
              status: 'completed'
            })
            .eq('id', matchId);

          if (error) throw error;
        }

        setMatches(matches.map(match => 
          match.id === matchId ? updatedMatch : match
        ));

        alert('✅ Score et commentaires sauvegardés !');
      } catch (error) {
        handleSupabaseError(error, 'sauvegarde score');
      }
    }
  };

  return { 
    students, 
    matches, 
    trainings, 
    trainingAttendances, 
    playerRoles,
    newsLinks, // ✅ AJOUTÉ
    loading, 
    connectionStatus, 
    supabaseMode,
    studentOperations, 
    trainingOperations,
    matchOperations,
    roleOperations,
    newsOperations, // ✅ AJOUTÉ
    setPlayerRoles,
    setNewsLinks // ✅ AJOUTÉ
  };
};

// Composant principal
const BasketballApp = () => {
  const { 
    students, 
    matches, 
    trainings, 
    trainingAttendances, 
    playerRoles,
    newsLinks, // ✅ AJOUTÉ
    loading, 
    connectionStatus, 
    supabaseMode,
    studentOperations, 
    trainingOperations,
    matchOperations,
    roleOperations,
    newsOperations, // ✅ AJOUTÉ
    setPlayerRoles,
    setNewsLinks // ✅ AJOUTÉ
  } = useBasketballData();
  
  const [activeView, setActiveView] = useState('dashboard');
  const [userType, setUserType] = useState('player');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedChampionship, setSelectedChampionship] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  
  const [modalState, setModalState] = useState({ type: null, isOpen: false, data: null });
  const [selectedTrainingForAttendance, setSelectedTrainingForAttendance] = useState(null);
  
  // 🔥 NOUVEL ÉTAT pour gérer l'accès à la page présences
  const [attendanceAccessMode, setAttendanceAccessMode] = useState('direct'); // 'direct' ou 'readonly'
  
  const [newPlayer, setNewPlayer] = useState({
    firstName: '', lastName: '', birthDate: '', licenseNumber: '',
    position: 'Meneur', team: '2', isCaptain: false
  });
  const [editingPlayer, setEditingPlayer] = useState(null);

  useEffect(() => {
    if (activeView !== 'attendance') {
      setSelectedTrainingForAttendance(null);
      setAttendanceAccessMode('direct'); // Reset du mode d'accès
    }
  }, [activeView]);

  // 🔥 LOGIQUE DE REDIRECTION MODIFIÉE - Ne bloquer que l'accès direct des joueurs
  useEffect(() => {
    if (userType === 'player' && activeView === 'attendance' && attendanceAccessMode === 'direct') {
      // Seul l'accès direct est bloqué pour les joueurs
      setActiveView('dashboard');
    }
  }, [userType, activeView, attendanceAccessMode]);

  // 🔥 FONCTION MODIFIÉE pour permettre l'accès en lecture seule depuis les entraînements
  const setSelectedTrainingForAttendanceWithMode = (training) => {
    setSelectedTrainingForAttendance(training);
    setAttendanceAccessMode('readonly'); // Mode lecture seule depuis les entraînements
    setActiveView('attendance');
  };

  // Debug des données au changement
  useEffect(() => {
    console.log('🔍 Debug App - Matches actuels:', matches);
    console.log('🔍 Debug App - Students actuels:', students);
    console.log('🔍 Debug App - PlayerRoles actuels:', playerRoles);
    
    // Debug spécifique pour voir les selectedPlayers
    const matchesWithPlayers = matches.filter(m => m.selectedPlayers && m.selectedPlayers.length > 0);
    if (matchesWithPlayers.length > 0) {
      console.log('🔍 Matchs avec joueurs sélectionnés dans App:', matchesWithPlayers);
    }
  }, [matches, students, playerRoles]);

  const openModal = (type, data = null) => setModalState({ type, isOpen: true, data });
  const closeModal = () => setModalState({ type: null, isOpen: false, data: null });

  // 🔥 COMPOSANT NAVIGATION MODIFIÉ - Filtrage par type d'utilisateur
  const Navigation = () => {
    const allNavItems = [
      { id: 'dashboard', label: 'Tableau de bord', icon: Settings },
      { id: 'attendance', label: 'Présences', icon: UserCheck, coachOnly: true }, // ✅ RÉSERVÉ AUX COACHS
      { id: 'trainings', label: 'Entraînements', icon: Calendar },
      { id: 'matches', label: 'Matchs', icon: Trophy },
      { id: 'teams', label: 'Équipes', icon: Users },
      { id: 'players', label: 'Joueurs', icon: Users },
      { id: 'stats', label: 'Statistiques', icon: BarChart3 },
    ];

    // ✅ FILTRER LES ONGLETS SELON LE TYPE D'UTILISATEUR
    const navItems = allNavItems.filter(item => {
      if (item.coachOnly && userType !== 'coach') {
        return false; // Ne pas afficher l'onglet pour les joueurs
      }
      return true;
    });

    // 🔥 FONCTION MODIFIÉE pour l'onglet Présences avec mode direct
    const handleNavClick = (viewId) => {
      if (viewId === 'attendance') {
        setAttendanceAccessMode('direct'); // Accès direct par l'onglet
      }
      setActiveView(viewId);
    };

    return (
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors whitespace-nowrap ${
                    activeView === item.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                  }`}>
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ✅ Vue Dashboard COMPLÈTEMENT RÉÉCRITE avec actualités persistantes
  const Dashboard = () => {
    const nextTraining = trainings.filter(t => t.status === 'upcoming').sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    const nextMatch = matches.filter(m => m.status === 'upcoming').sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    
    
    
    // ✅ États pour la gestion des actualités - MAINTENANT PERSISTANTES
    const [editingNews, setEditingNews] = useState(false);
    const [tempNewsLinks, setTempNewsLinks] = useState([]);
    
    // ✅ Initialiser les liens temporaires quand on entre en mode édition
    useEffect(() => {
      if (editingNews) {
        setTempNewsLinks([...newsLinks]); // Copie des actualités existantes
      }
    }, [editingNews, newsLinks]);

    // ✅ LOGIQUE : Récupérer les vraies données du dernier entraînement
    const getLastTrainingAttendance = () => {
      const completedTrainings = trainings
        .filter(t => t.status === 'completed')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (completedTrainings.length === 0) {
        return {
          presentCount: 0, injuredCount: 0, absentCount: 0,
          stageCount: 0, excusedCount: 0, absentWarnedCount: 0,
          trainingDate: null, hasData: false
        };
      }

      for (const training of completedTrainings) {
        const attendance = trainingAttendances.find(ta => ta.trainingId === training.id);
        
        if (attendance && attendance.attendances && attendance.attendances.length > 0) {
          const counts = {
            present: 0, injured: 0, absent: 0,
            stage: 0, excused: 0, 'absent-warned': 0
          };

          // ✅ Filtrer pour ne compter que les joueurs actuels
attendance.attendances
.filter(att => students.find(s => s.id === att.studentId))
.forEach(att => {
  if (counts.hasOwnProperty(att.status)) {
    counts[att.status]++;
  }
});

          return {
            presentCount: counts.present,
            injuredCount: counts.injured,
            absentCount: counts.absent,
            stageCount: counts.stage,
            excusedCount: counts.excused,
            absentWarnedCount: counts['absent-warned'],
            trainingDate: training.date,
            trainingTheme: training.theme,
            hasData: true
          };
        }
      }

      return {
        presentCount: 0, injuredCount: 0, absentCount: 0,
        stageCount: 0, excusedCount: 0, absentWarnedCount: 0,
        trainingDate: null, hasData: false
      };
    };

    const lastTrainingData = getLastTrainingAttendance();

    // Calculer la présence moyenne depuis le début
    const calculateAverageAttendance = () => {
      if (trainingAttendances.length === 0) return 0;
      
      let totalPresent = 0;
      let totalStudents = 0;
      
      trainingAttendances.forEach(attendance => {
        // ✅ Filtrer pour ne compter que les joueurs actuels
        const validAttendances = attendance.attendances.filter(att => 
          students.find(s => s.id === att.studentId)
        );
        const presentInTraining = validAttendances.filter(att => att.status === 'present').length;
        totalPresent += presentInTraining;
        totalStudents += validAttendances.length;
      });
      
      return totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    };

    const averageAttendance = calculateAverageAttendance();

    // ✅ NOUVELLES FONCTIONS pour la gestion des actualités
    const updateTempNewsLink = (index, field, value) => {
      const updated = [...tempNewsLinks];
      updated[index][field] = value;
      setTempNewsLinks(updated);
    };

    const addTempNewsLink = () => {
      setTempNewsLinks([...tempNewsLinks, { title: '', url: '', type: 'web' }]);
    };

    const removeTempNewsLink = (index) => {
      setTempNewsLinks(tempNewsLinks.filter((_, i) => i !== index));
    };

    const saveNewsLinks = async () => {
      if (supabaseMode) {
        const success = await newsOperations.saveNewsLinks(tempNewsLinks);
        if (success) {
          setEditingNews(false);
          alert('✅ Actualités sauvegardées !');
        }
      } else {
        // Mode local - mise à jour directe
        setNewsLinks([...tempNewsLinks]);
        setEditingNews(false);
        alert('✅ Actualités sauvegardées localement !');
      }
    };

    const cancelEditNews = () => {
      setEditingNews(false);
      setTempNewsLinks([]);
    };

    return (
      <div className="space-y-6">
        {/* Grille principale 4 carrés */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1er carré - Planning de la semaine */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-slate-800"> Planning de la Semaine</h3>
            </div>
            
            <div className="space-y-3">
              {nextTraining && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">Entraînement</h4>
                    <p className="text-sm text-slate-600">
                      {new Date(nextTraining.date).toLocaleDateString('fr-FR')} à {nextTraining.time}
                    </p>
                    <p className="text-sm text-slate-500">{nextTraining.theme} - {nextTraining.lieu}</p>
                  </div>
                </div>
              )}
              
              {nextMatch && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-3 h-3 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">Match vs {nextMatch.opponent}</h4>
                    <p className="text-sm text-slate-600">
                      {new Date(nextMatch.date).toLocaleDateString('fr-FR')} à {nextMatch.time}
                    </p>
                    <p className="text-sm text-slate-500">{nextMatch.championship} - {nextMatch.lieu}</p>
                  </div>
                </div>
              )}
              
              {!nextTraining && !nextMatch && (
                <div className="text-center py-6 text-slate-500">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun événement planifié</p>
                </div>
              )}
            </div>
          </div>

          {/* 2ème carré - Aperçu des équipes */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-green-600" size={20} />
              <h3 className="text-lg font-semibold text-slate-800"> Aperçu des Équipes</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-800">Équipe 2 - LDV2</h4>
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                    {students.filter(s => s.team === '2').length} joueurs
                  </span>
                </div>
                <div className="text-sm text-green-700">
                  {students.filter(s => s.team === '2').length === 0 ? (
                    <span className="italic">Aucun joueur inscrit</span>
                  ) : (
                    <span>
                      Capitaine : {students.find(s => s.team === '2' && s.isCaptain)?.firstName || 'Non défini'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800">Équipe 3 - LDV3</h4>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                    {students.filter(s => s.team === '3').length} joueurs
                  </span>
                </div>
                <div className="text-sm text-blue-700">
                  {students.filter(s => s.team === '3').length === 0 ? (
                    <span className="italic">Aucun joueur inscrit</span>
                  ) : (
                    <span>
                      Capitaine : {students.find(s => s.team === '3' && s.isCaptain)?.firstName || 'Non défini'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3ème carré - Synthèse stats */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-purple-600" size={20} />
              <h3 className="text-lg font-semibold text-slate-800"> Synthèse Présences</h3>
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{averageAttendance}%</div>
                <div className="text-sm text-purple-800">Présence moyenne générale</div>
              </div>
              
              <div className="text-center mb-3">
                {lastTrainingData.hasData ? (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Dernier entraînement :</span><br />
                    {new Date(lastTrainingData.trainingDate).toLocaleDateString('fr-FR')}
                    {lastTrainingData.trainingTheme && (
                      <span className="text-slate-500"> • {lastTrainingData.trainingTheme}</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">
                    Aucun entraînement avec données
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-600">
                    <CheckCircle size={18} />
                    {lastTrainingData.presentCount}
                  </div>
                  <div className="text-xs text-green-800">Présents</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-purple-600">
                    <Heart size={18} />
                    {lastTrainingData.injuredCount}
                  </div>
                  <div className="text-xs text-purple-800">Blessés</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-red-600">
                    <XCircle size={18} />
                    {lastTrainingData.absentCount}
                  </div>
                  <div className="text-xs text-red-800">Absents</div>
                </div>
                <div className="text-center p-2 bg-teal-50 rounded">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-teal-600">
                    <Building size={18} />
                    {lastTrainingData.stageCount}
                  </div>
                  <div className="text-xs text-teal-800">En stage</div>
                </div>
              </div>

              {(lastTrainingData.absentWarnedCount > 0 || lastTrainingData.excusedCount > 0) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-600">
                      <Phone size={18} />
                      {lastTrainingData.absentWarnedCount}
                    </div>
                    <div className="text-xs text-orange-800">Abs. Prévenus</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-blue-600">
                      <ClipboardCheck size={18} />
                      {lastTrainingData.excusedCount}
                    </div>
                    <div className="text-xs text-blue-800">Excusés</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ 4ème carré - Actualités/Liens ENTIÈREMENT RECODÉ */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-orange-600" size={20} />
                <h3 className="text-lg font-semibold text-slate-800"> Actualités Championnat</h3>
              </div>
              {userType === 'coach' && (
                <button
                  onClick={() => setEditingNews(!editingNews)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  title={editingNews ? 'Annuler' : 'Modifier'}
                >
                  {editingNews ? <X size={16} /> : <Edit size={16} />}
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {editingNews && userType === 'coach' ? (
                // ✅ Mode édition avec données persistantes
                <div className="space-y-3">
                  {tempNewsLinks.map((link, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Titre"
                        value={link.title}
                        onChange={(e) => updateTempNewsLink(index, 'title', e.target.value)}
                        className="col-span-4 text-xs border border-slate-300 rounded px-2 py-1"
                      />
                      <input
                        type="url"
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) => updateTempNewsLink(index, 'url', e.target.value)}
                        className="col-span-6 text-xs border border-slate-300 rounded px-2 py-1"
                      />
                      <select
                        value={link.type}
                        onChange={(e) => updateTempNewsLink(index, 'type', e.target.value)}
                        className="col-span-1 text-xs border border-slate-300 rounded px-1 py-1"
                      >
                        <option value="web">🌐</option>
                        <option value="instagram">📷</option>
                      </select>
                      <button
                        onClick={() => removeTempNewsLink(index)}
                        className="col-span-1 text-red-600 hover:text-red-800"
                        title="Supprimer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={addTempNewsLink}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Ajouter
                    </button>
                    <button
                      onClick={saveNewsLinks}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Save size={14} />
                      Sauvegarder
                    </button>
                    <button
                      onClick={cancelEditNews}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                // ✅ Mode affichage avec données persistantes
                <div className="space-y-2">
                  {newsLinks && newsLinks.length > 0 ? (
                    newsLinks.map((link, index) => (
                      <a
                        key={link.id || index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
                      >
                        <span className="text-orange-600">
                          {link.type === 'instagram' ? '📷' : '🌐'}
                        </span>
                        <span className="text-sm text-slate-700 group-hover:text-orange-700 flex-1">
                          {link.title}
                        </span>
                        <span className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          ↗️
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      <Trophy size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {userType === 'coach' ? 'Cliquez sur ✏️ pour ajouter des liens' : 'Aucun lien configuré'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bandeau créateur en bas de page */}
        <div className="mt-8 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              {connectionStatus === 'online' ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Connecté à Supabase</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Mode local</span>
                </div>
              )}
            </div>
            <div className="text-slate-400">
              Créé par <span className="font-medium text-slate-600">Eude Florian</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vue Teams MODIFIÉE avec organisation par poste
  const Teams = () => {
    // Fonction pour calculer le nombre de matchs joués par un joueur
    const getPlayerMatchesCount = (playerId) => {
      if (!matches || !playerId) return 0;
      
      return matches.filter(match => 
        match.status === 'completed' && 
        match.selectedPlayers && 
        match.selectedPlayers.includes(playerId)
      ).length;
    };

    // Composant pour afficher le badge du nombre de matchs
    const MatchesBadge = ({ playerId }) => {
      const matchesCount = getPlayerMatchesCount(playerId);
      return (
        <div 
          className="w-8 h-6 rounded bg-slate-600 flex items-center justify-center text-white font-bold text-xs"
          title={`${matchesCount} match${matchesCount > 1 ? 's' : ''} joué${matchesCount > 1 ? 's' : ''}`}
        >
          {matchesCount}
        </div>
      );
    };

    // Fonction pour regrouper les joueurs par poste
    const getPlayersByPosition = (teamPlayers) => {
      const playersByPosition = {};
      
      POSITIONS.forEach(position => {
        playersByPosition[position] = teamPlayers.filter(player => player.position === position);
      });
      
      return playersByPosition;
    };

    // Composant pour afficher une section de poste
    const PositionSection = ({ position, players, teamColor }) => {
      if (players.length === 0) return null;

      const positionIcons = {
        'Meneur': '',
        'Arrière': '',
        'Ailier': '',
        'Ailier fort': '',
        'Pivot': ''
      };

      return (
        <div className={`bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-slate-200 mt-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{positionIcons[position]}</span>
            <h4 className="font-medium text-slate-700">
              {position} ({players.length} joueur{players.length > 1 ? 's' : ''})
            </h4>
          </div>
          
          <div className="space-y-2">
            {players.map(player => (
              <div key={player.id} className="flex justify-between items-center p-3 bg-white rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                    {player.firstName[0]}{player.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{player.firstName} {player.lastName}</span>
                      {player.isCaptain && <span className="text-yellow-600" title="Capitaine">🏀</span>}
                    </div>
                    <div className="text-sm text-slate-600">Licence: {player.licenseNumber}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MatchesBadge playerId={player.id} />
                  
                  {userType === 'coach' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingPlayer(player)}
                        className="text-blue-600 hover:text-blue-800 p-1" title="Modifier">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => studentOperations.deleteStudent(player.id)}
                        className="text-red-600 hover:text-red-800 p-1" title="Supprimer">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const renderTeamSection = (teamNumber, bgColor, borderColor) => {
      const teamPlayers = students.filter(s => s.team === teamNumber);
      const playersByPosition = getPlayersByPosition(teamPlayers);
      
      return (
        <div className={`bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border-2 ${borderColor}`}>
          {/* En-tête de l'équipe */}
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold text-white px-4 py-2 rounded ${bgColor}`}>
              Équipe {teamNumber} - LDV{teamNumber} ({teamPlayers.length} joueur{teamPlayers.length > 1 ? 's' : ''})
            </h3>
          </div>

          {/* Informations générales */}
          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">Capitaine :</span> {' '}
              {teamPlayers.find(p => p.isCaptain)?.firstName || 'Non défini'} {' '}
              {teamPlayers.find(p => p.isCaptain)?.lastName || ''}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              <span className="font-medium">Matchs joués par l'équipe :</span> {' '}
              {matches.filter(match => match.team === teamNumber && match.status === 'completed').length}
            </div>
          </div>
          
          {/* Sections par poste */}
          {teamPlayers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucun joueur dans cette équipe</p>
              {userType === 'coach' && (
                <button onClick={() => openModal('addStudent')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                  Ajouter le premier joueur
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {POSITIONS.map(position => (
                <PositionSection 
                  key={position}
                  position={position}
                  players={playersByPosition[position]}
                  teamColor={bgColor}
                />
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-slate-800">Gestion des équipes</h2>
          {userType === 'coach' && (
            <button onClick={() => openModal('addStudent')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors">
              <Plus size={16} />
              Ajouter un joueur
            </button>
          )}
        </div>

        {/* Légende */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-600" size={16} />
            <h3 className="font-medium text-blue-800">Légende</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-slate-600 flex items-center justify-center text-white font-bold text-xs">5</div>
              <span>Nombre de matchs joués par le joueur</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">🏀</span>
              <span>Capitaine d'équipe</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderTeamSection('2', 'bg-green-600', 'border-green-300')}
          {renderTeamSection('3', 'bg-blue-600', 'border-blue-300')}
        </div>
      </div>
    );
  };

  // Modale joueur
  const StudentModal = ({ isOpen, mode, student = null }) => {
    const [formData, setFormData] = useState(newPlayer);

    React.useEffect(() => {
      if (mode === 'edit' && student) {
        setFormData(student);
      } else {
        setFormData(newPlayer);
      }
    }, [mode, student, isOpen]);

    const handleSubmit = () => {
      if (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.licenseNumber) {
        alert('⚠️ Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (mode === 'edit') {
        studentOperations.updateStudent(formData);
        setEditingPlayer(null);
      } else {
        studentOperations.addStudent(formData);
        setNewPlayer({
          firstName: '', lastName: '', birthDate: '', licenseNumber: '',
          position: 'Meneur', team: '2', isCaptain: false
        });
      }
      closeModal();
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">
            {mode === 'add' ? 'Ajouter un nouveau joueur' : 'Modifier le joueur'}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Prénom" value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="border border-slate-300 rounded px-3 py-2" />
              <input type="text" placeholder="Nom" value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="border border-slate-300 rounded px-3 py-2" />
            </div>
            
            <input type="date" value={formData.birthDate}
              onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
              className="w-full border border-slate-300 rounded px-3 py-2" />
            
            <input type="text" placeholder="Numéro de licence" value={formData.licenseNumber}
              onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
              className="w-full border border-slate-300 rounded px-3 py-2" />
            
            <div className="grid grid-cols-2 gap-4">
              <select value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                className="border border-slate-300 rounded px-3 py-2">
                {POSITIONS.map(pos => (<option key={pos} value={pos}>{pos}</option>))}
              </select>
              <select value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                className="border border-slate-300 rounded px-3 py-2">
                <option value="2">Équipe 2</option>
                <option value="3">Équipe 3</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isCaptain}
                onChange={(e) => setFormData({...formData, isCaptain: e.target.checked})} />
              <span className="text-sm">Capitaine</span>
            </label>
            
            <div className="flex gap-2">
              <button onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex-1">
                {mode === 'add' ? 'Ajouter le joueur' : 'Sauvegarder'}
              </button>
              <button onClick={closeModal}
                className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (activeView) {
      case 'dashboard': 
        return <Dashboard />;
      case 'attendance': 
        return <Attendance 
          students={students}
          trainings={trainings}
          trainingAttendances={trainingAttendances}
          selectedTeam={selectedTeam}
          userType={userType}
          studentOperations={studentOperations}
          trainingOperations={trainingOperations}
          onViewChange={setActiveView}
          selectedTraining={selectedTrainingForAttendance}
          isReadOnly={attendanceAccessMode === 'readonly'} // 🔥 NOUVELLE PROP
        />;
      case 'teams': 
        return <Teams />;
      case 'trainings': 
        return <TrainingsView 
          students={students} 
          trainings={trainings} 
          trainingAttendances={trainingAttendances}
          userType={userType}
          trainingOperations={trainingOperations}
          onViewChange={setActiveView}
          setActiveView={setActiveView}
          setSelectedTrainingForAttendance={setSelectedTrainingForAttendanceWithMode} // 🔥 FONCTION MODIFIÉE
        />;
      case 'matches': 
        return <MatchesView 
          matches={matches} 
          students={students}
          userType={userType}
          selectedChampionship={selectedChampionship}
          selectedTeam={selectedTeam}
          selectedDate={selectedDate}
          matchOperations={matchOperations}
        />;
      case 'players': 
        return <Players 
          students={students}
          matches={matches}
          trainingAttendances={trainingAttendances}
          selectedTeam={selectedTeam}
          userType={userType}
          studentOperations={studentOperations}
          roleOperations={roleOperations} // ✅ PASSER LES OPÉRATIONS DE RÔLES
          playerRoles={playerRoles} // ✅ PASSER LES RÔLES
          setPlayerRoles={setPlayerRoles} // ✅ PASSER LE SETTER DE RÔLES
          onModalOpen={openModal}
        />;
      case 'stats': 
        return <Stats 
          students={students}
          matches={matches}
          trainings={trainings}
          trainingAttendances={trainingAttendances}
          userType={userType}
          selectedTeam={selectedTeam}
          playerRoles={playerRoles}
        />;
      default: 
        return <Dashboard />;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <ProtectedHeader 
        userType={userType}
        onUserTypeChange={setUserType}
        connectionStatus={connectionStatus}
      />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </div>

      {/* Modales */}
      <StudentModal 
        isOpen={modalState.type === 'addStudent'} 
        mode="add" 
      />
      <StudentModal 
        isOpen={!!editingPlayer} 
        mode="edit" 
        student={editingPlayer} 
      />
    </div>
  );
};

export default BasketballApp;