import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PeriodProvider } from './contexts/PeriodContext'
import { Dashboard } from './pages/Dashboard'
import { ChartOfAccounts } from './pages/ChartOfAccounts'
import { JournalEntries } from './pages/JournalEntries'
import { GeneralLedger } from './pages/GeneralLedger'
import { Payments } from './pages/Payments'
import { FinancialReports } from './pages/FinancialReports'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Settings } from './pages/Settings'
import { UserManagement } from './pages/UserManagement'
import { AccountingPeriods } from './pages/AccountingPeriods'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<PeriodProvider><Layout /></PeriodProvider>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<ChartOfAccounts />} />
            <Route path="/journal-entries" element={<JournalEntries />} />
            <Route path="/general-ledger" element={<GeneralLedger />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<FinancialReports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/accounting-periods" element={<AccountingPeriods />} />
            <Route path="/usermgmt" element={<UserManagement />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
