import type { ComponentType, CSSProperties, ReactNode } from 'react'
import ClickSparkRaw from './bits/ClickSpark'
import GradualBlurRaw from './bits/GradualBlur'
import MetallicPaintRaw from './bits/MetallicPaint'
import CubesRaw from './bits/Cubes'
import StarBorderRaw from './bits/StarBorder'
import AnimatedListRaw from './bits/AnimatedList'
import type { MouseEventHandler } from 'react'
import DitherVeilRaw from './bits/DitherVeil'
import OrbitImagesRaw from './bits/OrbitImages'
import ReflectiveCardRaw from './bits/ReflectiveCard'
import FolderFloatRaw from './bits/FolderFloat'
import ThoughtLineRaw from './bits/ThoughtLine'
import MoltenMetalRaw from './bits/MoltenMetal'

type ClickSparkProps = {
  sparkColor?: string | string[]
  shape?: 'line' | 'streak' | 'dot' | 'star'
  sparkCount?: number
  sparkSize?: number
  sparkWidth?: number
  sparkRadius?: number
  duration?: number
  easing?: 'ease-out' | 'ease-in-out' | 'ease-in' | 'linear' | 'spring'
  randomness?: number
  glow?: number
  ring?: boolean
  disabled?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

type GradualBlurProps = {
  target?: 'parent' | 'page'
  position?: 'top' | 'bottom' | 'left' | 'right'
  height?: string | number
  strength?: number
  layers?: number
  curve?: 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
  exponential?: boolean
  tint?: string
  autoHide?: boolean
  zIndex?: number
}

export const ClickSpark = ClickSparkRaw as unknown as ComponentType<ClickSparkProps>
export const GradualBlur = GradualBlurRaw as unknown as ComponentType<GradualBlurProps>


type MetallicPaintProps = {
  imageSrc?: string
  text?: string
  fontFamily?: string
  fontWeight?: number
  color?: string
  density?: number
  softness?: number
  dispersion?: number
  edgeBend?: number
  speed?: number
  scale?: number
  mouseTilt?: number
  lightMode?: boolean
  intro?: boolean
  className?: string
  style?: CSSProperties
}
export const MetallicPaint = MetallicPaintRaw as unknown as ComponentType<MetallicPaintProps>

type CubesProps = {
  gridSize?: number
  faceColor?: string
  edgeColor?: string
  rippleColor?: string
  maxAngle?: number
  radius?: number
  perspective?: number
  shading?: number
  bounce?: number
  className?: string
}

type StarBorderProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  color?: string
  trailColor?: string
  duration?: number
  thickness?: number
  radius?: number
  glow?: number
  stars?: number
  sparkle?: boolean
  hover?: 'lap' | 'brighten' | 'reveal' | 'none'
  theme?: 'dark' | 'light'
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  onClick?: MouseEventHandler<HTMLElement>
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
}

type AnimatedListProps<T> = {
  items: T[]
  renderItem?: (item: T, index: number, selected: boolean) => ReactNode
  onItemSelect?: (item: T, index: number) => void
  animation?: 'pop' | 'slide' | 'fade' | 'none'
  animateOnce?: boolean
  stagger?: number
  showGradients?: boolean
  frame?: boolean
  theme?: 'dark' | 'light'
  radius?: number
  gap?: number
  width?: number | string
  maxHeight?: number | string
  displayScrollbar?: boolean
  selectOnHover?: boolean
}

export const Cubes = CubesRaw as unknown as ComponentType<CubesProps>
export const StarBorder = StarBorderRaw as unknown as ComponentType<StarBorderProps>

export function AnimatedList<T>(props: AnimatedListProps<T>) {
  const List = AnimatedListRaw as unknown as ComponentType<AnimatedListProps<T>>
  return <List {...props} />
}

type DitherVeilProps = {
  src?: string
  fit?: 'contain' | 'cover'
  pattern?: 'bayer' | 'noise' | 'atkinson' | 'floyd' | 'lines'
  palette?: 'duotone' | 'rgb'
  pixelSize?: number
  levels?: number
  inkColor?: string
  paperColor?: string
  contrast?: number
  brightness?: number
  revealRadius?: number
  softness?: number
  linger?: number
  rimColor?: string
  rim?: number
  reverse?: boolean
  wander?: boolean
  clickBurst?: boolean
  className?: string
  style?: CSSProperties
}

type OrbitImagesProps = {
  images: { src: string; alt?: string }[]
  shape?: 'ellipse' | 'circle'
  radiusX?: number
  radiusY?: number
  rotation?: number
  duration?: number
  itemSize?: number
  itemRadius?: number
  depth?: number
  showPath?: boolean
  pathColor?: string
  pathDash?: number
  hoverSpeed?: number
  shadow?: number
  centerContent?: ReactNode
}

type ReflectiveCardProps = {
  children?: ReactNode
  theme?: 'dark' | 'light'
  tint?: string
  width?: number | string
  height?: number | string
  radius?: number
  metalness?: number
  roughness?: number
  blurStrength?: number
  shine?: number
  glare?: number
  tiltStrength?: number
}

type FolderFloatProps = {
  items?: string[]
  label?: string
  sublabel?: string
  trigger?: 'hover' | 'click'
  closeOnSelect?: boolean
  physics?: boolean
  drift?: number
  folderColor?: string
  frontColor?: string
  paperColor?: string
  itemColor?: string
  itemTextColor?: string
  labelColor?: string
  width?: number
  height?: number
  spread?: number
  lift?: number
}

type ThoughtLineProps = {
  working?: boolean
  steps?: string[]
  label?: string
  doneLabel?: string
  glyph?: 'sparkle' | 'dot' | 'none'
  fontSize?: number
  color?: string
  collapsible?: boolean
  showTimer?: boolean
  className?: string
}

export const DitherVeil = DitherVeilRaw as unknown as ComponentType<DitherVeilProps>
export const OrbitImages = OrbitImagesRaw as unknown as ComponentType<OrbitImagesProps>
export const ReflectiveCard = ReflectiveCardRaw as unknown as ComponentType<ReflectiveCardProps>
export const FolderFloat = FolderFloatRaw as unknown as ComponentType<FolderFloatProps>
export const ThoughtLine = ThoughtLineRaw as unknown as ComponentType<ThoughtLineProps>

type MoltenMetalProps = {
  colors?: string[]
  coreColor?: string
  backgroundColor?: string
  lightMode?: boolean
  speed?: number
  scale?: number
  detail?: number
  glow?: number
  thickness?: number
  haze?: number
  brightness?: number
  drift?: number
  grain?: number
  opacity?: number
  mouseInteraction?: boolean
  flareOnClick?: boolean
  dpr?: number
  className?: string
  style?: CSSProperties
  mouseStrength?: number
}

export const MoltenMetal = MoltenMetalRaw as unknown as ComponentType<MoltenMetalProps>
