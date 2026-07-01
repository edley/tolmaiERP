import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PeriodProvider } from './contexts/PeriodContext'
import { CompanyProvider } from './contexts/CompanyContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Dashboard } from './pages/Dashboard'
import { ChartOfAccounts } from './pages/ChartOfAccounts'
import { JournalEntries } from './pages/JournalEntries'
import { GeneralLedger } from './pages/GeneralLedger'
import { Payments } from './pages/Payments'
import { Receipts } from './pages/Receipts'
import { FinancialReports } from './pages/FinancialReports'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ForcePasswordReset } from './pages/ForcePasswordReset'
import { Settings } from './pages/Settings'
import { UserManagement } from './pages/UserManagement'
import { UserSession } from './pages/UserSession'
import { AuditTrailPage } from './pages/AuditTrail'
import { FieldAuditLogPage } from './pages/FieldAuditLog'
import { ObjectManager } from './pages/ObjectManager'
import { PaymentModes } from './pages/PaymentModes'
import { MFAGate } from './components/MFA/MFAGate'
import { AccountingPeriods } from './pages/AccountingPeriods'
import { TrialBalance } from './pages/TrialBalance'
import { AllocationMappings } from './pages/AllocationMappings'
import { AllocationTypes } from './pages/AllocationTypes'
import { AllocationReportAnalysis } from './pages/AllocationReportAnalysis/AllocationReportAnalysis'
import { ExpenseTypeAnalysis } from './pages/ExpenseTypeAnalysis'
import { PendingPosting } from './pages/PendingPosting'
import { Companies } from './pages/Companies'
import { BankReport } from './pages/BankReport'
import { BudgetPage } from './pages/Budget'
import { BudgetAnalysis } from './pages/BudgetAnalysis'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoute />}>
            <Route path="/force-password-reset" element={<ForcePasswordReset />} />
            <Route element={<MFAGate />}>
            <Route element={<ThemeProvider><CompanyProvider><PeriodProvider><Layout /></PeriodProvider></CompanyProvider></ThemeProvider>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<ChartOfAccounts />} />
            <Route path="/journal-entries" element={<JournalEntries />} />
            <Route path="/pending-posting" element={<PendingPosting />} />
            <Route path="/general-ledger" element={<GeneralLedger />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/trial-balance" element={<TrialBalance />} />
            <Route path="/allocation-report-analysis" element={<AllocationReportAnalysis />} />
            <Route path="/expense-type-analysis" element={<ExpenseTypeAnalysis />} />
            <Route path="/reports" element={<FinancialReports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/allocation-mappings" element={<AllocationMappings />} />
            <Route path="/allocation-types" element={<AllocationTypes />} />
            <Route path="/payment-modes" element={<PaymentModes />} />
            <Route path="/accounting-periods" element={<AccountingPeriods />} />
            <Route path="/usermgmt" element={<UserManagement />} />
            <Route path="/user-sessions" element={<UserSession />} />
            <Route path="/audit-trail" element={<AuditTrailPage />} />
            <Route path="/field-audit-log" element={<FieldAuditLogPage />} />
            <Route path="/object-manager" element={<ObjectManager />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/bank-report" element={<BankReport />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/budget-analysis" element={<BudgetAnalysis />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
