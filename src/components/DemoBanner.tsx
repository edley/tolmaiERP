import { Database, CheckCircle, Info } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/demo'

interface DemoBannerProps {
  visible: boolean
  error?: string | null
}

export function DemoBanner({ visible, error }: DemoBannerProps) {
  if (!visible) return null

  const isDbMissing = error?.toLowerCase().includes('does not exist')
    || error?.toLowerCase().includes('relation')
    || error?.toLowerCase().includes('not found')

  const supabaseConfigured = isSupabaseConfigured()

  if (isDbMissing) {
    return (
      <div className="rounded-lg px-4 py-3 flex items-start gap-3 mb-6 bg-red-50 border border-red-200">
        <Database className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-red-800 mb-1">Supabase connected but tables not found</p>
          <p className="text-red-700">
            Open your Supabase dashboard, go to the <strong>SQL Editor</strong>, paste and run{' '}
            <code className="bg-red-100 px-1 rounded text-xs font-mono">supabase-schema.sql</code>,{' '}
            then <code className="bg-red-100 px-1 rounded text-xs font-mono">supabase-seed.sql</code>.
          </p>
          <details className="mt-2">
            <summary className="text-red-600 text-xs cursor-pointer hover:text-red-800">Show error details</summary>
            <pre className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-20">{error}</pre>
          </details>
        </div>
      </div>
    )
  }

  if (!supabaseConfigured) {
    return (
      <div className="rounded-lg px-4 py-3 flex items-start gap-3 mb-6 bg-amber-50 border border-amber-200">
        <CheckCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 mb-1">Running in demo mode with sample data</p>
          <p className="text-amber-700">
            Set up Supabase: copy{' '}
            <code className="bg-amber-100 px-1 rounded text-xs font-mono">.env.example</code> to{' '}
            <code className="bg-amber-100 px-1 rounded text-xs font-mono">.env</code> with your project credentials.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg px-4 py-3 flex items-start gap-3 mb-6 bg-blue-50 border border-blue-200">
      <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-blue-800 mb-1">Supabase connected — no data matched your filters</p>
        <p className="text-blue-700">
          {error ?? 'The selected filters returned no results from the database. Showing sample data for preview.'}
        </p>
      </div>
    </div>
  )
}
