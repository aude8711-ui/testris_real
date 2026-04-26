interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = 'px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50'
  const variants = {
    primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    danger:    'bg-red-600 hover:bg-red-500 text-white',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
