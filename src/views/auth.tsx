import type { Child } from 'hono/jsx'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'

interface AuthFormProps {
  mode: 'login' | 'register'
  lang: Lang
  error?: string
  next?: string
}

function field(label: string, children: Child) {
  return <label>{label}{children}</label>
}

export function AuthView({ mode, lang, error, next }: AuthFormProps) {
  const isRegister = mode === 'register'
  return (
    <section class="auth-card">
      <h1>{isRegister ? t(lang, 'auth.signup_title') : t(lang, 'auth.login_title')}</h1>
      {error ? <p class="flash error">{error}</p> : null}
      <form class="auth-form" action={isRegister ? '/register' : '/login'} method="post">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {field(
          t(lang, 'auth.username'),
          <input type="text" name="username" required minlength={3} maxlength={24} autocomplete="username" placeholder={t(lang, 'auth.uname_ph')} />,
        )}
        {field(
          t(lang, 'auth.password'),
          <input type="password" name="password" required minlength={8} autocomplete={isRegister ? 'new-password' : 'current-password'} />,
        )}
        {isRegister
          ? <>
              {field(
                t(lang, 'auth.display_name'),
                <input type="text" name="display_name" maxlength={32} autocomplete="nickname" placeholder={t(lang, 'auth.display_ph')} />,
              )}
              {field(t(lang, 'auth.email'), <input type="email" name="email" autocomplete="email" />)}
            </>
          : null}
        <button class="btn" type="submit">
          {isRegister ? t(lang, 'acct.signup') : t(lang, 'acct.login')}
        </button>
      </form>
      {isRegister ? (
        <p class="muted">
          {t(lang, 'auth.to_login')}{' '}
          <a href="/login">{t(lang, 'acct.login')}</a>
        </p>
      ) : (
        <p class="muted">
          {t(lang, 'auth.to_signup')}{' '}
          <a href="/register">{t(lang, 'acct.signup')}</a>
        </p>
      )}
    </section>
  )
}
