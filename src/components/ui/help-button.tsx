import { useState } from 'react'
import { HelpCircle, Keyboard, BookOpen, Info } from 'lucide-react'
import { Modal } from '../Modal'

export function HelpButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full bg-[#0070d2] text-white shadow-lg hover:bg-[#005fb2] transition-colors flex items-center justify-center"
        title="Help"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Help & Support">
        <HelpPanel />
      </Modal>
    </>
  )
}

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Help & Support">
      <HelpPanel />
    </Modal>
  )
}

export function HelpPanel() {
  return (
    <div className="space-y-4">
      <Section icon={<Keyboard className="w-4 h-4" />} title="Keyboard Shortcuts">
        <ShortcutRow keys={['Ctrl', 'K']} description="Command palette" />
        <ShortcutRow keys={['Ctrl', 'N']} description="New entry (current module)" />
        <ShortcutRow keys={['Ctrl', 'S']} description="Save current form" />
        <ShortcutRow keys={['Escape']} description="Close modal / cancel" />
      </Section>

      <Section icon={<BookOpen className="w-4 h-4" />} title="Documentation">
        <p className="text-sm text-[#514f4d]">
          Visit the documentation for detailed guides on each module, setup instructions, and best practices.
        </p>
      </Section>

      <Section icon={<Info className="w-4 h-4" />} title="About">
        <div className="text-sm text-[#514f4d] space-y-1">
          <p><span className="font-semibold text-[#16325c]">Tolmai ERP</span> v1.0.0</p>
          <p>Built with React + Supabase</p>
        </div>
      </Section>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#16325c]">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#514f4d]">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((k) => (
          <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 border border-slate-200 rounded text-[#514f4d]">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}
