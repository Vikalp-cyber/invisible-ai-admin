import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40'
      : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100',
  ].join(' ')

export function Layout() {
  const { apiBase, displayEmail, displayName, authKind, logout } = useAuth()

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        <div className="border-b border-zinc-800 px-4 py-5">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Invisible AI
          </div>
          <div className="mt-1 text-lg font-semibold text-white">Admin</div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <NavLink to="/users" className={navClass}>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" aria-hidden />
            Users
          </NavLink>
          <NavLink to="/payment-requests" className={navClass}>
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-400/80" aria-hidden />
            Payment requests
          </NavLink>
          <NavLink to="/groq-keys" className={navClass}>
            <span className="inline-flex h-2 w-2 rounded-full bg-sky-400/80" aria-hidden />
            Groq keys
          </NavLink>
          <NavLink to="/deepgram-keys" className={navClass}>
            <span className="inline-flex h-2 w-2 rounded-full bg-fuchsia-400/80" aria-hidden />
            Deepgram keys
          </NavLink>
          <NavLink to="/app-releases" className={navClass}>
            <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400/80" aria-hidden />
            Windows releases
          </NavLink>
        </nav>
        <div className="mt-auto border-t border-zinc-800 p-3">
          <p className="truncate px-1 text-xs text-zinc-400" title={displayEmail}>
            {displayEmail}
          </p>
          {displayName ? (
            <p className="mt-0.5 truncate px-1 text-xs text-zinc-500" title={displayName}>
              {displayName}
            </p>
          ) : null}
          <p className="mt-1 truncate px-1 text-xs text-zinc-500" title={apiBase}>
            {apiBase}
          </p>
          {authKind === 'apiKey' ? (
            <p className="mt-1 px-1 text-[10px] uppercase tracking-wide text-amber-500/90">
              API key session
            </p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 gap-1 md:hidden">
              <NavLink
                to="/users"
                className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 hover:bg-zinc-800/80 hover:text-violet-200"
              >
                Users
              </NavLink>
              <NavLink
                to="/payment-requests"
                className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 hover:bg-zinc-800/80 hover:text-violet-200"
              >
                UTR
              </NavLink>
              <NavLink
                to="/groq-keys"
                className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 hover:bg-zinc-800/80 hover:text-violet-200"
              >
                Groq
              </NavLink>
              <NavLink
                to="/deepgram-keys"
                className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 hover:bg-zinc-800/80 hover:text-violet-200"
              >
                Deepgram
              </NavLink>
              <NavLink
                to="/app-releases"
                className="rounded-lg px-2 py-1 text-sm font-medium text-violet-300 hover:bg-zinc-800/80 hover:text-violet-200"
              >
                Win
              </NavLink>
            </div>
            <div className="min-w-0 md:flex-1">
              <div className="text-sm font-semibold text-white md:hidden">Admin</div>
              <p className="truncate text-xs text-zinc-400" title={displayEmail}>
                {displayEmail}
              </p>
              {displayName ? (
                <p className="truncate text-xs text-zinc-500" title={displayName}>
                  {displayName}
                </p>
              ) : null}
              <p className="truncate text-xs text-zinc-500" title={apiBase}>
                {apiBase}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-auto bg-zinc-950 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
