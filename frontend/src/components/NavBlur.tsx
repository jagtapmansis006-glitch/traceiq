import { GradualBlur } from './bits'
import { useTheme } from '../theme'

function NavBlur() {
  const { resolved } = useTheme()
  return (
    <GradualBlur
      position="top"
      target="page"
      height="7rem"
      strength={3}
      layers={8}
      curve="bezier"
      exponential
      zIndex={999}
      tint={resolved === 'dark' ? 'rgba(22, 12, 22, 0.45)' : 'rgba(255, 244, 248, 0.45)'}
    />
  )
}

export default NavBlur