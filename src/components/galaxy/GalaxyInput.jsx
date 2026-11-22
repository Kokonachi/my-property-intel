/* Galaxy / Uiverse input by Cksunandh (MIT). See vendor/ATTRIBUTION.md */
import styles from './GalaxyInput.module.css'

export default function GalaxyInput({ className = '', ...props }) {
  const cls = className ? `${styles.input} ${className}` : styles.input
  return <input className={cls} {...props} />
}
