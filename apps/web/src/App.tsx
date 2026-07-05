import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { AppRouter } from '@/components/router/app-router'
import { useEffect } from 'react'
import { initGTM } from '@/utils/analytics'
import { AuthProvider } from '@/contexts/auth-context'
import { LanguageProvider } from '@/lib/i18n'
import { Toaster } from '@/components/ui/sonner'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  // Initialize GTM on app load
  useEffect(() => {
    initGTM();
  }, []);

  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-body)' }}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <LanguageProvider>
          <Toaster />
          <AuthProvider>
            <SidebarConfigProvider>
              <Router basename={basename}>
                <AppRouter />
              </Router>
            </SidebarConfigProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
