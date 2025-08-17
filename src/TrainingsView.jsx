import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, Edit, X, Plus, BarChart3, Save, Trash2, Clock, MapPin, Users, Target, CheckCircle, Play } from 'lucide-react';

const TrainingsView = ({ 
  students = [], 
  trainings = [], 
  trainingAttendances = [], 
  userType = 'player',
  trainingOperations, // ⚠️ AJOUT : Recevoir trainingOperations en props
  onViewChange,
  // ← NOUVELLES PROPS pour la redirection vers Présences
  setActiveView,
  setSelectedTrainingForAttendance
}) => {
  // États pour les modales
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showEditTraining, setShowEditTraining] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [selectedTraining, setSelectedTraining] = useState(null);
  
  // États pour le formulaire
  const [newTraining, setNewTraining] = useState({
    date: '',
    time: '',
    type: 'entrainement',
    theme: '',
    lieu: 'Gymnase LDV',
    team: 'all',
    status: 'upcoming',
    description: ''
  });

  // ✅ UTILISER trainingOperations au lieu des fonctions locales
  const addTraining = async () => {
    if (!newTraining.date || !newTraining.time || !newTraining.theme) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    // ⚠️ IMPORTANT : Utiliser trainingOperations.addTraining qui sauvegarde en Supabase
    if (trainingOperations?.addTraining) {
      await trainingOperations.addTraining(newTraining);
      
      // Réinitialiser le formulaire
      setNewTraining({
        date: '',
        time: '',
        type: 'entrainement',
        theme: '',
        lieu: 'Gymnase LDV',
        team: 'all',
        status: 'upcoming',
        description: ''
      });
      
      setShowAddTraining(false);
    } else {
      alert('❌ Erreur : Opérations d\'entraînement non disponibles');
    }
  };

  const updateTraining = async (updatedTraining) => {
    if (!updatedTraining.date || !updatedTraining.time || !updatedTraining.theme) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires');
      return;
    }

    // ⚠️ IMPORTANT : Utiliser trainingOperations.updateTraining
    if (trainingOperations?.updateTraining) {
      await trainingOperations.updateTraining(updatedTraining);
      setEditingTraining(null);
      setShowEditTraining(false);
    } else {
      alert('❌ Erreur : Opérations d\'entraînement non disponibles');
    }
  };

  const deleteTraining = async (trainingId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entraînement ?')) return;

    // ⚠️ IMPORTANT : Utiliser trainingOperations.deleteTraining
    if (trainingOperations?.deleteTraining) {
      await trainingOperations.deleteTraining(trainingId);
    } else {
      alert('❌ Erreur : Opérations d\'entraînement non disponibles');
    }
  };

  const handleAttendanceClick = (training) => {
    setSelectedTraining(training);
    if (onViewChange) {
      onViewChange('attendance');
    }
  };

  // ← NOUVELLE FONCTION pour rediriger vers la page Présences (remplace showAttendanceDetails)
  const handleViewAttendance = (training) => {
    // Rediriger vers la page Présences avec l'entraînement sélectionné
    if (setSelectedTrainingForAttendance && setActiveView) {
      setSelectedTrainingForAttendance(training);
      setActiveView('attendance');
    } else {
      // Fallback vers l'ancienne méthode si les props ne sont pas disponibles
      showAttendanceDetails(training);
    }
  };

  // ← ANCIENNE FONCTION conservée comme fallback
  const showAttendanceDetails = (training) => {
    const attendance = trainingAttendances.find(ta => ta.trainingId === training.id);
    if (!attendance) return;
    
    const attendanceStatuses = [
      { key: 'present', label: 'Présent' },
      { key: 'absent', label: 'Absent' },
      { key: 'absent-warned', label: 'Absent Prévenu WhatsApp' },
      { key: 'injured', label: 'Blessé' },
      { key: 'excused', label: 'Excusé' },
      { key: 'stage', label: 'En Stage' }
    ];
    
    const attendanceDetails = (attendance.attendances || []).map(a => {
      const student = students.find(s => s.id === a.studentId);
      const statusInfo = attendanceStatuses.find(st => st.key === a.status);
      return `${student?.firstName || ''} ${student?.lastName || ''}: ${statusInfo?.label || 'Inconnu'}`;
    }).join('\n');
    
    alert(`Présences du ${new Date(training.date).toLocaleDateString('fr-FR')}:\n\n${attendanceDetails}`);
  };

  // ← NOUVELLE FONCTION pour supprimer un entraînement archivé
  const deleteArchivedTraining = async (trainingId) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet entraînement et toutes ses données de présence ?')) return;
    
    if (trainingOperations?.deleteTraining) {
      await trainingOperations.deleteTraining(trainingId);
    } else {
      alert('❌ Erreur : Opérations d\'entraînement non disponibles');
    }
  };

  // ← NOUVELLE FONCTION pour éditer un entraînement archivé (présences)
  const editArchivedTrainingAttendance = (training) => {
    // Rediriger vers la page Présences pour éditer les présences
    if (setSelectedTrainingForAttendance && setActiveView) {
      setSelectedTrainingForAttendance(training);
      setActiveView('attendance');
    } else {
      alert('⚠️ Fonctionnalité d\'édition non disponible');
    }
  };

  // ✅ UTILISER directement les props trainings au lieu de localTrainings
  const upcomingTrainings = trainings.filter(t => t && t.status === 'upcoming');
  const pastTrainings = trainings.filter(t => t && t.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date));

  // Composant carte d'entraînement compact
  const TrainingCard = ({ training, isUpcoming = true }) => {
    const trainingDate = new Date(training.date);
    const attendance = trainingAttendances.find(ta => ta.trainingId === training.id);
    
    // Calculer les statistiques de présence
    const presentCount = attendance ? 
  attendance.attendances.filter(att => 
    att.status === 'present' && students.find(s => s.id === att.studentId)
  ).length : 0;
const totalCount = attendance ? 
  attendance.attendances.filter(att => students.find(s => s.id === att.studentId)).length : 
  students.length;

    const handleStartAttendance = () => {
      if (setSelectedTrainingForAttendance && setActiveView) {
        setSelectedTrainingForAttendance(training);
        setActiveView('attendance');
      } else {
        handleAttendanceClick(training);
      }
    };

    return (
      <div className={`bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 transition-all hover:shadow-md ${
        training.team === '2' ? 'border-l-4 border-l-green-500' : 
        training.team === '3' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-purple-500'
      }`}>
        {/* En-tête de l'entraînement */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              training.team === '2' ? 'bg-green-600' : 
              training.team === '3' ? 'bg-blue-600' : 'bg-purple-600'
            }`}>
              {training.team === 'all' ? 'T' : training.team}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{training.theme}</h3>
              <p className="text-xs text-slate-600 capitalize">{training.type === 'entrainement' ? 'Entraînement' : training.type}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!isUpcoming && (
              <div className={`w-2 h-2 rounded-full ${training.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            )}
            
            {userType === 'coach' && (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingTraining(training);
                    setShowEditTraining(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Modifier"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => deleteTraining(training.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Informations de l'entraînement */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={12} />
            <span>{trainingDate.toLocaleDateString('fr-FR')}</span>
            <Clock size={12} className="ml-2" />
            <span>{training.time}</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin size={12} />
            <span>{training.lieu}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Target size={12} />
            <span>Équipe {training.team === 'all' ? 'complète' : training.team}</span>
          </div>
        </div>

        {/* Description */}
        {training.description && (
          <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600">
            {training.description}
          </div>
        )}

        {/* Statistiques de présence pour les entraînements terminés */}
        {!isUpcoming && attendance && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <Users size={12} className="text-slate-500" />
                <span className="text-slate-600">Présence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${
                  presentCount / totalCount >= 0.8 ? 'text-green-600' : 
                  presentCount / totalCount >= 0.6 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {presentCount}/{totalCount}
                </span>
                <span className="text-slate-500">
                  ({Math.round((presentCount / totalCount) * 100)}%)
                </span>
              </div>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  presentCount / totalCount >= 0.8 ? 'bg-green-500' : 
                  presentCount / totalCount >= 0.6 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${(presentCount / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Actions pour les entraînements à venir */}
        {isUpcoming && userType === 'coach' && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              onClick={handleStartAttendance}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <UserCheck size={14} />
              Faire l'appel
            </button>
          </div>
        )}

        {/* Actions pour les entraînements terminés */}
        {!isUpcoming && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {attendance && (
              <button
                onClick={() => handleViewAttendance(training)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <UserCheck size={14} />
                Voir les présences
              </button>
            )}
            
            {userType === 'coach' && (
              <div className="flex gap-2">
                <button
                  onClick={() => editArchivedTrainingAttendance(training)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm flex items-center justify-center gap-1"
                >
                  <Edit size={12} />
                  Modifier présences
                </button>
                <button
                  onClick={() => deleteArchivedTraining(training.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Modal Component
  const TrainingModal = ({ isOpen, mode, training = null }) => {
    const [formData, setFormData] = useState(newTraining);

    useEffect(() => {
      if (mode === 'edit' && training) {
        setFormData(training);
      } else {
        setFormData({
          date: '',
          time: '',
          type: 'entrainement',
          theme: '',
          lieu: 'Gymnase LDV',
          team: 'all',
          status: 'upcoming',
          description: ''
        });
      }
    }, [mode, training, isOpen]);

    const handleSubmit = async () => {
      if (!formData.date || !formData.time || !formData.theme) {
        alert('⚠️ Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (mode === 'edit') {
        await updateTraining(formData);
      } else {
        // ⚠️ IMPORTANT : Utiliser trainingOperations.addTraining
        if (trainingOperations?.addTraining) {
          await trainingOperations.addTraining(formData);
          setShowAddTraining(false);
        }
      }
    };

    const closeModal = () => {
      if (mode === 'edit') {
        setShowEditTraining(false);
        setEditingTraining(null);
      } else {
        setShowAddTraining(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {mode === 'add' ? 'Planifier un nouvel entraînement' : 'Modifier l\'entraînement'}
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Thème de l'entraînement *"
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
                className="w-full border border-slate-300 rounded px-3 py-2"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="border border-slate-300 rounded px-3 py-2"
                  required
                />
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="border border-slate-300 rounded px-3 py-2"
                  required
                />
              </div>
              
              <input
                type="text"
                placeholder="Lieu"
                value={formData.lieu}
                onChange={(e) => setFormData({...formData, lieu: e.target.value})}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
              
              <select
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                className="w-full border border-slate-300 rounded px-3 py-2"
              >
                <option value="all">Toutes les équipes</option>
                <option value="2">Équipe 2 uniquement</option>
                <option value="3">Équipe 3 uniquement</option>
              </select>
              
              <textarea
                placeholder="Description (optionnel)"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full border border-slate-300 rounded px-3 py-2 h-20"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex-1"
                >
                  {mode === 'add' ? 'Planifier l\'entraînement' : 'Sauvegarder'}
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
            <Calendar className="text-blue-600" size={28} />
            Gestion des entraînements
          </h2>
          
          {userType === 'coach' && (
            <button
              onClick={() => setShowAddTraining(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Nouvel entraînement
            </button>
          )}
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{upcomingTrainings.length}</div>
            <div className="text-sm text-blue-700">Entraînements à venir</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{pastTrainings.length}</div>
            <div className="text-sm text-green-700">Entraînements terminés</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {pastTrainings.length > 0 ? 
                Math.round(trainingAttendances.reduce((acc, attendance) => {
                  // ✅ Filtrer seulement les joueurs qui existent encore
                  const presentCount = attendance.attendances.filter(att => 
                    att.status === 'present' && students.find(s => s.id === att.studentId)
                  ).length;
                  
                  const totalCount = attendance.attendances.filter(att => 
                    students.find(s => s.id === att.studentId)
                  ).length;
                  
                  // ✅ Éviter division par zéro si aucun joueur valide
                  return acc + (totalCount > 0 ? (presentCount / totalCount) * 100 : 0);
                }, 0) / trainingAttendances.length) : 0
              }%
            </div>
            <div className="text-sm text-purple-700">Présence moyenne</div>
          </div>
        </div>
      </div>

      {/* Prochains entraînements */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            Prochains entraînements ({upcomingTrainings.length})
          </h3>
        </div>
        
        <div className="p-4">
          {upcomingTrainings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="mx-auto mb-4 opacity-50" size={48} />
              <p>Aucun entraînement programmé</p>
              {userType === 'coach' && (
                <button
                  onClick={() => setShowAddTraining(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Programmer le premier entraînement
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingTrainings.map(training => (
                <TrainingCard key={training.id} training={training} isUpcoming={true} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historique des entraînements */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            Historique des entraînements ({pastTrainings.length})
          </h3>
        </div>
        
        <div className="p-4">
          {pastTrainings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="mx-auto mb-4 opacity-50" size={48} />
              <p>Aucun entraînement terminé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastTrainings.map(training => (
                <TrainingCard key={training.id} training={training} isUpcoming={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <TrainingModal
        isOpen={showAddTraining}
        mode="add"
      />
      <TrainingModal
        isOpen={showEditTraining}
        mode="edit"
        training={editingTraining}
      />
    </div>
  );
};

export default TrainingsView;