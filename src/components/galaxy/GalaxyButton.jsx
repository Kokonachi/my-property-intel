/* Galaxy / Uiverse button by adamgiebl (MIT). See vendor/ATTRIBUTION.md */
import styles from './GalaxyButton.module.css'

export default function GalaxyButton({ children = 'Button', type = 'button', className = '', ...props }) {
  const cls = className ? `${styles.button} ${className}` : styles.button
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  )
}
