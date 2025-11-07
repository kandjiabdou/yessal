# Exemple d'utilisation - Flux Financier avec Preuves Multiples

## 🎯 Composant React complet

```jsx
import { useState } from 'react';

const FILE_SERVICE_URL = 'http://localhost:4600';
const API_MANAGER_URL = 'http://localhost:4520';
const FILE_SERVICE_API_KEY = 'yessal-manager-2025';

function FluxFinancierFormWithProofs() {
  const [formData, setFormData] = useState({
    type: 'depense',
    montant: '',
    dateFluxFinancier: '',
    motif: '',
    beneficiaire: '',
    sourceFinancement: 'caisse',
    description: '',
    laverieId: ''
  });
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Valider les fichiers
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        alert(`${file.name}: Type de fichier non autorisé`);
        return false;
      }
      
      if (file.size > maxSize) {
        alert(`${file.name}: Fichier trop volumineux (max 10MB)`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      // ÉTAPE 1 : Créer le flux financier
      setUploadProgress(20);
      const fluxResponse = await fetch(`${API_MANAGER_URL}/api/flux-financier`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!fluxResponse.ok) {
        throw new Error('Erreur lors de la création du flux');
      }

      const fluxResult = await fluxResponse.json();
      const fluxId = fluxResult.data.id;
      
      setUploadProgress(40);

      // ÉTAPE 2 : Upload des fichiers (si présents)
      if (selectedFiles.length > 0) {
        // Option A: Upload multiple (recommandé pour >3 fichiers)
        const uploadFormData = new FormData();
        selectedFiles.forEach(file => {
          uploadFormData.append('files', file);
        });
        uploadFormData.append('uploadedBy', userId);
        uploadFormData.append('context', 'flux_financier');
        uploadFormData.append('description', `Preuves ${formData.motif}`);

        setUploadProgress(50);

        const uploadResponse = await fetch(`${FILE_SERVICE_URL}/api/files/upload-multiple`, {
          method: 'POST',
          headers: {
            'x-api-key': FILE_SERVICE_API_KEY
          },
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          throw new Error('Erreur lors de l\'upload des fichiers');
        }

        const uploadResult = await uploadResponse.json();
        const uploadedFiles = uploadResult.data;

        setUploadProgress(70);

        // ÉTAPE 3 : Attacher les preuves au flux
        for (let i = 0; i < uploadedFiles.length; i++) {
          const fileInfo = uploadedFiles[i];
          
          await fetch(`${API_MANAGER_URL}/api/flux-financier/${fluxId}/preuves`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileId: fileInfo.fileId,
              filename: fileInfo.filename,
              downloadUrl: fileInfo.downloadUrl,
              mimetype: fileInfo.mimetype,
              size: fileInfo.size
            })
          });

          setUploadProgress(70 + ((i + 1) / uploadedFiles.length) * 30);
        }
      }

      setUploadProgress(100);
      alert('Flux financier créé avec succès !');
      
      // Reset form
      setFormData({
        type: 'depense',
        montant: '',
        dateFluxFinancier: '',
        motif: '',
        beneficiaire: '',
        sourceFinancement: 'caisse',
        description: '',
        laverieId: ''
      });
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="flux-financier-form">
      <h2>Créer un Flux Financier</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Type */}
        <div className="form-group">
          <label>Type *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            required
          >
            <option value="depense">Dépense</option>
            <option value="recette">Recette</option>
          </select>
        </div>

        {/* Montant */}
        <div className="form-group">
          <label>Montant (FCFA) *</label>
          <input
            type="number"
            value={formData.montant}
            onChange={(e) => setFormData({...formData, montant: e.target.value})}
            required
            min="0"
          />
        </div>

        {/* Date */}
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            value={formData.dateFluxFinancier}
            onChange={(e) => setFormData({...formData, dateFluxFinancier: e.target.value})}
            required
          />
        </div>

        {/* Motif */}
        <div className="form-group">
          <label>Motif *</label>
          <input
            type="text"
            value={formData.motif}
            onChange={(e) => setFormData({...formData, motif: e.target.value})}
            required
          />
        </div>

        {/* Bénéficiaire */}
        <div className="form-group">
          <label>Bénéficiaire</label>
          <input
            type="text"
            value={formData.beneficiaire}
            onChange={(e) => setFormData({...formData, beneficiaire: e.target.value})}
          />
        </div>

        {/* Source financement */}
        <div className="form-group">
          <label>Source de financement *</label>
          <select
            value={formData.sourceFinancement}
            onChange={(e) => setFormData({...formData, sourceFinancement: e.target.value})}
            required
          >
            <option value="caisse">Caisse</option>
            <option value="banque">Banque</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
          />
        </div>

        {/* Upload fichiers */}
        <div className="form-group">
          <label>Pièces jointes (images, PDF)</label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {selectedFiles.length > 0 && (
            <div className="files-preview">
              <p>{selectedFiles.length} fichier(s) sélectionné(s) :</p>
              <ul>
                {selectedFiles.map((file, index) => (
                  <li key={index}>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {uploading && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${uploadProgress}%`}}
            >
              {uploadProgress}%
            </div>
          </div>
        )}

        {/* Bouton submit */}
        <button 
          type="submit" 
          disabled={uploading}
          className="btn-submit"
        >
          {uploading ? 'Création en cours...' : 'Créer le flux financier'}
        </button>
      </form>
    </div>
  );
}

export default FluxFinancierFormWithProofs;
```

## 🎨 CSS pour le composant

```css
.flux-financier-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.files-preview {
  margin-top: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.files-preview ul {
  margin: 5px 0 0 0;
  padding-left: 20px;
}

.progress-bar {
  width: 100%;
  height: 30px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 15px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #45a049);
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.btn-submit {
  width: 100%;
  padding: 12px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-submit:hover:not(:disabled) {
  background: #1976d2;
}

.btn-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

## 📱 Composant d'affichage des preuves

```jsx
function FluxFinancierDetails({ fluxId }) {
  const [flux, setFlux] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlux();
  }, [fluxId]);

  const fetchFlux = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_MANAGER_URL}/api/flux-financier/${fluxId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      setFlux(result.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreuve = async (preuveId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette preuve ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_MANAGER_URL}/api/flux-financier/preuves/${preuveId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Rafraîchir les données
      fetchFlux();
      alert('Preuve supprimée avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (!flux) return <div>Flux non trouvé</div>;

  return (
    <div className="flux-details">
      <h2>Détails du Flux Financier #{flux.id}</h2>
      
      <div className="flux-info">
        <p><strong>Type:</strong> {flux.type}</p>
        <p><strong>Montant:</strong> {flux.montant.toLocaleString()} FCFA</p>
        <p><strong>Motif:</strong> {flux.motif}</p>
        <p><strong>Bénéficiaire:</strong> {flux.beneficiaire}</p>
        <p><strong>Date:</strong> {new Date(flux.dateFluxFinancier).toLocaleDateString()}</p>
        <p><strong>Statut:</strong> {flux.status}</p>
      </div>

      {/* Pièces jointes */}
      {flux.preuves && flux.preuves.length > 0 && (
        <div className="preuves-section">
          <h3>Pièces jointes ({flux.preuves.length})</h3>
          
          <div className="preuves-grid">
            {flux.preuves.map((preuve) => (
              <div key={preuve.id} className="preuve-card">
                {preuve.mimetype.startsWith('image/') ? (
                  <img 
                    src={preuve.downloadUrl} 
                    alt={preuve.filename}
                    className="preuve-image"
                  />
                ) : (
                  <div className="preuve-pdf">
                    <span className="pdf-icon">📄</span>
                    <p>{preuve.filename}</p>
                  </div>
                )}
                
                <div className="preuve-info">
                  <p className="filename">{preuve.filename}</p>
                  <p className="filesize">{(preuve.size / 1024).toFixed(2)} KB</p>
                  
                  <div className="preuve-actions">
                    <a 
                      href={preuve.downloadUrl} 
                      download={preuve.filename}
                      className="btn-download"
                    >
                      Télécharger
                    </a>
                    
                    {flux.status === 'pending' && (
                      <button
                        onClick={() => handleDeletePreuve(preuve.id)}
                        className="btn-delete"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FluxFinancierDetails;
```

## 📊 Version avec upload parallèle (plus rapide)

```javascript
// Alternative : Upload en parallèle (1 requête par fichier)
async function uploadFilesInParallel(files, userId) {
  const uploadPromises = files.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', userId);
    formData.append('context', 'flux_financier');
    
    const response = await fetch(`${FILE_SERVICE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': FILE_SERVICE_API_KEY
      },
      body: formData
    });
    
    const result = await response.json();
    return result.data;
  });
  
  return await Promise.all(uploadPromises);
}

// Utilisation dans le formulaire
const uploadedFiles = await uploadFilesInParallel(selectedFiles, userId);
```

## ✅ Points clés

1. **Upload batch** : 1 seule requête pour tous les fichiers (plus rapide)
2. **Validation côté client** : Types et tailles vérifiés avant upload
3. **Barre de progression** : Feedback visuel pour l'utilisateur
4. **Gestion d'erreurs** : Try/catch avec messages explicites
5. **Optimisation** : URLs signées valides 1h (pas besoin de régénérer à chaque affichage)
6. **Sécurité** : Suppression uniquement si flux en pending

## 🔧 Configuration requise

```javascript
// .env ou config
FILE_SERVICE_URL=http://localhost:4600
API_MANAGER_URL=http://localhost:4520
FILE_SERVICE_API_KEY=yessal-manager-2025
```
