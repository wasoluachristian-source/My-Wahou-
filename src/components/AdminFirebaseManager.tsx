import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  MessageSquare,
  Users,
  Send,
  Sparkles,
  Briefcase,
  Sliders,
  Trash2,
  Eye,
  Search,
  Check,
  ShieldAlert,
  Activity,
  HardDrive
} from 'lucide-react';
import {
  fetchFirebaseDatabaseStats,
  forceSynchronizeAndRepairDatabase,
  deleteDocumentFromCollection,
} from '../services/dbService';
import { FirebaseDatabaseStats, FirebaseCollectionSummary } from '../types';

export const AdminFirebaseManager: React.FC = () => {
  const [stats, setStats] = useState<FirebaseDatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    repairedCount: number;
    totalConversations: number;
    syncTimestamp: number;
  } | null>(null);

  const [selectedCollection, setSelectedCollection] = useState<string>('conversations');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{ id: string; data: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFirebaseDatabaseStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading DB stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleForceSyncAndRepair = async () => {
    setIsSyncing(true);
    setSyncReport(null);
    try {
      const result = await forceSynchronizeAndRepairDatabase();
      setSyncReport(result);
      setActionSuccessMsg(
        `Synchronisation réussie : ${result.totalConversations} discussions vérifiées et synchronisées en temps réel chez tous les utilisateurs !`
      );
      await loadStats();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to sync and repair:', err);
      alert('Erreur lors de la synchronisation de la base de données.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDoc = async (colName: string, docId: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le document "${docId}" de la collection "${colName}" ?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDocumentFromCollection(colName, docId);
      setActionSuccessMsg(`Document ${docId} supprimé avec succès.`);
      setViewingDoc(null);
      await loadStats();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Delete document failed:', err);
      alert('Erreur lors de la suppression du document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentSummary = stats?.collections.find((c) => c.name === selectedCollection);

  const filteredDocs = currentSummary?.sampleDocs.filter((d) => {
    if (!searchDocQuery.trim()) return true;
    const q = searchDocQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      JSON.stringify(d).toLowerCase().includes(q)
    );
  }) || [];

  const getCollectionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'MessageSquare':
        return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'Send':
        return <Send className="w-5 h-5 text-cyan-400" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'MessageCircle':
        return <MessageSquare className="w-5 h-5 text-teal-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-pink-400" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-orange-400" />;
      case 'Sliders':
        return <Sliders className="w-5 h-5 text-violet-400" />;
      default:
        return <Database className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div id="admin_firebase_manager_root" className="space-y-6">
      {/* Top Banner: Global Real-time Sync & Force Repair */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-indigo-950/60 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Gestionnaire Firebase & Synchronisation Forcée
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Temps Réel
                </span>
              </h2>
            </div>
            <p className="text-sm text-zinc-300">
              Contrôlez l'intégrité de la base de données Firestore, réparez les métadonnées des conversations,
              et forcez la synchronisation instantanée de toutes les discussions chez l'ensemble des utilisateurs connectés pour éviter toute disparition de messages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="admin_refresh_db_stats_btn"
              onClick={loadStats}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser stats
            </button>

            <button
              id="admin_force_sync_btn"
              onClick={handleForceSyncAndRepair}
              disabled={isSyncing}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? 'Synchronisation en cours...' : '⚡ Forcer Synchronisation & Réparation Globale'}
            </button>
          </div>
        </div>

        {/* Action / Sync Feedback Banner */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {syncReport && (
          <div className="mt-4 p-4 bg-zinc-900/90 border border-emerald-500/30 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-800/60">
              <span className="text-zinc-400">Total Discussions Vérifiées :</span>
              <p className="text-base font-bold text-white">{syncReport.totalConversations}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-800/60">
              <span className="text-zinc-400">Conversations Réparées :</span>
              <p className="text-base font-bold text-emerald-400">{syncReport.repairedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-800/60">
              <span className="text-zinc-400">Impulsion Réseau Envoyée :</span>
              <p className="text-xs font-mono text-zinc-300">
                {new Date(syncReport.syncTimestamp).toLocaleTimeString()} (Signal global actif)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Database Connection & Collections Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats?.collections.map((col) => {
          const isSelected = selectedCollection === col.name;
          return (
            <button
              key={col.name}
              id={`db_col_card_${col.name}`}
              onClick={() => {
                setSelectedCollection(col.name);
                setViewingDoc(null);
              }}
              className={`p-4 rounded-2xl border text-left transition relative overflow-hidden group ${
                isSelected
                  ? 'bg-zinc-800 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-zinc-900/70 hover:bg-zinc-800/60 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="p-2 rounded-xl bg-zinc-800 group-hover:scale-105 transition">
                  {getCollectionIcon(col.icon)}
                </div>
                <span className="text-lg font-black text-white font-mono">{col.count}</span>
              </div>
              <div className="text-xs font-bold text-zinc-200 capitalize truncate">{col.name}</div>
              <div className="text-[10px] text-zinc-500 truncate mt-0.5">{col.description}</div>
            </button>
          );
        })}
      </div>

      {/* Collection Document Explorer */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white capitalize">
                Documents de la collection : <span className="text-emerald-400">{selectedCollection}</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {currentSummary?.count || 0} document(s) détecté(s) dans Firestore
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="admin_db_search_input"
              type="text"
              value={searchDocQuery}
              onChange={(e) => setSearchDocQuery(e.target.value)}
              placeholder="Rechercher par ID ou contenu..."
              className="w-full bg-zinc-800 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Document List & Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Document list */}
          <div className="lg:col-span-1 space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Aucun document trouvé dans cette collection.
              </div>
            ) : (
              filteredDocs.map((docItem) => {
                const isSelected = viewingDoc?.id === docItem.id;
                return (
                  <div
                    key={docItem.id}
                    onClick={() => setViewingDoc({ id: docItem.id, data: docItem })}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-white'
                        : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/50 text-zinc-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] font-bold truncate text-zinc-200">
                        {docItem.id}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {docItem.name || docItem.displayName || docItem.title || docItem.lastMessage?.text || docItem.email || 'Document Firestore'}
                      </div>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                );
              })
            )}
          </div>

          {/* Document JSON Inspector */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col max-h-96 overflow-hidden">
            {viewingDoc ? (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div>
                    <span className="text-xs font-bold text-white font-mono">ID : {viewingDoc.id}</span>
                    <span className="text-[10px] text-zinc-500 block">Collection : {selectedCollection}</span>
                  </div>
                  <button
                    id="admin_db_delete_doc_btn"
                    onClick={() => handleDeleteDoc(selectedCollection, viewingDoc.id)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer document
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-zinc-900/90 rounded-xl p-3 text-[11px] font-mono text-emerald-300 select-text">
                  <pre>{JSON.stringify(viewingDoc.data, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                <Database className="w-8 h-8 text-zinc-700" />
                <p className="text-xs">Sélectionnez un document à gauche pour inspecter sa structure brute.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
