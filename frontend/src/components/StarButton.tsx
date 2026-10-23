import type { MouseEventHandler, ReactNode } from 'react'
import { StarBorder } from './bits'
import { useTheme } from '../theme'
import './starbutton.css'

type StarButtonProps = {
  children: ReactNode
  onClick?: MouseEventHandler<HTMLElement>
  disabled?: boolean
  className?: string
  title?: string
}

function StarButton({ children, onClick, disabled, className = '', title }: StarButtonProps) {
  const { resolved } = useTheme()
  const dark = resolved === 'dark'

  return (
    <StarBorder
      className={`star-btn ${className}`.trim()}
      theme={dark ? 'dark' : 'light'}
      backgroundColor="linear-gradient(135deg, #ff9ec4, #ffcf9e)"
      textColor="#3a1226"
      borderColor={dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(214, 69, 127, 0.35)'}
      color={dark ? '#ffffff' : '#d6457f'}
      trailColor={dark ? '#ff8fb8' : '#ffb98a'}
      duration={5}
      glow={0.5}
      radius={12}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </StarBorder>
  )
}

export default StarButton