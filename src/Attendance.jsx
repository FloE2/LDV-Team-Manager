import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Clock, Users, CheckCircle, AlertCircle, Archive, Edit, Trash2, Eye, BarChart3, MapPin, FileText, ArrowLeft } from 'lucide-react';

const ATTENDANCE_STATUSES = [
  { key: 'present', label: 'Présent', color: 'bg-green-600', textColor: 'text-green-600', bgLight: 'bg-green-50', borderLight: 'border-green-200', code: 'P' },
  { key: 'absent', label: 'Absent', color: 'bg-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50', borderLight: 'border-red-200', code: 'A' },
  { key: 'absent-warned', label: 'Absent Prévenu WhatsApp', color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-50', borderLight: 'border-orange-200', code: 'AP' },
  { key: 'injured', label: 'Blessé', color: 'bg-purple-600', textColor: 'text-purple-600', bgLight: 'bg-purple-50', borderLight: 'border-purple-200', code: 'B' },
  { key: 'excused', label: 'Excusé', color: 'bg-blue-600', textColor: 'text-blue-600', bgLight: 'bg-blue-50', borderLight: 'border-blue-200', code: 'E' },
  { key: 'stage', label: 'En Stage', color: 'bg-teal-600', textColor: 'text-teal-600', bgLight: 'bg-teal-50', borderLight: 'border-teal-200', code: 'S' },
];

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

const Attendance = ({ 
  students, 
  trainings, 
  trainingAttendances, 
  selectedTeam, 
  userType, 
  studentOperations, 
  trainingOperations, 
  onViewChange,
  selectedTraining = null,
  isReadOnly = false // 🔥 NOUVELLE PROP pour le mode lecture seule
}) => {
  // 🔥 LOGIQUE MODIFIÉE : Forcer la section historique si en mode lecture seule
  const [activeSection, setActiveSection] = useState(isReadOnly ? 'history' : 'upcoming');
  const [selectedTrainingForCall, setSelectedTrainingForCall] = useState(null);
  const [currentAttendances, setCurrentAttendances] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isQuickCallMode, setIsQuickCallMode] = useState(false);
  
  // États pour l'édition des entraînements archivés
  const [editingArchivedTraining, setEditingArchivedTraining] = useState(null);
  const [archivedAttendances, setArchivedAttendances] = useState({});
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' ou 'list'

  // Séparer les entraînements à venir et terminés
  const upcomingTrainings = trainings.filter(t => t.status !== 'completed');
  const completedTrainings = trainings.filter(t => t.status === 'completed');

  // Filtrer les étudiants selon l'équipe sélectionnée
  const filteredStudents = selectedTeam === 'all' 
    ? students 
    : students.filter(s => s.team === selectedTeam);

  // 🔥 EFFET MODIFIÉ : Forcer la section historique si mode lecture seule
  useEffect(() => {
    if (isReadOnly) {
      setActiveSection('history');
    }
  }, [isReadOnly]);

  // Effet pour gérer la navigation depuis TrainingsView
  useEffect(() => {
    if (selectedTraining) {
      if (selectedTraining.status === 'completed') {
        setActiveSection('history');
        // 🔥 Ne pas éditer automatiquement si en mode lecture seule
        if (!isReadOnly) {
          editArchivedTrainingAttendance(selectedTraining);
        }
      } else {
        setActiveSection('upcoming');
        selectTrainingForAttendance(selectedTraining);
      }
    }
  }, [selectedTraining, isReadOnly]);

  // Fonction pour calculer les statistiques des présences
  const calculateAttendanceStats = (attendances) => {
    const stats = {};
    ATTENDANCE_STATUSES.forEach(status => {
      stats[status.key] = Object.values(attendances).filter(att => att === status.key).length;
    });
    stats.total = Object.keys(attendances).length;
    stats.notSet = filteredStudents.length - stats.total;
    return stats;
  };

  // Fonction pour grouper les étudiants par statut
  const groupStudentsByStatus = (attendances) => {
    const groups = {};
    ATTENDANCE_STATUSES.forEach(status => {
      groups[status.key] = [];
    });
    groups.notSet = [];

    filteredStudents.forEach(student => {
      const status = attendances[student.id];
      if (status) {
        groups[status].push(student);
      } else {
        groups.notSet.push(student);
      }
    });

    return groups;
  };

  const deleteArchivedTraining = async (trainingId) => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet entraînement et toutes ses données de présence ?')) return;
    
    try {
      if (trainingOperations.deleteTraining) {
        await trainingOperations.deleteTraining(trainingId);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  const editArchivedTrainingAttendance = (training) => {
    setEditingArchivedTraining(training);
    
    const existingAttendance = trainingAttendances.find(ta => ta.trainingId === training.id);
    if (existingAttendance) {
      const attendanceMap = {};
      // ✅ Filtrer pour ne garder que les joueurs actuels
      existingAttendance.attendances
        .filter(att => students.find(s => s.id === att.studentId))
        .forEach(att => {
          attendanceMap[att.studentId] = att.status;
        });
      setArchivedAttendances(attendanceMap);
    } else {
      setArchivedAttendances({});
    }
  };

  const saveArchivedTrainingAttendance = async () => {
    if (!editingArchivedTraining) return;

    try {
      const attendancesData = Object.entries(archivedAttendances).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status: status
      }));

      if (trainingOperations.saveTrainingAttendance) {
        await trainingOperations.saveTrainingAttendance(editingArchivedTraining.id, attendancesData);
      }
      
      setEditingArchivedTraining(null);
      setArchivedAttendances({});
      alert('✅ Présences modifiées avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  const cancelArchivedTrainingEdit = () => {
    setEditingArchivedTraining(null);
    setArchivedAttendances({});
  };

  const updateArchivedAttendance = (studentId, status) => {
    setArchivedAttendances(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const initializeAttendances = (trainingId) => {
    const existingAttendance = trainingAttendances.find(ta => ta.trainingId === trainingId);
    
    if (existingAttendance) {
      const attendanceMap = {};
      // ✅ Filtrer pour ne garder que les joueurs actuels
      existingAttendance.attendances
        .filter(att => students.find(s => s.id === att.studentId))
        .forEach(att => {
          attendanceMap[att.studentId] = att.status;
        });
      return attendanceMap;
    } else {
      return {};
    }
  };

  const selectTrainingForAttendance = (training) => {
    setSelectedTrainingForCall(training);
    setCurrentAttendances(initializeAttendances(training.id));
    setCurrentStudentIndex(0);
    setIsQuickCallMode(false);
  };

  const startQuickCall = () => {
    setIsQuickCallMode(true);
    setCurrentStudentIndex(0);
  };

  const updateAttendanceStatus = (studentId, status) => {
    setCurrentAttendances(prev => ({
      ...prev,
      [studentId]: status
    }));

    if (isQuickCallMode) {
      const nextIndex = currentStudentIndex + 1;
      if (nextIndex < filteredStudents.length) {
        setCurrentStudentIndex(nextIndex);
      } else {
        setIsQuickCallMode(false);
        alert('🎉 Appel terminé ! Vous pouvez maintenant valider.');
      }
    }
  };

  const goToPreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    }
  };

  const goToNextStudent = () => {
    if (currentStudentIndex < filteredStudents.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const validateAttendanceCall = async () => {
    if (!selectedTrainingForCall) return;

    setIsValidating(true);
    
    try {
      const attendancesData = Object.entries(currentAttendances).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status: status
      }));

      const checkedStudentIds = Object.keys(currentAttendances).map(id => parseInt(id));
      const uncheckedStudents = filteredStudents
        .filter(student => !checkedStudentIds.includes(student.id))
        .map(student => ({
          studentId: student.id,
          status: 'absent'
        }));

      const finalAttendances = [...attendancesData, ...uncheckedStudents];

      await trainingOperations.saveTrainingAttendance(selectedTrainingForCall.id, finalAttendances);
      
      setSelectedTrainingForCall(null);
      setCurrentAttendances({});
      
      alert('✅ Appel validé ! L\'entraînement est maintenant archivé.');
      
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      alert('❌ Erreur lors de la validation de l\'appel');
    }
    
    setIsValidating(false);
  };

  const getAttendanceStats = (trainingId) => {
    const attendance = trainingAttendances.find(ta => ta.trainingId === trainingId);
    if (!attendance) return { present: 0, total: 0 };

    const validAttendances = attendance.attendances.filter(att => 
      students.find(s => s.id === att.studentId)
    );
    const present = validAttendances.filter(att => att.status === 'present').length;
    const total = validAttendances.length;
    
    return { present, total };
  };

  // Composant pour l'affichage des statistiques
  const AttendanceStatsDisplay = ({ attendances }) => {
    const stats = calculateAttendanceStats(attendances);
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="text-slate-700" size={16} />
          <h6 className="text-sm font-semibold text-slate-700">Résumé des présences</h6>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {ATTENDANCE_STATUSES.map(status => (
            <div key={status.key} className={`${status.bgLight} ${status.borderLight} border rounded-lg p-3 text-center`}>
              <div className="flex items-center justify-center mb-2">
                <StatusBadge status={status.key} size="small" />
              </div>
              <div className="text-lg font-bold text-slate-800">{stats[status.key]}</div>
              <div className="text-xs text-slate-600">{status.code}</div>
            </div>
          ))}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="w-4 h-4 bg-slate-400 rounded flex items-center justify-center text-white font-bold text-xs mx-auto mb-2">
              ?
            </div>
            <div className="text-lg font-bold text-slate-800">{stats.notSet}</div>
            <div className="text-xs text-slate-600">Non défini</div>
          </div>
        </div>
      </div>
    );
  };

  // Composant pour l'affichage groupé par statut
  const GroupedAttendanceDisplay = ({ attendances, onUpdateAttendance }) => {
    const groups = groupStudentsByStatus(attendances);
    
    return (
      <div className="space-y-4">
        {ATTENDANCE_STATUSES.map(status => {
          const studentsInGroup = groups[status.key];
          if (studentsInGroup.length === 0) return null;
          
          return (
            <div key={status.key} className={`${status.bgLight} ${status.borderLight} border-l-4 rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={status.key} />
                <h6 className="font-semibold text-slate-800">{status.label}</h6>
                <span className="bg-white px-2 py-1 rounded text-sm font-bold text-slate-600">
                  {studentsInGroup.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {studentsInGroup.map(student => (
                  <div key={student.id} className="bg-white rounded p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">
                          {student.firstName} {student.lastName}
                        </span>
                        <div className="text-xs text-slate-500">Équipe {student.team}</div>
                      </div>
                    </div>
                    {/* 🔥 AFFICHER LES BOUTONS SEULEMENT SI ON N'EST PAS EN MODE LECTURE SEULE */}
                    {!isReadOnly && onUpdateAttendance && (
                      <div className="flex items-center gap-1">
                        {ATTENDANCE_STATUSES.map(statusOption => (
                          <button
                            key={statusOption.key}
                            onClick={() => onUpdateAttendance(student.id, statusOption.key)}
                            className={`w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs transition-all hover:scale-110 ${
                              attendances[student.id] === statusOption.key 
                                ? statusOption.color + ' shadow-lg scale-110' 
                                : 'bg-slate-300 hover:bg-slate-400'
                            }`}
                            title={statusOption.label}
                          >
                            {statusOption.code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Étudiants sans statut défini */}
        {groups.notSet.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-slate-400 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-slate-400 rounded flex items-center justify-center text-white font-bold text-sm">
                ?
              </div>
              <h6 className="font-semibold text-slate-800">Non défini</h6>
              <span className="bg-white px-2 py-1 rounded text-sm font-bold text-slate-600">
                {groups.notSet.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {groups.notSet.map(student => (
                <div key={student.id} className="bg-white rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800">
                        {student.firstName} {student.lastName}
                      </span>
                      <div className="text-xs text-slate-500">Équipe {student.team}</div>
                    </div>
                  </div>
                  {/* 🔥 AFFICHER LES BOUTONS SEULEMENT SI ON N'EST PAS EN MODE LECTURE SEULE */}
                  {!isReadOnly && onUpdateAttendance && (
                    <div className="flex items-center gap-1">
                      {ATTENDANCE_STATUSES.map(statusOption => (
                        <button
                          key={statusOption.key}
                          onClick={() => onUpdateAttendance(student.id, statusOption.key)}
                          className={`w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs transition-all hover:scale-110 bg-slate-300 hover:bg-slate-400`}
                          title={statusOption.label}
                        >
                          {statusOption.code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const UpcomingTrainingsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-blue-600" size={20} />
        <h3 className="text-lg font-semibold text-slate-800">Entraînements à venir</h3>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          {upcomingTrainings.length}
        </span>
      </div>

      {upcomingTrainings.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucun entraînement planifié</p>
          {userType === 'coach' && (
            <button 
              onClick={() => onViewChange('trainings')}
              className="mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              Planifier un entraînement
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingTrainings.map(training => (
            <div key={training.id} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{training.theme}</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{new Date(training.date).toLocaleDateString('fr-FR')} à {training.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{training.lieu}</span>
                    </div>
                    {training.description && (
                      <div className="flex items-center gap-1">
                        <FileText size={14} />
                        <span className="truncate">{training.description}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {userType === 'coach' && (
                  <button
                    onClick={() => selectTrainingForAttendance(training)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center gap-2 transition-colors ml-2 flex-shrink-0"
                  >
                    <Users size={14} />
                    <span className="hidden sm:inline">Faire l'appel</span>
                    <span className="sm:hidden">Appel</span>
                  </button>
                )}
              </div>
              
              {selectedTrainingForCall?.id === training.id && (
                <AttendanceForm 
                  training={training}
                  students={filteredStudents}
                  currentAttendances={currentAttendances}
                  onUpdateAttendance={updateAttendanceStatus}
                  onValidate={validateAttendanceCall}
                  onCancel={() => setSelectedTrainingForCall(null)}
                  isValidating={isValidating}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const HistorySection = () => (
    <div className="space-y-6">
      {/* 🔥 BANDEAU MODE LECTURE SEULE */}
      {isReadOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Eye className="text-blue-600" size={20} />
            <div>
              <h4 className="font-medium text-blue-800">Mode consultation</h4>
              <p className="text-sm text-blue-700">Vous consultez l'historique des présences en lecture seule.</p>
            </div>
            {onViewChange && (
              <button
                onClick={() => onViewChange('trainings')}
                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center gap-2 text-sm"
              >
                <ArrowLeft size={14} />
                Retour aux entraînements
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Archive className="text-green-600" size={20} />
        <h3 className="text-lg font-semibold text-slate-800">Historique des présences</h3>
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
          {completedTrainings.length}
        </span>
      </div>

      {completedTrainings.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Archive size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucun entraînement terminé</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {completedTrainings.map(training => {
            const stats = getAttendanceStats(training.id);
            const attendance = trainingAttendances.find(ta => ta.trainingId === training.id);
            const isEditing = editingArchivedTraining?.id === training.id;
            
            return (
              <div key={training.id} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800">{training.theme}</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(training.date).toLocaleDateString('fr-FR')} à {training.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{training.lieu}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="font-semibold">Terminé</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {stats.present}/{stats.total} présents
                      </p>
                    </div>
                    
                    {/* 🔥 BOUTONS COACHS MASQUÉS EN MODE LECTURE SEULE */}
                    {userType === 'coach' && !isEditing && !isReadOnly && (
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => editArchivedTrainingAttendance(training)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          title="Modifier les présences"
                        >
                          <Edit size={14} />
                          Modifier présences
                        </button>
                        <button
                          onClick={() => deleteArchivedTraining(training.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          title="Supprimer l'entraînement"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 🔥 FORMULAIRE D'ÉDITION MASQUÉ EN MODE LECTURE SEULE */}
                {isEditing && !isReadOnly && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-slate-700">
                        Modification des présences - {training.theme}
                      </h5>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewMode(viewMode === 'grouped' ? 'list' : 'grouped')}
                          className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        >
                          <Eye size={14} />
                          {viewMode === 'grouped' ? 'Vue liste' : 'Vue groupée'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Affichage des statistiques */}
                    <AttendanceStatsDisplay attendances={archivedAttendances} />
                    
                    {/* Affichage conditionnel selon le mode */}
                    {viewMode === 'grouped' ? (
                      <GroupedAttendanceDisplay 
                        attendances={archivedAttendances}
                        onUpdateAttendance={updateArchivedAttendance}
                      />
                    ) : (
                      <div className="grid gap-2 mb-4">
                        {students.map(student => (
                          <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">
                                {student.firstName} {student.lastName}
                              </span>
                              <span className="text-sm text-slate-500">Équipe {student.team}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {ATTENDANCE_STATUSES.map(status => (
                                <button
                                  key={status.key}
                                  onClick={() => updateArchivedAttendance(student.id, status.key)}
                                  className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm transition-all hover:scale-110 ${
                                    archivedAttendances[student.id] === status.key 
                                      ? status.color + ' shadow-lg scale-110' 
                                      : 'bg-slate-300 hover:bg-slate-400'
                                  }`}
                                  title={status.label}
                                >
                                  {status.code}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={saveArchivedTrainingAttendance}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Sauvegarder les modifications
                      </button>
                      <button
                        onClick={cancelArchivedTrainingEdit}
                        className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 🔥 AFFICHAGE DES PRÉSENCES - TOUJOURS VISIBLE */}
                {attendance && !isEditing && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h5 className="font-medium mb-2 text-slate-700">Détail des présences :</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {attendance.attendances.map(att => {
                        const student = students.find(s => s.id === att.studentId);
                        if (!student) return null;
                        
                        return (
                          <div key={att.studentId} className="flex items-center gap-2 text-sm">
                            <StatusBadge status={att.status} size="small" />
                            <span className="text-slate-700">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Composant pour le formulaire d'appel
  const AttendanceForm = ({ 
    training, 
    students, 
    currentAttendances, 
    onUpdateAttendance, 
    onValidate, 
    onCancel, 
    isValidating 
  }) => {

    const QuickCallMode = () => {
      const currentStudent = students[currentStudentIndex];
      const progress = ((Object.keys(currentAttendances).length / students.length) * 100).toFixed(0);

      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-medium text-slate-700">
              Appel rapide - {new Date(training.date).toLocaleDateString('fr-FR')}
            </h5>
            <button
              onClick={() => setIsQuickCallMode(false)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Passer en mode normal
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>Progression de l'appel</span>
              <span>{Object.keys(currentAttendances).length}/{students.length} ({progress}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                {currentStudent.firstName[0]}{currentStudent.lastName[0]}
              </div>
              <h3 className="text-xl font-semibold text-slate-800">
                {currentStudent.firstName} {currentStudent.lastName}
              </h3>
              <p className="text-slate-600">Équipe {currentStudent.team} • {currentStudent.position}</p>
            </div>

            {currentAttendances[currentStudent.id] && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full">
                  <StatusBadge status={currentAttendances[currentStudent.id]} />
                  <span className="text-sm font-medium">
                    {ATTENDANCE_STATUSES.find(s => s.key === currentAttendances[currentStudent.id])?.label}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {ATTENDANCE_STATUSES.map(status => (
                <button
                  key={status.key}
                  onClick={() => onUpdateAttendance(currentStudent.id, status.key)}
                  className={`h-16 rounded-lg flex flex-col items-center justify-center text-white font-bold transition-all hover:scale-105 ${
                    currentAttendances[currentStudent.id] === status.key 
                      ? status.color + ' shadow-lg ring-2 ring-white' 
                      : status.color + ' opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="text-lg">{status.code}</div>
                  <div className="text-xs">{status.label.split(' ')[0]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousStudent}
              disabled={currentStudentIndex === 0}
              className="bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
            >
              ← Précédent
            </button>

            <span className="text-slate-600">
              {currentStudentIndex + 1} / {students.length}
            </span>

            <button
              onClick={goToNextStudent}
              disabled={currentStudentIndex === students.length - 1}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>
      );
    };

    const NormalMode = () => (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-medium text-slate-700">
            Appel pour l'entraînement du {new Date(training.date).toLocaleDateString('fr-FR')} :
          </h5>
          <button
            onClick={startQuickCall}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors"
          >
            ⚡ Appel rapide
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h6 className="text-sm font-medium text-slate-700 mb-2">Légende :</h6>
          <div className="flex flex-wrap gap-3 text-xs">
            {ATTENDANCE_STATUSES.map(status => (
              <div key={status.key} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs ${status.color}`}>
                  {status.code}
                </div>
                <span className="text-slate-600">{status.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid gap-3 mb-6">
          {students.map((student, index) => (
            <div 
              key={student.id} 
              className={`flex items-center justify-between p-3 rounded transition-all ${
                isQuickCallMode && index === currentStudentIndex 
                  ? 'bg-blue-100 border-2 border-blue-300' 
                  : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <span className="font-medium text-slate-800">
                  {student.firstName} {student.lastName}
                </span>
                <span className="text-sm text-slate-500">Équipe {student.team}</span>
                {currentAttendances[student.id] && (
                  <StatusBadge status={currentAttendances[student.id]} size="small" />
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {ATTENDANCE_STATUSES.map(status => (
                  <button
                    key={status.key}
                    onClick={() => onUpdateAttendance(student.id, status.key)}
                    className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm transition-all hover:scale-110 ${
                      currentAttendances[student.id] === status.key 
                        ? status.color + ' shadow-lg scale-110' 
                        : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={status.label}
                  >
                    {status.code}
                  </button>
                ))}
                
                {currentAttendances[student.id] && (
                  <button
                    onClick={() => onUpdateAttendance(student.id, '')}
                    className="w-8 h-8 rounded flex items-center justify-center text-red-600 hover:bg-red-100 transition-all ml-2"
                    title="Effacer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <>
        {isQuickCallMode ? <QuickCallMode /> : <NormalMode />}
        
        <div className="flex gap-3">
          <button
            onClick={onValidate}
            disabled={isValidating}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded flex items-center gap-2 transition-colors"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Validation...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Valider l'appel ({Object.keys(currentAttendances).length}/{students.length})
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={isValidating}
            className="bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300 text-white px-4 py-2 rounded transition-colors"
          >
            Annuler
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-800">Gestion des présences</h2>
        {/* 🔥 BOUTON MASQUÉ EN MODE LECTURE SEULE */}
        {userType === 'coach' && !isReadOnly && (
          <button
            onClick={() => onViewChange('trainings')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
          >
            <Calendar size={16} />
            Planifier un entraînement
          </button>
        )}
      </div>

      {/* 🔥 ONGLETS MASQUÉS EN MODE LECTURE SEULE */}
      {!isReadOnly && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded">
          <button
            onClick={() => setActiveSection('upcoming')}
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              activeSection === 'upcoming'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Entraînements à venir ({upcomingTrainings.length})
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              activeSection === 'history'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Historique ({completedTrainings.length})
          </button>
        </div>
      )}

      {/* 🔥 AFFICHAGE CONDITIONNEL : Historique seulement si mode lecture seule */}
      {isReadOnly ? (
        <HistorySection />
      ) : (
        activeSection === 'upcoming' ? <UpcomingTrainingsSection /> : <HistorySection />
      )}
    </div>
  );
};

export default Attendance;