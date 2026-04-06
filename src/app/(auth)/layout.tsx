export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center login-bg noise-overlay relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#c8a04a]/[0.04] rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#c8a04a]/[0.03] rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      <div className="absolute inset-0 industrial-pattern opacity-50" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24 px-6 py-12 max-w-5xl w-full">
        {/* Left branding - desktop only */}
        <div className="max-lg:hidden flex-1 text-center lg:text-left">
          <img src="/goldbell-logo.svg" alt="Goldbell" className="w-12 h-12 rounded-xl mb-10" />
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Fleet Management<br />
            <span style={{ background: 'linear-gradient(135deg, #c8a04a 0%, #d4b96a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Reimagined.</span>
          </h1>
          <p className="text-neutral-400 mt-4 text-[16px] font-medium leading-relaxed max-w-md">
            Real-time vehicle tracking, intelligent inspections, and data-driven insights for Goldbell Car Rental operations.
          </p>
          <div className="flex items-center gap-6 mt-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Vehicles</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Monitoring</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">99.9%</p>
              <p className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Uptime</p>
            </div>
          </div>
          <p className="text-[12px] font-medium text-neutral-600 mt-12">&copy; {new Date().getFullYear()} Goldbell Group. All rights reserved.</p>
        </div>

        {/* Login form */}
        <div className="w-full max-w-sm animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
