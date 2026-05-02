'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertCircle,
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Plus,
  UploadCloud,
  X,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { loadOperationalScope } from '@/lib/workspace-client'

const ARCHIVE_BUCKET = 'document-archive'
const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv'
const MAX_FILE_SIZE = 10 * 1024 * 1024

type WorkspaceMode = 'client' | 'cabinet'
type QueuedFile = { key: string; file: File }

type ArchiveFolder = {
  id: string
  company_id: string
  exercise_year: number
  created_at: string
  updated_at?: string | null
  parent_folder_id?: string | null
  folder_name: string
  folder_kind: 'exercise' | 'folder'
}

type ArchiveFile = {
  id: string
  company_id: string
  folder_id: string
  created_by?: string | null
  uploader_role: 'cabinet' | 'client'
  name: string
  description?: string | null
  file_bucket: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
  created_at: string
  updated_at?: string | null
  download_url?: string | null
}

type FolderTreeNode = {
  folder: ArchiveFolder
  depth: number
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-DZ')
}

function formatSize(value?: number | null) {
  const size = Number(value || 0)
  if (!size) return ''
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function folderLabel(year: number) {
  return `Annee d'exercice ${year}`
}

function normalizeFolder(row: any): ArchiveFolder {
  const year = Number(row?.exercise_year || new Date().getFullYear())
  const kind = row?.folder_kind === 'folder' ? 'folder' : 'exercise'

  return {
    id: String(row?.id || ''),
    company_id: String(row?.company_id || ''),
    exercise_year: year,
    created_at: row?.created_at || new Date().toISOString(),
    updated_at: row?.updated_at || null,
    parent_folder_id: row?.parent_folder_id || null,
    folder_name: String(row?.folder_name || folderLabel(year)),
    folder_kind: kind,
  }
}

function buildStoragePath(companyId: string, folderId: string, fileName: string) {
  const safeName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${companyId}/${folderId}/${Date.now()}-${crypto.randomUUID()}-${safeName || 'document'}`
}

function getFileIcon(mimeType?: string | null, name?: string): LucideIcon {
  const value = `${mimeType || ''} ${name || ''}`.toLowerCase()
  if (value.includes('image') || /\.(png|jpe?g|webp|gif)$/i.test(name || '')) return FileImage
  if (value.includes('sheet') || /\.(xls|xlsx|csv)$/i.test(name || '')) return FileSpreadsheet
  return FileText
}

async function withSignedUrls(rows: ArchiveFile[]) {
  return Promise.all(rows.map(async (row) => {
    if (!row.file_bucket || !row.file_path) return { ...row, download_url: null }
    const { data } = await supabase.storage.from(row.file_bucket).createSignedUrl(row.file_path, 60 * 60)
    return { ...row, download_url: data?.signedUrl || null }
  }))
}

function buildFolderTree(folders: ArchiveFolder[]): FolderTreeNode[] {
  const byParent = new Map<string, ArchiveFolder[]>()
  const roots: ArchiveFolder[] = []

  for (const folder of folders) {
    if (folder.parent_folder_id) {
      const current = byParent.get(folder.parent_folder_id) || []
      current.push(folder)
      byParent.set(folder.parent_folder_id, current)
    } else {
      roots.push(folder)
    }
  }

  roots.sort((a, b) => b.exercise_year - a.exercise_year || a.folder_name.localeCompare(b.folder_name))
  for (const group of byParent.values()) {
    group.sort((a, b) => a.folder_name.localeCompare(b.folder_name))
  }

  const ordered: FolderTreeNode[] = []
  const visit = (folder: ArchiveFolder, depth: number) => {
    ordered.push({ folder, depth })
    for (const child of byParent.get(folder.id) || []) {
      visit(child, depth + 1)
    }
  }

  for (const root of roots) {
    visit(root, 0)
  }

  return ordered
}

function buildFolderPath(folderId: string, lookup: Record<string, ArchiveFolder>) {
  const labels: string[] = []
  let cursor: ArchiveFolder | undefined = lookup[folderId]

  while (cursor) {
    labels.unshift(cursor.folder_name)
    cursor = cursor.parent_folder_id ? lookup[cursor.parent_folder_id] : undefined
  }

  return labels.join(' / ')
}

export default function DocumentsPage() {
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [mode, setMode] = useState<WorkspaceMode>('client')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creatingExercise, setCreatingExercise] = useState(false)
  const [creatingSubfolder, setCreatingSubfolder] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [managedCompanies, setManagedCompanies] = useState<any[]>([])
  const [folders, setFolders] = useState<ArchiveFolder[]>([])
  const [files, setFiles] = useState<ArchiveFile[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [exerciseYear, setExerciseYear] = useState(new Date().getFullYear())
  const [subfolderName, setSubfolderName] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([])

  async function load(companyOverride?: string) {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(currentUser)
    if (!currentUser.company_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const scope = await loadOperationalScope(currentUser.company_id, pathname)
      setMode(scope.mode)
      setManagedCompanies(scope.companies)

      const companyId = companyOverride || (scope.mode === 'cabinet'
        ? (activeCompanyId || scope.companies[0]?.id || '')
        : currentUser.company_id
      )

      setActiveCompanyId(companyId)

      if (!companyId) {
        setFolders([])
        setFiles([])
        setLoading(false)
        return
      }

      const [{ data: folderRows, error: folderError }, { data: fileRows, error: fileError }] = await Promise.all([
        supabase.rpc('list_company_archive_folders', { p_company_id: companyId }),
        supabase.rpc('list_company_archive_files', { p_company_id: companyId }),
      ])

      if (folderError || fileError) {
        throw new Error('Module archives documents non initialise dans la base.')
      }

      const nextFolders = (folderRows || []).map(normalizeFolder) as ArchiveFolder[]
      const nextFiles = await withSignedUrls((fileRows || []) as ArchiveFile[])

      setFolders(nextFolders)
      setFiles(nextFiles)

      const nextSelected = nextFolders.some((folder) => folder.id === selectedFolderId)
        ? selectedFolderId
        : (nextFolders[0]?.id || '')
      setSelectedFolderId(nextSelected)
    } catch (err: any) {
      setFolders([])
      setFiles([])
      setError(err?.message || 'Impossible de charger les archives.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [pathname])

  useEffect(() => {
    if (!user?.company_id) return
    if (mode !== 'cabinet') return
    if (!activeCompanyId) return
    load(activeCompanyId)
  }, [activeCompanyId])

  const companyLookup = useMemo(
    () => Object.fromEntries(managedCompanies.map((company: any) => [company.id, company])),
    [managedCompanies],
  )

  const folderLookup = useMemo(
    () => Object.fromEntries(folders.map((folder) => [folder.id, folder])),
    [folders],
  )

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) || null,
    [folders, selectedFolderId],
  )

  const visibleFiles = useMemo(
    () => files.filter((file) => file.folder_id === selectedFolderId),
    [files, selectedFolderId],
  )

  const folderTree = useMemo(
    () => buildFolderTree(folders),
    [folders],
  )

  const currentCompanyName = mode === 'cabinet'
    ? (companyLookup[activeCompanyId]?.name || 'Client')
    : (user?.company_name || 'Client')

  const summary = useMemo(() => ({
    exercises: folders.filter((folder) => folder.folder_kind === 'exercise').length,
    folders: folders.filter((folder) => folder.folder_kind === 'folder').length,
    totalFiles: files.length,
  }), [folders, files])

  const selectedFolderPath = selectedFolder ? buildFolderPath(selectedFolder.id, folderLookup) : ''

  function addFiles(list: FileList | File[]) {
    const nextFiles = Array.from(list)
    if (!nextFiles.length) return

    const rejected = nextFiles.find((item) => item.size > MAX_FILE_SIZE)
    if (rejected) {
      setError(`Le fichier "${rejected.name}" depasse 10 MB.`)
      return
    }

    setError('')
    setQueuedFiles((current) => {
      const seen = new Set(current.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`))
      const additions = nextFiles
        .filter((file) => {
          const signature = `${file.name}-${file.size}-${file.lastModified}`
          if (seen.has(signature)) return false
          seen.add(signature)
          return true
        })
        .map((file) => ({
          key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
        }))

      return [...current, ...additions]
    })
  }

  function clearComposer() {
    setUploadTitle('')
    setUploadDescription('')
    setQueuedFiles([])
  }

  function removeQueuedFile(key: string) {
    setQueuedFiles((current) => current.filter((item) => item.key !== key))
  }

  function handleCompanyChange(companyId: string) {
    setActiveCompanyId(companyId)
    setSelectedFolderId('')
    setError('')
  }

  async function createExerciseFolder() {
    if (mode !== 'cabinet') return
    if (!activeCompanyId) {
      setError('Selectionnez d abord un client.')
      return
    }

    setCreatingExercise(true)
    setError('')

    try {
      const { error: insertError } = await supabase.rpc('create_company_archive_folder', {
        p_company_id: activeCompanyId,
        p_exercise_year: exerciseYear,
        p_folder_name: folderLabel(exerciseYear),
        p_parent_folder_id: null,
      })

      if (insertError) {
        throw new Error(insertError.message || 'Impossible de creer ce dossier d exercice.')
      }

      await load(activeCompanyId)
    } catch (err: any) {
      setError(err?.message || 'Impossible de creer le dossier.')
    } finally {
      setCreatingExercise(false)
    }
  }

  async function createSubfolder() {
    if (mode !== 'cabinet') return
    if (!selectedFolder) {
      setError("Selectionnez d'abord un dossier parent.")
      return
    }

    const nextName = subfolderName.trim()
    if (!nextName) {
      setError('Donnez un nom au sous-dossier.')
      return
    }

    setCreatingSubfolder(true)
    setError('')

    try {
      const { error: insertError } = await supabase.rpc('create_company_archive_folder', {
        p_company_id: selectedFolder.company_id,
        p_exercise_year: selectedFolder.exercise_year,
        p_folder_name: nextName,
        p_parent_folder_id: selectedFolder.id,
      })

      if (insertError) {
        throw new Error(insertError.message || 'Impossible de creer ce sous-dossier.')
      }

      setSubfolderName('')
      await load(selectedFolder.company_id)
    } catch (err: any) {
      setError(err?.message || 'Impossible de creer le sous-dossier.')
    } finally {
      setCreatingSubfolder(false)
    }
  }

  async function uploadDocuments() {
    if (!selectedFolder) {
      setError('Choisissez un dossier avant de deposer des fichiers.')
      return
    }

    if (!queuedFiles.length) {
      setError('Ajoutez au moins un fichier.')
      return
    }

    const baseTitle = uploadTitle.trim()
    setSaving(true)
    setError('')

    try {
      for (const [index, entry] of queuedFiles.entries()) {
        const path = buildStoragePath(selectedFolder.company_id, selectedFolder.id, entry.file.name)
        const { error: uploadError } = await supabase.storage.from(ARCHIVE_BUCKET).upload(path, entry.file, {
          upsert: false,
          contentType: entry.file.type || undefined,
        })

        if (uploadError) {
          throw new Error('Impossible d envoyer le fichier. Verifiez le bucket document-archive et sa migration Supabase.')
        }

        const { error: recordError } = await supabase.rpc('create_company_archive_file_record', {
          p_company_id: selectedFolder.company_id,
          p_folder_id: selectedFolder.id,
          p_name: baseTitle ? (queuedFiles.length === 1 ? baseTitle : `${baseTitle} (${index + 1})`) : entry.file.name,
          p_description: uploadDescription.trim() || null,
          p_file_bucket: ARCHIVE_BUCKET,
          p_file_path: path,
          p_file_size: entry.file.size,
          p_mime_type: entry.file.type || null,
          p_uploader_role: mode === 'cabinet' ? 'cabinet' : 'client',
        })
        if (recordError) {
          throw new Error(recordError.message || 'Impossible d enregistrer les fichiers dans l archive.')
        }
      }

      clearComposer()
      await load(selectedFolder.company_id)
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue pendant le depot.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="docs-page archive-page">
      <section className="workspace-panel docs-hero">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">Archives documentaires</div>
            <div className="workspace-section-copy">
              {mode === 'cabinet'
                ? "Le cabinet cree les dossiers d'exercice puis ajoute des sous-dossiers a l'interieur."
                : "Le cabinet prepare l'arborescence. Vous pouvez deposer vos pieces et telecharger les documents visibles."}
            </div>
          </div>
          <div className="docs-hero-chips">
            <span className="workspace-chip accent">
              <FileArchive size={13} />
              <span>{summary.exercises} exercices</span>
            </span>
            <span className="workspace-chip success">
              <FolderOpen size={13} />
              <span>{summary.folders} sous-dossiers</span>
            </span>
            <span className="workspace-chip warning">
              <UploadCloud size={13} />
              <span>{summary.totalFiles} fichiers</span>
            </span>
          </div>
        </div>
      </section>

      <section className="docs-layout archive-layout">
        <div className="workspace-panel docs-compose">
          <div className="workspace-section-head">
            <div>
              <div className="workspace-section-title">
                {mode === 'cabinet' ? 'Structure des archives' : 'Arborescence des dossiers'}
              </div>
              <div className="workspace-section-copy">
                {mode === 'cabinet'
                  ? "Chaque annee d'exercice est un dossier racine. A l'interieur, vous pouvez creer autant de sous-dossiers que necessaire."
                  : "Le client consulte l'arborescence existante et depose ses fichiers dans le dossier choisi."}
              </div>
            </div>
          </div>

          {mode === 'cabinet' && (
            <div className="docs-form-grid">
              <label className="docs-field docs-field-full">
                <span className="docs-label">Client archive</span>
                <select
                  className="workspace-select"
                  value={activeCompanyId}
                  onChange={(event) => handleCompanyChange(event.target.value)}
                >
                  <option value="">Selectionner un client</option>
                  {managedCompanies.map((company: any) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </label>

              <label className="docs-field">
                <span className="docs-label">Nouvel exercice</span>
                <input
                  className="workspace-input"
                  type="number"
                  min={2000}
                  max={2100}
                  value={exerciseYear}
                  onChange={(event) => setExerciseYear(Number(event.target.value || new Date().getFullYear()))}
                />
              </label>

              <div className="docs-field">
                <span className="docs-label">Dossier racine</span>
                <button className="workspace-button primary archive-create-button" type="button" onClick={createExerciseFolder} disabled={creatingExercise || !activeCompanyId}>
                  <Plus size={14} />
                  <span>{creatingExercise ? 'Creation...' : `Creer le dossier ${exerciseYear}`}</span>
                </button>
              </div>

              <label className="docs-field">
                <span className="docs-label">Sous-dossier</span>
                <input
                  className="workspace-input"
                  value={subfolderName}
                  onChange={(event) => setSubfolderName(event.target.value)}
                  placeholder="Ex: Banque, TVA, Paie..."
                  disabled={!selectedFolder}
                />
              </label>

              <div className="docs-field">
                <span className="docs-label">Dans le dossier choisi</span>
                <button className="workspace-button ghost archive-create-button" type="button" onClick={createSubfolder} disabled={creatingSubfolder || !selectedFolder}>
                  <Plus size={14} />
                  <span>{creatingSubfolder ? 'Creation...' : 'Creer un sous-dossier'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="archive-target-card">
            <div className="archive-target-title">{currentCompanyName}</div>
            <div className="workspace-row-meta">
              {selectedFolderPath || "Aucun dossier selectionne pour l'instant."}
            </div>
          </div>

          <div className="archive-folder-list">
            {folderTree.length === 0 ? (
              <div className="workspace-empty">
                {mode === 'cabinet' ? (
                  <div style={{ display:'grid', gap:12, justifyItems:'center' }}>
                    <div>Aucun dossier d'exercice. Creez d'abord 2024, 2025, etc.</div>
                    <button
                      className="workspace-button primary"
                      type="button"
                      onClick={createExerciseFolder}
                      disabled={creatingExercise || !activeCompanyId}
                    >
                      <Plus size={14} />
                      <span>{creatingExercise ? 'Creation...' : `Creer ${exerciseYear}`}</span>
                    </button>
                  </div>
                ) : (
                  "Aucun dossier d'exercice n'est encore disponible. Le cabinet doit en creer un."
                )}
              </div>
            ) : (
              folderTree.map(({ folder, depth }) => {
                const active = folder.id === selectedFolderId
                const count = files.filter((file) => file.folder_id === folder.id).length
                const Icon = folder.folder_kind === 'exercise' ? FileArchive : FolderOpen

                return (
                  <button
                    key={folder.id}
                    type="button"
                    className={`archive-folder-button ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedFolderId(folder.id)
                      setError('')
                    }}
                    style={{ paddingLeft: `${14 + depth * 20}px` }}
                  >
                    <div className="archive-folder-main">
                      <span className="archive-folder-icon"><Icon size={16} /></span>
                      <div>
                        <div className="archive-folder-title">{folder.folder_name}</div>
                        <div className="workspace-row-meta">
                          {folder.folder_kind === 'exercise' ? `Exercice ${folder.exercise_year}` : `Dans ${folderLabel(folder.exercise_year)}`} • {count} fichier(s)
                        </div>
                      </div>
                    </div>
                    <span className="workspace-chip accent">{folder.folder_kind === 'exercise' ? folder.exercise_year : 'Dossier'}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="workspace-panel docs-summary">
          <div className="workspace-section-title">Depot de fichiers</div>
          <div className="workspace-section-copy">
            {selectedFolderPath || "Choisissez un dossier d'abord."}
          </div>

          <label className="docs-field">
            <span className="docs-label">Titre optionnel</span>
            <input
              className="workspace-input"
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
              placeholder="Ex: Releve bancaire avril"
              disabled={!selectedFolder}
            />
          </label>

          <label className="docs-field">
            <span className="docs-label">Note</span>
            <textarea
              className="workspace-input docs-textarea"
              value={uploadDescription}
              onChange={(event) => setUploadDescription(event.target.value)}
              placeholder={mode === 'cabinet' ? 'Contexte ou note visible...' : 'Information utile pour le cabinet...'}
              disabled={!selectedFolder}
            />
          </label>

          <div
            className={`docs-dropzone ${dragActive ? 'is-dragover' : ''} ${!selectedFolder ? 'is-disabled' : ''}`}
            onClick={() => selectedFolder && fileInputRef.current?.click()}
            onDragEnter={(event) => {
              if (!selectedFolder) return
              event.preventDefault()
              setDragActive(true)
            }}
            onDragOver={(event) => {
              if (!selectedFolder) return
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={(event) => {
              if (!selectedFolder) return
              event.preventDefault()
              const nextTarget = event.relatedTarget as Node | null
              if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                setDragActive(false)
              }
            }}
            onDrop={(event) => {
              if (!selectedFolder) return
              event.preventDefault()
              setDragActive(false)
              addFiles(event.dataTransfer.files)
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />
            <div className="docs-dropzone-icon">
              <UploadCloud size={20} />
            </div>
            <div className="docs-dropzone-title">
              {selectedFolder ? 'Glissez vos fichiers dans ce dossier' : "Selectionnez d'abord un dossier"}
            </div>
            <div className="docs-dropzone-copy">
              {selectedFolder
                ? 'Le fichier sera archive exactement dans le dossier choisi.'
                : "Le cabinet cree l'arborescence, puis le depot devient disponible."}
            </div>
          </div>

          {queuedFiles.length > 0 && (
            <div className="docs-file-grid">
              {queuedFiles.map((entry) => {
                const Icon = getFileIcon(entry.file.type, entry.file.name)
                return (
                  <div key={entry.key} className="docs-file-chip">
                    <div className="docs-file-meta">
                      <span className="docs-file-icon"><Icon size={15} /></span>
                      <div>
                        <div className="docs-file-name">{entry.file.name}</div>
                        <div className="workspace-row-meta">{formatSize(entry.file.size)}</div>
                      </div>
                    </div>
                    <button className="docs-file-remove" type="button" onClick={() => removeQueuedFile(entry.key)}>
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <div className="docs-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="docs-actions">
            <div className="workspace-row-meta">
              {mode === 'cabinet'
                ? 'Le cabinet garde la main sur la structure complete des archives.'
                : 'Le client peut deposer et telecharger, sans modifier les dossiers.'}
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button className="workspace-button ghost" type="button" onClick={clearComposer}>
                <span>Vider</span>
              </button>
              <button className="workspace-button primary" type="button" onClick={uploadDocuments} disabled={saving || !selectedFolder}>
                <UploadCloud size={14} />
                <span>{saving ? 'Envoi...' : mode === 'cabinet' ? 'Archiver les fichiers' : 'Deposer au cabinet'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-section-head">
          <div>
            <div className="workspace-section-title">
              {selectedFolder ? `Contenu de ${selectedFolder.folder_name}` : 'Contenu du dossier'}
            </div>
            <div className="workspace-section-copy">
              {selectedFolderPath || "Selectionnez un dossier pour voir son contenu."}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="workspace-empty">Chargement des archives...</div>
        ) : !selectedFolder ? (
          <div className="workspace-empty">Selectionnez un dossier.</div>
        ) : visibleFiles.length === 0 ? (
          <div className="workspace-empty">Aucun fichier dans ce dossier pour le moment.</div>
        ) : (
          <div className="archive-file-list">
            {visibleFiles.map((file) => {
              const Icon = getFileIcon(file.mime_type, file.name)
              return (
                <div key={file.id} className="archive-file-row">
                  <div className="archive-file-main">
                    <span className="docs-file-icon large"><Icon size={18} /></span>
                    <div>
                      <div className="archive-file-title">{file.name}</div>
                      <div className="workspace-row-meta">
                        {file.uploader_role === 'cabinet' ? 'Depose par le cabinet' : 'Depose par le client'}
                        {file.mime_type ? ` • ${file.mime_type}` : ''}
                        {file.file_size ? ` • ${formatSize(file.file_size)}` : ''}
                      </div>
                      {file.description && <div className="archive-file-note">{file.description}</div>}
                    </div>
                  </div>
                  <div className="archive-file-side">
                    <div className="archive-file-date">{formatDate(file.created_at)}</div>
                    {file.download_url ? (
                      <a className="workspace-button ghost" href={file.download_url} target="_blank" rel="noreferrer">
                        <Download size={14} />
                        <span>Telecharger</span>
                      </a>
                    ) : (
                      <span className="workspace-row-meta">Lien indisponible</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
