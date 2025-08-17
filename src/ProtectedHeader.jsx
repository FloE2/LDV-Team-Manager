import React, { useState } from 'react';
import { Settings, User, Shield, Lock, Eye, EyeOff } from 'lucide-react';

const ProtectedHeader = ({ userType, onUserTypeChange, connectionStatus }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ✅ MOT DE PASSE COACH
  const COACH_PASSWORD = 'Coach123';

  const handleUserTypeChange = (newUserType) => {
    if (newUserType === 'coach' && userType !== 'coach') {
      // Demander le mot de passe pour passer en mode coach
      setShowPasswordModal(true);
      setPassword('');
      setErrorMessage('');
    } else {
      // Passage libre vers le mode joueur
      onUserTypeChange(newUserType);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === COACH_PASSWORD) {
      // Mot de passe correct
      onUserTypeChange('coach');
      setShowPasswordModal(false);
      setPassword('');
      setErrorMessage('');
    } else {
      // Mot de passe incorrect
      setErrorMessage('Mot de passe incorrect');
      setPassword('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
  };

  const closeModal = () => {
    setShowPasswordModal(false);
    setPassword('');
    setErrorMessage('');
  };

  return (
    <>
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et titre */}
            <div className="flex items-center gap-4">
              {/* Logo Pôle Léonard de Vinci */}
              <div className="flex items-center">
                <img 
                  src="/Logo-pole-leonard-vinci-n.png" 
                  alt="Logo Pôle Léonard de Vinci" 
                  width="45" 
                  height="45" 
                  className="object-contain"
                  onError={(e) => {
                    // Fallback en cas d'erreur de chargement
                    e.target.style.display = 'none';
                    console.error('Erreur de chargement du logo');
                  }}
                />
              </div>
              
              <div>
                <h1 className="text-xl font-bold text-slate-900">LDV Team Manager</h1>
                <p className="text-sm text-slate-600">Gestion Basketball</p>
              </div>
            </div>

            {/* Statut et contrôles */}
            <div className="flex items-center gap-4">
              {/* Indicateur de connexion */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'online' ? 'bg-green-500' : 
                  connectionStatus === 'local' ? 'bg-blue-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-slate-600">
                  {connectionStatus === 'online' ? 'En ligne' : 
                   connectionStatus === 'local' ? 'Hors ligne' : 'Connexion...'}
                </span>
              </div>

              {/* ✅ SÉLECTEUR PROTÉGÉ par mot de passe */}
              <div className="flex items-center gap-2">
                <User size={16} className="text-slate-500" />
                <select
                  value={userType}
                  onChange={(e) => handleUserTypeChange(e.target.value)}
                  className="text-sm border border-slate-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="player">Joueur</option>
                  <option value="coach">Coach</option>
                </select>
              </div>

              {/* Badge du rôle */}
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                userType === 'coach' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {userType === 'coach' ? <Shield size={12} /> : <User size={12} />}
                {userType === 'coach' ? 'Mode Coach' : 'Mode Joueur'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ MODALE MOT DE PASSE COACH */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-slate-800">
                Accès Mode Coach
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-4">
              Veuillez saisir le mot de passe pour accéder au mode coach :
            </p>
            
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mot de passe coach"
                className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errorMessage 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-slate-300 focus:border-blue-500'
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* ✅ MESSAGE D'ERREUR */}
            {errorMessage && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {errorMessage}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handlePasswordSubmit}
                disabled={!password.trim()}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  password.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Valider
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </div>

            {/* ✅ AIDE */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 <strong>Aide :</strong> Le mot de passe coach vous donne accès aux fonctions d'administration 
                (modification des données, gestion des présences, etc.)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProtectedHeader;