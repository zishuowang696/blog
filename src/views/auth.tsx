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
      <h1>{isRegister ? '创建账号' : '登录'}</h1>
      {error ? <p class="flash error">{error}</p> : null}
      <form class="auth-form" action={isRegister ? '/register' : '/login'} method="post">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {field(
          '用户名',
          <input type="text" name="username" required minlength={3} maxlength={24} autocomplete="username" placeholder="小写字母/数字/_/-" />,
        )}
        {field(
          '密码',
          <input type="password" name="password" required minlength={8} autocomplete={isRegister ? 'new-password' : 'current-password'} />,
        )}
        {isRegister
          ? <>
              {field(
                '显示昵称（可选）',
                <input type="text" name="display_name" maxlength={32} autocomplete="nickname" placeholder="默认同用户名" />,
              )}
              {field('邮箱（可选）', <input type="email" name="email" autocomplete="email" />)}
            </>
          : null}
        <button class="btn" type="submit">
          {isRegister ? '注册' : '登录'}
        </button>
      </form>
      {isRegister ? (
        <p class="muted">
          已有账号？<a href="/login">去登录</a>
        </p>
      ) : (
        <p class="muted">
          还没有账号？<a href="/register">注册一个</a>
        </p>
      )}
    </section>
  )
}
