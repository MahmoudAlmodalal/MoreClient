import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ChatWidget from './components/ChatWidget'
import DashboardPage from './pages/DashboardPage'
import FilesPage from './pages/FilesPage'
import HandoffsPage from './pages/HandoffsPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      {/* Standalone customer-facing chat widget (no dashboard chrome). */}
      <Route path="/widget" element={<ChatWidget />} />

      {/* Agent dashboard */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/handoffs" element={<HandoffsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
