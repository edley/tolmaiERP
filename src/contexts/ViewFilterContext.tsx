import { createContext, useContext } from 'react'

export type ViewFilterValue = 'recent' | '10days' | 'all'

const ViewFilterContext = createContext<ViewFilterValue>('all')

export function useViewFilter() {
  return useContext(ViewFilterContext)
}

export { ViewFilterContext }
