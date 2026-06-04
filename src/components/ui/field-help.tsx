import * as Tooltip from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'

interface FieldHelpProps {
  description: string
}

export function FieldHelp({ description }: FieldHelpProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center ml-1 align-middle text-slate-400 hover:text-[#0070d2] transition-colors outline-none"
            tabIndex={-1}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={4}
            className="z-50 max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-[#514f4d] shadow-md"
          >
            {description}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
