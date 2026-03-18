import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your platform configuration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/settings/users"
          className="group flex items-start gap-4 bg-white rounded-xl border border-neutral-200 p-5 hover:border-primary hover:shadow-sm transition-all"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">User Management</p>
            <p className="mt-0.5 text-xs text-neutral-500">Manage staff accounts and roles</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
