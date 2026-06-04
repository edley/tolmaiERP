import { useState, useRef } from 'react'
import { Upload, Trash2, Camera } from 'lucide-react'
import { uploadAvatar, deleteAvatar } from '../../lib/auth'

interface AvatarUploadProps {
  userId: string
  currentUrl: string | null
  userName: string
  onUpdate: (url: string | null) => void
}

export function AvatarUpload({ userId, currentUrl, userName, onUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum 2MB.')
      return
    }
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Invalid file type. Use PNG, JPEG, GIF, or WebP.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const url = await uploadAvatar(userId, file)
      onUpdate(url)
    } catch (err) {
      setError('Failed to upload avatar.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setUploading(true)
    try {
      await deleteAvatar(userId)
      onUpdate(null)
    } catch {
      setError('Failed to delete avatar.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={userName}
            className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#0070d2] text-white text-lg font-bold flex items-center justify-center border-2 border-slate-200">
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
          title="Change avatar"
        >
          <Camera className="w-3.5 h-3.5 text-[#514f4d]" />
        </button>
      </div>

      <div className="space-y-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0070d2] bg-[#e8f4fe] rounded hover:bg-[#d8edfc] transition-colors disabled:opacity-40"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c23934] bg-[#fef0f0] rounded hover:bg-[#fde0e0] transition-colors disabled:opacity-40 ml-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
        {error && <p className="text-xs text-[#c23934]">{error}</p>}
      </div>
    </div>
  )
}
