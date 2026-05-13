export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <form action="/api/login" method="post" className="card w-full max-w-md space-y-4">
      <div><h1 className="text-2xl font-bold">Welcome home</h1><p className="text-sm text-slate-500">Sign in to review family spending.</p></div>
      <label className="block text-sm font-medium">Username<input className="input mt-1" name="username" autoComplete="username" required /></label>
      <label className="block text-sm font-medium">Password<input className="input mt-1" name="password" type="password" autoComplete="current-password" required /></label>
      <button className="btn w-full" type="submit">Sign in</button>
      <p className="text-xs text-slate-500">Demo users: jake and wife. Change seeded passwords in your .env.</p>
    </form>
  </main>;
}
