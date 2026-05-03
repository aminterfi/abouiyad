'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertCircle,
  Building2,
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
import { useRealtime } from '@/lib/useRealtime'

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

function isMissingRpcFunction(error: any, functionName: string) {
  const message = String(error?.message || '').toLowerCase()
  return (
    error?.code === 'PGRST202' ||
    message.includes(`could not find the function public.${functionName}`.toLowerCase()) ||
    message.includes('schema cache')
  )
}

function isArchiveSchemaColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('parent_folder_id') ||
    message.includes('folder_name') ||
    message.includes('folder_kind')
  )
}

function formatFolderCreationError(error: any, fallbackMessage: string) {
  if (error?.code === '23505') {
    return 'Cet exercice existe deja.'
  }
  const message = String(error?.message || '')
  return message || fallbackMessage
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

  async function loadArchiveData(companyId: string) {
    const [{ data: folderRows, error: folderError }, { data: fileRows, error: fileError }] = await Promise.all([
      supabase.rpc('list_company_archive_folders', { p_company_id: companyId }),
      supabase.rpc('list_company_archive_files', { p_company_id: companyId }),
    ])

    if (!folderError && !fileError) {
      return {
        folderRows: folderRows || [],
        fileRows: fileRows || [],
      }
    }

    const shouldFallback =
      (!folderError || isMissingRpcFunction(folderError, 'list_company_archive_folders')) &&
      (!fileError || isMissingRpcFunction(fileError, 'list_company_archive_files'))

    if (!shouldFallback) {
      throw new Error(folderError?.message || fileError?.message || 'Module archives documents non initialise dans la base.')
    }

    const [{ data: directFolders, error: directFolderError }, { data: directFiles, error: directFileError }] = await Promise.all([
      supabase
        .from('document_exercise_folders')
        .select('*')
        .eq('company_id', companyId)
        .order('exercise_year', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('document_archive_files')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
    ])

    if (directFolderError || directFileError) {
      throw new Error(directFolderError?.message || directFileError?.message || 'Module archives documents non initialise dans la base.')
    }

    return {
      folderRows: directFolders || [],
      fileRows: directFiles || [],
    }
  }

  async function createExerciseFolderFallback(companyId: string, year: number, createdBy?: string | null) {
    const rootInsert = await supabase.from('document_exercise_folders').insert({
      company_id: companyId,
      exercise_year: year,
      folder_name: folderLabel(year),
      folder_kind: 'exercise',
      parent_folder_id: null,
      created_by: createdBy || null,
    })

    if (!rootInsert.error) return
    if (!isArchiveSchemaColumnError(rootInsert.error)) throw rootInsert.error

    const legacyInsert = await supabase.from('document_exercise_folders').insert({
      company_id: companyId,
      exercise_year: year,
      created_by: createdBy || null,
    })

    if (legacyInsert.error) throw legacyInsert.error
  }

  async function createSubfolderFallback(folder: ArchiveFolder, name: string, createdBy?: string | null) {
    const insertResult = await supabase.from('document_exercise_folders').insert({
      company_id: folder.company_id,
      exercise_year: folder.exercise_year,
      folder_name: name,
      folder_kind: 'folder',
      parent_folder_id: folder.id,
      created_by: createdBy || null,
    })

    if (!insertResult.error) return
    if (isArchiveSchemaColumnError(insertResult.error)) {
      throw new Error("Le support des sous-dossiers n'est pas encore present dans Supabase. Appliquez la migration nested folders.")
    }

    throw insertResult.error
  }

  async function createArchiveFileRecordFallback(
    folder: ArchiveFolder,
    name: string,
    description: string | null,
    path: string,
    size: number,
    mimeType: string | null,
    uploaderRole: 'cabinet' | 'client',
    createdBy?: string | null,
  ) {
    const { error } = await supabase.from('document_archive_files').insert({
      company_id: folder.company_id,
      folder_id: folder.id,
      created_by: createdBy || null,
      uploader_role: uploaderRole,
      name,
      description,
      file_bucket: ARCHIVE_BUCKET,
      file_path: path,
      file_size: size,
      mime_type: mimeType,
    })

    if (error) throw error
  }

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
        ? (activeCompanyId || '')
        : currentUser.company_id
      )

      setActiveCompanyId(companyId)

      if (!companyId) {
        setFolders([])
        setFiles([])
        setLoading(false)
        return
      }

      const { folderRows, fileRows } = await loadArchiveData(companyId)
      const nextFolders = (folderRows || []).map(normalizeFolder) as ArchiveFolder[]
      const nextFiles = await withSignedUrls((fileRows || []) as ArchiveFile[])
      const nextSelected = nextFolders.some((folder) => folder.id === selectedFolderId)
        ? selectedFolderId
        : (nextFolders[0]?.id || '')

      setFolders(nextFolders)
      setFiles(nextFiles)
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

  useRealtime(
    ['document_exercise_folders', 'document_archive_files'],
    () => load(activeCompanyId || undefined),
    {
      enabled: Boolean(user?.company_id),
      intervalMs: 4000,
      deps: [pathname, activeCompanyId, mode, user?.company_id],
    },
  )

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

  const hasClientSelected = mode !== 'cabinet' || Boolean(activeCompanyId)
  const activeClientName = mode === 'cabinet'
    ? (companyLookup[activeCompanyId]?.name || '')
    : (user?.company_name || 'Client')
  const activeClientSlug = mode === 'cabinet'
    ? (companyLookup[activeCompanyId]?.slug || '')
    : (user?.slug || '')

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
    clearComposer()
    setSubfolderName('')
    setActiveCompanyId(companyId)
    setSelectedFolderId('')
    setError('')
  }

  async function createExerciseFolder() {
    if (mode !== 'cabinet') return
    if (!activeCompanyId) {
      setError("Selectionnez d'abord un client.")
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
        if (isMissingRpcFunction(insertError, 'create_company_archive_folder')) {
          await createExerciseFolderFallback(activeCompanyId, exerciseYear, user?.id || null)
        } else {
          throw insertError
        }
      }

      await load(activeCompanyId)
    } catch (err: any) {
      setError(formatFolderCreationError(err, "Impossible de creer ce dossier d'exercice."))
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
        if (isMissingRpcFunction(insertError, 'create_company_archive_folder')) {
          await createSubfolderFallback(selectedFolder, nextName, user?.id || null)
        } else {
          throw insertError
        }
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
      setError("Choisissez d'abord un dossier.")
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
        const finalName = baseTitle
          ? (queuedFiles.length === 1 ? baseTitle : `${baseTitle} (${index + 1})`)
          : entry.file.name

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
          p_name: finalName,
          p_description: uploadDescription.trim() || null,
          p_file_bucket: ARCHIVE_BUCKET,
          p_file_path: path,
          p_file_size: entry.file.size,
          p_mime_type: entry.file.type || null,
          p_uploader_role: mode === 'cabinet' ? 'cabinet' : 'client',
        })

        if (recordError) {
          if (isMissingRpcFunction(recordError, 'create_company_archive_file_record')) {
            await createArchiveFileRecordFallback(
              selectedFolder,
              finalName,
              uploadDescription.trim() || null,
              path,
              entry.file.size,
              entry.file.type || null,
              mode === 'cabinet' ? 'cabinet' : 'client',
              user?.id || null,
            )
          } else {
            throw new Error(recordError.message || "Impossible d'enregistrer les fichiers dans l'archive.")
          }
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

  const folderTreeContent = loading ? (
    <div className="archive-empty-state">Chargement des archives...</div>
  ) : !hasClientSelected ? (
    <div className="archive-empty-state">
      <Building2 size={20} />
      <div className="archive-empty-title">Selectionnez un client pour ouvrir son archive</div>
      <div className="archive-empty-copy">
        Le cabinet travaille client par client. Une fois le client choisi, l'arborescence et les actions deviennent disponibles.
      </div>
    </div>
  ) : folderTree.length === 0 ? (
    <div className="archive-empty-state">
      <FileArchive size={20} />
      <div className="archive-empty-title">
        {mode === 'cabinet' ? "Aucun exercice cree pour l'instant" : "Le cabinet n'a pas encore prepare l'archive"}
      </div>
      <div className="archive-empty-copy">
        {mode === 'cabinet'
          ? "Creez un premier dossier d'exercice pour poser la structure du client."
          : "Des que le cabinet cree le premier exercice, vous pourrez deposer et telecharger vos documents."}
      </div>
    </div>
  ) : (
    <div className="archive-folder-list">
      {folderTree.map(({ folder, depth }) => {
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
                  {folder.folder_kind === 'exercise' ? `Exercice ${folder.exercise_year}` : `Dans ${folderLabel(folder.exercise_year)}`} | {count} fichier(s)
                </div>
              </div>
            </div>
            <span className="workspace-chip accent">{folder.folder_kind === 'exercise' ? folder.exercise_year : 'Dossier'}</span>
          </button>
        )
      })}
    </div>
  )

  const uploadPanel = (
    <section className="workspace-panel archive-workspace-panel">
      <div className="workspace-section-head">
        <div>
          <div className="workspace-section-title">
            {mode === 'cabinet' ? 'Zone de travail' : 'Depot de fichiers'}
          </div>
          <div className="workspace-section-copy">
            {selectedFolderPath || "Choisissez d'abord un dossier dans l'arborescence."}
          </div>
        </div>
        {mode === 'cabinet' && hasClientSelected && (
          <span className="workspace-chip accent">
            <Building2 size={13} />
            <span>{activeClientName}</span>
          </span>
        )}
      </div>

      <div className="docs-form-grid">
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
          <span className="docs-label">Contexte</span>
          <textarea
            className="workspace-input docs-textarea"
            value={uploadDescription}
            onChange={(event) => setUploadDescription(event.target.value)}
            placeholder={mode === 'cabinet' ? 'Note visible pour ce dossier...' : 'Information utile pour le cabinet...'}
            disabled={!selectedFolder}
          />
        </label>
      </div>

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
          {selectedFolder ? 'Glissez ou ajoutez les fichiers dans ce dossier' : "Selectionnez d'abord un dossier"}
        </div>
        <div className="docs-dropzone-copy">
          {selectedFolder
            ? "Le depot sera archive exactement a l'endroit selectionne."
            : "Le depot reste verrouille tant qu'aucun dossier cible n'est choisi."}
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
            ? "Le cabinet garde la main sur la structure. Le client travaille dans les dossiers mis a sa disposition."
            : "Vous pouvez deposer et telecharger vos documents sans modifier l'arborescence."}
        </div>
        <div className="archive-inline-actions">
          <button className="workspace-button ghost" type="button" onClick={clearComposer}>
            <span>Vider</span>
          </button>
          <button className="workspace-button primary" type="button" onClick={uploadDocuments} disabled={saving || !selectedFolder}>
            <UploadCloud size={14} />
            <span>{saving ? 'Envoi...' : mode === 'cabinet' ? 'Archiver les fichiers' : 'Deposer au cabinet'}</span>
          </button>
        </div>
      </div>
    </section>
  )

  const filesPanel = (
    <section className="workspace-panel archive-workspace-panel">
      <div className="workspace-section-head">
        <div>
          <div className="workspace-section-title">
            {selectedFolder ? `Contenu de ${selectedFolder.folder_name}` : 'Contenu du dossier'}
          </div>
          <div className="workspace-section-copy">
            {selectedFolderPath || 'Selectionnez un dossier pour afficher son contenu.'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="archive-empty-state">Chargement du contenu...</div>
      ) : !selectedFolder ? (
        <div className="archive-empty-state">
          <FolderOpen size={20} />
          <div className="archive-empty-title">Aucun dossier selectionne</div>
          <div className="archive-empty-copy">
            Choisissez un exercice ou un sous-dossier dans l'arborescence pour afficher les pieces.
          </div>
        </div>
      ) : visibleFiles.length === 0 ? (
        <div className="archive-empty-state">
          <UploadCloud size={20} />
          <div className="archive-empty-title">Ce dossier est encore vide</div>
          <div className="archive-empty-copy">
            Ajoutez des pieces ici pour commencer l'archive de travail.
          </div>
        </div>
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
                      {file.mime_type ? ` | ${file.mime_type}` : ''}
                      {file.file_size ? ` | ${formatSize(file.file_size)}` : ''}
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
  )

  if (mode === 'cabinet') {
    return (
      <div className="docs-page archive-page archive-cabinet-page">
        <section className="workspace-panel archive-navigator-hero">
          <div className="archive-navigator-head">
            <div>
              <div className="workspace-section-title">Poste documentaire cabinet</div>
              <div className="workspace-section-copy">
                Selectionnez un client, ouvrez son arborescence, puis creez la structure et les depots a partir de ce poste de travail.
              </div>
            </div>
            <div className="archive-navigator-stats">
              <div className="archive-navigator-stat">
                <span className="archive-navigator-stat-label">Exercices</span>
                <span className="archive-navigator-stat-value">{summary.exercises}</span>
              </div>
              <div className="archive-navigator-stat">
                <span className="archive-navigator-stat-label">Sous-dossiers</span>
                <span className="archive-navigator-stat-value">{summary.folders}</span>
              </div>
              <div className="archive-navigator-stat">
                <span className="archive-navigator-stat-label">Fichiers</span>
                <span className="archive-navigator-stat-value">{summary.totalFiles}</span>
              </div>
            </div>
          </div>

          <div className="archive-client-bar">
            <label className="docs-field archive-client-selector">
              <span className="docs-label">Client actif</span>
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

            <div className="archive-client-current">
              <span className="archive-client-current-label">Contexte</span>
              <div className="archive-client-current-name">
                {hasClientSelected ? activeClientName : 'Aucun client selectionne'}
              </div>
              <div className="archive-client-current-meta">
                {hasClientSelected
                  ? (selectedFolderPath || (activeClientSlug ? `/${activeClientSlug}` : 'Archive prete a naviguer'))
                  : "Commencez par choisir une entreprise dans le portefeuille du cabinet."}
              </div>
            </div>
          </div>
        </section>

        <section className="archive-cabinet-grid">
          <aside className="workspace-panel archive-navigator-panel">
            <div className="workspace-section-head">
              <div>
                <div className="workspace-section-title">Structure et navigation</div>
                <div className="workspace-section-copy">
                  Le cabinet pilote la structure, puis travaille directement dans le dossier cible.
                </div>
              </div>
            </div>

            <div className="archive-structure-actions">
              <label className="docs-field">
                <span className="docs-label">Nouvel exercice</span>
                <input
                  className="workspace-input"
                  type="number"
                  min={2000}
                  max={2100}
                  value={exerciseYear}
                  onChange={(event) => setExerciseYear(Number(event.target.value || new Date().getFullYear()))}
                  disabled={!hasClientSelected}
                />
              </label>

              <button
                className="workspace-button primary archive-create-button"
                type="button"
                onClick={createExerciseFolder}
                disabled={creatingExercise || !hasClientSelected}
              >
                <Plus size={14} />
                <span>{creatingExercise ? 'Creation...' : `Creer l'exercice ${exerciseYear}`}</span>
              </button>

              <label className="docs-field">
                <span className="docs-label">Nouveau sous-dossier</span>
                <input
                  className="workspace-input"
                  value={subfolderName}
                  onChange={(event) => setSubfolderName(event.target.value)}
                  placeholder="Ex: Banque, TVA, Paie..."
                  disabled={!selectedFolder}
                />
              </label>

              <button
                className="workspace-button ghost archive-create-button"
                type="button"
                onClick={createSubfolder}
                disabled={creatingSubfolder || !selectedFolder}
              >
                <Plus size={14} />
                <span>{creatingSubfolder ? 'Creation...' : 'Creer un sous-dossier'}</span>
              </button>
            </div>

            <div className="archive-tree-panel">
              <div className="archive-target-card">
                <div className="archive-target-title">{hasClientSelected ? activeClientName : 'Archive client'}</div>
                <div className="workspace-row-meta">
                  {hasClientSelected
                    ? (selectedFolderPath || "Aucun dossier selectionne pour l'instant.")
                    : 'Choisissez un client pour charger son arborescence.'}
                </div>
              </div>
              {folderTreeContent}
            </div>
          </aside>

          <div className="archive-cabinet-main">
            {uploadPanel}
            {filesPanel}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="docs-page archive-page archive-client-page">
      <section className="workspace-panel archive-navigator-hero archive-client-hero">
        <div className="archive-navigator-head">
          <div>
            <div className="workspace-section-title">Archives documentaires</div>
            <div className="workspace-section-copy">
              Retrouvez vos dossiers d'exercice, deposez vos pieces dans les bons emplacements et telechargez les documents rendus visibles.
            </div>
          </div>
          <div className="archive-navigator-stats">
            <div className="archive-navigator-stat">
              <span className="archive-navigator-stat-label">Exercices</span>
              <span className="archive-navigator-stat-value">{summary.exercises}</span>
            </div>
            <div className="archive-navigator-stat">
              <span className="archive-navigator-stat-label">Sous-dossiers</span>
              <span className="archive-navigator-stat-value">{summary.folders}</span>
            </div>
            <div className="archive-navigator-stat">
              <span className="archive-navigator-stat-label">Fichiers</span>
              <span className="archive-navigator-stat-value">{summary.totalFiles}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="archive-client-layout">
        <aside className="workspace-panel archive-tree-panel">
          <div className="workspace-section-head">
            <div>
              <div className="workspace-section-title">Arborescence</div>
              <div className="workspace-section-copy">
                Le cabinet prepare la structure. Vous travaillez a l'interieur des dossiers existants.
              </div>
            </div>
          </div>

          <div className="archive-target-card">
            <div className="archive-target-title">{activeClientName}</div>
            <div className="workspace-row-meta">
              {selectedFolderPath || "Aucun dossier selectionne pour l'instant."}
            </div>
          </div>

          {folderTreeContent}
        </aside>

        <div className="archive-cabinet-main">
          {uploadPanel}
          {filesPanel}
        </div>
      </section>
    </div>
  )
}
