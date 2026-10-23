import { MoltenMetal } from './bits'
import { useTheme } from '../theme'
import './molten.css'
import { usePrefs } from '../prefs'

function MoltenBackground() {
  const { resolved } = useTheme()
  const dark = resolved === 'dark'
  const prefs = usePrefs()
  if (!prefs.background) return null

  return (
    <div className="molten-bg" aria-hidden="true">
      <MoltenMetal
        key={resolved}
        lightMode={!dark}
        colors={dark ? ['#3b1a4a', '#d6457f', '#ffb98a'] : ['#ffb3cf', '#ff8fb8', '#e0803a']}
        coreColor={dark ? '#fff1f6' : '#d6457f'}
        backgroundColor={dark ? '#1a1120' : '#fff5f3'}
        speed={0.25}
        scale={3.2}
        detail={3}
        glow={dark ? 1.4 : 1.1}
        haze={0.8}
        brightness={dark ? 1.1 : 0.95}
        drift={0.25}
        grain={0.03}
        opacity={Math.min(1, (dark ? 0.9 : 0.7) * prefs.intensity)}
        mouseStrength={0.4}
        dpr={1.25}
      />
    </div>
  )
}

export default MoltenBackground