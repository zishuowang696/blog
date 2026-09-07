import type { Child } from 'hono/jsx'

interface AuthFormProps {
  mode: 'login' | 'register'
  error?: string
  next?: string
}

function field(label: string, children: Child) {
  return <label>{label}{children}</label>
}

export function AuthView({ mode, error, next }: AuthFormProps) {
  const isRegister = mode === 'register'
  return (
    <section class="auth-card">
      <h1>{isRegister ? 'Create account' : 'Log in'}</h1>
      {error ? <p class="flash error">{error}</p> : null}
      <form class="auth-form" action={isRegister ? '/register' : '/login'} method="post">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {field(
          'Username',
          <input type="text" name="username" required minlength={3} maxlength={24} autocomplete="username" placeholder="lowercase letters / digits / _ -" />,
        )}
        {field(
          'Password',
          <input type="password" name="password" required minlength={8} autocomplete={isRegister ? 'new-password' : 'current-password'} />,
        )}
        {isRegister
          ? <>
              {field(
                'Display name (optional)',
                <input type="text" name="display_name" maxlength={32} autocomplete="nickname" placeholder="defaults to username" />,
              )}
              {field('Email (optional)', <input type="email" name="email" autocomplete="email" />)}
            </>
          : null}
        <button class="btn" type="submit">
          {isRegister ? 'Sign up' : 'Log in'}
        </button>
      </form>
      {isRegister ? (
        <p class="muted">
          Already have an account? <a href="/login">Log in</a>
        </p>
      ) : (
        <p class="muted">
          No account yet? <a href="/register">Sign up</a>
        </p>
      )}
    </section>
  )
}
