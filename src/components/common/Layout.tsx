import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import clsx from 'clsx'

interface Props {
  children: ReactNode
  title?: string
}

const navItems = [
  { to: '/', label: 'ダッシュボード', icon: '🏠' },
  { to: '/quiz', label: '問題を解く', icon: '📝' },
  { to: '/history', label: '解答履歴', icon: '📊' },
]

export default function Layout({ children, title }: Props) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-aws-dark text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-aws-orange font-bold text-xl">AWS</span>
            <span className="text-white font-semibold">認定試験対策</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user?.username}</span>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={clsx(
                  'text-sm px-3 py-1 rounded-lg transition-colors',
                  location.pathname === '/admin'
                    ? 'bg-aws-orange text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                )}
              >
                管理者
              </Link>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-6 gap-6">
        {/* Sidebar */}
        <nav className="hidden md:flex flex-col gap-1 w-48 flex-shrink-0">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.to
                  ? 'bg-aws-orange text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
          )}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx(
              'flex-1 flex flex-col items-center py-2 text-xs',
              location.pathname === item.to ? 'text-aws-orange' : 'text-gray-500'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
